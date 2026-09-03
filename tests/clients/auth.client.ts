import request from 'supertest';

import { app } from '@/config/app';

export class AuthClient {
  static async getCsrfToken(
    agent?: ReturnType<typeof request.agent>,
  ): Promise<{ agent: ReturnType<typeof request.agent>; csrfToken: string }> {
    const clientAgent = agent ?? request.agent(app);
    const res = await clientAgent.get('/api/v1/auth/csrf-token');
    const csrfToken = res.body?.data?.csrfToken ?? res.headers['x-csrf-token'] ?? '';
    return { agent: clientAgent, csrfToken };
  }

  static async register(
    agent: ReturnType<typeof request.agent>,
    payload: Record<string, unknown>,
    csrfToken?: string,
  ) {
    let reqCall = agent.post('/api/v1/auth/register');
    if (csrfToken) {
      reqCall = reqCall.set('x-csrf-token', csrfToken);
    }
    return await reqCall.send(payload);
  }

  static async login(
    agent: ReturnType<typeof request.agent>,
    payload: Record<string, unknown>,
    csrfToken?: string,
  ) {
    let reqCall = agent.post('/api/v1/auth/login');
    if (csrfToken) {
      reqCall = reqCall.set('x-csrf-token', csrfToken);
    }
    return await reqCall.send(payload);
  }

  static async verifyEmail(
    agent: ReturnType<typeof request.agent>,
    payload: { token: string },
    csrfToken?: string,
  ) {
    let reqCall = agent.post('/api/v1/auth/verify-email');
    if (csrfToken) {
      reqCall = reqCall.set('x-csrf-token', csrfToken);
    }
    return await reqCall.send(payload);
  }

  static async refresh(agent: ReturnType<typeof request.agent>, csrfToken?: string) {
    let reqCall = agent.post('/api/v1/auth/refresh');
    if (csrfToken) {
      reqCall = reqCall.set('x-csrf-token', csrfToken);
    }
    return await reqCall.send({});
  }

  static async logout(
    agent: ReturnType<typeof request.agent>,
    csrfToken?: string,
    cookies?: string | string[],
  ) {
    let reqCall = agent.post('/api/v1/auth/logout');
    if (csrfToken) {
      reqCall = reqCall.set('x-csrf-token', csrfToken);
    }
    if (cookies) {
      const rawList = Array.isArray(cookies) ? cookies : [cookies];
      const cookieHeader = rawList
        .map((c) => c.split(';')[0]?.trim())
        .filter(Boolean)
        .join('; ');
      reqCall = reqCall.set('Cookie', cookieHeader);
    }
    return await reqCall.send({});
  }

  static async getMe(agent: ReturnType<typeof request.agent>, cookies?: string | string[]) {
    let reqCall = agent.get('/api/v1/auth/me');
    if (cookies) {
      const rawList = Array.isArray(cookies) ? cookies : [cookies];
      const cookieHeader = rawList
        .map((c) => c.split(';')[0]?.trim())
        .filter(Boolean)
        .join('; ');
      reqCall = reqCall.set('Cookie', cookieHeader);
    }
    return await reqCall;
  }
}
