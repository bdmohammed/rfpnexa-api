// import { AppDataSource } from '@/config/database';
// import { logger } from '@/config/logger';
// import { Tender } from '@/entities/Tender';
// import {
//   TenderBiddingStatus,
//   TenderLifecycleStatus,
//   TenderProcessStatus,
//   TenderPublicationStatus,
// } from '@/types/enums';

// const tenderRepo = AppDataSource.getRepository(Tender);

// /**
//  * Expire/Close Bidding Window Job — runs hourly.
//  * Sets biddingStatus = CLOSED, processStatus = UNDER_EVALUATION for active tenders past their closing date.
//  */
// export async function expireTendersJob(): Promise<void> {
//   const passedTenders = await tenderRepo
//     .createQueryBuilder('tender')
//     .leftJoinAndSelect('tender.activeVersion', 'activeVersion')
//     .where('tender.status = :status', { status: TenderLifecycleStatus.ACTIVE })
//     .andWhere('tender.publicationStatus = :pubStatus', {
//       pubStatus: TenderPublicationStatus.PUBLISHED,
//     })
//     .andWhere('tender.biddingStatus = :biddingStatus', {
//       biddingStatus: TenderBiddingStatus.OPEN,
//     })
//     .andWhere('activeVersion.closingDate < :now', { now: new Date() })
//     .getMany();

//   for await (const t of passedTenders) {
//     t.biddingStatus = TenderBiddingStatus.CLOSED;
//     t.processStatus = TenderProcessStatus.UNDER_EVALUATION;
//     await tenderRepo.save(t);
//   }

//   logger.info({ affected: passedTenders.length }, 'Expire/close tenders job complete');
// }
