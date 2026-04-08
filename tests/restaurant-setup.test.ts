import {
  upsertRestaurantForOwner,
  ensureRestaurantRole,
  ensureDinerRole,
  fetchRestaurantIdForOwner,
} from '@/lib/restaurant-setup';

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
  ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in'].forEach((m) => {
    chain[m] = jest.fn().mockReturnThis();
  });
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single      = jest.fn().mockResolvedValue(result);
  chain.then        = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

const NO_USER = { data: { user: null }, error: null };
const SIGNED_IN = { data: { user: { id: 'uid-1' } }, error: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue(SIGNED_IN);
});

// ---------------------------------------------------------------------------
// upsertRestaurantForOwner
// ---------------------------------------------------------------------------

describe('upsertRestaurantForOwner', () => {
  it('returns error when user is not signed in', async () => {
    mockGetUser.mockResolvedValue(NO_USER);
    const { error } = await upsertRestaurantForOwner({ name: 'Cafe', cuisineNames: [] });
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/not signed in/i);
  });

  it('returns error when cuisine lookup fails', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'cuisine error' } }));
    const { error } = await upsertRestaurantForOwner({ name: 'Cafe', cuisineNames: ['Italian'] });
    expect(error?.message).toBe('cuisine error');
  });

  it('updates existing restaurant and returns no error', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [], error: null });             // cuisines lookup
      if (callCount === 2) return makeChain({ data: { id: 'rest-1' }, error: null }); // existing restaurant
      if (callCount === 3) return makeChain({ data: null, error: null });             // update
      if (callCount === 4) return makeChain({ data: null, error: null });             // delete cuisine links
      return makeChain({ data: null, error: null });
    });
    const { error } = await upsertRestaurantForOwner({ name: 'Cafe', cuisineNames: [] });
    expect(error).toBeNull();
  });

  it('inserts new restaurant and returns no error', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [], error: null });               // cuisines lookup
      if (callCount === 2) return makeChain({ data: null, error: null });              // no existing restaurant
      if (callCount === 3) return makeChain({ data: { id: 'rest-new' }, error: null }); // insert
      if (callCount === 4) return makeChain({ data: null, error: null });              // delete cuisine links
      return makeChain({ data: null, error: null });
    });
    const { error } = await upsertRestaurantForOwner({ name: 'New Cafe', cuisineNames: [] });
    expect(error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ensureRestaurantRole
// ---------------------------------------------------------------------------

describe('ensureRestaurantRole', () => {
  it('returns error when user is not signed in', async () => {
    mockGetUser.mockResolvedValue(NO_USER);
    const { error } = await ensureRestaurantRole();
    expect(error?.message).toMatch(/not signed in/i);
  });

  it('returns no error on successful upsert', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const { error } = await ensureRestaurantRole();
    expect(error).toBeNull();
  });

  it('returns error when upsert fails', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'upsert failed' } }));
    const { error } = await ensureRestaurantRole();
    expect(error?.message).toBe('upsert failed');
  });
});

// ---------------------------------------------------------------------------
// ensureDinerRole
// ---------------------------------------------------------------------------

describe('ensureDinerRole', () => {
  it('returns error when user is not signed in', async () => {
    mockGetUser.mockResolvedValue(NO_USER);
    const { error } = await ensureDinerRole();
    expect(error?.message).toMatch(/not signed in/i);
  });

  it('returns no error on successful upsert', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const { error } = await ensureDinerRole();
    expect(error).toBeNull();
  });

  it('returns error when upsert fails', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'upsert failed' } }));
    const { error } = await ensureDinerRole();
    expect(error?.message).toBe('upsert failed');
  });
});

// ---------------------------------------------------------------------------
// fetchRestaurantIdForOwner
// ---------------------------------------------------------------------------

describe('fetchRestaurantIdForOwner', () => {
  it('returns error when user is not signed in', async () => {
    mockGetUser.mockResolvedValue(NO_USER);
    const { restaurantId, error } = await fetchRestaurantIdForOwner();
    expect(restaurantId).toBeNull();
    expect(error?.message).toMatch(/not signed in/i);
  });

  it('returns restaurantId when restaurant exists', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { id: 'rest-1' }, error: null }));
    const { restaurantId, error } = await fetchRestaurantIdForOwner();
    expect(restaurantId).toBe('rest-1');
    expect(error).toBeNull();
  });

  it('returns null restaurantId when owner has no restaurant', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const { restaurantId, error } = await fetchRestaurantIdForOwner();
    expect(restaurantId).toBeNull();
    expect(error).toBeNull();
  });

  it('returns error when query fails', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'query error' } }));
    const { restaurantId, error } = await fetchRestaurantIdForOwner();
    expect(restaurantId).toBeNull();
    expect(error?.message).toBe('query error');
  });
});
