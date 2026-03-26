import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pickmyplate/pending_restaurant_menu_scan_v1';

export type PendingRestaurantMenuScan = {
  bucket: string;
  path: string;
  ts: number;
};

/** Persist last restaurant upload so processing screen can recover if route params are dropped. */
export async function writePendingRestaurantMenuScan(bucket: string, path: string): Promise<void> {
  const payload: PendingRestaurantMenuScan = { bucket, path, ts: Date.now() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function readPendingRestaurantMenuScan(): Promise<PendingRestaurantMenuScan | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingRestaurantMenuScan;
    if (typeof parsed.bucket === 'string' && typeof parsed.path === 'string') {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function clearPendingRestaurantMenuScan(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

