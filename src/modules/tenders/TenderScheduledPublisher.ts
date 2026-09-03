import { LessThanOrEqual } from 'typeorm';

import { Tender } from '../../database/entities/Tender';

import { TenderWorkflowService } from './TenderWorkflowService';

import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';
import { TenderPublicationStatus } from '@/types/enums';

export class TenderScheduledPublisher {
  /**
   * Process and publish all scheduled tenders whose publishAt timestamp has elapsed
   */
  static async processScheduledPublications(): Promise<number> {
    const tenderRepo = AppDataSource.getRepository(Tender);

    const dueTenders = await tenderRepo.find({
      where: {
        publicationStatus: TenderPublicationStatus.SCHEDULED,
        publishAt: LessThanOrEqual(new Date()),
      },
      relations: {
        activeVersion: true,
      },
    });

    if (dueTenders.length === 0) {
      return 0;
    }

    logger.info(
      `[TenderScheduledPublisher] Found ${dueTenders.length} scheduled tender(s) due for publication.`,
    );

    let publishedCount = 0;
    for (const tender of dueTenders) {
      try {
        const computed = TenderWorkflowService.computeStateTransition(
          tender,
          TenderPublicationStatus.PUBLISHED,
        );

        tender.publicationStatus = computed.publicationStatus;
        tender.biddingStatus = computed.biddingStatus;
        tender.processStatus = computed.processStatus;

        await tenderRepo.save(tender);
        publishedCount++;

        logger.info(
          `[TenderScheduledPublisher] Automatically published tender ID=${tender.id} (Ref=${tender.referenceNo}).`,
        );
      } catch (err: any) {
        logger.error(
          `[TenderScheduledPublisher] Failed to process scheduled publication for tender ID=${tender.id}: ${err.message}`,
        );
      }
    }

    return publishedCount;
  }
}
