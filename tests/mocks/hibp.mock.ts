import * as securityService from '@/modules/auth/security/auth.security.service';

jest.mock('@/modules/auth/security/auth.security.service', () => {
  const actual = jest.requireActual('@/modules/auth/security/auth.security.service');
  return {
    __esModule: true,
    ...actual,
    verifyPasswordBreach: jest.fn().mockResolvedValue(undefined),
  };
});

export class HibpMock {
  static verifyPasswordBreach = securityService.verifyPasswordBreach as unknown as jest.Mock;

  static mockCleanPassword(): void {
    this.verifyPasswordBreach.mockReset().mockResolvedValue(undefined);
  }

  static mockPwnedPassword(): void {
    this.verifyPasswordBreach.mockReset().mockRejectedValue(new Error('Password breached'));
  }
}
