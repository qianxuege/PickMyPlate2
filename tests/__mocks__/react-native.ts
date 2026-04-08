/**
 * Minimal mock for react-native — only the subset used by lib/ files under test.
 */
export const Platform = {
  OS: 'ios',
  select: (obj: Record<string, unknown>) => obj.ios ?? obj.default,
};

export const StyleSheet = {
  create: <T extends Record<string, unknown>>(styles: T) => styles,
  flatten: (style: unknown) => style,
};

export const Alert = {
  alert: jest.fn(),
};

export const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812 })),
};
