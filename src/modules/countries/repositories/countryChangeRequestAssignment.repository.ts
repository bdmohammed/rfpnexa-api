import { AppDataSource } from '@/config/database';
import { CountryChangeRequestAssignment } from '@/database/entities/CountryChangeRequestAssignment';
import { CountryAssignmentStatus } from '@/types/enums';

const countryChangeRequestAssignmentRepo = AppDataSource.getRepository(
  CountryChangeRequestAssignment,
);

export async function countPendingAssignments(reviewerId: string) {
  return countryChangeRequestAssignmentRepo.count({
    where: {
      reviewerId,
      status: CountryAssignmentStatus.PENDING,
    },
  });
}
