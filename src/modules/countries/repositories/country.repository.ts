import type { CountryStats } from '../countries.dto';
import { AppDataSource } from '@/config/database';
import { Country } from '@/database/entities/Country';

const countryRepo = AppDataSource.getRepository(Country);

export async function getCountryById(id: number) {
  return countryRepo.findOne({
    where: {
      id,
    },
  });
}

export async function getCountryStats() {
  return countryRepo
    .createQueryBuilder('country')
    .select('COUNT(*)', 'totalCountries')
    .addSelect('COUNT(*) FILTER (WHERE country.is_active)', 'activeCountries')
    .addSelect('COUNT(*) FILTER (WHERE NOT country.is_active)', 'inactiveCountries')
    .getRawOne<CountryStats>();
}

export async function getCountriesWithStates() {
  return countryRepo.find({
    select: {
      id: true,
      code: true,
      name: true,
      slug: true,
      isActive: true,
      updatedAt: true,
      states: {
        id: true,
        countryId: true,
        code: true,
        name: true,
        slug: true,
        type: true,
        isActive: true,
        updatedAt: true,
      },
    },
    relations: {
      states: true,
    },
    order: {
      name: 'ASC',
      states: {
        name: 'ASC',
      },
    },
  });
}
