export interface RouteTestCase {
  name: string;
  payload?: Record<string, unknown>;
  expectedStatus: number;
  expectedErrorCode?: string;
}

export const registerRouteCases: RouteTestCase[] = [
  {
    name: 'Happy path registration',
    expectedStatus: 201,
  },
  {
    name: 'Missing email',
    payload: { name: 'Jane', password: 'Password123!' },
    expectedStatus: 422,
  },
  {
    name: 'Invalid email format',
    payload: { name: 'Jane', email: 'invalid-email', password: 'Password123!' },
    expectedStatus: 422,
  },
  {
    name: 'Weak password',
    payload: { name: 'Jane', email: 'jane@example.com', password: '123' },
    expectedStatus: 422,
  },
  {
    name: 'Duplicate email registration',
    expectedStatus: 409,
    expectedErrorCode: 'EMAIL_ALREADY_EXISTS',
  },
];
