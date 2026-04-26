import {
  fetchRestaurantProfile,
  updateRestaurantProfile,
  upsertRestaurantProfileFromForm,
  updateRestaurantLogoUrl,
  type RestaurantProfileUpdate,
} from '@/lib/restaurant-profile';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

const mockGetUser = supabase.auth.getUser as jest.Mock;
const mockFrom    = supabase.from as jest.Mock;

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'eq', 'in'].forEach((m) => {
    chain[m] = jest.fn().mockReturnThis();
  });
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single      = jest.fn().mockResolvedValue(result);
  chain.then        = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

const NO_USER   = { data: { user: null }, error: null };
const SIGNED_IN = { data: { user: { id: 'uid-1' } }, error: null };

function validPayload(overrides: Partial<RestaurantProfileUpdate> = {}): RestaurantProfileUpdate {
  return {
    name: 'Test Restaurant',
    specialty: 'Italian',
    cuisine_names: [],
    address: '123 Main St',
    phone: '555-0100',
    hours_text: 'Mon-Fri 9-5',
    website: 'https://example.com',
    price_range: '$$',
    logo_url: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue(SIGNED_IN);
});

// ---------------------------------------------------------------------------
// fetchRestaurantProfile
// ---------------------------------------------------------------------------

describe('fetchRestaurantProfile', () => {
  it('returns null when user is not signed in', async () => {
    mockGetUser.mockResolvedValue(NO_USER);
    expect(await fetchRestaurantProfile()).toBeNull();
  });

  it('returns null when owner has no restaurant row', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchRestaurantProfile()).toBeNull();
  });

  it('returns profile with cuisine labels joined', async () => {
    let callCount = 0;
    const lookupChain = makeChain({
      data: { id: 'rest-1', owner_id: 'uid-1', name: 'Cafe', specialty: null,
              location_short: null, address: null, phone: null, hours_text: null,
              website: null, logo_url: null, price_range: null },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) return lookupChain;                                          // restaurants
      if (callCount === 2) return makeChain({ data: [{ cuisine_id: 'c-1' }], error: null }); // junction
      return makeChain({ data: [{ name: 'Italian' }], error: null });                   // cuisines
    });

    const snapshot = await fetchRestaurantProfile();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.restaurant.name).toBe('Cafe');
    expect(snapshot?.cuisineLabels).toBe('Italian');
    expect(snapshot?.cuisineNames).toEqual(['Italian']);
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'restaurants');
    expect(lookupChain.eq as jest.Mock).toHaveBeenCalledWith('owner_id', 'uid-1');
  });

  it('falls back to specialty when no cuisines are linked', async () => {
    let callCount = 0;
    const lookupChain = makeChain({
      data: { id: 'rest-1', owner_id: 'uid-1', name: 'Cafe', specialty: 'Fusion',
              location_short: null, address: null, phone: null, hours_text: null,
              website: null, logo_url: null, price_range: null },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) return lookupChain;                     // restaurants
      return makeChain({ data: [], error: null });                  // junction — empty
    });

    const snapshot = await fetchRestaurantProfile();
    expect(snapshot?.cuisineLabels).toBe('Fusion');
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'restaurants');
    expect(lookupChain.eq as jest.Mock).toHaveBeenCalledWith('owner_id', 'uid-1');
  });
});

// ---------------------------------------------------------------------------
// updateRestaurantProfile
// ---------------------------------------------------------------------------

describe('updateRestaurantProfile', () => {
  it('updates the restaurants table with eq("id") and returns no error', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const { error } = await updateRestaurantProfile('rest-1', validPayload());
    expect(error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('restaurants');
    expect(chain.eq as jest.Mock).toHaveBeenCalledWith('id', 'rest-1');
  });

  it('trims whitespace from fields before saving', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    await updateRestaurantProfile('rest-1', validPayload({ name: '  Cafe  ', specialty: '  Italian  ' }));
    expect(chain.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Cafe', specialty: 'Italian' })
    );
  });

  it('returns error when update query fails', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'update error' } }));
    const { error } = await updateRestaurantProfile('rest-1', validPayload());
    expect(error?.message).toBe('update error');
  });
});

// ---------------------------------------------------------------------------
// upsertRestaurantProfileFromForm
// ---------------------------------------------------------------------------

describe('upsertRestaurantProfileFromForm', () => {
  it('returns error when user is not signed in', async () => {
    mockGetUser.mockResolvedValue(NO_USER);
    const { error } = await upsertRestaurantProfileFromForm(validPayload());
    expect(error?.message).toMatch(/not signed in/i);
  });

  it('updates existing restaurant when one exists', async () => {
    const tablesSeen: string[] = [];
    const lookupChain = makeChain({ data: { id: 'rest-1' }, error: null });
    mockFrom.mockImplementation((table: string) => {
      tablesSeen.push(table);
      if (table === 'restaurants' && tablesSeen.length === 1) return lookupChain; // existing lookup
      return makeChain({ data: [], error: null });
    });
    const { error } = await upsertRestaurantProfileFromForm(validPayload());
    expect(error).toBeNull();
    expect(tablesSeen[0]).toBe('restaurants'); // lookup
    expect(tablesSeen).toContain('restaurants'); // update via updateRestaurantProfile
    expect(tablesSeen).toContain('cuisines');
    expect(tablesSeen).toContain('restaurant_cuisine_types');
    expect(lookupChain.eq as jest.Mock).toHaveBeenCalledWith('owner_id', 'uid-1');
  });

  it('inserts new restaurant when none exists', async () => {
    const tablesSeen: string[] = [];
    const lookupChain = makeChain({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      tablesSeen.push(table);
      if (table === 'restaurants' && tablesSeen.length === 1) return lookupChain; // no existing
      if (table === 'restaurants') return makeChain({ data: { id: 'rest-1' }, error: null }); // insert + select
      return makeChain({ data: [], error: null });
    });
    const { error } = await upsertRestaurantProfileFromForm(validPayload());
    expect(error).toBeNull();
    expect(tablesSeen[0]).toBe('restaurants');
    expect(tablesSeen).toContain('cuisines');
    expect(tablesSeen).toContain('restaurant_cuisine_types');
    expect(lookupChain.eq as jest.Mock).toHaveBeenCalledWith('owner_id', 'uid-1');
  });

  it('falls through to insert when existing-restaurant lookup errors (documents bug: lookup error is ignored)', async () => {
    // The implementation uses `const { data: existing }` without destructuring the error,
    // so a lookup failure silently falls through to the insert path.
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (callCount === 1) return makeChain({ data: null, error: { message: 'lookup error' } }); // erroring lookup
      if (table === 'restaurants') return makeChain({ data: { id: 'rest-1' }, error: null }); // insert proceeds anyway
      return makeChain({ data: [], error: null });
    });
    const { error } = await upsertRestaurantProfileFromForm(validPayload());
    // Bug: lookup error is swallowed; insert runs and succeeds
    expect(error).toBeNull();
    expect(callCount).toBeGreaterThanOrEqual(4); // lookup + insert + cuisine link sync calls
  });
});

// ---------------------------------------------------------------------------
// updateRestaurantLogoUrl
// ---------------------------------------------------------------------------

describe('updateRestaurantLogoUrl', () => {
  it('returns error when user is not signed in', async () => {
    mockGetUser.mockResolvedValue(NO_USER);
    const { error } = await updateRestaurantLogoUrl('https://example.com/logo.png');
    expect(error?.message).toMatch(/not signed in/i);
  });

  it('returns error when owner has no restaurant', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const { error } = await updateRestaurantLogoUrl('https://example.com/logo.png');
    expect(error?.message).toMatch(/no restaurant found/i);
  });

  it('returns "No restaurant found" when lookup query itself errors (documents: lookup error is rewritten)', async () => {
    // Implementation drops the lookup error and replaces it with a generic message.
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'db timeout' } }));
    const { error } = await updateRestaurantLogoUrl('https://example.com/logo.png');
    expect(error?.message).toMatch(/no restaurant found/i); // original 'db timeout' is swallowed
  });

  it('updates the restaurants table with eq("id") and returns no error', async () => {
    const lookupChain = makeChain({ data: { id: 'rest-1' }, error: null });
    const updateChain = makeChain({ data: null, error: null });
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return lookupChain; // lookup
      return updateChain;                       // update
    });
    const { error } = await updateRestaurantLogoUrl('https://example.com/logo.png');
    expect(error).toBeNull();
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'restaurants');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'restaurants');
    expect(lookupChain.eq as jest.Mock).toHaveBeenCalledWith('owner_id', 'uid-1');
    expect(updateChain.eq as jest.Mock).toHaveBeenCalledWith('id', 'rest-1');
  });
});
