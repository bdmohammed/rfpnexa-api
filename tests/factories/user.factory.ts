import { UserBuilder } from '../builders/user.builder';

import { AppDataSource } from '@/config/database';
import { Country } from '@/entities/Country';
import { PasswordHistory } from '@/entities/PasswordHistory';
import { User } from '@/entities/User';
import { UserStatus } from '@/types/enums';

/**
 * User Entity Factory. Handles database persistence side-effects.
 */
export class UserFactory {
  private static async ensureCountry(): Promise<string> {
    const repo = AppDataSource.getRepository(Country);
    let country = await repo.findOneBy({ code: 'US' });
    country ??= await repo.save(
      repo.create({
        code: 'US',
        name: 'United States',
        slug: 'united-states',
        isActive: true,
      }),
    );
    return String(country.id);
  }

  private static async saveInitialPasswordHistory(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    const repo = AppDataSource.getRepository(PasswordHistory);
    await repo.save(repo.create({ userId, passwordHash }));
  }

  static async create(
    builder: UserBuilder = new UserBuilder(),
  ): Promise<{ user: User; rawPassword: string }> {
    const countryId = await this.ensureCountry();
    const { user, rawPassword } = builder.build();
    user.countryId = countryId;

    const savedUser = await AppDataSource.getRepository(User).save(user);
    await this.saveInitialPasswordHistory(savedUser.id, savedUser.passwordHash);
    return { user: savedUser, rawPassword };
  }

  static async createActiveUser(
    overrides?: Partial<User>,
  ): Promise<{ user: User; rawPassword: string }> {
    const builder = new UserBuilder().active().verified();
    const { user, rawPassword } = builder.build();
    if (overrides) Object.assign(user, overrides);

    user.countryId = await this.ensureCountry();
    const savedUser = await AppDataSource.getRepository(User).save(user);
    await this.saveInitialPasswordHistory(savedUser.id, savedUser.passwordHash);
    return { user: savedUser, rawPassword };
  }

  static async createUnverifiedUser(
    overrides?: Partial<User>,
  ): Promise<{ user: User; rawPassword: string }> {
    const builder = new UserBuilder()
      .withStatus(UserStatus.PENDING_EMAIL_VERIFICATION)
      .unverified();
    const { user, rawPassword } = builder.build();
    if (overrides) Object.assign(user, overrides);

    user.countryId = await this.ensureCountry();
    const savedUser = await AppDataSource.getRepository(User).save(user);
    await this.saveInitialPasswordHistory(savedUser.id, savedUser.passwordHash);
    return { user: savedUser, rawPassword };
  }

  static async createLockedUser(
    overrides?: Partial<User>,
  ): Promise<{ user: User; rawPassword: string }> {
    const builder = new UserBuilder().locked();
    const { user, rawPassword } = builder.build();
    if (overrides) Object.assign(user, overrides);

    user.countryId = await this.ensureCountry();
    const savedUser = await AppDataSource.getRepository(User).save(user);
    await this.saveInitialPasswordHistory(savedUser.id, savedUser.passwordHash);
    return { user: savedUser, rawPassword };
  }

  static async createAdminUser(
    overrides?: Partial<User>,
  ): Promise<{ user: User; rawPassword: string }> {
    const builder = new UserBuilder().active().verified().admin();
    const { user, rawPassword } = builder.build();
    if (overrides) Object.assign(user, overrides);

    user.countryId = await this.ensureCountry();
    const savedUser = await AppDataSource.getRepository(User).save(user);
    await this.saveInitialPasswordHistory(savedUser.id, savedUser.passwordHash);
    return { user: savedUser, rawPassword };
  }
}
