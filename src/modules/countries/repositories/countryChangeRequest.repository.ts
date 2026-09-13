import { In } from 'typeorm';

import type { RequestStats } from '../countries.dto';
import { AppDataSource } from '@/config/database';
import { CountryChangeRequest } from '@/database/entities/CountryChangeRequest';
import { CountryChangeRequestStatus, CountryChangeRequestTargetType } from '@/types/enums';

const countryChangeRequestRepo = AppDataSource.getRepository(CountryChangeRequest);

const ACTIVE_CHANGE_REQUEST_STATUSES = [
  CountryChangeRequestStatus.DRAFT,
  CountryChangeRequestStatus.READY_FOR_REVIEW,
  CountryChangeRequestStatus.IN_REVIEW,
];

export async function getChangeRequestStats() {
  return countryChangeRequestRepo
    .createQueryBuilder('request')
    .select(
      `COUNT(*) FILTER (
            WHERE request.status IN (:...openStatuses)
          )`,
      'open',
    )
    .addSelect(
      `COUNT(*) FILTER (
            WHERE request.status = :approved
          )`,
      'approved',
    )
    .addSelect(
      `COUNT(*) FILTER (
            WHERE request.status = :rejected
          )`,
      'rejected',
    )
    .addSelect(
      `COUNT(*) FILTER (
            WHERE request.status = :pending
          )`,
      'pending',
    )
    .setParameters({
      openStatuses: [
        CountryChangeRequestStatus.DRAFT,
        CountryChangeRequestStatus.READY_FOR_REVIEW,
        CountryChangeRequestStatus.IN_REVIEW,
      ],
      pending: CountryChangeRequestStatus.READY_FOR_REVIEW,
      approved: CountryChangeRequestStatus.APPROVED,
      rejected: CountryChangeRequestStatus.REJECTED,
    })
    .getRawOne<RequestStats>();
}

export async function getActiveChangeRequests() {
  return countryChangeRequestRepo.find({
    where: {
      status: In(ACTIVE_CHANGE_REQUEST_STATUSES),
    },
    select: {
      id: true,
      requestNumber: true,
      status: true,
      countryId: true,
      stateId: true,
    },
  });
}

export async function getPendingReview(countryId: number) {
  return countryChangeRequestRepo
    .createQueryBuilder('request')
    .select('request.id', 'requestId')
    .addSelect('request.status', 'status')
    .where('request.country_id = :countryId', { countryId })
    .andWhere('request.target_type = :targetType', {
      targetType: CountryChangeRequestTargetType.COUNTRY,
    })
    .andWhere('request.status IN (:...statuses)', {
      statuses: [
        CountryChangeRequestStatus.DRAFT,
        CountryChangeRequestStatus.READY_FOR_REVIEW,
        CountryChangeRequestStatus.IN_REVIEW,
      ],
    })
    .orderBy('request.created_at', 'DESC')
    .getRawOne();
}
