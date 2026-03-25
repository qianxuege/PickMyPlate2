import { Colors } from '@/constants/theme';

export type ThemeColorKey = keyof typeof Colors;

export function useThemeColor(colorName: ThemeColorKey): string {
  return Colors[colorName];
}
