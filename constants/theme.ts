/**
 * PickMyPlate Design System
 * Based on wireframes in UserInterfaces/
 */

import { Platform } from 'react-native';

// Colors
export const Colors = {
  primary: '#FF6A3D',
  background: '#FFFFFF',
  text: '#101828',
  textSecondary: '#667085',
  textPlaceholder: '#A0AEC0',
  error: '#E53E3E',
  border: '#D0D5DD',
  borderLight: '#E2E8F0',
  errorBackground: '#FEF3F2',
  primaryLight: '#FFF0EB',
  white: '#FFFFFF',
} as const;

// Spacing scale (in pixels)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

// Border radius
export const BorderRadius = {
  sm: 8,
  md: 10,
  base: 12,
  lg: 16,
  full: 9999,
} as const;

// Typography
export const Typography = {
  heading: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  headingSmall: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  captionMedium: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
} as const;

// Component dimensions
export const Dimensions = {
  inputHeight: 50,
  buttonHeight: 50,
  iconSize: 20,
} as const;

// Shadows (for primary button)
export const Shadows = {
  primary: Platform.select({
    ios: {
      shadowColor: '#FF6A3D',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
} as const;

export const Theme = {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Dimensions,
  Shadows,
} as const;
