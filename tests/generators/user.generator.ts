import crypto from 'node:crypto';

export class EmailGenerator {
  static unique(): string {
    return `test-${crypto.randomUUID()}@example.com`.toLowerCase();
  }
}

export class PasswordGenerator {
  static strong(): string {
    return 'Password123!';
  }

  static weak(): string {
    return '12345';
  }

  static breached(): string {
    return 'P@ssword1';
  }
}

export class UserGenerator {
  static registrationDto(overrides?: Record<string, unknown>) {
    return {
      name: 'Jane Doe',
      email: EmailGenerator.unique(),
      password: PasswordGenerator.strong(),
      companyName: 'Jane Doe Enterprise',
      countryId: '1',
      ...overrides,
    };
  }

  static loginDto(email: string, password = PasswordGenerator.strong()) {
    return { email, password };
  }
}
