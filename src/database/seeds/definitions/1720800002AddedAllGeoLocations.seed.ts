import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type DataSource, In } from 'typeorm';

import { seedCountryWithStates } from '../helpers/seedCountry';

import type { CountrySeedInput } from '../data/countries-states.dto';
import type { SeedInterface } from '../seed.interface';
import type { User } from '@/entities/User';
import { State } from '@/entities/State';

const geoLocation = JSON.parse(
  readFileSync(join(__dirname, '../data/countries-states.json'), 'utf-8'),
) as CountrySeedInput[];

export default class AddedAllGeoLocations1720800002 implements SeedInterface {
  name = 'AddedAllGeoLocations1720800002';

  public async up(dataSource: DataSource, systemUser?: User): Promise<void> {
    if (!systemUser) {
      throw new Error('System user not found');
    }

    await Promise.all(
      geoLocation.map((country) => seedCountryWithStates(dataSource, country, systemUser)),
    );
  }

  public async down(dataSource: DataSource): Promise<void> {
    const stateRepo = dataSource.getRepository(State);
    const codes = geoLocation.map((s) => s.code);
    await stateRepo.delete({ code: In(codes) });
  }
}
