import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pickmyplate/diner_search_recent_v1';
const MAX_PER_SCAN = 8;

type RecentMap = Record<string, string[]>;

async function readAll(): Promise<RecentMap> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as RecentMap;
    }
  } catch {
    /* ignore */
  }
  return {};
}

async function writeAll(map: RecentMap): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * Recent search strings for a given menu scan (AsyncStorage only).
 */
export async function getRecentSearchesForScan(scanId: string): Promise<string[]> {
  const map = await readAll();
  const list = map[scanId];
  return Array.isArray(list) ? list.filter((s) => typeof s === 'string' && s.trim().length > 0) : [];
}

/**
 * Prepend a query to this scan's recents; dedupe case-insensitively; cap length.
 */
export async function addRecentSearchForScan(scanId: string, query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed || !scanId) return;

  const map = await readAll();
  const prev = map[scanId] ?? [];
  const lower = trimmed.toLowerCase();
  const next = [
    trimmed,
    ...prev.filter((s) => s.trim().toLowerCase() !== lower),
  ].slice(0, MAX_PER_SCAN);
  map[scanId] = next;
  await writeAll(map);
}
