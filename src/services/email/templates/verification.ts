import { emailFooterHtml, emailFooterText } from './footer';

import { escapeHtml } from '@/utils/html';

export function getVerificationTemplate(opts: { name: string; link: string; userId: string }) {
  const safeName = escapeHtml(opts.name);
  const html = `
    <h2>Welcome to RFPNexa, ${safeName}!</h2>
    <p>Please verify your email address to activate your account.</p>
    <a href="${opts.link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
      Verify Email Address
    </a>
    <p style="color:#888;font-size:12px;margin-top:16px;">This link expires in 24 hours.</p>
    ${emailFooterHtml(opts.userId)}
  `;

  const text = `Welcome to RFPNexa, ${opts.name}!\n\nPlease verify your email address to activate your account by clicking the link below:\n${opts.link}\n\nThis link expires in 24 hours.${emailFooterText(opts.userId)}`;

  return { html, text };
}
