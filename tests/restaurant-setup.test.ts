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

  it('returns the auth error object when getUser itself errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('auth service error') });
    const { error } = await upsertRestaurantForOwner({ name: 'Cafe', cuisineNames: [] });
    expect(error?.message).toBe('auth service error');
  });

  it('returns error when cuisine lookup fails', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'cuisine error' } }));
    const { error } = await upsertRestaurantForOwner({ name: 'Cafe', cuisineNames: ['Italian'] });
    expect(error?.message).toBe('cuisine error');
  });

  it('runs update on restaurants table and delete on cuisine links for existing restaurant', async () => {
    const tablesSeen: string[] = [];
    const chainAt: Array<Record<string, unknown>> = [];
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      tablesSeen.push(table);
      const c = callCount === 1 ? makeChain({ data: [], error: null })              // cuisines
               : callCount === 2 ? makeChain({ data: { id: 'rest-1' }, error: null }) // existing
               : makeChain({ data: null, error: null });                              // update / delete
      chainAt.push(c);
      return c;
    });
    const { error } = await upsertRestaurantForOwner({ name: 'Cafe', cuisineNames: [] });
    expect(error).toBeNull();
    expect(tablesSeen[0]).toBe('cuisines');
    expect(tablesSeen[1]).toBe('restaurants');   // lookup
    expect(tablesSeen[2]).toBe('restaurants');   // update
    expect(tablesSeen[3]).toBe('restaurant_cuisine_types'); // delete
    expect(chainAt[2].update as jest.Mock).toHaveBeenCalled();
  });

  it('returns error when restaurant update fails', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [], error: null });                            // cuisines
      if (callCount === 2) return makeChain({ data: { id: 'rest-1' }, error: null });              // existing
      return makeChain({ data: null, error: { message: 'update failed' } });                       // update fails
    });
    const { error } = await upsertRestaurantForOwner({ name: 'Cafe', cuisineNames: [] });
    expect(error?.message).toBe('update failed');
  });

  it('runs insert on restaurants table and delete on cuisine links for new restaurant', async () => {
    const tablesSeen: string[] = [];
    const chainAt: Array<Record<string, unknown>> = [];
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      tablesSeen.push(table);
      const c = callCount === 1 ? makeChain({ data: [], error: null })                   // cuisines
               : callCount === 2 ? makeChain({ data: null, error: null })                // no existing
               : callCount === 3 ? makeChain({ data: { id: 'rest-new' }, error: null })  // insert
               : makeChain({ data: null, error: null });                                  // delete
      chainAt.push(c);
      return c;
    });
    const { error } = await upsertRestaurantForOwner({ name: 'New Cafe', cuisineNames: [] });
    expect(error).toBeNull();
    expect(tablesSeen[2]).toBe('restaurants');   // insert
    expect(tablesSeen[3]).toBe('restaurant_cuisine_types'); // delete
    expect(chainAt[2].insert as jest.Mock).toHaveBeenCalled();
  });

  it('returns error when restaurant insert fails', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [], error: null });                     // cuisines
      if (callCount === 2) return makeChain({ data: null, error: null });                   // no existing
      return makeChain({ data: null, error: { message: 'insert failed' } });                // insert fails
    });
    const { error } = await upsertRestaurantForOwner({ name: 'New Cafe', cuisineNames: [] });
    expect(error?.message).toBe('insert failed');
  });

  it('returns error when insert returns no id', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [], error: null });    // cuisines
      if (callCount === 2) return makeChain({ data: null, error: null });  // no existing
      return makeChain({ data: {}, error: null });                         // insert returns no id
    });
    const { error } = await upsertRestaurantForOwner({ name: 'New Cafe', cuisineNames: [] });
    expect(error?.message).toMatch(/missing restaurant id/i);
  });

  it('returns error when deleting cuisine links fails', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [], error: null });               // cuisines
      if (callCount === 2) return makeChain({ data: { id: 'rest-1' }, error: null }); // existing
      if (callCount === 3) return makeChain({ data: null, error: null });              // update succeeds
      return makeChain({ data: null, error: { message: 'delete links failed' } });    // delete fails
    });
    const { error } = await upsertRestaurantForOwner({ name: 'Cafe', cuisineNames: [] });
    expect(error?.message).toBe('delete links failed');
  });

  it('deletes then re-inserts cuisine links and returns error when junction insert fails', async () => {
    const tablesSeen: string[] = [];
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      tablesSeen.push(table);
      if (callCount === 1) return makeChain({ data: [{ id: 'c-1' }], error: null });  // cuisines found
      if (callCount === 2) return makeChain({ data: { id: 'rest-1' }, error: null }); // existing
      if (callCount === 3) return makeChain({ data: null, error: null });              // update
      if (callCount === 4) return makeChain({ data: null, error: null });              // delete links
      return makeChain({ data: null, error: { message: 'junction error' } });         // junction insert fails
    });
    const { error } = await upsertRestaurantForOwner({ name: 'Cafe', cuisineNames: ['Italian'] });
    expect(error?.message).toBe('junction error');
    expect(tablesSeen[3]).toBe('restaurant_cuisine_types'); // delete
    expect(tablesSeen[4]).toBe('restaurant_cuisine_types'); // insert
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
