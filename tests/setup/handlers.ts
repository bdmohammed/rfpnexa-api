/**
 * tests/setup/handlers.ts
 *
 * Mock handlers and interceptors for third-party external services (AWS SES, S3, Email, Webhooks).
 */
import { jest } from '@jest/globals';

export interface MockEmailRecord {
  to: string;
  subject?: string;
  template?: string;
  data?: Record<string, unknown>;
  sentAt: Date;
}

export const emailDispatchLog: MockEmailRecord[] = [];

/**
 * Mock email service dispatch handler.
 */
export const mockEmailHandlers = {
  sendEmail: jest.fn(async (payload: { to: string; subject: string; [key: string]: unknown }) => {
    emailDispatchLog.push({
      to: payload.to,
      subject: payload.subject,
      data: payload,
      sentAt: new Date(),
    });
    return { success: true, messageId: `msg_${Date.now()}` };
  }),

  clearLog: () => {
    emailDispatchLog.length = 0;
  },

  getLastEmail: () => emailDispatchLog[emailDispatchLog.length - 1] ?? null,
};

/**
 * Mock S3 file storage handlers.
 */
export const mockStorageHandlers = {
  getSignedUrl: jest.fn(
    async (key: string) => `https://mock-s3.amazonaws.com/uploads/${key}?signed=true`,
  ),
  uploadObject: jest.fn(async (_key: string, _buffer: Buffer) => ({ ETag: '"mock-etag-12345"' })),
  deleteObject: jest.fn(async (_key: string) => ({ success: true })),
};

/**
 * Mock third-party external webhook handlers.
 */
export const mockWebhookHandlers = {
  dispatchWebhook: jest.fn(async (_url: string, _payload: unknown) => ({
    status: 200,
    received: true,
  })),
};

/**
 * Resets all external mock handlers.
 */
export function resetMockHandlers(): void {
  emailDispatchLog.length = 0;
  mockEmailHandlers.sendEmail.mockClear();
  mockStorageHandlers.getSignedUrl.mockClear();
  mockStorageHandlers.uploadObject.mockClear();
  mockStorageHandlers.deleteObject.mockClear();
  mockWebhookHandlers.dispatchWebhook.mockClear();
}
