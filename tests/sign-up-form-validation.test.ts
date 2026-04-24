import {
  validateSignUpEmail,
  validateSignUpPassword,
  validateVenueNameForSignUp,
} from '@/lib/sign-up-form-validation';

describe('validateSignUpEmail', () => {
  it('rejects c@g.c', () => {
    expect(validateSignUpEmail('c@g.c').ok).toBe(false);
  });

  it('accepts normal work emails', () => {
    const r = validateSignUpEmail('  Owner@Cafe-123.com  ');
    expect(r).toEqual({ ok: true, value: 'owner@cafe-123.com' });
  });

  it('rejects single char local', () => {
    expect(validateSignUpEmail('a@b.co').ok).toBe(false);
  });
});

describe('validateSignUpPassword', () => {
  it('requires 6+ chars', () => {
    expect(validateSignUpPassword('12').ok).toBe(false);
  });
  it('accepts 6 chars', () => {
    expect(validateSignUpPassword('12four').ok).toBe(true);
  });
});

describe('validateVenueNameForSignUp', () => {
  it('rejects 1 char', () => {
    expect(validateVenueNameForSignUp('A').ok).toBe(false);
  });
  it('accepts Rest', () => {
    expect(validateVenueNameForSignUp('Rest').ok).toBe(true);
  });
});
