import { AppDataSource } from '@/config/database';
import { CountryVersion } from '@/database/entities/CountryVersion';

const countryVersionRepo = AppDataSource.getRepository(CountryVersion);

export async function getCurrentVersion(countryId: number) {
  return countryVersionRepo
    .createQueryBuilder('version')
    .leftJoin('version.approvedBy', 'approvedBy')
    .select('version.version', 'version')
    .addSelect('version.approved_at', 'approvedAt')
    .addSelect('approvedBy.id', 'approvedById')
    .addSelect('approvedBy.name', 'approvedByName')
    .where('version.country_id = :countryId', { countryId })
    .orderBy('version.version', 'DESC')
    .limit(1)
    .getRawOne();
}
