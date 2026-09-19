import { z } from 'zod';

import { EMAIL_VERIFICATION_TOKEN_LENGTH } from '@/core/constants';

// eslint-disable-next-line security/detect-non-literal-regexp
const emailVerificationTokenRegex = new RegExp(`^[a-f0-9]{${EMAIL_VERIFICATION_TOKEN_LENGTH}}$`);

export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .superRefine((password, ctx) => {
    if (!/[A-Z]/.test(password)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password must contain at least one uppercase letter',
      });
    }

    if (!/[a-z]/.test(password)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password must contain at least one lowercase letter',
      });
    }

    if (!/[0-9]/.test(password)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password must contain at least one number',
      });
    }

    if (!/[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?`~]/.test(password)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password must contain at least one special character',
      });
    }
  });

export const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ message: 'Invalid email address' }));

export const RegisterSchema = z.object({
  name: z.string().min(2).max(120).trim(),
  email: EmailSchema,
  password: PasswordSchema,
  companyName: z.string().max(160).trim().optional(),
  countryId: z.string().regex(/^\d+$/, 'Invalid Country ID'),
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
  captchaToken: z.string().optional(),
});
export type LoginDto = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
});
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  token: z
    .string()
    .trim()
    .length(EMAIL_VERIFICATION_TOKEN_LENGTH, 'Invalid verification token.')
    .regex(emailVerificationTokenRegex, 'Invalid verification token.'),
  password: PasswordSchema,
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;

export const VerifyEmailSchema = z
  .object({
    token: z
      .string()
      .trim()
      .length(EMAIL_VERIFICATION_TOKEN_LENGTH, 'Invalid verification token.')
      .regex(emailVerificationTokenRegex, 'Invalid verification token.'),
  })
  .strict();

export type VerifyEmailDto = z.infer<typeof VerifyEmailSchema>;

export const ResendVerificationSchema = z.object({
  email: EmailSchema,
});
export type ResendVerificationDto = z.infer<typeof ResendVerificationSchema>;

export const EmailChangeSchema = z.object({
  email: EmailSchema,
});
export type EmailChangeDto = z.infer<typeof EmailChangeSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: PasswordSchema,
  newPassword: PasswordSchema,
});
export type ChangePasswordDto = z.infer<typeof ChangePasswordSchema>;

export const OwnerReviewSchema = z.object({
  token: z
    .string()
    .trim()
    .length(EMAIL_VERIFICATION_TOKEN_LENGTH, 'Invalid verification token.')
    .regex(emailVerificationTokenRegex, 'Invalid verification token.'),
  action: z.enum(['approve', 'reject'], { message: "Action must be either 'approve' or 'reject'" }),
});
export type OwnerReviewDto = z.infer<typeof OwnerReviewSchema>;

export const VerifyBootstrapTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .length(EMAIL_VERIFICATION_TOKEN_LENGTH, 'Invalid verification token.')
    .regex(emailVerificationTokenRegex, 'Invalid verification token.'),
});
export type VerifyBootstrapTokenDto = z.infer<typeof VerifyBootstrapTokenSchema>;

export const ApproveBootstrapAdminSchema = z.object({
  token: z
    .string()
    .trim()
    .length(EMAIL_VERIFICATION_TOKEN_LENGTH, 'Invalid verification token.')
    .regex(emailVerificationTokenRegex, 'Invalid verification token.'),
  action: z.enum(['approve', 'reject']).optional().default('approve'),
});
export type ApproveBootstrapAdminDto = z.infer<typeof ApproveBootstrapAdminSchema>;

export const IdParamSchema = z.object({
  id: z.uuid(),
});
export type IdParamDto = z.infer<typeof IdParamSchema>;

export interface UserSessionDto {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
  createdAt: Date;
  expiresAt: Date;
}

export interface UserDeviceDto {
  id: string;
  browser: string;
  browserVersion: string | null;
  os: string;
  osVersion: string | null;
  device:
    'desktop' | 'mobile' | 'tablet' | 'smarttv' | 'wearable' | 'embedded' | 'console' | 'unknown';
  ipAddress: string | null;
  isTrusted: boolean;
  isCurrent: boolean;
  lastSeenAt: Date;
  createdAt: Date;
}

export const OAuthProviderSchema = z.object({
  provider: z.enum(['google', 'github', 'microsoft']),
});
export type OAuthProviderDto = z.infer<typeof OAuthProviderSchema>;

export const OAuthCallbackQuerySchema = z.object({
  code: z.string().min(1, 'Code is required'),
  state: z.string().min(1, 'State is required'),
});
export type OAuthCallbackQueryDto = z.infer<typeof OAuthCallbackQuerySchema>;
