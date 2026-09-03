import bcrypt from 'bcryptjs';

import { EmailGenerator, PasswordGenerator } from '../generators/user.generator';

import { BCRYPT_ROUNDS } from '@/core/constants';
import { User } from '@/entities/User';
import { AccountType, UserStatus } from '@/types/enums';

/**
 * Pure In-Memory User Builder.
 * Has ZERO database dependencies or side-effects.
 */
export class UserBuilder {
  private readonly user: Partial<User> = {
    name: 'Test User',
    email: EmailGenerator.unique(),
    companyName: 'Test Company Inc.',
    passwordHash: '',
    accountType: AccountType.USER,
    status: UserStatus.ACTIVE,
    emailVerified: true,
    mustResetPassword: false,
    tokenVersion: 1,
    failedLoginAttempts: 0,
    lockoutUntil: null,
  };

  private plainPassword = PasswordGenerator.strong();

  withCompanyName(companyName: string): this {
    this.user.companyName = companyName;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email.toLowerCase();
    return this;
  }

  withPassword(password: string): this {
    this.plainPassword = password;
    return this;
  }

  withAccountType(accountType: AccountType): this {
    this.user.accountType = accountType;
    return this;
  }

  withStatus(status: UserStatus): this {
    this.user.status = status;
    return this;
  }

  withEmailVerified(verified: boolean): this {
    this.user.emailVerified = verified;
    return this;
  }

  verified(): this {
    this.user.emailVerified = true;
    return this;
  }

  unverified(): this {
    this.user.emailVerified = false;
    return this;
  }

  active(): this {
    this.user.status = UserStatus.ACTIVE;
    return this;
  }

  locked(): this {
    this.user.status = UserStatus.BLOCKED;
    this.user.lockoutUntil = new Date(Date.now() + 60 * 60 * 1000);
    this.user.failedLoginAttempts = 5;
    return this;
  }

  admin(): this {
    this.user.accountType = AccountType.ADMIN;
    return this;
  }

  /**
   * Instantiates the User entity in memory without persisting.
   */
  build(): { user: User; rawPassword: string } {
    const salt = bcrypt.genSaltSync(BCRYPT_ROUNDS.PASSWORD);
    const passwordHash = bcrypt.hashSync(this.plainPassword, salt);

    const entity = new User();
    Object.assign(entity, this.user, { passwordHash });

    return { user: entity, rawPassword: this.plainPassword };
  }
}
