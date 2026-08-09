import { AppDataSource } from '../../config/database';
import { logger } from '../../config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '../../core/AppError';
import { DownloadHistory } from '../../database/entities/DownloadHistory';
import { EvaluationTemplate } from '../../database/entities/EvaluationTemplate';
import { Tender } from '../../database/entities/Tender';
import { TenderAmendment } from '../../database/entities/TenderAmendment';
import { TenderClarification } from '../../database/entities/TenderClarification';
import { TenderCommittee } from '../../database/entities/TenderCommittee';
import { TenderDocument } from '../../database/entities/TenderDocument';
import { TenderEvaluation } from '../../database/entities/TenderEvaluation';
import { TenderInvitation } from '../../database/entities/TenderInvitation';
import { TenderParticipant } from '../../database/entities/TenderParticipant';
import { TenderQuestion } from '../../database/entities/TenderQuestion';
import { TenderReview } from '../../database/entities/TenderReview';
import { TenderReviewAssignment } from '../../database/entities/TenderReviewAssignment';
import { TenderReviewComment } from '../../database/entities/TenderReviewComment';
import { TenderTemplate } from '../../database/entities/TenderTemplate';
import { TenderVersion } from '../../database/entities/TenderVersion';
import { TenderWatcher } from '../../database/entities/TenderWatcher';
import { deleteFile, generateDownloadUrl } from '../../services/s3.service';
import {
  TenderLifecycleStatus,
  TenderPublicationStatus,
  TenderVersionStatus,
} from '../../types/enums';
import { hasAccessToTender } from '../../utils/access';
import { domainEvents, TENDER_EVENTS } from '../../utils/domainEvents';

import { TenderWorkflowService } from './TenderWorkflowService';

import type {
  AnswerQuestionDto,
  AssignReviewerDto,
  CreateAmendmentDto,
  CreateClarificationDto,
  CreateQuestionDto,
  CreateTenderDto,
  RegisterDocumentDto,
  SubmitEvaluationDto,
  SubmitReviewCommentDto,
  TenderCommitteeDto,
  TenderInvitationDto,
  TenderSearchQueryDto,
  TenderTemplateDto,
  TenderWatcherDto,
  UpdateTenderDto,
  UpdateTenderStatusDto,
} from './tenders.dto';
import type { Request } from 'express';
import type { DeepPartial, SelectQueryBuilder } from 'typeorm';

const tenderRepository = AppDataSource.getRepository(Tender);
const tenderVersionRepository = AppDataSource.getRepository(TenderVersion);
const tenderDocumentRepository = AppDataSource.getRepository(TenderDocument);
const tenderReviewRepository = AppDataSource.getRepository(TenderReview);
const tenderReviewAssignmentRepository = AppDataSource.getRepository(TenderReviewAssignment);
const tenderReviewCommentRepository = AppDataSource.getRepository(TenderReviewComment);
const tenderCommitteeRepository = AppDataSource.getRepository(TenderCommittee);
const tenderParticipantRepository = AppDataSource.getRepository(TenderParticipant);
const tenderEvaluationRepository = AppDataSource.getRepository(TenderEvaluation);
const tenderWatcherRepository = AppDataSource.getRepository(TenderWatcher);
const tenderInvitationRepository = AppDataSource.getRepository(TenderInvitation);
const tenderTemplateRepository = AppDataSource.getRepository(TenderTemplate);
const tenderQuestionRepository = AppDataSource.getRepository(TenderQuestion);
const tenderClarificationRepository = AppDataSource.getRepository(TenderClarification);
const tenderAmendmentRepository = AppDataSource.getRepository(TenderAmendment);
const downloadHistoryRepository = AppDataSource.getRepository(DownloadHistory);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function removeUndefined<T extends object>(obj: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  const result = { ...obj };
  (Object.keys(result) as Array<keyof T>).forEach((key) => {
    if (result[key] === undefined) {
      delete result[key];
    }
  });
  return result as { [K in keyof T]: Exclude<T[K], undefined> };
}

function getVal<T>(val: T | null | undefined, fallback: T): T {
  if (val === null || val === undefined) {
    return fallback;
  }
  return val;
}

function applyTenderFilters(qb: SelectQueryBuilder<Tender>, params: TenderSearchQueryDto): void {
  if (params.q) {
    qb.andWhere(
      '(activeVersion.title ILIKE :q OR activeVersion.description ILIKE :q OR tender.referenceNo ILIKE :q)',
      {
        q: `%${params.q}%`,
      },
    );
  }

  if (params.categoryId) {
    qb.andWhere('activeVersion.categoryId = :categoryId', { categoryId: params.categoryId });
  }

  if (params.stateId) {
    qb.andWhere('activeVersion.stateId = :stateId', { stateId: params.stateId });
  }

  if (params.priority) {
    qb.andWhere('activeVersion.priority = :priority', { priority: params.priority });
  }

  if (params.procurementType) {
    qb.andWhere('activeVersion.procurementType = :procurementType', {
      procurementType: params.procurementType,
    });
  }

  if (params.budgetMin) {
    qb.andWhere('activeVersion.estimatedBudget >= :budgetMin', { budgetMin: params.budgetMin });
  }

  if (params.budgetMax) {
    qb.andWhere('activeVersion.estimatedBudget <= :budgetMax', { budgetMax: params.budgetMax });
  }
}

function mapTenderSummary(t: Tender) {
  const active = t.activeVersion;
  if (!active) {
    return {
      id: t.id,
      referenceNumber: t.referenceNo,
      title: 'No Title Available',
      description: '',
      procurementType: '',
      priority: 'Medium',
      budgetMax: 0,
      currency: 'USD',
      openingDate: null,
      closingDate: null,
      status: t.publicationStatus,
      category: null,
      state: null,
    };
  }

  return {
    id: t.id,
    referenceNumber: t.referenceNo,
    title: getVal(active.title, 'No Title Available'),
    description: getVal(active.description, ''),
    procurementType: getVal(active.procurementType, ''),
    priority: getVal(active.priority, 'Medium'),
    budgetMax: getVal(active.estimatedBudget, 0),
    currency: getVal(active.currency, 'USD'),
    openingDate: getVal(active.openingDate, null),
    closingDate: getVal(active.closingDate, null),
    status: t.publicationStatus,
    category: getVal(active.category, null),
    state: getVal(active.state, null),
  };
}

function mapTenderDetails(tender: Tender, hasAccess: boolean) {
  const active = tender.activeVersion;
  if (!active) {
    return {
      id: tender.id,
      referenceNumber: tender.referenceNo,
      status: tender.status,
      publicationStatus: tender.publicationStatus,
      title: '',
      description: '',
      procurementType: '',
      priority: 'Medium',
      budgetMax: 0,
      currency: 'USD',
      department: '',
      formattedAddress: '',
      siteVisitRequired: false,
      siteVisitDate: null,
      siteVisitInstructions: '',
      contactPerson: null,
      contactEmail: null,
      contactPhone: null,
      openingDate: null,
      closingDate: null,
      projectDuration: '',
      bidValidity: 0,
      emdAmount: 0,
      securityDeposit: 0,
      paymentTerms: '',
      evaluationMethod: '',
      submissionMethod: '',
      contractType: '',
      procurementMethod: '',
      eligibility: '',
      specialConditions: '',
      category: null,
      state: null,
      documents: [],
      clarifications: tender.clarifications,
      amendments: tender.amendments,
    };
  }

  let contactPerson = null;
  let contactEmail = null;
  let contactPhone = null;

  if (hasAccess) {
    contactPerson = getVal(active.contactPerson, null);
    contactEmail = getVal(active.contactEmail, null);
    contactPhone = getVal(active.contactPhone, null);
  }

  const documents = getVal(active.documents, [] as TenderDocument[]);
  const filteredDocs = [];
  for (const doc of documents) {
    const { isPublic } = doc;
    const include = isPublic || hasAccess;
    if (include) {
      filteredDocs.push({
        id: doc.id,
        documentType: doc.documentType,
        originalName: doc.documentOriginalName,
        fileSize: doc.fileSize,
        virusScanStatus: doc.virusScanStatus,
        uploadedAt: doc.uploadedAt,
      });
    }
  }

  return {
    id: tender.id,
    referenceNumber: tender.referenceNo,
    status: tender.status,
    publicationStatus: tender.publicationStatus,
    title: getVal(active.title, ''),
    description: getVal(active.description, ''),
    procurementType: getVal(active.procurementType, ''),
    priority: getVal(active.priority, 'Medium'),
    budgetMax: getVal(active.estimatedBudget, 0),
    currency: getVal(active.currency, 'USD'),
    department: getVal(active.department, ''),
    formattedAddress: getVal(active.formattedAddress, ''),
    siteVisitRequired: getVal(active.siteVisitRequired, false),
    siteVisitDate: getVal(active.siteVisitDate, null),
    siteVisitInstructions: getVal(active.siteVisitInstructions, ''),
    contactPerson,
    contactEmail,
    contactPhone,
    openingDate: getVal(active.openingDate, null),
    closingDate: getVal(active.closingDate, null),
    projectDuration: getVal(active.projectDuration, ''),
    bidValidity: getVal(active.bidValidity, 0),
    emdAmount: getVal(active.emdAmount, 0),
    securityDeposit: getVal(active.securityDeposit, 0),
    paymentTerms: getVal(active.paymentTerms, ''),
    evaluationMethod: getVal(active.evaluationMethod, ''),
    submissionMethod: getVal(active.submissionMethod, ''),
    contractType: getVal(active.contractType, ''),
    procurementMethod: getVal(active.procurementMethod, ''),
    eligibility: getVal(active.eligibilityCriteria, ''),
    specialConditions: getVal(active.specialConditions, ''),
    category: getVal(active.category, null),
    state: getVal(active.state, null),
    documents: filteredDocs,
    clarifications: tender.clarifications,
    amendments: tender.amendments,
  };
}

// ─── Public: List Tenders ─────────────────────────────────────────────────────

export async function listTenders(params: TenderSearchQueryDto) {
  const page = getVal(params.page, 1);
  const limit = getVal(params.limit, 20);

  const qb = tenderRepository
    .createQueryBuilder('tender')
    .leftJoinAndSelect('tender.activeVersion', 'activeVersion')
    .leftJoinAndSelect('activeVersion.category', 'category')
    .leftJoinAndSelect('activeVersion.state', 'state')
    .where('tender.status = :status', { status: TenderLifecycleStatus.ACTIVE })
    .andWhere('tender.publicationStatus = :pubStatus', {
      pubStatus: TenderPublicationStatus.PUBLISHED,
    });

  applyTenderFilters(qb, params);

  const sortField = params.sort ? `activeVersion.${params.sort}` : 'tender.createdAt';
  const sortOrder = getVal(params.order, 'DESC');
  qb.orderBy(sortField, sortOrder);

  qb.skip((page - 1) * limit).take(limit);

  const [tenders, total] = await qb.getManyAndCount();

  const mapped = tenders.map(mapTenderSummary);

  return { tenders: mapped, total, page, limit };
}

// ─── Public: Get Tender by Slug ───────────────────────────────────────────────

export async function getTenderBySlug(slug: string, userId?: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const qb = tenderRepository
    .createQueryBuilder('tender')
    .leftJoinAndSelect('tender.activeVersion', 'activeVersion')
    .leftJoinAndSelect('activeVersion.category', 'category')
    .leftJoinAndSelect('activeVersion.state', 'state')
    .leftJoinAndSelect('activeVersion.documents', 'documents')
    .leftJoinAndSelect('tender.clarifications', 'clarifications')
    .leftJoinAndSelect('tender.amendments', 'amendments');

  if (isUuid) {
    qb.where('tender.id = :slug', { slug });
  } else {
    qb.where('tender.referenceNo = :slug', { slug });
  }

  const tender = await qb.getOne();

  if (!tender) {
    throw new AppError(
      AppErrorMessage.TENDER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  let hasAccess = false;
  if (userId) {
    hasAccess = await hasAccessToTender(userId, tender.id);
  }

  const mapped = mapTenderDetails(tender, hasAccess);

  return { tender: mapped, hasAccess };
}

// ─── Get Download URL ─────────────────────────────────────────────────────────

export async function getDownloadUrl(
  documentId: string,
  userId: string,
  req: Request,
): Promise<string> {
  const doc = await tenderDocumentRepository.findOne({
    where: { id: documentId },
    relations: {
      tenderVersion: {
        tender: true,
      },
    },
  });

  if (!doc) {
    throw new AppError(
      AppErrorMessage.DOCUMENT_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const { tenderId } = doc.tenderVersion;

  const allowed = await hasAccessToTender(userId, tenderId);
  if (!allowed && !doc.isPublic) {
    throw new AppError(
      AppErrorMessage.ACCESS_DENIED_SUBSCRIPTION,
      HttpStatusCode.FORBIDDEN,
      AppErrorCode.ACCESS_DENIED,
    );
  }

  const url = await generateDownloadUrl(doc.documentS3Key, doc.documentOriginalName);

  // Increment download counter
  doc.downloadCount += 1;
  await tenderDocumentRepository.save(doc);

  // Log download history (non-blocking)
  setImmediate(() => {
    downloadHistoryRepository
      .save({
        userId,
        tenderId,
        fileName: doc.documentOriginalName,
        ipAddress: req.ip ?? null,
      })
      .catch(() => {
        /* silent */
      });
  });

  return url;
}

// ─── Admin: Create Tender ─────────────────────────────────────────────────────

export async function createTender(dto: CreateTenderDto, createdById: string): Promise<Tender> {
  // Generate sequence reference number safely
  let seqNumber = Math.floor(100000 + Math.random() * 900000);
  try {
    await AppDataSource.query('CREATE SEQUENCE IF NOT EXISTS tender_ref_seq START WITH 1000');
    const seqRes = await AppDataSource.query("SELECT nextval('tender_ref_seq') as nextval");
    if (seqRes[0].nextval) {
      seqNumber = parseInt(seqRes[0].nextval, 10);
    }
  } catch (seqErr) {
    logger.warn(
      { err: seqErr },
      'Could not query tender_ref_seq — using random reference sequence fallback',
    );
  }
  const referenceNo = `TDR-${new Date().getFullYear()}-${String(seqNumber).padStart(6, '0')}`;

  const tender = tenderRepository.create({
    referenceNo,
    createdById,
    status: TenderLifecycleStatus.ACTIVE,
    publicationStatus: TenderPublicationStatus.UNPUBLISHED,
  });

  const savedTender = await tenderRepository.save(tender);

  const { templateId, ...versionFields } = dto;

  const versionData = {
    ...versionFields,
    tenderId: savedTender.id,
    version: 1,
    status: TenderVersionStatus.DRAFT,
    createdById,
    siteVisitDate: dto.siteVisitDate
      ? new Date(dto.siteVisitDate)
      : dto.siteVisitDate === null
        ? null
        : undefined,
    openingDate: dto.openingDate
      ? new Date(dto.openingDate)
      : dto.openingDate === null
        ? null
        : undefined,
    closingDate: dto.closingDate
      ? new Date(dto.closingDate)
      : dto.closingDate === null
        ? null
        : undefined,
  };

  const version = tenderVersionRepository.create(
    removeUndefined(versionData) as DeepPartial<TenderVersion>,
  );

  const savedVersion = await tenderVersionRepository.save(version);

  savedTender.activeVersionId = savedVersion.id;
  await tenderRepository.save(savedTender);

  return savedTender;
}

// ─── Admin: Update Tender ─────────────────────────────────────────────────────

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function updateTender(
  id: string,
  dto: UpdateTenderDto,
  createdById: string,
): Promise<Tender> {
  const tender = await tenderRepository.findOne({
    where: { id },
    relations: {
      activeVersion: true,
    },
  });

  if (!tender) {
    throw new AppError(
      AppErrorMessage.TENDER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const active = tender.activeVersion;
  if (!active) {
    throw new AppError(
      AppErrorMessage.NO_ACTIVE_VERSION,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NO_ACTIVE_VERSION,
    );
  }

  // Concurrency Check (Optimistic Locking)
  if (dto.dbVersion !== undefined && active.dbVersion !== dto.dbVersion) {
    throw new AppError(
      AppErrorMessage.TENDER_CONFLICT_MODIFIED,
      HttpStatusCode.CONFLICT,
      AppErrorCode.CONCURRENCY_CONFLICT,
    );
  }

  // If the active version is not in DRAFT mode, we must spawn a new version draft
  if (active.status !== TenderVersionStatus.DRAFT) {
    const nextVerNum = active.version + 1;
    const {
      id: _oldId,
      createdAt: _oldCreatedAt,
      tender: _tenderRelation,
      category: _categoryRelation,
      state: _stateRelation,
      documents: _docsRelation,
      reviews: _reviewsRelation,
      ...activeFields
    } = active;

    const newVersionData = {
      ...activeFields,
      ...dto,
      version: nextVerNum,
      status: TenderVersionStatus.DRAFT,
      createdById,
      siteVisitDate: dto.siteVisitDate
        ? new Date(dto.siteVisitDate)
        : dto.siteVisitDate === null
          ? null
          : active.siteVisitDate,
      openingDate: dto.openingDate
        ? new Date(dto.openingDate)
        : dto.openingDate === null
          ? null
          : active.openingDate,
      closingDate: dto.closingDate
        ? new Date(dto.closingDate)
        : dto.closingDate === null
          ? null
          : active.closingDate,
    };

    const newVersion = tenderVersionRepository.create(
      removeUndefined(newVersionData) as DeepPartial<TenderVersion>,
    );

    const savedVersion = await tenderVersionRepository.save(newVersion);

    // Copy documents to new version
    const docs = await tenderDocumentRepository.find({ where: { tenderVersionId: active.id } });
    for (const d of docs) {
      const { id: _id, ...docData } = d;
      const copiedDoc = tenderDocumentRepository.create({
        ...docData,
        tenderVersionId: savedVersion.id,
      });
      await tenderDocumentRepository.save(copiedDoc);
    }

    tender.activeVersionId = savedVersion.id;
    await tenderRepository.save(tender);

    return tender;
  }

  // Otherwise, we edit the existing draft version
  Object.assign(active, dto);
  await tenderVersionRepository.save(active);

  return tender;
}

export async function updateTenderBasicInfo(
  id: string,
  dto: Partial<UpdateTenderDto>,
  actorId: string,
): Promise<Tender> {
  return updateTender(id, dto, actorId);
}

export async function updateTenderLocation(
  id: string,
  dto: Partial<UpdateTenderDto>,
  actorId: string,
): Promise<Tender> {
  return updateTender(id, dto, actorId);
}

export async function updateTenderCommercial(
  id: string,
  dto: Partial<UpdateTenderDto>,
  actorId: string,
): Promise<Tender> {
  return updateTender(id, dto, actorId);
}

export async function updateTenderSchedule(
  id: string,
  dto: Partial<UpdateTenderDto>,
  actorId: string,
): Promise<Tender> {
  return updateTender(id, dto, actorId);
}

export async function getTenderCompletionStatus(id: string) {
  const tender = await tenderRepository.findOne({
    where: { id },
    relations: {
      activeVersion: true,
    },
  });

  if (!tender?.activeVersion) {
    throw new AppError(
      AppErrorMessage.TENDER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const docsCount = await tenderDocumentRepository.count({
    where: { tenderVersionId: tender.activeVersion.id },
  });

  const ver = tender.activeVersion;
  const basicInfo = Boolean(ver.title && ver.categoryId && ver.procurementType);
  const location = Boolean(ver.placeId ?? ver.formattedAddress ?? ver.stateId);
  const commercial = Boolean(ver.estimatedBudget && ver.paymentTerms);
  const schedule = Boolean(ver.openingDate && ver.closingDate);
  const documents = docsCount > 0;

  const steps = [basicInfo, location, commercial, schedule, documents];
  const completedCount = steps.filter(Boolean).length;
  const percentage = Math.round((completedCount / steps.length) * 100);

  return {
    percentage,
    completedSteps: {
      basicInfo,
      location,
      commercial,
      schedule,
      documents,
    },
  };
}

// ─── Admin: Update Status ─────────────────────────────────────────────────────

export async function updateTenderStatus(
  id: string,
  dto: UpdateTenderStatusDto,
  actorId: string,
): Promise<Tender> {
  const tender = await tenderRepository.findOne({
    where: { id },
    relations: {
      activeVersion: true,
    },
  });

  if (!tender) {
    throw new AppError(
      AppErrorMessage.TENDER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const computed = TenderWorkflowService.computeStateTransition(
    tender,
    dto.publicationStatus,
    dto.status,
  );

  tender.publicationStatus = computed.publicationStatus;
  tender.biddingStatus = computed.biddingStatus;
  tender.processStatus = computed.processStatus;

  if (computed.versionStatus && tender.activeVersion) {
    tender.activeVersion.status = computed.versionStatus;
    await tenderVersionRepository.save(tender.activeVersion);
  }

  const savedTender = await tenderRepository.save(tender);

  // Dispatch decoupled domain events
  if (dto.status === TenderVersionStatus.SUBMITTED) {
    domainEvents.dispatch(TENDER_EVENTS.SUBMITTED, { tender: savedTender, actorId });
  } else if (dto.status === TenderVersionStatus.APPROVED) {
    domainEvents.dispatch(TENDER_EVENTS.APPROVED, { tender: savedTender, actorId });
  }

  return savedTender;
}

// ─── Admin: Statistics aggregations ──────────────────────────────────────────

export async function getTenderStatistics(): Promise<{
  totalTenders: number;
  draftCount: number;
  reviewCount: number;
  publishedCount: number;
  sumBudget: number;
  totalBudget: number;
  totalParticipants: number;
}> {
  const totalTenders = await tenderRepository.count();
  const draftCount = await tenderVersionRepository.count({
    where: { status: TenderVersionStatus.DRAFT },
  });
  const reviewCount = await tenderVersionRepository.count({
    where: { status: TenderVersionStatus.UNDER_REVIEW },
  });
  const publishedCount = await tenderRepository.count({
    where: { publicationStatus: TenderPublicationStatus.PUBLISHED },
  });

  const sumBudget = await tenderVersionRepository
    .createQueryBuilder('tv')
    .select('SUM(tv.estimated_budget)', 'sum')
    .getRawOne();

  const totalParticipants = await tenderParticipantRepository.count();

  return {
    totalTenders,
    draftCount,
    reviewCount,
    publishedCount,
    totalBudget: parseInt(sumBudget?.sum ?? '0', 10),
    totalParticipants,
    sumBudget,
  };
}

// ─── Document Upload Registration ─────────────────────────────────────────────

export async function registerDocument(
  tenderId: string,
  dto: RegisterDocumentDto,
  userId: string,
): Promise<TenderDocument> {
  const tender = await tenderRepository.findOne({
    where: { id: tenderId },
    relations: {
      activeVersion: true,
    },
  });

  if (!tender?.activeVersion) {
    throw new AppError(
      AppErrorMessage.TENDER_ACTIVE_VERSION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const doc = tenderDocumentRepository.create({
    tenderVersionId: tender.activeVersion.id,
    documentType: dto.documentType,
    documentS3Key: dto.s3Key,
    documentS3Bucket: dto.bucket,
    documentOriginalName: dto.originalName,
    mimeType: dto.mimeType ?? 'application/pdf',
    fileSize: dto.fileSize ?? 0,
    checksum: dto.checksum ?? null,
    virusScanStatus: 'Scanning', // Initiate scan state
    isPublic: dto.isPublic,
    uploadedById: userId,
  });

  const saved = await tenderDocumentRepository.save(doc);

  // Stub background virus scanner simulation
  setImmediate(() => {
    setTimeout(async () => {
      saved.virusScanStatus = 'Clean';
      await tenderDocumentRepository.save(saved);
      logger.info({ docId: saved.id }, 'Mock malware virus scan complete: CLEAN');
    }, 5000);
  });

  return saved;
}

export async function getTenderDocuments(tenderId: string): Promise<TenderDocument[]> {
  const tender = await tenderRepository.findOne({
    where: { id: tenderId },
    relations: {
      activeVersion: true,
    },
  });

  if (!tender?.activeVersion) {
    return [];
  }

  return tenderDocumentRepository.find({
    where: { tenderVersionId: tender.activeVersion.id },
    order: { uploadedAt: 'DESC' },
  });
}

export async function deleteDocument(docId: string): Promise<void> {
  const doc = await tenderDocumentRepository.findOne({ where: { id: docId } });
  if (doc) {
    if (doc.documentS3Key) {
      try {
        await deleteFile(doc.documentS3Key);
      } catch (err) {
        logger.warn(
          { docId, s3Key: doc.documentS3Key, err },
          'Failed to delete S3 file on document removal',
        );
      }
    }
    await tenderDocumentRepository.remove(doc);
  }
}

// ─── Question & Answers ───────────────────────────────────────────────────────

export async function askQuestion(
  tenderId: string,
  dto: CreateQuestionDto,
  vendorId: string,
): Promise<TenderQuestion> {
  const question = tenderQuestionRepository.create({
    tenderId,
    vendorId,
    questionText: dto.questionText,
    isPublic: false,
  });

  return tenderQuestionRepository.save(question);
}

export async function answerQuestion(
  questionId: string,
  dto: AnswerQuestionDto,
  answeredById: string,
): Promise<TenderQuestion> {
  const question = await tenderQuestionRepository.findOne({ where: { id: questionId } });
  if (!question) {
    throw new AppError(
      AppErrorMessage.QUESTION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  question.answerText = dto.answerText;
  question.isPublic = dto.isPublic;
  question.answeredById = answeredById;
  question.answeredAt = new Date();

  return tenderQuestionRepository.save(question);
}

// ─── Clarifications ─────────────────────────────────────────────────────────

export async function createClarification(
  tenderId: string,
  dto: CreateClarificationDto,
  createdById: string,
): Promise<TenderClarification> {
  const clar = tenderClarificationRepository.create({
    tenderId,
    title: dto.title,
    description: dto.description,
    createdById,
  });

  return tenderClarificationRepository.save(clar);
}

// ─── Amendments ─────────────────────────────────────────────────────────────

export async function createAmendment(
  tenderId: string,
  dto: CreateAmendmentDto,
  createdById: string,
): Promise<TenderAmendment> {
  const amend = tenderAmendmentRepository.create({
    tenderId,
    amendmentNumber: dto.amendmentNumber,
    changedFields: dto.changedFields,
    publishedById: createdById,
  });

  return tenderAmendmentRepository.save(amend);
}

export async function getTenderVersionDiff(tenderId: string, v1Number: number, v2Number: number) {
  const v1 = await tenderVersionRepository.findOne({
    where: { tenderId, version: v1Number },
  });
  const v2 = await tenderVersionRepository.findOne({
    where: { tenderId, version: v2Number },
  });

  if (!v1 || !v2) {
    throw new AppError(
      'One or both tender versions were not found for comparison',
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  return TenderWorkflowService.compareVersions(v1, v2);
}

// ─── Committee Assignments ───────────────────────────────────────────────────

export async function assignCommitteeMember(
  tenderId: string,
  dto: TenderCommitteeDto,
): Promise<TenderCommittee> {
  const comm = tenderCommitteeRepository.create({
    tenderId,
    userId: dto.userId,
    role: dto.role,
  });

  return tenderCommitteeRepository.save(comm);
}

// ─── Bid Evaluations ──────────────────────────────────────────────────────────

export async function submitEvaluation(
  participantId: string,
  dto: SubmitEvaluationDto,
  evaluatedById: string,
): Promise<TenderEvaluation> {
  const evaluationTemplateRepository = AppDataSource.getRepository(EvaluationTemplate);
  let template = await evaluationTemplateRepository.findOne({ where: { name: dto.criteriaName } });
  if (!template) {
    template = evaluationTemplateRepository.create({
      name: dto.criteriaName,
      description: `Auto-generated template for ${dto.criteriaName}`,
      defaultWeight: dto.weight,
      maxScore: dto.maxScore,
    });
    await evaluationTemplateRepository.save(template);
  }

  const evalRow = tenderEvaluationRepository.create({
    participantId,
    evaluationType: dto.evaluationType,
    evaluationTemplateId: template.id,
    weight: dto.weight,
    score: dto.score,
    maxScore: dto.maxScore,
    passed: dto.passed,
    remarks: dto.remarks ?? null,
    evaluatedById,
  });

  return tenderEvaluationRepository.save(evalRow);
}

export async function submitDraftForReview(
  tenderId: string,
  actorId: string,
): Promise<TenderReview> {
  const tender = await tenderRepository.findOne({
    where: { id: tenderId },
    relations: {
      activeVersion: true,
    },
  });

  if (!tender?.activeVersion) {
    throw new AppError(
      AppErrorMessage.TENDER_ACTIVE_VERSION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  tender.activeVersion.status = TenderVersionStatus.SUBMITTED;
  await tenderVersionRepository.save(tender.activeVersion);

  const review = tenderReviewRepository.create({
    tenderVersionId: tender.activeVersion.id,
    status: 'SUBMITTED',
  });

  const savedReview = await tenderReviewRepository.save(review);
  domainEvents.dispatch(TENDER_EVENTS.SUBMITTED, { tender, actorId });

  return savedReview;
}

export async function getTenderReviews(tenderId: string): Promise<TenderReview[]> {
  const tender = await tenderRepository.findOne({
    where: { id: tenderId },
    relations: {
      activeVersion: true,
    },
  });

  if (!tender?.activeVersion) {
    return [];
  }

  return tenderReviewRepository.find({
    where: { tenderVersionId: tender.activeVersion.id, status: 'REVIEW_ASSIGNED' },
    relations: {
      assignments: {
        reviewer: true,
      },

      comments: {
        author: true,
      },
    },
    order: { createdAt: 'DESC' },
  });
}

export async function assignReviewers(
  tenderId: string,
  dto: AssignReviewerDto,
): Promise<TenderReview> {
  const tender = await tenderRepository.findOne({
    where: { id: tenderId },
    relations: {
      activeVersion: true,
    },
  });

  if (!tender?.activeVersion) {
    throw new AppError(
      AppErrorMessage.TENDER_ACTIVE_VERSION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  let review = await tenderReviewRepository.findOne({
    where: { tenderVersionId: tender.activeVersion.id },
    order: { createdAt: 'DESC' },
  });

  if (!review) {
    review = tenderReviewRepository.create({
      tenderVersionId: tender.activeVersion.id,
      status: 'REVIEW_ASSIGNED',
    });
    review = await tenderReviewRepository.save(review);
  } else {
    review.status = 'REVIEW_ASSIGNED';
    await tenderReviewRepository.save(review);
  }

  for (const reviewerId of dto.reviewerIds) {
    const existing = await tenderReviewAssignmentRepository.findOne({
      where: { reviewId: review.id, reviewerId },
    });

    if (!existing) {
      const assign = tenderReviewAssignmentRepository.create({
        reviewId: review.id,
        reviewerId,
        decision: 'PENDING',
      });
      await tenderReviewAssignmentRepository.save(assign);
    }
  }

  tender.activeVersion.status = TenderVersionStatus.REVIEW_ASSIGNED;
  await tenderVersionRepository.save(tender.activeVersion);

  return review;
}

export async function submitReviewComment(
  reviewId: string,
  dto: SubmitReviewCommentDto,
  authorId: string,
): Promise<TenderReviewComment> {
  const review = await tenderReviewRepository.findOne({
    where: { id: reviewId },
    relations: {
      tenderVersion: {
        tender: true,
      },
    },
  });

  if (!review) {
    throw new AppError(
      AppErrorMessage.REVIEW_SESSION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const comment = tenderReviewCommentRepository.create({
    reviewId,
    authorId,
    commentText: dto.commentText,
  });

  const savedComment = await tenderReviewCommentRepository.save(comment);

  if (dto.status) {
    review.status = dto.status;
    await tenderReviewRepository.save(review);

    review.tenderVersion.status = dto.status;
    await tenderVersionRepository.save(review.tenderVersion);
  }

  return savedComment;
}

export async function submitReviewDecision(
  reviewId: string,
  decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED',
  commentText: string | undefined,
  actorId: string,
): Promise<TenderReview> {
  const review = await tenderReviewRepository.findOne({
    where: { id: reviewId },
    relations: {
      assignments: true,

      tenderVersion: {
        tender: true,
      },
    },
  });

  if (!review) {
    throw new AppError(
      AppErrorMessage.REVIEW_SESSION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  let assignment = await tenderReviewAssignmentRepository.findOne({
    where: { reviewId, reviewerId: actorId },
  });

  if (!assignment) {
    assignment = tenderReviewAssignmentRepository.create({
      reviewId,
      reviewerId: actorId,
      decision,
      completedAt: new Date(),
    });
  } else {
    assignment.decision = decision;
    assignment.completedAt = new Date();
  }
  await tenderReviewAssignmentRepository.save(assignment);

  if (commentText) {
    const comment = tenderReviewCommentRepository.create({
      reviewId,
      authorId: actorId,
      commentText: `[Decision: ${decision}] ${commentText}`,
    });
    await tenderReviewCommentRepository.save(comment);
  }

  // Evaluate parallel conflict resolution precedence formula across all assigned reviewers
  const allAssignments = await tenderReviewAssignmentRepository.find({ where: { reviewId } });
  const decisions = allAssignments.map((a) => a.decision);

  let finalStatus: TenderVersionStatus = TenderVersionStatus.UNDER_REVIEW;
  if (decisions.includes('REJECTED')) {
    finalStatus = TenderVersionStatus.REJECTED;
  } else if (decisions.includes('CHANGES_REQUESTED')) {
    finalStatus = TenderVersionStatus.CHANGES_REQUESTED;
  } else if (decisions.length > 0 && decisions.every((d) => d === 'APPROVED')) {
    finalStatus = TenderVersionStatus.APPROVED;
  }

  review.status = finalStatus;
  await tenderReviewRepository.save(review);

  review.tenderVersion.status = finalStatus;
  await tenderVersionRepository.save(review.tenderVersion);

  if (finalStatus === TenderVersionStatus.APPROVED) {
    domainEvents.dispatch(TENDER_EVENTS.APPROVED, { tender: review.tenderVersion.tender, actorId });
  }

  return review;
}

// ─── Watchers ───────────────────────────────────────────────────────────────

export async function toggleWatcher(
  tenderId: string,
  userId: string,
  dto: TenderWatcherDto,
): Promise<{ watching: boolean }> {
  const existing = await tenderWatcherRepository.findOne({ where: { tenderId, userId } });

  if (existing) {
    await tenderWatcherRepository.remove(existing);
    return { watching: false };
  }

  const channels: string[] = [];
  if (dto.notifyEmail) channels.push('EMAIL');
  if (dto.notifyInApp) channels.push('IN_APP');
  if (dto.notifySms) channels.push('SMS');

  const watcher = tenderWatcherRepository.create({
    tenderId,
    userId,
    channels,
  });

  await tenderWatcherRepository.save(watcher);
  return { watching: true };
}

// ─── Invitations ────────────────────────────────────────────────────────────

export async function inviteVendor(
  tenderId: string,
  dto: TenderInvitationDto,
): Promise<TenderInvitation> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + dto.expiresDays);

  const inv = tenderInvitationRepository.create({
    tenderId,
    email: dto.email,
    status: 'invited',
    expiresAt,
  });

  return tenderInvitationRepository.save(inv);
}

// ─── Templates ──────────────────────────────────────────────────────────────

export async function createTemplate(
  dto: TenderTemplateDto,
  userId: string,
): Promise<TenderTemplate> {
  const tenderTemplate = tenderTemplateRepository.create({
    templateScope: dto.templateScope,
    departmentId: dto.departmentId ?? null,
    title: dto.title,
    description: dto.description ?? null,
    payload: dto.payload,
    createdById: userId,
  });

  return tenderTemplateRepository.save(tenderTemplate);
}

// ─── Diff / Version comparison ───────────────────────────────────────────────

export async function getTenderVersions(tenderId: string): Promise<TenderVersion[]> {
  return tenderVersionRepository.find({
    where: { tenderId },
    order: { version: 'DESC' },
  });
}
