import { env } from '@/config/env';

export function emailFooterHtml(userId: string): string {
  return `
    <p style="color:#888;font-size:12px;margin-top:32px;">
      RFPNexa · USA Government RFP Marketplace<br>
      <a href="${env.FRONTEND_CUSTOMER_URL}/unsubscribe?uid=${userId}" style="color:#888;">Unsubscribe from email notifications</a>
    </p>
  `;
}

export function emailFooterText(userId: string): string {
  return `\n\nrfpnexa · USA Government RFP Marketplace\nUnsubscribe from email notifications: ${env.FRONTEND_CUSTOMER_URL}/unsubscribe?uid=${userId}`;
}
