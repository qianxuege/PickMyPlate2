import {
  fetchFavoritedDishIds,
  isDishFavorited,
  toggleDishFavorite,
  fetchDinerFavoritesList,
  fetchFavoriteNote,
  upsertFavoriteNote,
  NOTE_MAX_LENGTH,
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
  ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order'].forEach((m) => {
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
        return makeChain({ data: [{ dish_id: 'dish-1', created_at: '2025-01-01T00:00:00Z', note: 'Loved the crunch' }], error: null });
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
      note: 'Loved the crunch',
    });
  });

  it('returns null note when the favorite row has no note', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: [{ dish_id: 'dish-1', created_at: '2025-01-02T00:00:00Z', note: null }], error: null });
      }
      if (callCount === 2) {
        return makeChain({
          data: [{
            id: 'dish-1', name: 'Pho',
            price_amount: null, price_currency: 'USD', price_display: null,
            spice_level: 0, image_url: null, section_id: 'sec-1',
          }],
          error: null,
        });
      }
      if (callCount === 3) return makeChain({ data: [{ id: 'sec-1', scan_id: 'scan-1' }], error: null });
      return makeChain({ data: [{ id: 'scan-1', restaurant_name: null }], error: null });
    });

    const [item] = await fetchDinerFavoritesList();
    expect(item.note).toBeNull();
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

// ---------------------------------------------------------------------------
// fetchFavoriteNote (US10)
// ---------------------------------------------------------------------------

describe('fetchFavoriteNote', () => {
  it('returns null when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await fetchFavoriteNote('dish-1')).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns the saved note for the signed-in user + dish', async () => {
    const chain = makeChain({ data: { note: 'Ask for extra sauce' }, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await fetchFavoriteNote('dish-1');
    expect(result).toBe('Ask for extra sauce');

    expect(mockFrom).toHaveBeenCalledWith('diner_favorite_dishes');
    expect(chain.select).toHaveBeenCalledWith('note');
    expect(chain.eq).toHaveBeenCalledWith('profile_id', 'uid-1');
    expect(chain.eq).toHaveBeenCalledWith('dish_id', 'dish-1');
  });

  it('returns null when the favorite row has no note stored', async () => {
    mockFrom.mockReturnValue(makeChain({ data: { note: null }, error: null }));
    expect(await fetchFavoriteNote('dish-1')).toBeNull();
  });

  it('returns null when no favorite row exists for the user + dish', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    expect(await fetchFavoriteNote('dish-1')).toBeNull();
  });

  it('throws when Supabase returns an error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'note fetch failed' } }));
    await expect(fetchFavoriteNote('dish-1')).rejects.toThrow('note fetch failed');
  });
});

// ---------------------------------------------------------------------------
// upsertFavoriteNote (US10)
// ---------------------------------------------------------------------------

describe('upsertFavoriteNote', () => {
  it('throws "Sign in required" when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(upsertFavoriteNote('dish-1', 'hello')).rejects.toThrow('Sign in required');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('saves a trimmed note scoped to the signed-in user + dish', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await upsertFavoriteNote('dish-1', '  Great with pickles  ');

    expect(mockFrom).toHaveBeenCalledWith('diner_favorite_dishes');
    expect(chain.update).toHaveBeenCalledWith({ note: 'Great with pickles' });
    expect(chain.eq).toHaveBeenCalledWith('profile_id', 'uid-1');
    expect(chain.eq).toHaveBeenCalledWith('dish_id', 'dish-1');
  });

  it('clears the note (sets to null) when passed an empty string', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await upsertFavoriteNote('dish-1', '');

    expect(chain.update).toHaveBeenCalledWith({ note: null });
  });

  it('clears the note (sets to null) when passed whitespace only', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    await upsertFavoriteNote('dish-1', '   \n\t  ');

    expect(chain.update).toHaveBeenCalledWith({ note: null });
  });

  it('accepts a note of exactly NOTE_MAX_LENGTH characters', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const exact = 'a'.repeat(NOTE_MAX_LENGTH);
    await expect(upsertFavoriteNote('dish-1', exact)).resolves.toBeUndefined();
    expect(chain.update).toHaveBeenCalledWith({ note: exact });
  });

  it('throws when the note exceeds NOTE_MAX_LENGTH characters', async () => {
    const tooLong = 'x'.repeat(NOTE_MAX_LENGTH + 1);
    await expect(upsertFavoriteNote('dish-1', tooLong)).rejects.toThrow(
      `Notes must be ${NOTE_MAX_LENGTH} characters or fewer.`
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('measures length after trimming (trailing whitespace does not push over the limit)', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const padded = '   ' + 'b'.repeat(NOTE_MAX_LENGTH) + '   ';
    await expect(upsertFavoriteNote('dish-1', padded)).resolves.toBeUndefined();
    expect(chain.update).toHaveBeenCalledWith({ note: 'b'.repeat(NOTE_MAX_LENGTH) });
  });

  it('throws when Supabase update returns an error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'update failed' } }));
    await expect(upsertFavoriteNote('dish-1', 'hi')).rejects.toThrow('update failed');
  });
});

// ---------------------------------------------------------------------------
// NOTE_MAX_LENGTH constant
// ---------------------------------------------------------------------------

describe('NOTE_MAX_LENGTH', () => {
  it('is 300 characters per US10 acceptance criteria', () => {
    expect(NOTE_MAX_LENGTH).toBe(300);
  });
});
