import type { User } from '@/entities/User';

/**
 * Strips sensitive fields from a user object before returning to client.
 */
export function sanitizeUser(
  user: User,
): Omit<User, 'passwordHash' | 'tokenVersion' | 'failedLoginAttempts' | 'lockoutUntil'> {
  const {
    passwordHash,
    // tokenVersion,
    // failedLoginAttempts,
    // lockoutUntil,
    ...safe
  } = user;
  return safe;
}
