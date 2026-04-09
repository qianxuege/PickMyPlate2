import {
  fetchFavoritedDishIds,
  isDishFavorited,
  toggleDishFavorite,
  fetchDinerFavoritesList,
} from '@/lib/diner-favorites';

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
  ['select', 'insert', 'delete', 'eq', 'in', 'order'].forEach((m) => {
    chain[m] = jest.fn().mockReturnThis();
  });
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single      = jest.fn().mockResolvedValue(result);
  chain.then        = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
});

// ---------------------------------------------------------------------------
// fetchFavoritedDishIds
// ---------------------------------------------------------------------------

describe('fetchFavoritedDishIds', () => {
  it('returns empty Set when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await fetchFavoritedDishIds();
    expect(result).toEqual(new Set());
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns a Set of dish ids for the signed-in user', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [{ dish_id: 'dish-1' }, { dish_id: 'dish-2' }], error: null }));
    const result = await fetchFavoritedDishIds();
    expect(result).toEqual(new Set(['dish-1', 'dish-2']));
  });

  it('throws when Supabase returns an error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'db error' } }));
    await expect(fetchFavoritedDishIds()).rejects.toThrow('db error');
  });
});

// ---------------------------------------------------------------------------
// isDishFavorited
// ---------------------------------------------------------------------------

describe('isDishFavorited', () => {
  it('returns false when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await isDishFavorited('dish-1')).toBe(false);
  });

  it('returns true when the dish is in the favorites table', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { dish_id: 'dish-1' }, error: null }));
    expect(await isDishFavorited('dish-1')).toBe(true);
  });

  it('returns false when the dish is not favorited', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await isDishFavorited('dish-1')).toBe(false);
  });

  it('throws when Supabase returns an error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'query failed' } }));
    await expect(isDishFavorited('dish-1')).rejects.toThrow('query failed');
  });
});

// ---------------------------------------------------------------------------
// toggleDishFavorite
// ---------------------------------------------------------------------------

describe('toggleDishFavorite', () => {
  it('throws when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(toggleDishFavorite('dish-1')).rejects.toThrow('Sign in required');
  });

  it('deletes the favorite and returns false when dish is already favorited', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: { dish_id: 'dish-1' }, error: null }); // existing check
      return makeChain({ data: null, error: null }); // delete
    });
    expect(await toggleDishFavorite('dish-1')).toBe(false);
  });

  it('inserts a favorite and returns true when dish is not yet favorited', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: null, error: null }); // not existing
      return makeChain({ data: null, error: null }); // insert
    });
    expect(await toggleDishFavorite('dish-1')).toBe(true);
  });

  it('throws when the select query errors', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'select error' } }));
    await expect(toggleDishFavorite('dish-1')).rejects.toThrow('select error');
  });

  it('throws when the delete query errors', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: { dish_id: 'dish-1' }, error: null }); // existing found
      return makeChain({ data: null, error: { message: 'delete error' } }); // delete fails
    });
    await expect(toggleDishFavorite('dish-1')).rejects.toThrow('delete error');
  });

  it('throws when the insert query errors', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: null, error: null }); // not existing
      return makeChain({ data: null, error: { message: 'insert error' } }); // insert fails
    });
    await expect(toggleDishFavorite('dish-1')).rejects.toThrow('insert error');
  });
});

// ---------------------------------------------------------------------------
// fetchDinerFavoritesList
// ---------------------------------------------------------------------------

describe('fetchDinerFavoritesList', () => {
  it('returns empty array when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await fetchDinerFavoritesList()).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns empty array when user has no favorites', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    expect(await fetchDinerFavoritesList()).toEqual([]);
  });

  it('returns mapped list items with restaurant name', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // diner_favorite_dishes
        return makeChain({ data: [{ dish_id: 'dish-1', created_at: '2025-01-01T00:00:00Z' }], error: null });
      }
      if (callCount === 2) {
        // diner_scanned_dishes
        return makeChain({
          data: [{
            id: 'dish-1', name: 'Spring Roll',
            price_amount: 8.99, price_currency: 'USD', price_display: '$8.99',
            spice_level: 1, image_url: null, section_id: 'sec-1',
          }],
          error: null,
        });
      }
      if (callCount === 3) {
        // diner_menu_sections
        return makeChain({ data: [{ id: 'sec-1', scan_id: 'scan-1' }], error: null });
      }
      // diner_menu_scans
      return makeChain({ data: [{ id: 'scan-1', restaurant_name: 'Test Restaurant' }], error: null });
    });

    const result = await fetchDinerFavoritesList();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      dishId: 'dish-1',
      favoritedAt: '2025-01-01T00:00:00Z',
      name: 'Spring Roll',
      restaurantName: 'Test Restaurant',
      scanId: 'scan-1',
      priceAmount: 8.99,
      priceCurrency: 'USD',
      priceDisplay: '$8.99',
      spiceLevel: 1,
      imageUrl: null,
    });
  });

  it('throws when the favorites query errors', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'favs error' } }));
    await expect(fetchDinerFavoritesList()).rejects.toThrow('favs error');
  });

  it('throws when the dishes query errors', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [{ dish_id: 'dish-1', created_at: '2025-01-01T00:00:00Z' }], error: null });
      return makeChain({ data: null, error: { message: 'dishes error' } }); // diner_scanned_dishes fails
    });
    await expect(fetchDinerFavoritesList()).rejects.toThrow('dishes error');
  });

  it('throws when the sections query errors', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [{ dish_id: 'dish-1', created_at: '2025-01-01T00:00:00Z' }], error: null });
      if (callCount === 2) return makeChain({ data: [{ id: 'dish-1', name: 'Spring Roll', price_amount: null, price_currency: 'USD', price_display: null, spice_level: 0, image_url: null, section_id: 'sec-1' }], error: null });
      return makeChain({ data: null, error: { message: 'sections error' } }); // diner_menu_sections fails
    });
    await expect(fetchDinerFavoritesList()).rejects.toThrow('sections error');
  });

  it('throws when the scans query errors', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: [{ dish_id: 'dish-1', created_at: '2025-01-01T00:00:00Z' }], error: null });
      if (callCount === 2) return makeChain({ data: [{ id: 'dish-1', name: 'Spring Roll', price_amount: null, price_currency: 'USD', price_display: null, spice_level: 0, image_url: null, section_id: 'sec-1' }], error: null });
      if (callCount === 3) return makeChain({ data: [{ id: 'sec-1', scan_id: 'scan-1' }], error: null });
      return makeChain({ data: null, error: { message: 'scans error' } }); // diner_menu_scans fails
    });
    await expect(fetchDinerFavoritesList()).rejects.toThrow('scans error');
  });
});
