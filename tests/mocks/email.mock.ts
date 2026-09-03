import * as emailService from '@/services/email.service';

jest.mock('@/services/email.service', () => ({
  __esModule: true,
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailChangeVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailChangeAlertEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailChangeAlertToOldAddress: jest.fn().mockResolvedValue(undefined),
  sendAdminApprovalStatusEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminBootstrapNotification: jest.fn().mockResolvedValue(undefined),
}));

export class EmailMock {
  static get sendVerificationEmail(): jest.Mock {
    return (emailService as any).sendVerificationEmail;
  }

  static get sendPasswordResetEmail(): jest.Mock {
    return (emailService as any).sendPasswordResetEmail;
  }

  static get sendEmailChangeVerificationEmail(): jest.Mock {
    return (emailService as any).sendEmailChangeVerificationEmail;
  }

  static get sendEmailChangeAlertEmail(): jest.Mock {
    return (emailService as any).sendEmailChangeAlertEmail;
  }

  static get sendAdminApprovalStatusEmail(): jest.Mock {
    return (emailService as any).sendAdminApprovalStatusEmail;
  }

  static get sendAdminBootstrapNotification(): jest.Mock {
    return (emailService as any).sendAdminBootstrapNotification;
  }

  static resetAll(): void {
    this.sendVerificationEmail.mockReset().mockResolvedValue(undefined as any);
    this.sendPasswordResetEmail.mockReset().mockResolvedValue(undefined as any);
    this.sendEmailChangeVerificationEmail.mockReset().mockResolvedValue(undefined as any);
    this.sendEmailChangeAlertEmail.mockReset().mockResolvedValue(undefined as any);
    this.sendAdminApprovalStatusEmail.mockReset().mockResolvedValue(undefined as any);
    this.sendAdminBootstrapNotification.mockReset().mockResolvedValue(undefined as any);
  }
}
