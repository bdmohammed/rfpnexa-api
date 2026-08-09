import { type FindOptionsWhere, In } from 'typeorm';

import { CountryDependencyService } from './country-dependency.service';

import type {
  AddCommentInput,
  CreateCountryChangeRequestInput,
  ReviewChangeRequestInput,
  StateQueryDto,
  UpdateCountryBodyDto,
  UpdateStateDto,
} from './countries.dto';
import { AppDataSource } from '@/config/database';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { Country } from '@/database/entities/Country';
import { CountryActivity } from '@/database/entities/CountryActivity';
import { CountryChangeRequest } from '@/database/entities/CountryChangeRequest';
import { CountryChangeRequestAssignment } from '@/database/entities/CountryChangeRequestAssignment';
import { CountryChangeRequestComment } from '@/database/entities/CountryChangeRequestComment';
import { State } from '@/database/entities/State';
import { User } from '@/database/entities/User';
import {
  ActorType,
  CountryActivityType,
  CountryAssignmentStatus,
  CountryChangeRequestAction,
  CountryChangeRequestStatus,
  CountryChangeRequestTargetType,
  PermissionKey,
  RoleStatus,
  UserStatus,
} from '@/types/enums';

export class CountriesService {
  /**
   * Retrieves countries hierarchy with nested states and workflow badges
   */
  private static readonly countryRepo = AppDataSource.getRepository(Country);
  private static readonly requestRepo = AppDataSource.getRepository(CountryChangeRequest);
  private static readonly stateRepo = AppDataSource.getRepository(State);

  public static async getCountriesHierarchy() {
    const countries = await this.countryRepo.find({
      relations: {
        states: true,
      },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });

    const activeRequests = await this.requestRepo.find({
      where: {
        status: In([
          CountryChangeRequestStatus.DRAFT,
          CountryChangeRequestStatus.READY_FOR_REVIEW,
          CountryChangeRequestStatus.IN_REVIEW,
        ]),
      },
    });

    const requestMap = new Map<string, CountryChangeRequest>();
    activeRequests.forEach((req) => {
      const key = req.stateId ? `STATE_${req.stateId}` : `COUNTRY_${req.countryId}`;
      requestMap.set(key, req);
    });

    return countries.map((c) => {
      const countryReq = requestMap.get(`COUNTRY_${c.id}`);
      return {
        id: c.id,
        code: c.code,
        name: c.name,
        slug: c.slug,
        type: 'Country',
        isActive: c.isActive,
        displayOrder: c.displayOrder,
        updatedAt: c.updatedAt,
        workflowStatus: countryReq
          ? countryReq.status === CountryChangeRequestStatus.IN_REVIEW
            ? 'Pending Review'
            : 'Changes Requested'
          : 'None',
        activeRequestId: countryReq ? countryReq.id : null,
        activeRequestNumber: countryReq ? countryReq.requestNumber : null,
        states: c.states.map((s) => {
          const stateReq = requestMap.get(`STATE_${s.id}`);
          return {
            id: s.id,
            countryId: s.countryId,
            code: s.code,
            name: s.name,
            slug: s.slug,
            type: s.type,
            isActive: s.isActive,
            displayOrder: s.displayOrder,
            updatedAt: s.updatedAt,
            workflowStatus: stateReq
              ? stateReq.status === CountryChangeRequestStatus.IN_REVIEW
                ? 'Pending Review'
                : 'Changes Requested'
              : 'None',
            activeRequestId: stateReq ? stateReq.id : null,
            activeRequestNumber: stateReq ? stateReq.requestNumber : null,
          };
        }),
      };
    });
  }

  /**
   * Retrieves operational metrics for the Stats dashboard
   */
  public static async getOperationalStats(userId: string) {
    const countryRepo = AppDataSource.getRepository(Country);
    const requestRepo = AppDataSource.getRepository(CountryChangeRequest);
    const assignmentRepo = AppDataSource.getRepository(CountryChangeRequestAssignment);

    const totalCountries = await countryRepo.count();
    const activeCountries = await countryRepo.count({ where: { isActive: true } });
    const disabledCountries = await countryRepo.count({ where: { isActive: false } });

    const openReviews = await requestRepo.count({
      where: {
        status: In([
          CountryChangeRequestStatus.READY_FOR_REVIEW,
          CountryChangeRequestStatus.IN_REVIEW,
        ]),
      },
    });

    const pendingMine = await assignmentRepo.count({
      where: {
        reviewerId: userId,
        status: CountryAssignmentStatus.PENDING,
      },
    });

    return {
      totalCountries,
      activeCountries,
      disabledCountries,
      openReviews,
      pendingMine,
    };
  }

  /**
   * List eligible reviewers enforcing Rule 1 & Rule 2
   */
  public static async getEligibleReviewers(currentUserId: string) {
    const userRepo = AppDataSource.getRepository(User);

    // Users with active status and admin role that have country.review permission
    const users = await userRepo
      .createQueryBuilder('user')
      .innerJoin('user.userRoles', 'userRole')
      .innerJoin('userRole.role', 'role')
      .innerJoin('role.activeVersion', 'roleVersion')
      .innerJoin('roleVersion.roleVersionPermissions', 'rvp')
      .where('user.status = :userStatus', { userStatus: UserStatus.ACTIVE })
      .andWhere('role.status = :roleStatus', { roleStatus: RoleStatus.ACTIVE })
      .andWhere('rvp.permissionKey = :permKey', { permKey: PermissionKey.COUNTRY_REVIEW })
      .select(['user.id', 'user.name', 'user.email', 'user.avatarUrl'])
      .getMany();

    const otherEligibleCount = users.filter((u) => u.id !== currentUserId).length;
    const canSelfAssign = otherEligibleCount === 0;

    const finalUsers = [...users];
    if (canSelfAssign && !finalUsers.some((u) => u.id === currentUserId)) {
      const currentUser = await userRepo.findOne({
        where: { id: currentUserId },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });
      if (currentUser) {
        finalUsers.push(currentUser);
      }
    }

    return finalUsers.map((u) => {
      const isSelf = u.id === currentUserId;
      return {
        id: u.id,
        name: u.name,
        fullName: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl,
        isSelf,
        canBeAssigned: !isSelf || canSelfAssign,
      };
    });
  }

  /**
   * Creates a new Country or State Change Request ticket (e.g. CTR-000001)
   */
  public static async createChangeRequest(
    requestedByUserId: string,
    dto: CreateCountryChangeRequestInput,
    reqMeta?: { ipAddress?: string | undefined; userAgent?: string | undefined },
  ) {
    const requestRepo = AppDataSource.getRepository(CountryChangeRequest);
    const countryRepo = AppDataSource.getRepository(Country);
    const stateRepo = AppDataSource.getRepository(State);

    // Verify target entity exists
    const country = await countryRepo.findOneBy({ id: dto.countryId });
    if (!country) {
      throw new AppError(
        AppErrorMessage.COUNTRY_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }

    let state: State | null = null;
    if (dto.targetType === CountryChangeRequestTargetType.STATE) {
      if (!dto.stateId) {
        throw new AppError(
          AppErrorMessage.STATE_SELECTION_REQUIRED,
          HttpStatusCode.BAD_REQUEST,
          AppErrorCode.STATE_REQUIRED,
        );
      }
      state = await stateRepo.findOneBy({ id: dto.stateId, countryId: dto.countryId });
      if (!state) {
        throw new AppError(
          AppErrorMessage.STATE_NOT_FOUND,
          HttpStatusCode.NOT_FOUND,
          AppErrorCode.NOT_FOUND,
        );
      }
    }

    // Check for existing pending request
    const where: FindOptionsWhere<CountryChangeRequest> = {
      countryId: dto.countryId,
      status: In([
        CountryChangeRequestStatus.DRAFT,
        CountryChangeRequestStatus.READY_FOR_REVIEW,
        CountryChangeRequestStatus.IN_REVIEW,
      ]),
    };
    if (dto.stateId) {
      where.stateId = dto.stateId;
    }

    const existing = await requestRepo.findOne({ where });

    if (existing) {
      throw new AppError(
        `A change request (${existing.requestNumber}) is already under review for this ${dto.targetType.toLowerCase()}`,
        HttpStatusCode.CONFLICT,
        AppErrorCode.CONCURRENCY_CONFLICT,
      );
    }

    // Generate requestSequence & requestNumber
    const maxSeqResult = await requestRepo
      .createQueryBuilder('req')
      .select('MAX(req.requestSequence)', 'max')
      .getRawOne();
    const nextSeq = (Number(maxSeqResult?.max) || 0) + 1;
    const requestNumber = `CTR-${String(nextSeq).padStart(6, '0')}`;

    const defaultCascadePolicy = {
      disableStates: true,
      disableTenders: true,
      disableCategories: false,
      hideFromSearch: true,
      notifySuppliers: true,
    };

    const changeRequest = requestRepo.create({
      requestSequence: nextSeq,
      requestNumber,
      targetType: dto.targetType,
      countryId: dto.countryId,
      stateId: dto.stateId ?? null,
      action: dto.action,
      status: CountryChangeRequestStatus.READY_FOR_REVIEW,
      requestedById: requestedByUserId,
      reason: dto.reason,
      cascadePolicy: dto.cascadePolicy
        ? { ...defaultCascadePolicy, ...dto.cascadePolicy }
        : defaultCascadePolicy,
    });

    const savedRequest = await requestRepo.save(changeRequest);

    // Log Activity (REQUEST_CREATED)
    const targetName = state ? `${country.name} -> ${state.name}` : country.name;
    await AppDataSource.getRepository(CountryActivity).save({
      countryId: dto.countryId,
      stateId: dto.stateId ?? null,
      requestId: savedRequest.id,
      actorId: requestedByUserId,
      actorType: ActorType.USER,
      eventType: CountryActivityType.REQUEST_CREATED,
      title: `Change Request ${requestNumber} Created`,
      description: `Requested to ${dto.action.toLowerCase()} ${dto.targetType.toLowerCase()} '${targetName}'.`,
      oldValue: { isActive: state ? state.isActive : country.isActive },
      newValue: { requestedAction: dto.action },
      metadata: { reason: dto.reason, cascadePolicy: savedRequest.cascadePolicy },
      ipAddress: reqMeta?.ipAddress ?? null,
      userAgent: reqMeta?.userAgent ?? null,
    });

    return savedRequest;
  }

  /**
   * Assigns a reviewer to a change request
   */
  public static async assignReviewer(
    requestId: string,
    reviewerId: string,
    assignedByUserId: string,
    reqMeta?: { ipAddress?: string | undefined; userAgent?: string | undefined },
  ) {
    const requestRepo = AppDataSource.getRepository(CountryChangeRequest);
    const assignmentRepo = AppDataSource.getRepository(CountryChangeRequestAssignment);
    const userRepo = AppDataSource.getRepository(User);

    const request = await requestRepo.findOneBy({ id: requestId });
    if (!request) {
      throw new AppError(
        'Change request not found',
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }

    if (
      request.status === CountryChangeRequestStatus.APPROVED ||
      request.status === CountryChangeRequestStatus.REJECTED ||
      request.status === CountryChangeRequestStatus.CANCELLED
    ) {
      throw new AppError(
        'Cannot assign reviewer to a closed change request',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.INVALID_STATUS,
      );
    }

    const reviewer = await userRepo.findOneBy({ id: reviewerId });
    if (!reviewer) {
      throw new AppError(
        AppErrorMessage.USER_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.USER_NOT_FOUND,
      );
    }

    // Cancel existing pending assignments
    await assignmentRepo.update(
      { requestId, status: CountryAssignmentStatus.PENDING },
      { status: CountryAssignmentStatus.CANCELLED },
    );

    // Create assignment
    const assignment = assignmentRepo.create({
      requestId,
      reviewerId,
      assignedById: assignedByUserId,
      status: CountryAssignmentStatus.PENDING,
    });
    await assignmentRepo.save(assignment);

    // Update request status to IN_REVIEW
    request.status = CountryChangeRequestStatus.IN_REVIEW;
    await requestRepo.save(request);

    // Log Activity
    await AppDataSource.getRepository(CountryActivity).save({
      countryId: request.countryId,
      stateId: request.stateId ?? null,
      requestId: request.id,
      actorId: assignedByUserId,
      actorType: ActorType.USER,
      eventType: CountryActivityType.REVIEWER_ASSIGNED,
      title: `Reviewer Assigned to ${request.requestNumber}`,
      description: `Assigned review to ${reviewer.name}.`,
      metadata: { reviewerId, reviewerName: reviewer.name },
      ipAddress: reqMeta?.ipAddress ?? null,
      userAgent: reqMeta?.userAgent ?? null,
    });

    return assignment;
  }

  /**
   * Adds a comment to a change request
   */
  public static async addComment(requestId: string, authorId: string, dto: AddCommentInput) {
    const requestRepo = AppDataSource.getRepository(CountryChangeRequest);
    const commentRepo = AppDataSource.getRepository(CountryChangeRequestComment);

    const request = await requestRepo.findOneBy({ id: requestId });
    if (!request) {
      throw new AppError(
        'Change request not found',
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }

    const comment = commentRepo.create({
      requestId,
      authorId,
      type: dto.type,
      content: dto.content,
    });
    const savedComment = await commentRepo.save(comment);

    // Log Activity
    await AppDataSource.getRepository(CountryActivity).save({
      countryId: request.countryId,
      stateId: request.stateId ?? null,
      requestId: request.id,
      actorId: authorId,
      actorType: ActorType.USER,
      eventType: CountryActivityType.COMMENT_ADDED,
      title: `Comment added to ${request.requestNumber}`,
      description: dto.content.substring(0, 100),
      metadata: { commentId: savedComment.id, commentType: dto.type },
    });

    return savedComment;
  }

  /**
   * Reviews (Approve or Reject) a Change Request with atomic transaction and optimistic locking
   */
  public static async reviewChangeRequest(
    requestId: string,
    reviewerUserId: string,
    dto: ReviewChangeRequestInput,
    reqMeta?: { ipAddress?: string | undefined; userAgent?: string | undefined },
  ) {
    // eslint-disable-next-line sonarjs/cognitive-complexity
    return await AppDataSource.transaction(async (transactionalEntityManager) => {
      const requestRepo = transactionalEntityManager.getRepository(CountryChangeRequest);
      const assignmentRepo = transactionalEntityManager.getRepository(
        CountryChangeRequestAssignment,
      );
      const countryRepo = transactionalEntityManager.getRepository(Country);
      const stateRepo = transactionalEntityManager.getRepository(State);
      const activityRepo = transactionalEntityManager.getRepository(CountryActivity);

      const request = await requestRepo.findOne({
        where: { id: requestId },
        relations: {
          country: true,
          state: true,
        },
      });

      if (!request) {
        throw new AppError(
          'Change request not found',
          HttpStatusCode.NOT_FOUND,
          AppErrorCode.NOT_FOUND,
        );
      }

      if (
        request.status === CountryChangeRequestStatus.APPROVED ||
        request.status === CountryChangeRequestStatus.REJECTED ||
        request.status === CountryChangeRequestStatus.CANCELLED
      ) {
        throw new AppError(
          'Change request is already closed',
          HttpStatusCode.BAD_REQUEST,
          AppErrorCode.INVALID_STATUS,
        );
      }

      // Mark reviewer assignment as COMPLETED
      await assignmentRepo.update(
        { requestId, reviewerId: reviewerUserId, status: CountryAssignmentStatus.PENDING },
        { status: CountryAssignmentStatus.COMPLETED, respondedAt: new Date() },
      );

      if (dto.action === 'APPROVE') {
        const isActivate = request.action === CountryChangeRequestAction.ACTIVATE;
        const newStatus = isActivate;

        const oldValueObj = {
          isActive: request.state ? request.state.isActive : request.country.isActive,
        };
        const newValueObj = { isActive: newStatus };

        // Update target entity live status
        if (request.targetType === CountryChangeRequestTargetType.COUNTRY) {
          request.country.isActive = newStatus;
          await countryRepo.save(request.country);

          // Handle Configured Cascade on Country Deactivation
          if (!isActivate && request.cascadePolicy.disableStates) {
            await stateRepo.update({ countryId: request.countryId }, { isActive: false });

            // Log Cascade Activity
            await activityRepo.save({
              countryId: request.countryId,
              stateId: null,
              requestId: request.id,
              actorId: reviewerUserId,
              actorType: ActorType.SYSTEM,
              eventType: CountryActivityType.CASCADE_EXECUTED,
              title: 'Cascade Deactivation Executed',
              description: `Disabled states and tenders under country ${request.country.name}.`,
              metadata: { cascadePolicy: request.cascadePolicy },
              ipAddress: reqMeta?.ipAddress ?? null,
              userAgent: reqMeta?.userAgent ?? null,
            });
          }

          // Activity for Country Activation/Deactivation
          await activityRepo.save({
            countryId: request.countryId,
            stateId: null,
            requestId: request.id,
            actorId: reviewerUserId,
            actorType: ActorType.USER,
            eventType: isActivate ? CountryActivityType.ACTIVATED : CountryActivityType.DEACTIVATED,
            title: `Country ${request.country.name} ${isActivate ? 'Activated' : 'Deactivated'}`,
            description: `Production status set to ${isActivate ? 'Active' : 'Inactive'}.`,
            oldValue: oldValueObj,
            newValue: newValueObj,
            metadata: { reason: request.reason, comment: dto.comment ?? null },
            ipAddress: reqMeta?.ipAddress ?? null,
            userAgent: reqMeta?.userAgent ?? null,
          });
        } else if (request.state) {
          request.state.isActive = newStatus;
          await stateRepo.save(request.state);

          await activityRepo.save({
            countryId: request.countryId,
            stateId: request.state.id,
            requestId: request.id,
            actorId: reviewerUserId,
            actorType: ActorType.USER,
            eventType: isActivate ? CountryActivityType.ACTIVATED : CountryActivityType.DEACTIVATED,
            title: `State ${request.state.name} ${isActivate ? 'Activated' : 'Deactivated'}`,
            description: `Production status set to ${isActivate ? 'Active' : 'Inactive'}.`,
            oldValue: oldValueObj,
            newValue: newValueObj,
            metadata: { reason: request.reason, comment: dto.comment ?? null },
            ipAddress: reqMeta?.ipAddress ?? null,
            userAgent: reqMeta?.userAgent ?? null,
          });
        }

        request.status = CountryChangeRequestStatus.APPROVED;
        await requestRepo.save(request);

        // Activity for Request Approval
        await activityRepo.save({
          countryId: request.countryId,
          stateId: request.stateId ?? null,
          requestId: request.id,
          actorId: reviewerUserId,
          actorType: ActorType.USER,
          eventType: CountryActivityType.APPROVED,
          title: `Change Request ${request.requestNumber} Approved`,
          description: dto.comment ?? 'Approved request',
          oldValue: { status: request.status },
          newValue: { status: CountryChangeRequestStatus.APPROVED },
          metadata: { comment: dto.comment ?? null },
          ipAddress: reqMeta?.ipAddress ?? null,
          userAgent: reqMeta?.userAgent ?? null,
        });
      } else {
        // REJECT
        request.status = CountryChangeRequestStatus.REJECTED;
        await requestRepo.save(request);

        await activityRepo.save({
          countryId: request.countryId,
          stateId: request.stateId ?? null,
          requestId: request.id,
          actorId: reviewerUserId,
          actorType: ActorType.USER,
          eventType: CountryActivityType.REJECTED,
          title: `Change Request ${request.requestNumber} Rejected`,
          description: dto.comment ?? 'Rejected request',
          oldValue: { status: request.status },
          newValue: { status: CountryChangeRequestStatus.REJECTED },
          metadata: { comment: dto.comment ?? null },
          ipAddress: reqMeta?.ipAddress ?? null,
          userAgent: reqMeta?.userAgent ?? null,
        });
      }

      return request;
    });
  }

  /**
   * Retrieves Jira-style Change Request Queue
   */
  public static async getReviewsQueue(
    userId: string,
    filter: 'assigned' | 'pending' | 'approved' | 'rejected' | 'all' = 'all',
    page = 1,
    limit = 20,
  ) {
    const requestRepo = AppDataSource.getRepository(CountryChangeRequest);

    const qb = requestRepo
      .createQueryBuilder('req')
      .innerJoinAndSelect('req.country', 'country')
      .leftJoinAndSelect('req.state', 'state')
      .innerJoinAndSelect('req.requestedBy', 'requestedBy')
      .leftJoinAndSelect('req.assignments', 'assignment')
      .leftJoinAndSelect('assignment.reviewer', 'reviewer')
      .orderBy('req.createdAt', 'DESC');

    if (filter === 'assigned') {
      qb.andWhere('assignment.reviewerId = :userId', { userId }).andWhere(
        'assignment.status = :aStatus',
        {
          aStatus: CountryAssignmentStatus.PENDING,
        },
      );
    } else if (filter === 'pending') {
      qb.andWhere('req.status IN (:...statuses)', {
        statuses: [
          CountryChangeRequestStatus.READY_FOR_REVIEW,
          CountryChangeRequestStatus.IN_REVIEW,
        ],
      });
    } else if (filter === 'approved') {
      qb.andWhere('req.status = :status', { status: CountryChangeRequestStatus.APPROVED });
    } else if (filter === 'rejected') {
      qb.andWhere('req.status = :status', { status: CountryChangeRequestStatus.REJECTED });
    }

    const totalItems = await qb.getCount();
    const requests = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: requests.map((r) => {
        const pendingAssign = r.assignments.find(
          (a) => a.status === CountryAssignmentStatus.PENDING,
        );
        return {
          id: r.id,
          requestNumber: r.requestNumber,
          targetType: r.targetType,
          countryId: r.countryId,
          countryName: r.country.name,
          stateId: r.stateId,
          stateName: r.state?.name,
          action: r.action,
          status: r.status,
          reason: r.reason,
          requestedBy: {
            id: r.requestedBy.id,
            fullName: r.requestedBy.name,
            avatarUrl: r.requestedBy.avatarUrl,
          },
          assignedReviewer: pendingAssign
            ? {
                id: pendingAssign.reviewer.id,
                fullName: pendingAssign.reviewer.name,
                avatarUrl: pendingAssign.reviewer.avatarUrl,
              }
            : null,
          cascadePolicy: r.cascadePolicy,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      }),
      meta: {
        totalItems,
        itemCount: requests.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  /**
   * Fetches single change request detail with comments and dependency matrix
   */
  public static async getChangeRequestDetails(requestId: string) {
    const requestRepo = AppDataSource.getRepository(CountryChangeRequest);

    const request = await requestRepo.findOne({
      where: { id: requestId },
      relations: {
        country: true,
        state: true,
        requestedBy: true,

        assignments: {
          reviewer: true,
        },

        comments: {
          author: true,
        },
      },
      order: { comments: { createdAt: 'ASC' } },
    });

    if (!request) {
      throw new AppError(
        'Change request not found',
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }

    const dependencyMatrix = await CountryDependencyService.getDependencyMatrix(
      request.targetType,
      request.countryId,
      request.stateId,
    );

    return {
      ...request,
      dependencyMatrix,
    };
  }

  /**
   * Retrieves chronological Country Lifecycle Timeline
   */
  public static async getCountryTimeline(countryId: string, stateId?: string | null) {
    const activityRepo = AppDataSource.getRepository(CountryActivity);

    const whereCondition: Record<string, unknown> = { countryId };
    if (stateId) {
      whereCondition.stateId = stateId;
    }

    return await activityRepo.find({
      where: whereCondition,
      relations: {
        actor: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Retrieves Request Workflow Timeline
   */
  public static async getRequestTimeline(requestId: string) {
    const activityRepo = AppDataSource.getRepository(CountryActivity);

    return await activityRepo.find({
      where: { requestId },
      relations: {
        actor: true,
      },
      order: { createdAt: 'ASC' },
    });
  }

  public static async listAllStates(
    query: Partial<StateQueryDto> = {},
  ): Promise<{ states: State[]; total: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.stateRepo
      .createQueryBuilder('state')
      .leftJoinAndSelect('state.country', 'country');

    if (query.code !== undefined && query.code !== '') {
      qb.andWhere('state.code = :code', { code: query.code });
    }

    if (query.slug !== undefined && query.slug !== '') {
      qb.andWhere('state.slug = :slug', { slug: query.slug });
    }

    if (query.type !== undefined) {
      qb.andWhere('state.type = :type', { type: query.type });
    }

    if (query.countryId !== undefined) {
      qb.andWhere('state.countryId = :countryId', { countryId: query.countryId });
    }

    if (query.countryCode !== undefined && query.countryCode !== '') {
      qb.andWhere('country.code = :countryCode', { countryCode: query.countryCode.toUpperCase() });
    }

    if (query.search !== undefined && query.search !== '') {
      const searchPattern = `%${query.search}%`;
      qb.andWhere(
        '(state.name ILike :pattern OR state.code ILike :pattern OR country.name ILike :pattern OR country.code ILike :pattern)',
        { pattern: searchPattern },
      );
    }

    qb.orderBy('state.code', 'ASC').skip(skip).take(limit);

    const [states, total] = await qb.getManyAndCount();
    return { states, total };
  }

  public static async listDistinctCountries(): Promise<
    { countryId: string; countryName: string; countryCode: string }[]
  > {
    const result = await this.countryRepo.find({
      select: {
        id: true,
        name: true,
        code: true,
      },
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return result.map((c) => ({
      countryId: c.id,
      countryName: c.name,
      countryCode: c.code,
    }));
  }

  public static async getStateById(id: string): Promise<State> {
    const state = await this.stateRepo.findOne({
      where: { id },
      relations: {
        country: true,
      },
    });
    if (!state) {
      throw new AppError(
        AppErrorMessage.STATE_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }
    return state;
  }

  public static async getCountryById(id: string): Promise<Country> {
    const country = await this.countryRepo.findOne({ where: { id } });
    if (!country) {
      throw new AppError(
        AppErrorMessage.COUNTRY_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    }
    return country;
  }

  public static async updateState(
    id: string,
    dto: UpdateStateDto,
    adminId?: string,
  ): Promise<State> {
    const state = await this.getStateById(id);
    state.isActive = dto.isActive;
    if (adminId) {
      state.updatedById = adminId;
    }
    return await this.stateRepo.save(state);
  }

  public static async updateCountry(
    id: string,
    dto: UpdateCountryBodyDto,
    adminId?: string,
  ): Promise<Country> {
    const country = await this.getCountryById(id);
    country.isActive = dto.isActive;
    if (adminId) {
      country.updatedById = adminId;
    }
    return await this.countryRepo.save(country);
  }
}
