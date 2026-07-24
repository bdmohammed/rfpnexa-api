import { performance } from 'node:perf_hooks';

import { Resend } from 'resend';

import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

import type { EmailProvider } from '../email.provider';
import type { EmailOptions } from '../types/email.types';
import type { CreateEmailOptions } from 'resend';

export class ResendProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY is not set in environment variables');
    }
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async send(options: EmailOptions): Promise<void> {
    const toAddresses = typeof options.to === 'string' ? [options.to] : options.to;
    const recipientDomain = toAddresses[0]?.includes('@')
      ? toAddresses[0].split('@')[1]
      : 'unknown';

    logger.info({ recipientDomain }, 'Sending email via Resend');

    const start = performance.now();
    try {
      const payload: CreateEmailOptions = {
        from: env.FROM_EMAIL,
        to: toAddresses,
        subject: options.subject,
        html: options.html,
      };

      if (options.cc) {
        payload.cc = options.cc;
      }
      if (options.bcc) {
        payload.bcc = options.bcc;
      }
      if (options.replyTo) {
        payload.replyTo = options.replyTo;
      }
      if (options.text) {
        payload.text = options.text;
      }

      const response = await this.resend.emails.send(payload);

      if (response.error) {
        throw new Error(response.error.message);
      }

      const durationMs = performance.now() - start;
      logger.info(
        { id: response.data.id, recipientDomain, durationMs },
        'Email sent via Resend successfully',
      );
    } catch (err) {
      const durationMs = performance.now() - start;
      logger.error({ err, recipientDomain, durationMs }, 'Email sending via Resend failed');
      throw err;
    }
  }
}
