import { isInvalidStoredSessionError } from '@/lib/supabase-auth-errors';

describe('isInvalidStoredSessionError', () => {
  it('returns true for invalid refresh token messages', () => {
    expect(
      isInvalidStoredSessionError({ message: 'Invalid Refresh Token: Refresh Token Not Found' }),
    ).toBe(true);
    expect(isInvalidStoredSessionError({ message: 'invalid refresh token' })).toBe(true);
    expect(isInvalidStoredSessionError({ message: 'Refresh token revoked' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isInvalidStoredSessionError({ message: 'Network request failed' })).toBe(false);
    expect(isInvalidStoredSessionError(null)).toBe(false);
    expect(isInvalidStoredSessionError(undefined)).toBe(false);
  });
});
