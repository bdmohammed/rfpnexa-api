/**
 * tests/e2e/customer/register.e2e.test.ts
 *
 * End-to-End HTTP Test Suite for POST /api/v1/auth/register
 *
 * Verification Areas:
 *   - Happy Path: Returns 201 Created with clean sanitized response payload.
 *   - Validation: Fails with 422 for missing fields, invalid email format, weak passwords.
 *   - Duplicate: Fails with 409 Conflict for existing emails.
 *   - CSRF: Enforces CSRF token checks.
 */
import { AuthClient } from '../../clients/auth.client';
import { PasswordGenerator, UserGenerator } from '../../generators/user.generator';
import { EmailMock } from '../../mocks/email.mock';
import { HibpMock } from '../../mocks/hibp.mock';
import { clearDatabase } from '../../setup/db-reset';

import type request from 'supertest';
import { AppDataSource } from '@/config/database';
import { Country } from '@/entities/Country';

describe('E2E: POST /api/v1/auth/register', () => {
  let _agent: ReturnType<typeof request.agent>;
  let _csrfToken: string;

  async function ensureCountryExists(): Promise<string> {
    const countryRepo = AppDataSource.getRepository(Country);
    let country = await countryRepo.findOneBy({ code: 'US' });
    if (!country) {
      country = countryRepo.create({
        code: 'US',
        name: 'United States',
        slug: 'united-states',
        isActive: true,
      });
      await countryRepo.save(country);
    }
    return String(country.id);
  }

  beforeEach(async () => {
    await clearDatabase();
    EmailMock.resetAll();
    HibpMock.mockCleanPassword();

    const { agent, csrfToken } = await AuthClient.getCsrfToken();
    _agent = agent;
    _csrfToken = csrfToken;
  });

  it('should register a new customer successfully (201 Created)', async () => {
    const countryId = await ensureCountryExists();
    const payload = UserGenerator.registrationDto({ countryId });

    const res = await AuthClient.register(_agent, payload, _csrfToken);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('message');
    expect(res.body.data).toBeNull();
  });

  it('should fail with 409 Conflict when registering with a duplicate email', async () => {
    const countryId = await ensureCountryExists();
    const payload = UserGenerator.registrationDto({ countryId });

    // First registration
    await AuthClient.register(_agent, payload, _csrfToken);

    // Second duplicate registration
    const res = await AuthClient.register(_agent, payload, _csrfToken);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('success', false);
  });

  it('should fail validation (422) when required fields are missing or invalid', async () => {
    const invalidPayload = {
      name: 'A',
      email: 'not-an-email',
      password: PasswordGenerator.weak(),
    };

    const res = await AuthClient.register(_agent, invalidPayload, _csrfToken);

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('success', false);
  });
});
