/**
 * Human-readable message for caught/rejected values, including non-Error throws
 * (e.g. some fetch/auth failure paths in React Native).
 */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) {
    if (e.message) return e.message;
    return e.name && e.name !== 'Error' ? e.name : 'Unknown error';
  }
  if (typeof e === 'string' && e) return e;
  if (e && typeof e === 'object') {
    const o = e as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message) return o.message;
    if (typeof o.msg === 'string' && o.msg) return o.msg;
    if (typeof o.error_description === 'string' && o.error_description) {
      return o.error_description;
    }
    try {
      const s = JSON.stringify(e);
      if (s && s !== '{}') return s;
    } catch {
      /* ignore */
    }
  }
  if (e === undefined || e === null) return 'Unknown error';
  return String(e);
}
