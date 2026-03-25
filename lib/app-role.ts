export type AppRole = 'diner' | 'restaurant';

export const ACTIVE_APP_ROLE_STORAGE_KEY = '@pickmyplate/active_app_role';

export function isAppRole(value: string | null | undefined): value is AppRole {
  return value === 'diner' || value === 'restaurant';
}

export function filterAppRoles(roles: string[]): AppRole[] {
  const out: AppRole[] = [];
  for (const r of roles) {
    if (isAppRole(r) && !out.includes(r)) out.push(r);
  }
  return out;
}
