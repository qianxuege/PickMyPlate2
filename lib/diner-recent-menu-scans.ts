import type { DinerMenuScanListRow } from '@/lib/diner-menu-scans';

/**
 * When the same restaurant name appears on multiple scans, keeps only the first row.
 * Input must be ordered newest-first (as from `fetchDinerRecentScans`), so the kept row is the most recent.
 * Scans with no restaurant name are never merged—each stays visible.
 */
export function dedupeRecentMenuScansPreferNewest(rows: DinerMenuScanListRow[]): DinerMenuScanListRow[] {
  const seenRestaurantKeys = new Set<string>();
  const out: DinerMenuScanListRow[] = [];

  for (const row of rows) {
    const normalized = row.restaurant_name?.trim().toLowerCase();
    if (normalized && normalized.length > 0) {
      const key = `restaurant:${normalized}`;
      if (seenRestaurantKeys.has(key)) continue;
      seenRestaurantKeys.add(key);
    }
    out.push(row);
  }

  return out;
}
