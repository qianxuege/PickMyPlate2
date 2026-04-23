import {
  validateOptionalBusinessAddress,
  validateOptionalBusinessPhone,
  validateRequiredBusinessAddress,
} from '@/lib/venue-contact-validation';

describe('validateRequiredBusinessAddress', () => {
  it('accepts a normal street + city + state', () => {
    const r = validateRequiredBusinessAddress('123 Main St, Boston, MA 02101');
    expect(r).toEqual({ ok: true, value: '123 Main St, Boston, MA 02101' });
  });

  it('rejects too short', () => {
    const r = validateRequiredBusinessAddress('123 St');
    expect(r.ok).toBe(false);
  });

  it('rejects obvious placeholders', () => {
    expect(validateRequiredBusinessAddress('n/a').ok).toBe(false);
    expect(validateRequiredBusinessAddress('test').ok).toBe(false);
  });

  it('rejects no letters', () => {
    expect(validateRequiredBusinessAddress('123 45 78 00').ok).toBe(false);
  });

  it('requires a digit or comma when the line is not long enough to be a landmark-only description', () => {
    expect(validateRequiredBusinessAddress('Downtown block').ok).toBe(false);
  });

  it('allows a long landmark-style line without a digit or comma if there are enough words', () => {
    const s = 'Downtown food hall and market at central plaza main floor';
    const r = validateRequiredBusinessAddress(s);
    expect(r).toEqual({ ok: true, value: s });
  });
});

describe('validateOptionalBusinessAddress', () => {
  it('allows empty', () => {
    expect(validateOptionalBusinessAddress('  ')).toEqual({ ok: true, value: '' });
  });
});

describe('validateOptionalBusinessPhone', () => {
  it('allows empty', () => {
    expect(validateOptionalBusinessPhone('')).toEqual({ ok: true, value: '' });
  });

  it('accepts 10+ digit US-style numbers with formatting', () => {
    const r = validateOptionalBusinessPhone('(555) 123-4567');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('(555) 123-4567');
  });

  it('rejects too few digits', () => {
    const r = validateOptionalBusinessPhone('12');
    expect(r.ok).toBe(false);
  });

  it('rejects more than 15 digits', () => {
    const r = validateOptionalBusinessPhone('1'.repeat(16));
    expect(r.ok).toBe(false);
  });

  it('rejects all the same digit', () => {
    const r = validateOptionalBusinessPhone('2'.repeat(10));
    expect(r.ok).toBe(false);
  });
});
