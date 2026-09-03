import { UserFactory } from '../factories/user.factory';

import type { User } from '@/entities/User';

/**
 * Object Mother Pattern for standard User entity test states.
 */
export class Users {
  static async active(overrides?: Partial<User>): Promise<{ user: User; rawPassword: string }> {
    return await UserFactory.createActiveUser(overrides);
  }

  static async pending(overrides?: Partial<User>): Promise<{ user: User; rawPassword: string }> {
    return await UserFactory.createUnverifiedUser(overrides);
  }

  static async locked(overrides?: Partial<User>): Promise<{ user: User; rawPassword: string }> {
    return await UserFactory.createLockedUser(overrides);
  }

  static async admin(overrides?: Partial<User>): Promise<{ user: User; rawPassword: string }> {
    return await UserFactory.createAdminUser(overrides);
  }
}
