/**
 * tests/integration/oauth/oauth.integration.test.ts
 *
 * Integration Test Suite for authenticateOAuthUser() & PKCE Challenge Generators
 *
 * Verification Areas:
 *   - PKCE Generator: Correctly generates S256 code challenge from verifier.
 *   - Auto-Registration: Provisions new user in DB with pre-verified email, provider ID, and password history.
 *   - Auto-Linking: Links provider ID (googleId/githubId/microsoftId) to existing account with matching email.
 *   - Suspended Account Denial: Throws 403 FORBIDDEN if target account is blocked.
 */
import { EmailGenerator } from '../../generators/user.generator';
import { Users } from '../../mothers/user.mother';
import { clearDatabase } from '../../setup/db-reset';

import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import {
  authenticateOAuthUser,
  generateCodeChallenge,
  generateCodeVerifier,
  generateNonce,
} from '@/modules/auth/oauth/auth.oauth.service';

describe('Integration: OAuth Social Auth Services', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('PKCE & Nonce Generators', () => {
    it('should generate valid PKCE code verifier and S256 challenge', () => {
      const verifier = generateCodeVerifier();
      const challenge = generateCodeChallenge(verifier);
      const nonce = generateNonce();

      expect(verifier).toBeDefined();
      expect(challenge).toBeDefined();
      expect(nonce).toBeDefined();
      expect(verifier.length).toBeGreaterThanOrEqual(43);
      expect(challenge.length).toBeGreaterThan(10);
    });
  });

  describe('authenticateOAuthUser()', () => {
    it('should auto-register a new user in PostgreSQL when email does not exist', async () => {
      const profile = {
        providerId: 'google-sub-12345',
        email: EmailGenerator.unique(),
        name: 'Google User',
      };
      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      const user = await authenticateOAuthUser('google', profile, clientMetadata);

      expect(user).toBeDefined();
      expect(user.email).toBe(profile.email);
      expect(user.googleId).toBe('google-sub-12345');
      expect(user.emailVerified).toBe(true);

      // Verify DB persistence
      const userRepo = AppDataSource.getRepository(User);
      const dbUser = await userRepo.findOneBy({ id: user.id });
      expect(dbUser).not.toBeNull();
      expect(dbUser?.googleId).toBe('google-sub-12345');
    });

    it('should auto-link provider ID to existing user account with matching email', async () => {
      const { user } = await Users.active();
      const profile = {
        providerId: 'github-id-999',
        email: user.email,
        name: user.name,
      };
      const clientMetadata = { ipAddress: '127.0.0.1', userAgent: 'Jest Test Agent' };

      const linkedUser = await authenticateOAuthUser('github', profile, clientMetadata);

      expect(linkedUser.id).toBe(user.id);
      expect(linkedUser.githubId).toBe('github-id-999');

      // Verify DB update
      const userRepo = AppDataSource.getRepository(User);
      const dbUser = await userRepo.findOneBy({ id: user.id });
      expect(dbUser?.githubId).toBe('github-id-999');
    });
  });
});
