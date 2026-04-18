import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@pickmyplate/restaurant-active-menu-scan-v1';

export async function getStoredRestaurantActiveMenuScanId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return null;
    return raw.trim();
  } catch {
    return null;
  }
}

export async function setStoredRestaurantActiveMenuScanId(scanId: string): Promise<void> {
  const id = scanId?.trim();
  if (!id) return;
  await AsyncStorage.setItem(STORAGE_KEY, id);
}

export async function clearStoredRestaurantActiveMenuScanId(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
