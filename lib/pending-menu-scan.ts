import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pickmyplate/pending_menu_scan_v1';

export type PendingMenuScan = {
  bucket: string;
  path: string;
  ts: number;
};

/** Persist last upload so processing screen can recover if route params are dropped (Expo Router quirk). */
export async function writePendingMenuScan(bucket: string, path: string): Promise<void> {
  const payload: PendingMenuScan = { bucket, path, ts: Date.now() };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function readPendingMenuScan(): Promise<PendingMenuScan | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingMenuScan;
    if (typeof parsed.bucket === 'string' && typeof parsed.path === 'string') {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function clearPendingMenuScan(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
