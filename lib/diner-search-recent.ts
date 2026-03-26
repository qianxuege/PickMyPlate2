import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pickmyplate/diner-search-recents-v2';
const MAX_ITEMS = 8;

type RecentsStore = Record<string, string[]>;

async function readStore(): Promise<RecentsStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as RecentsStore;
  } catch {
    return {};
  }
}

async function writeStore(store: RecentsStore): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Recent query strings for this menu scan only (Figma / US4). */
export async function loadDinerSearchRecents(scanId: string): Promise<string[]> {
  if (!scanId?.trim()) return [];
  const store = await readStore();
  const list = store[scanId.trim()];
  if (!Array.isArray(list)) return [];
  return list.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

/** Saves a trimmed query (min 2 chars) for this scan. */
export async function addDinerSearchRecent(scanId: string, term: string): Promise<void> {
  const id = scanId?.trim();
  const t = term.trim();
  if (!id || t.length < 2) return;
  const store = await readStore();
  const prev = store[id] ?? [];
  const next = [t, ...prev.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_ITEMS);
  store[id] = next;
  await writeStore(store);
}
