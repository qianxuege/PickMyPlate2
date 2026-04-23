/**
 * Max length for `display_name` in auth metadata, venue names in forms, and
 * other profile-style labels. Account identity remains unique by email, not
 * this field.
 */
export const DISPLAY_NAME_MAX_LENGTH = 50;

export function clampDisplayName(s: string): string {
  if (s.length <= DISPLAY_NAME_MAX_LENGTH) return s;
  return s.slice(0, DISPLAY_NAME_MAX_LENGTH);
}
