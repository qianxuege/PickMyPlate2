/**
 * Manual mock for expo-linking
 */
export const createURL = jest.fn((path: string, opts?: { queryParams?: Record<string, string> }) => {
  const base = `pickmyplate://${path}`;
  if (opts?.queryParams) {
    const qs = new URLSearchParams(opts.queryParams as Record<string, string>).toString();
    return `${base}?${qs}`;
  }
  return base;
});

export const openURL = jest.fn(async (_url: string) => {});
export const canOpenURL = jest.fn(async (_url: string) => true);
export const getInitialURL = jest.fn(async () => null);
export const addEventListener = jest.fn(() => ({ remove: jest.fn() }));
