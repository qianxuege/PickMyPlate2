/**
 * Heuristic checks for business address and phone (no geocoding).
 * Catches empty-looking garbage and obviously invalid phone patterns.
 */

const MAX_ADDRESS_LEN = 500;
const MAX_PHONE_MESSAGE = 'That phone number looks too long. Use 15 digits or fewer (or leave the field empty).';
const ALL_SAME_RE = /^([0-9])\1*$/;
const TRIVIAL_ADDRESS = new Set(
  [
    'n/a',
    'na',
    'n.a.',
    'none',
    'null',
    'test',
    'testing',
    'tbd',
    'xxx',
    'x',
    'a',
    'aa',
    'asdf',
    'qwerty',
  ].map((s) => s.toLowerCase())
);

/**
 * Strips to digits; empty string if no digits.
 */
function phoneDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/**
 * US-style local number or international (E.164 up to 15 digits when formatted without +).
 * Empty input is not allowed here; use `validateOptionalBusinessPhone` for optional fields.
 */
export function validateNonEmptyPhone(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim();
  if (!value) {
    return { ok: false, message: 'Enter a phone number or remove this value.' };
  }
  const digits = phoneDigits(value);
  if (digits.length < 8) {
    return {
      ok: false,
      message: 'Enter a full phone number with the area or country code, or clear this field.',
    };
  }
  if (digits.length > 15) {
    return { ok: false, message: MAX_PHONE_MESSAGE };
  }
  if (ALL_SAME_RE.test(digits)) {
    return { ok: false, message: 'That does not look like a valid phone number.' };
  }
  return { ok: true, value };
}

/**
 * For optional "business phone" fields. Empty/whitespace is valid.
 */
export function validateOptionalBusinessPhone(raw: string): { ok: true; value: string } | { ok: false; message: string } {
  if (!raw.trim()) {
    return { ok: true, value: '' };
  }
  return validateNonEmptyPhone(raw);
}

/**
 * First-line or full mailing style address, required at store creation.
 */
export function validateRequiredBusinessAddress(
  raw: string
): { ok: true; value: string } | { ok: false; message: string } {
  const value = raw.trim();
  if (value.length < 8) {
    return {
      ok: false,
      message: 'Enter a real business address with street, city, and state or region (at least 8 characters).',
    };
  }
  if (value.length > MAX_ADDRESS_LEN) {
    return { ok: false, message: `Address must be ${MAX_ADDRESS_LEN} characters or less.` };
  }
  if (TRIVIAL_ADDRESS.has(value.toLowerCase())) {
    return { ok: false, message: 'Enter a real business address, not a placeholder like “test” or “N/A”.' };
  }
  const letterCount = (value.match(/[A-Za-z\u00C0-\u024F]/g) ?? []).length;
  if (letterCount < 3) {
    return {
      ok: false,
      message: 'Enter an address with street or place names, not only numbers and symbols.',
    };
  }
  const hasDigit = /\d/.test(value);
  const hasComma = value.includes(',');
  if (!hasDigit && !hasComma) {
    if (value.length < 22) {
      return {
        ok: false,
        message:
          'Add a street number, or a comma between city and state, so the address is easy to read (e.g. “123 Main St” or “Austin, TX”).',
      };
    }
    const wordish = value.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
    if (wordish.length < 3) {
      return { ok: false, message: 'The address is too short—include city, region, or a landmark in addition to the name.' };
    }
  }
  return { ok: true, value };
}

/**
 * When a profile or form allows a blank address: empty is valid; if present, use same rules as required.
 */
export function validateOptionalBusinessAddress(
  raw: string
): { ok: true; value: string } | { ok: false; message: string } {
  if (!raw.trim()) {
    return { ok: true, value: '' };
  }
  return validateRequiredBusinessAddress(raw);
}
