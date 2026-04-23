import { isValidEmail } from '@/lib/is-valid-email';

describe('isValidEmail', () => {
  it('rejects host-only domains (issue #153)', () => {
    expect(isValidEmail('g@g')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('accepts common public addresses', () => {
    expect(isValidEmail('jane@example.com')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
    expect(isValidEmail('user+tag@mail.sub.example.com')).toBe(true);
  });

  it('rejects empty or obviously malformed', () => {
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('   ')).toBe(false);
    expect(isValidEmail('nodomain@')).toBe(false);
    expect(isValidEmail('@nolocal.com')).toBe(false);
    expect(isValidEmail('a@@b.com')).toBe(false);
    expect(isValidEmail('a @b.com')).toBe(false);
  });

  it('rejects single-char TLD after dot', () => {
    expect(isValidEmail('x@y.c')).toBe(false);
  });
});
