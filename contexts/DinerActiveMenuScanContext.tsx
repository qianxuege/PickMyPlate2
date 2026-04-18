import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  clearStoredActiveDinerMenuScanId,
  getStoredActiveDinerMenuScanId,
  setStoredActiveDinerMenuScanId,
} from '@/lib/diner-active-menu-scan-storage';

type DinerActiveMenuScanContextValue = {
  /** Last menu the diner chose or opened; persisted for tab navigation. */
  activeScanId: string | null;
  /** True after the first AsyncStorage read completes. */
  hydrated: boolean;
  setActiveDinerMenuScan: (scanId: string | null) => Promise<void>;
};

const DinerActiveMenuScanContext = createContext<DinerActiveMenuScanContextValue | null>(null);

export function DinerActiveMenuScanProvider({ children }: { children: ReactNode }) {
  const [activeScanId, setActiveScanId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const id = await getStoredActiveDinerMenuScanId();
      if (!cancelled) {
        setActiveScanId(id);
        setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveDinerMenuScan = useCallback(async (scanId: string | null) => {
    if (!scanId?.trim()) {
      setActiveScanId(null);
      await clearStoredActiveDinerMenuScanId();
      return;
    }
    const id = scanId.trim();
    setActiveScanId(id);
    await setStoredActiveDinerMenuScanId(id);
  }, []);

  const value = useMemo(
    () => ({ activeScanId, hydrated, setActiveDinerMenuScan }),
    [activeScanId, hydrated, setActiveDinerMenuScan]
  );

  return <DinerActiveMenuScanContext.Provider value={value}>{children}</DinerActiveMenuScanContext.Provider>;
}

export function useDinerActiveMenuScan(): DinerActiveMenuScanContextValue {
  const ctx = useContext(DinerActiveMenuScanContext);
  if (!ctx) {
    throw new Error('useDinerActiveMenuScan must be used within DinerActiveMenuScanProvider');
  }
  return ctx;
}
