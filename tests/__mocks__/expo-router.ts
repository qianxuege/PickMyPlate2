/**
 * Manual mock for expo-router
 */
export const useRouter = jest.fn(() => ({
  replace: jest.fn(),
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => false),
}));

export const useLocalSearchParams = jest.fn(() => ({}));
export const useSegments = jest.fn(() => []);
export const usePathname = jest.fn(() => '/');
export const Link = 'Link';
export const Redirect = 'Redirect';
export const Stack = { Screen: 'Screen' };
export const Tabs = { Screen: 'Screen' };
