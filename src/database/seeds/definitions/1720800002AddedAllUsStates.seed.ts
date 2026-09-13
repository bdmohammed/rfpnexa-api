import { type DataSource, In } from 'typeorm';

import { COUNTRIES_SEED_DATA, US_STATES } from '../data/countries.data';
import { seedCountryWithStates } from '../helpers/seedCountry';

import type { SeedInterface } from '../seed.interface';
import type { User } from '@/entities/User';
import { State } from '@/entities/State';

export default class AddedAllUSStates1720800002 implements SeedInterface {
  name = 'AddedAllUSStates1720800002';

  public async up(dataSource: DataSource, systemUser?: User): Promise<void> {
    if (!systemUser) {
      throw new Error('System user not found');
    }

    const usCountryData = COUNTRIES_SEED_DATA.find((c) => c.code === 'US');
    if (usCountryData) {
      await seedCountryWithStates(dataSource, usCountryData, systemUser);
    }
  }

  public async down(dataSource: DataSource): Promise<void> {
    const stateRepo = dataSource.getRepository(State);
    const codes = US_STATES.map((s) => s.code);
    await stateRepo.delete({ code: In(codes) });
  }
}
