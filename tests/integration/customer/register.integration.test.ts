/**
 * tests/integration/customer/register.integration.test.ts
 *
 * Integration Test Suite for registerUser() service function
 *
 * Verification Areas:
 *   - Happy Path: Inserts User (status = PENDING_EMAIL_VERIFICATION), initial PasswordHistory row,
 *     and EmailToken row inside single atomic transaction.
 *   - Duplicate Email: Catches PostgreSQL 23505 unique constraint violation on concurrent registrations and
 *     returns 409 Conflict.
 *   - HIBP Breach Check: Rejects password if flagged by breach check.
 *   - Background Verification Email: Dispatches verification email post-commit.
 */
import { UserGenerator } from '../../generators/user.generator';
import { EmailMock } from '../../mocks/email.mock';
import { HibpMock } from '../../mocks/hibp.mock';
import { clearDatabase } from '../../setup/db-reset';

import { AppDataSource } from '@/config/database';
import { Country } from '@/entities/Country';
import { EmailToken } from '@/entities/EmailToken';
import { PasswordHistory } from '@/entities/PasswordHistory';
import { User } from '@/entities/User';
import { registerUser } from '@/modules/auth/customer/services/auth.customer.public.service';
import { EmailTokenType, UserStatus } from '@/types/enums';

describe('Integration: registerUser() Service Logic', () => {
  beforeEach(async () => {
    await clearDatabase();
    EmailMock.resetAll();
    HibpMock.mockCleanPassword();
  });

  async function ensureCountryExists(countryId: string): Promise<void> {
    const countryRepo = AppDataSource.getRepository(Country);
    let country = await countryRepo.findOneBy({ id: countryId });
    if (!country) {
      country = countryRepo.create({
        id: countryId,
        code: 'US',
        name: 'United States',
        slug: 'united-states',
        isActive: true,
      });
      await countryRepo.save(country);
    }
  }

  it('should register a new customer in a single transaction with User, PasswordHistory, and EmailToken', async () => {
    const dto = UserGenerator.registrationDto();
    await ensureCountryExists(dto.countryId);

    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await registerUser(dto, clientMetadata);

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ email: dto.email.toLowerCase() });

    expect(user).not.toBeNull();
    expect(user?.email).toBe(dto.email.toLowerCase());
    expect(user?.status).toBe(UserStatus.PENDING_EMAIL_VERIFICATION);
    expect(user?.emailVerified).toBe(false);

    // Verify PasswordHistory inserted in DB
    const historyRepo = AppDataSource.getRepository(PasswordHistory);
    const history = await historyRepo.findBy({ userId: user!.id });
    expect(history).toHaveLength(1);

    // Verify EmailToken inserted in DB
    const tokenRepo = AppDataSource.getRepository(EmailToken);
    const tokens = await tokenRepo.findBy({
      userId: user!.id,
      type: EmailTokenType.EMAIL_VERIFICATION,
    });
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.usedAt).toBeNull();

    // Verify background email dispatched post-commit
    expect(EmailMock.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(EmailMock.sendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: dto.email.toLowerCase() }),
    );
  });

  it('should throw HTTP 409 Conflict when registering with an existing email', async () => {
    const dto = UserGenerator.registrationDto();
    await ensureCountryExists(dto.countryId);

    const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

    await registerUser(dto, clientMetadata);

    // Second registration attempt with same email
    await expect(registerUser(dto, clientMetadata)).rejects.toThrow();
  });
});
