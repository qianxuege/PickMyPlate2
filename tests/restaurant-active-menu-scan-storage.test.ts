import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearStoredRestaurantActiveMenuScanId,
  getStoredRestaurantActiveMenuScanId,
  setStoredRestaurantActiveMenuScanId,
} from '@/lib/restaurant-active-menu-scan-storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('restaurant-active-menu-scan-storage', () => {
  it('returns null when nothing stored', async () => {
    expect(await getStoredRestaurantActiveMenuScanId()).toBeNull();
  });

  it('round-trips a scan id', async () => {
    await setStoredRestaurantActiveMenuScanId('  scan-xyz  ');
    expect(await getStoredRestaurantActiveMenuScanId()).toBe('scan-xyz');
  });

  it('clears stored id', async () => {
    await setStoredRestaurantActiveMenuScanId('scan-1');
    await clearStoredRestaurantActiveMenuScanId();
    expect(await getStoredRestaurantActiveMenuScanId()).toBeNull();
  });

  it('ignores empty set', async () => {
    await setStoredRestaurantActiveMenuScanId('   ');
    expect(await getStoredRestaurantActiveMenuScanId()).toBeNull();
  });
});
