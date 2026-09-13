import type { StateStats } from '../countries.dto';
import { AppDataSource } from '@/config/database';
import { State } from '@/database/entities/State';

const stateRepo = AppDataSource.getRepository(State);

function buildStateStatsQuery() {
  return stateRepo
    .createQueryBuilder('state')
    .select('COUNT(*)', 'totalStates')
    .addSelect('COUNT(*) FILTER (WHERE state.is_active)', 'activeStates')
    .addSelect('COUNT(*) FILTER (WHERE NOT state.is_active)', 'inactiveStates');
}

export async function getStateStats() {
  return buildStateStatsQuery().getRawOne<StateStats>();
}

export async function getStateStatsByCountryId(countryId: number) {
  return buildStateStatsQuery()
    .where('state.country_id = :countryId', { countryId })
    .getRawOne<StateStats>();
}
