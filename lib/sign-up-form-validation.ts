/**
 * Stricter than HTML5 "valid" so addresses like c@g.c are rejected at sign-up.
 */
export function validateSignUpEmail(
  raw: string
): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim();
  if (!value) {
    return { ok: false, message: 'Enter your email address.' };
  }
  if (value.includes(' ') || value.includes('..') || /[\s\u200B]/.test(value)) {
    return { ok: false, message: 'Remove spaces and use a single email address (e.g. you@restaurant.com).' };
  }
  const at = value.indexOf('@');
  const atLast = value.lastIndexOf('@');
  if (at < 1 || at !== atLast) {
    return { ok: false, message: 'Use a valid email with one @ sign (e.g. you@restaurant.com).' };
  }
  const local = value.slice(0, at);
  const host = value.slice(at + 1);
  if (local.length < 2) {
    return { ok: false, message: 'The part before @ should be at least 2 characters.' };
  }
  if (host.length < 3 || !host.includes('.')) {
    return { ok: false, message: 'Use a full domain (e.g. yourname.com), not @c or @co only.' };
  }
  const labels = host.split('.');
  if (labels.some((l) => l.length === 0)) {
    return { ok: false, message: 'Check the domain: remove extra dots (e.g. you@site.com).' };
  }
  const tld = labels[labels.length - 1] ?? '';
  if (tld.length < 2) {
    return { ok: false, message: 'The ending after the last dot should be at least 2 letters (e.g. .com, .org).' };
  }
  if (!/^[a-zA-Z]{2,63}$/.test(tld)) {
    return { ok: false, message: 'Use a normal domain ending with letters, like .com or .net.' };
  }
  if (labels[0]!.length < 1) {
    return { ok: false, message: 'Enter a complete domain name before the dot (e.g. you@restaurant.com).' };
  }
  if (!/^[a-zA-Z0-9._%+-]{2,64}$/i.test(local)) {
    return { ok: false, message: 'The email name can use letters, numbers, and . _ % + -' };
  }
  return { ok: true, value: value.toLowerCase() };
}

/** Supabase / common password minimum. */
export const MIN_SIGN_UP_PASSWORD_LEN = 6;

export function validateSignUpPassword(
  raw: string
): { ok: true; value: string } | { ok: false; message: string } {
  if (!raw) {
    return { ok: false, message: 'Create a password between 6 and 128 characters.' };
  }
  if (raw.length < MIN_SIGN_UP_PASSWORD_LEN) {
    return { ok: false, message: `Use at least ${MIN_SIGN_UP_PASSWORD_LEN} characters for your password.` };
  }
  if (raw.length > 128) {
    return { ok: false, message: 'That password is too long. Use 128 characters or fewer.' };
  }
  return { ok: true, value: raw };
}

export const MIN_VENUE_DISPLAY_NAME_LEN = 2;
export const MAX_VENUE_DISPLAY_NAME_LEN = 50;

export function validateVenueNameForSignUp(
  raw: string
): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim();
  if (value.length < MIN_VENUE_DISPLAY_NAME_LEN) {
    return { ok: false, message: 'Enter a restaurant name (at least 2 characters).' };
  }
  if (value.length > MAX_VENUE_DISPLAY_NAME_LEN) {
    return { ok: false, message: `Use ${MAX_VENUE_DISPLAY_NAME_LEN} characters or fewer for the name.` };
  }
  return { ok: true, value };
}
