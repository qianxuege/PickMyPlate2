import type { AppRole } from '@/lib/app-role';

/**
 * Diner shell: orange (brand).
 * Restaurant shell: green for clear context switching.
 */
export type RoleTheme = {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  screenBackground: string;
  headerBackground: string;
  headerBorder: string;
  /** Filled pill for active mode badge */
  badgeFilledBg: string;
  badgeFilledText: string;
  /** Outlined pill for diner when contrasting with filled restaurant */
  badgeOutlineBorder: string;
  badgeOutlineBg: string;
  badgeOutlineText: string;
  segmentTrack: string;
  segmentInactiveText: string;
  cardAccentBorder: string;
  shadowRgb: string;
};

export const dinerRoleTheme: RoleTheme = {
  primary: '#FF6A3D',
  primaryLight: '#FFF0EB',
  primaryDark: '#E85A2E',
  screenBackground: '#FFFCFA',
  headerBackground: '#FFFFFF',
  headerBorder: '#E2E8F0',
  badgeFilledBg: '#FF6A3D',
  badgeFilledText: '#FFFFFF',
  badgeOutlineBorder: '#FF6A3D',
  badgeOutlineBg: '#FFF7F3',
  badgeOutlineText: '#C2410C',
  segmentTrack: '#F2F4F7',
  segmentInactiveText: '#667085',
  cardAccentBorder: '#FFE4D6',
  shadowRgb: '255, 106, 61',
};

export const restaurantRoleTheme: RoleTheme = {
  primary: '#059669',
  primaryLight: '#ECFDF5',
  primaryDark: '#047857',
  screenBackground: '#F6FBF9',
  headerBackground: '#FFFFFF',
  headerBorder: '#D1FAE5',
  badgeFilledBg: '#059669',
  badgeFilledText: '#FFFFFF',
  badgeOutlineBorder: '#059669',
  badgeOutlineBg: '#ECFDF5',
  badgeOutlineText: '#047857',
  segmentTrack: '#F2F4F7',
  segmentInactiveText: '#667085',
  cardAccentBorder: '#A7F3D0',
  shadowRgb: '5, 150, 105',
};

export function getRoleTheme(role: AppRole): RoleTheme {
  return role === 'diner' ? dinerRoleTheme : restaurantRoleTheme;
}
