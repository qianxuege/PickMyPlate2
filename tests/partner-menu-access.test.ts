import {
  buildPartnerMenuLink,
  buildPartnerMenuQrUrl,
  getOrCreateOwnerPartnerMenuToken,
  refreshPartnerLinkedDinerScanIfStale,
  resolvePartnerTokenToDinerScan,
} from '@/lib/partner-menu-access';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

jest.mock('@/lib/restaurant-fetch-menu-for-scan', () => ({
  fetchRestaurantMenuForScan: jest.fn(),
}));

import { supabase } from '@/lib/supabase';
import { fetchRestaurantMenuForScan } from '@/lib/restaurant-fetch-menu-for-scan';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom   = supabase.from as jest.Mock;
const mockFetchRestaurantMenu = fetchRestaurantMenuForScan as jest.Mock;

/** Build a fluent Supabase query chain that resolves to `result`. */
function makeChain(result: unknown = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in',
   'not', 'order', 'limit'].forEach((m) => {
    chain[m] = jest.fn().mockReturnThis();
  });
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single      = jest.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

/** Queue multiple results so successive from() calls get the right response. */
function queueFromResults(results: unknown[]) {
  let i = 0;
  mockFrom.mockImplementation(() => makeChain(results[i++] ?? { data: null, error: null }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  mockFrom.mockImplementation(() => makeChain());
  mockFetchRestaurantMenu.mockResolvedValue({ ok: false, error: 'not mocked' });
});

// ---------------------------------------------------------------------------
// buildPartnerMenuLink  (pure given expo-linking mock)
// ---------------------------------------------------------------------------

describe('buildPartnerMenuLink', () => {
  it('returns a string URL containing the token', () => {
    const link = buildPartnerMenuLink('tok123');
    expect(typeof link).toBe('string');
    expect(link).toContain('tok123');
  });

  it('includes the partner-menu path', () => {
    const link = buildPartnerMenuLink('abc');
    expect(link).toContain('partner-menu');
  });

  it('produces different links for different tokens', () => {
    expect(buildPartnerMenuLink('aaa')).not.toBe(buildPartnerMenuLink('bbb'));
  });
});

// ---------------------------------------------------------------------------
// buildPartnerMenuQrUrl  (pure given expo-linking mock)
// ---------------------------------------------------------------------------

describe('buildPartnerMenuQrUrl', () => {
  it('returns a URL pointing to the QR server', () => {
    const url = buildPartnerMenuQrUrl('tok123');
    expect(url).toContain('qrserver.com');
  });

  it('encodes the partner menu link as the data parameter', () => {
    const link = buildPartnerMenuLink('tok123');
    const url  = buildPartnerMenuQrUrl('tok123');
    expect(url).toContain(encodeURIComponent(link));
  });

  it('includes the 800x800 size', () => {
    const url = buildPartnerMenuQrUrl('tok123');
    expect(url).toContain('800x800');
  });
});

// ---------------------------------------------------------------------------
// getOrCreateOwnerPartnerMenuToken
// ---------------------------------------------------------------------------

describe('getOrCreateOwnerPartnerMenuToken', () => {
  it('returns ok:false when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await getOrCreateOwnerPartnerMenuToken();
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when no restaurant exists for the owner', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    const result = await getOrCreateOwnerPartnerMenuToken();
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when restaurant has no published menu', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFrom.mockImplementation(() =>
      makeChain({ data: { id: 'rest-1', name: 'Burger Place', published_menu_scan_id: null }, error: null })
    );
    const result = await getOrCreateOwnerPartnerMenuToken();
    expect(result.ok).toBe(false);
  });

  it('returns ok:true with existing active token when one exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    queueFromResults([
      // restaurants query
      { data: { id: 'rest-1', name: 'Burger Place', published_menu_scan_id: 'scan-1' }, error: null },
      // partner_menu_qr_tokens query (existing token)
      { data: { token: 'existing-token-abc' }, error: null },
    ]);
    const result = await getOrCreateOwnerPartnerMenuToken();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.token).toBe('existing-token-abc');
  });

  it('returns ok:true with newly created token when none exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    queueFromResults([
      // restaurants query
      { data: { id: 'rest-1', name: 'Burger Place', published_menu_scan_id: 'scan-1' }, error: null },
      // partner_menu_qr_tokens query (no existing token)
      { data: null, error: null },
      // insert new token
      { data: { token: 'new-token-xyz' }, error: null },
    ]);
    const result = await getOrCreateOwnerPartnerMenuToken();
    expect(result.ok).toBe(true);
    if (result.ok) expect(typeof result.token).toBe('string');
  });
});

// ---------------------------------------------------------------------------
// resolvePartnerTokenToDinerScan
// ---------------------------------------------------------------------------

describe('refreshPartnerLinkedDinerScanIfStale', () => {
  it('returns ok:false when not signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await refreshPartnerLinkedDinerScanIfStale('diner-scan-1');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when there is no partner QR link for this diner scan', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    const result = await refreshPartnerLinkedDinerScanIfStale('diner-scan-orphan');
    expect(result.ok).toBe(false);
  });
});

describe('resolvePartnerTokenToDinerScan', () => {
  it('returns ok:false for an empty token', async () => {
    const result = await resolvePartnerTokenToDinerScan('');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false for a whitespace-only token', async () => {
    const result = await resolvePartnerTokenToDinerScan('   ');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await resolvePartnerTokenToDinerScan('tok123');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when the user has no diner role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    // user_roles returns empty — no diner role
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));
    const result = await resolvePartnerTokenToDinerScan('tok123');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/diner/i);
  });

  it('returns ok:false when the token row is not found', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    queueFromResults([
      { data: [{ role: 'diner' }], error: null }, // user_roles
      { data: null, error: null },                 // partner_menu_qr_tokens → not found
    ]);
    const result = await resolvePartnerTokenToDinerScan('tok123');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when the token is inactive', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    queueFromResults([
      { data: [{ role: 'diner' }], error: null },
      { data: { restaurant_id: 'rest-1', scan_id: 'scan-1', is_active: false }, error: null },
    ]);
    const result = await resolvePartnerTokenToDinerScan('tok123');
    expect(result.ok).toBe(false);
  });

  it('returns ok:false when the source scan is not published', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    queueFromResults([
      { data: [{ role: 'diner' }], error: null },
      { data: { restaurant_id: 'rest-1', scan_id: 'scan-1', is_active: true }, error: null },
      { data: { id: 'scan-1', restaurant_id: 'rest-1', restaurant_name: 'Test', is_published: false, last_activity_at: null }, error: null },
    ]);
    const result = await resolvePartnerTokenToDinerScan('tok123');
    expect(result.ok).toBe(false);
  });

  it('returns ok:true with new scanId after successfully copying a restaurant menu', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFetchRestaurantMenu.mockResolvedValue({
      ok: true,
      scan: { id: 'scan-1', restaurant_name: 'Test Restaurant' },
      sections: [{ id: 'sec-1', title: 'Mains', sort_order: 0 }],
      dishes: [],
    });
    queueFromResults([
      { data: [{ role: 'diner' }], error: null },                                                                                    // user_roles
      { data: { restaurant_id: 'rest-1', scan_id: 'scan-1', is_active: true }, error: null },                                       // token row
      { data: { id: 'scan-1', restaurant_id: 'rest-1', restaurant_name: 'Test', is_published: true, last_activity_at: null }, error: null }, // source scan
      { data: null, error: null },                                                                                                   // cache miss
      { data: { id: 'new-scan-id' }, error: null },                                                                                  // insert diner_menu_scans
      { data: [{ id: 'new-sec-id', sort_order: 0 }], error: null },                                                                  // insert sections
      { data: null, error: null },                                                                                                   // upsert cache
    ]);
    const result = await resolvePartnerTokenToDinerScan('tok123');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.scanId).toBe('new-scan-id');
  });
});
