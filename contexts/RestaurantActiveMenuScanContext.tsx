import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  clearStoredRestaurantActiveMenuScanId,
  getStoredRestaurantActiveMenuScanId,
  setStoredRestaurantActiveMenuScanId,
} from '@/lib/restaurant-active-menu-scan-storage';

type RestaurantActiveMenuScanContextValue = {
  activeScanId: string | null;
  hydrated: boolean;
  setActiveRestaurantMenuScan: (scanId: string | null) => Promise<void>;
};

const RestaurantActiveMenuScanContext = createContext<RestaurantActiveMenuScanContextValue | null>(null);

export function RestaurantActiveMenuScanProvider({ children }: { children: ReactNode }) {
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const id = await getStoredRestaurantActiveMenuScanId();
      if (!cancelled) {
        setActiveScanId(id);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveRestaurantMenuScan = useCallback(async (scanId: string | null) => {
    if (!scanId?.trim()) {
      setActiveScanId(null);
      await clearStoredRestaurantActiveMenuScanId();
      return;
    }
    const id = scanId.trim();
    setActiveScanId(id);
    await setStoredRestaurantActiveMenuScanId(id);
  }, []);

  const value = useMemo(
    () => ({ activeScanId, hydrated, setActiveRestaurantMenuScan }),
    [activeScanId, hydrated, setActiveRestaurantMenuScan]
  );

  return (
    <RestaurantActiveMenuScanContext.Provider value={value}>{children}</RestaurantActiveMenuScanContext.Provider>
  );
}

export function useRestaurantActiveMenuScan(): RestaurantActiveMenuScanContextValue {
  const ctx = useContext(RestaurantActiveMenuScanContext);
  if (!ctx) {
    throw new Error('useRestaurantActiveMenuScan must be used within RestaurantActiveMenuScanProvider');
  }
  return ctx;
}
