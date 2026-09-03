/**
 * [WHAT]
 * Normalizes email addresses by trimming whitespace and lowercasing domain/user portions.
 *
 * [WHY]
 * Guarantees case-insensitive and whitespace-clean email lookups across authentication,
 * registration, password resets, and user management modules.
 */
export function normalizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
}
