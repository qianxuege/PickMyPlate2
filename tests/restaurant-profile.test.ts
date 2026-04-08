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
  ['select', 'insert', 'update', 'eq', 'in'].forEach((m) => {
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
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // restaurants
        return makeChain({
          data: { id: 'rest-1', owner_id: 'uid-1', name: 'Cafe', specialty: null,
                  location_short: null, address: null, phone: null, hours_text: null,
                  website: null, logo_url: null, price_range: null },
          error: null,
        });
      }
      if (callCount === 2) {
        // restaurant_cuisine_types
        return makeChain({ data: [{ cuisine_id: 'c-1' }], error: null });
      }
      // cuisines
      return makeChain({ data: [{ name: 'Italian' }], error: null });
    });

    const snapshot = await fetchRestaurantProfile();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.restaurant.name).toBe('Cafe');
    expect(snapshot?.cuisineLabels).toBe('Italian');
  });

  it('falls back to specialty when no cuisines are linked', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({
          data: { id: 'rest-1', owner_id: 'uid-1', name: 'Cafe', specialty: 'Fusion',
                  location_short: null, address: null, phone: null, hours_text: null,
                  website: null, logo_url: null, price_range: null },
          error: null,
        });
      }
      // restaurant_cuisine_types — empty
      return makeChain({ data: [], error: null });
    });

    const snapshot = await fetchRestaurantProfile();
    expect(snapshot?.cuisineLabels).toBe('Fusion');
  });
});

// ---------------------------------------------------------------------------
// updateRestaurantProfile
// ---------------------------------------------------------------------------

describe('updateRestaurantProfile', () => {
  it('returns no error on successful update', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const { error } = await updateRestaurantProfile('rest-1', validPayload());
    expect(error).toBeNull();
  });

  it('trims whitespace from fields before saving', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    await updateRestaurantProfile('rest-1', validPayload({ name: '  Cafe  ', specialty: '  Italian  ' }));
    const updateFn = chain.update as jest.Mock;
    expect(updateFn).toHaveBeenCalledWith(
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
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: { id: 'rest-1' }, error: null }); // existing lookup
      return makeChain({ data: null, error: null }); // update
    });
    const { error } = await upsertRestaurantProfileFromForm(validPayload());
    expect(error).toBeNull();
  });

  it('inserts new restaurant when none exists', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: null, error: null }); // no existing
      return makeChain({ data: null, error: null }); // insert
    });
    const { error } = await upsertRestaurantProfileFromForm(validPayload());
    expect(error).toBeNull();
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

  it('updates logo_url and returns no error', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: { id: 'rest-1' }, error: null }); // existing
      return makeChain({ data: null, error: null }); // update
    });
    const { error } = await updateRestaurantLogoUrl('https://example.com/logo.png');
    expect(error).toBeNull();
  });
});
