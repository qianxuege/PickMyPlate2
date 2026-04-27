/**
 * Detects GoTrue errors when the persisted session cannot be refreshed
 * (missing refresh token, revoked session, new Supabase project, cleared app data).
 */
export function isInvalidStoredSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const msg =
    'message' in error && typeof (error as { message: unknown }).message === 'string'
      ? (error as { message: string }).message
      : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes('invalid refresh token') ||
    (lower.includes('refresh token') && lower.includes('not found')) ||
    lower.includes('refresh token revoked')
  );
}
