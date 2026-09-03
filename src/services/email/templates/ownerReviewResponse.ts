import { escapeHtml } from '@/utils/html';

export function getOwnerReviewResponseTemplate(action: 'approve' | 'reject'): string {
  const safeAction = escapeHtml(action);
  const isApproved = action === 'approve';
  const color = isApproved ? '#10b981' : '#ef4444';
  const title = isApproved ? 'Success!' : 'Request Rejected';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Review Response</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f3f4f6; margin: 0;">
  <div style="background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 400px; width: 100%;">
    <h2 style="color: ${color}; margin-top: 0; margin-bottom: 16px;">${title}</h2>
    <p style="color: #4b5563; font-size: 16px; margin-bottom: 24px;">The admin user request has been successfully <strong>${safeAction}d</strong>.</p>
    <div style="color: #9ca3af; font-size: 14px;">You can safely close this page.</div>
  </div>
</body>
</html>`;
}
