/**
 * Client-side check for a plausible public email. Supabase is permissive, so we
 * validate before sign-up/login to avoid accepting host-only addresses like
 * "g@g" (no TLD / no dot in the domain).
 */
export function isValidEmail(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  if (s.includes(' ') || s.includes('\n')) return false;

  const at = s.indexOf('@');
  if (at <= 0) return false;
  if (s.indexOf('@', at + 1) !== -1) return false;

  const local = s.slice(0, at);
  const domain = s.slice(at + 1);
  if (!local || !domain) return false;
  if (local.length > 64 || domain.length > 255) return false;
  if (!domain.includes('.')) return false;

  const labels = domain.split('.');
  if (labels.some((l) => l.length === 0)) return false;

  const tld = labels[labels.length - 1] as string;
  if (tld.length < 2) return false;

  return true;
}
