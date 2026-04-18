import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearStoredActiveDinerMenuScanId,
  getStoredActiveDinerMenuScanId,
  setStoredActiveDinerMenuScanId,
} from '@/lib/diner-active-menu-scan-storage';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('diner-active-menu-scan-storage', () => {
  it('returns null when nothing stored', async () => {
    expect(await getStoredActiveDinerMenuScanId()).toBeNull();
  });

  it('round-trips a scan id', async () => {
    await setStoredActiveDinerMenuScanId('  scan-abc  ');
    expect(await getStoredActiveDinerMenuScanId()).toBe('scan-abc');
  });

  it('clears stored id', async () => {
    await setStoredActiveDinerMenuScanId('scan-1');
    await clearStoredActiveDinerMenuScanId();
    expect(await getStoredActiveDinerMenuScanId()).toBeNull();
  });

  it('ignores empty set', async () => {
    await setStoredActiveDinerMenuScanId('   ');
    expect(await getStoredActiveDinerMenuScanId()).toBeNull();
  });
});
