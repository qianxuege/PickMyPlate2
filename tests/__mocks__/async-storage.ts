/**
 * Manual mock for @react-native-async-storage/async-storage
 */
const store: Record<string, string> = {};

const AsyncStorage = {
  getItem: jest.fn(async (key: string) => store[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => { store[key] = value; }),
  removeItem: jest.fn(async (key: string) => { delete store[key]; }),
  clear: jest.fn(async () => { Object.keys(store).forEach((k) => delete store[k]); }),
  getAllKeys: jest.fn(async () => Object.keys(store)),
  multiGet: jest.fn(async (keys: string[]) => keys.map((k) => [k, store[k] ?? null])),
  multiSet: jest.fn(async (pairs: [string, string][]) => { pairs.forEach(([k, v]) => { store[k] = v; }); }),
  multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => { delete store[k]; }); }),
  _reset: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

export default AsyncStorage;
