import { SecurityLog } from '../../../database/entities/SecurityLog';

import type { SecurityEvent } from '@/types/enums';
import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';
import { GeoLocationService } from '@/services/geolocation/geolocation.service';

const securityLogRepository = AppDataSource.getRepository(SecurityLog);

export enum SecurityAuditReason {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ALREADY_VERIFIED = 'ALREADY_VERIFIED',
  ACCOUNT_NOT_PENDING = 'ACCOUNT_NOT_PENDING',
  ACCOUNT_INELIGIBLE = 'ACCOUNT_INELIGIBLE',
  COOLDOWN_ACTIVE = 'COOLDOWN_ACTIVE',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  INVALID_PASSWORD = 'INVALID_PASSWORD',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
  CAPTCHA_FAILED = 'CAPTCHA_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ADMIN_ACCOUNT_AWAITING_APPROVAL = 'ADMIN_ACCOUNT_AWAITING_APPROVAL',
  ADMIN_ACCOUNT_APPROVAL_REJECTED = 'ADMIN_ACCOUNT_APPROVAL_REJECTED',
  ADMIN_ACCOUNT_SUSPENDED = 'ADMIN_ACCOUNT_SUSPENDED',
}

/**
 * [WHAT]
 * Resolves geolocation description for an IP address via GeoLocationService.
 */
export async function resolveIpLocation(ip: string | null): Promise<string> {
  return GeoLocationService.resolveIpLocation(ip);
}

/**
 * [WHAT]
 * Logs a security telemetry event asynchronously.
 *
 * [WHY]
 * Audits user authentication, registration, password changes, and suspicious login activities.
 */
export async function logSecurityEvent(options: {
  userId?: string | null;
  email: string | null;
  event: SecurityEvent;
  ipAddress: string | null;
  userAgent: string | null;
  details?: Record<string, unknown> | null;
}): Promise<void> {
  resolveIpLocation(options.ipAddress)
    .then(async (location) => {
      try {
        const securityLog = securityLogRepository.create({
          userId: options.userId ?? null,
          email: options.email ?? null,
          event: options.event,
          ipAddress: options.ipAddress ?? null,
          userAgent: options.userAgent ?? null,
          details: {
            ...(options.details ?? {}),
            location,
          },
        });

        await securityLogRepository.save(securityLog);
        logger.info(
          { event: options.event, email: options.email, location },
          'Security event logged',
        );
      } catch (err) {
        logger.error({ err, event: options.event }, 'Failed to save security log record');
      }
    })
    .catch((err) => {
      logger.error(
        { err, event: options.event },
        'Error occurred during security log background resolution',
      );
    });
}
