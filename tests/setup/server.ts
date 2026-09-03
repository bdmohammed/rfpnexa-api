/**
 * tests/setup/server.ts
 *
 * Test server bootstrap and Supertest client factory for API/Integration testing.
 */
import request from 'supertest';

import type { Express } from 'express';
import { app } from '@/config/app';

/**
 * Returns the configured Express application instance.
 */
export function getTestApp(): Express {
  return app;
}

/**
 * Creates a new supertest request instance for the Express application.
 */
export function createTestClient(): request.Agent {
  return request.agent(app);
}

/**
 * Default supertest request runner.
 */
export const testRequest = request(app);

export { app };
export default testRequest;
