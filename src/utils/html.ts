/**
 * [WHAT]
 * Escapes HTML special characters in string inputs.
 *
 * [WHY]
 * Sanitizes user-controlled data (e.g. user names, company names) before embedding them into
 * HTML email templates to prevent XSS / HTML injection attacks in email clients.
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') {
    return '';
  }
  return str.replace(/[&<>"']/g, (match) => {
    switch (match) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return match;
    }
  });
}
