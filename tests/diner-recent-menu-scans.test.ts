import { dedupeRecentMenuScansPreferNewest } from '@/lib/diner-recent-menu-scans';
import type { DinerMenuScanListRow } from '@/lib/diner-menu-scans';

describe('dedupeRecentMenuScansPreferNewest', () => {
  it('keeps newest scan when duplicate restaurant names appear', () => {
    const rows: DinerMenuScanListRow[] = [
      { id: 'new', restaurant_name: 'Joe Pizza', scanned_at: '2026-04-16T12:00:00Z' },
      { id: 'old', restaurant_name: 'Joe Pizza', scanned_at: '2026-04-10T12:00:00Z' },
    ];
    expect(dedupeRecentMenuScansPreferNewest(rows)).toEqual([rows[0]]);
  });

  it('does not dedupe unnamed scans', () => {
    const rows: DinerMenuScanListRow[] = [
      { id: 'a', restaurant_name: null, scanned_at: '2026-04-16T12:00:00Z' },
      { id: 'b', restaurant_name: null, scanned_at: '2026-04-15T12:00:00Z' },
    ];
    expect(dedupeRecentMenuScansPreferNewest(rows)).toEqual(rows);
  });

  it('treats same restaurant name with different casing as duplicate', () => {
    const rows: DinerMenuScanListRow[] = [
      { id: '1', restaurant_name: 'Joe Pizza', scanned_at: '2026-04-16T12:00:00Z' },
      { id: '2', restaurant_name: 'JOE PIZZA', scanned_at: '2026-04-14T12:00:00Z' },
    ];
    expect(dedupeRecentMenuScansPreferNewest(rows)).toEqual([rows[0]]);
  });
});
