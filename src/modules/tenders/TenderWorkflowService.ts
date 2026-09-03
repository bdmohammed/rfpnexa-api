import type { Tender } from '../../database/entities/Tender';
import type { TenderVersion } from '../../database/entities/TenderVersion';
import {
  TenderBiddingStatus,
  TenderProcessStatus,
  TenderPublicationStatus,
  TenderVersionStatus,
} from '@/types/enums';

export class TenderWorkflowService {
  /**
   * Validate and transition Tender Version status
   */
  static validateVersionTransition(
    current: TenderVersionStatus,
    next: TenderVersionStatus,
  ): boolean {
    if (current === next) return true;

    const allowed: Record<TenderVersionStatus, TenderVersionStatus[]> = {
      [TenderVersionStatus.DRAFT]: [TenderVersionStatus.SUBMITTED],
      [TenderVersionStatus.SUBMITTED]: [
        TenderVersionStatus.REVIEW_ASSIGNED,
        TenderVersionStatus.DRAFT,
      ],
      [TenderVersionStatus.REVIEW_ASSIGNED]: [
        TenderVersionStatus.UNDER_REVIEW,
        TenderVersionStatus.DRAFT,
      ],
      [TenderVersionStatus.UNDER_REVIEW]: [
        TenderVersionStatus.APPROVED,
        TenderVersionStatus.REJECTED,
        TenderVersionStatus.CHANGES_REQUESTED,
      ],
      [TenderVersionStatus.APPROVED]: [],
      [TenderVersionStatus.REJECTED]: [TenderVersionStatus.DRAFT],
      [TenderVersionStatus.CHANGES_REQUESTED]: [TenderVersionStatus.DRAFT],
      [TenderVersionStatus.ARCHIVED_VERSION]: [],
    };

    return allowed[current].includes(next);
  }

  /**
   * Validate and transition Tender Publication status
   */
  static validatePublicationTransition(
    current: TenderPublicationStatus,
    next: TenderPublicationStatus,
  ): boolean {
    if (current === next) return true;

    const allowed: Record<TenderPublicationStatus, TenderPublicationStatus[]> = {
      [TenderPublicationStatus.UNPUBLISHED]: [
        TenderPublicationStatus.SCHEDULED,
        TenderPublicationStatus.PUBLISHED,
      ],
      [TenderPublicationStatus.SCHEDULED]: [
        TenderPublicationStatus.PUBLISHED,
        TenderPublicationStatus.UNPUBLISHED,
      ],
      [TenderPublicationStatus.PUBLISHED]: [TenderPublicationStatus.RETRACTED],
      [TenderPublicationStatus.RETRACTED]: [TenderPublicationStatus.PUBLISHED],
    };

    return allowed[current].includes(next);
  }

  /**
   * Enforce orthogonal state transitions for a Tender aggregate
   */
  // eslint-disable-next-line complexity, sonarjs/cognitive-complexity
  static computeStateTransition(
    tender: Tender,
    targetPublicationStatus?: TenderPublicationStatus,
    targetVersionStatus?: TenderVersionStatus,
  ) {
    let { publicationStatus, biddingStatus, processStatus } = tender;

    if (targetPublicationStatus) {
      if (!this.validatePublicationTransition(publicationStatus, targetPublicationStatus)) {
        throw new Error(
          `Invalid publication transition from ${publicationStatus} to ${targetPublicationStatus}`,
        );
      }
      publicationStatus = targetPublicationStatus;

      if (publicationStatus === TenderPublicationStatus.PUBLISHED) {
        const now = new Date();
        const opening = tender.activeVersion?.openingDate
          ? new Date(tender.activeVersion.openingDate)
          : now;

        if (opening <= now) {
          biddingStatus = TenderBiddingStatus.OPEN;
          processStatus = TenderProcessStatus.IN_BIDDING;
        } else {
          biddingStatus = TenderBiddingStatus.NOT_OPEN;
          processStatus = TenderProcessStatus.PRE_BIDDING;
        }
      }
    }

    if (targetVersionStatus && tender.activeVersion?.status) {
      if (!this.validateVersionTransition(tender.activeVersion.status, targetVersionStatus)) {
        throw new Error(
          `Invalid version transition from ${tender.activeVersion.status} to ${targetVersionStatus}`,
        );
      }
    }

    return {
      publicationStatus,
      biddingStatus,
      processStatus,
      versionStatus: targetVersionStatus,
    };
  }

  /**
   * Generate diff comparison between two versions of a tender
   */
  static compareVersions(version1: TenderVersion, version2: TenderVersion) {
    const fieldsToCompare: (keyof TenderVersion)[] = [
      'title',
      'description',
      'procurementType',
      'priority',
      'estimatedBudget',
      'currency',
      'department',
      'formattedAddress',
      'siteVisitRequired',
      'openingDate',
      'closingDate',
      'emdAmount',
      'securityDeposit',
      'paymentTerms',
      'visibility',
    ];

    const added: Record<string, unknown> = {};
    const removed: Record<string, unknown> = {};
    const changed: Record<string, unknown> = {};

    for (const field of fieldsToCompare) {
      const value1 = version1[field];
      const value2 = version2[field];

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (value1 === null || value1 === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (value2 !== null && value2 !== undefined) {
          added[field] = value2;
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (value2 === null || value2 === undefined) {
        removed[field] = value1;
      } else if (JSON.stringify(value1) !== JSON.stringify(value2)) {
        changed[field] = { old: value1, new: value2 };
      }
    }

    return { added, removed, changed };
  }
}
