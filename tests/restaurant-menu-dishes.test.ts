import {
  getRestaurantSectionNextDishSortOrder,
  createRestaurantDishDraft,
  touchRestaurantMenuScan,
  saveRestaurantDish,
  updateRestaurantDishHighlightFlags,
  type SaveRestaurantDishInput,
} from '@/lib/restaurant-menu-dishes';

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '@/lib/supabase';

const mockFrom = supabase.from as jest.Mock;

/** Build a fluent Supabase query chain that resolves to `result`. */
function makeChain(result: unknown = { data: null, error: null }) {
  const chain: Record<string, unknown> = {};
  ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'in', 'order', 'limit'].forEach(
    (m) => { chain[m] = jest.fn().mockReturnThis(); }
  );
  chain.maybeSingle = jest.fn().mockResolvedValue(result);
  chain.single     = jest.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockFrom.mockImplementation(() => makeChain());
});

// ---------------------------------------------------------------------------
// getRestaurantSectionNextDishSortOrder
// ---------------------------------------------------------------------------

describe('getRestaurantSectionNextDishSortOrder', () => {
  it('returns 0 when the section has no dishes', async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }));
    const result = await getRestaurantSectionNextDishSortOrder('sec-1');
    expect(result).toBe(0);
  });

  it('queries restaurant_menu_dishes with correct section filter, order, and limit', async () => {
    const chain = makeChain({ data: [{ sort_order: 4 }], error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getRestaurantSectionNextDishSortOrder('sec-1');
    expect(result).toBe(5);
    expect(mockFrom).toHaveBeenCalledWith('restaurant_menu_dishes');
    expect(chain.eq as jest.Mock).toHaveBeenCalledWith('section_id', 'sec-1');
    expect(chain.order as jest.Mock).toHaveBeenCalledWith('sort_order', { ascending: false });
    expect(chain.limit as jest.Mock).toHaveBeenCalledWith(1);
  });

  it('throws when Supabase returns an error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(getRestaurantSectionNextDishSortOrder('sec-1')).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// createRestaurantDishDraft
// ---------------------------------------------------------------------------

describe('createRestaurantDishDraft', () => {
  it('inserts into restaurant_menu_dishes with correct fields and returns dishId', async () => {
    const chain = makeChain({ data: { id: 'dish-99' }, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await createRestaurantDishDraft({ sectionId: 'sec-1', sortOrder: 2 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.dishId).toBe('dish-99');
    expect(mockFrom).toHaveBeenCalledWith('restaurant_menu_dishes');
    expect(chain.insert as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ section_id: 'sec-1', sort_order: 2, needs_review: true })
    );
  });

  it('returns ok:false when Supabase returns an error', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: { message: 'insert failed' } }));
    const result = await createRestaurantDishDraft({ sectionId: 'sec-1', sortOrder: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('insert failed');
  });

  it('returns ok:false when no id is returned', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: {}, error: null }));
    const result = await createRestaurantDishDraft({ sectionId: 'sec-1', sortOrder: 0 });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// touchRestaurantMenuScan
// ---------------------------------------------------------------------------

describe('touchRestaurantMenuScan', () => {
  it('updates restaurant_menu_scans with last_activity_at and correct id filter', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    await expect(touchRestaurantMenuScan('scan-1')).resolves.toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('restaurant_menu_scans');
    expect(chain.eq as jest.Mock).toHaveBeenCalledWith('id', 'scan-1');
    expect(chain.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({ last_activity_at: expect.any(String) })
    );
  });

  it('throws when Supabase update returns an error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'update failed' } }));
    await expect(touchRestaurantMenuScan('scan-1')).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// saveRestaurantDish
// ---------------------------------------------------------------------------

describe('saveRestaurantDish', () => {
  const baseInput: SaveRestaurantDishInput = {
    dishId: 'dish-1',
    scanId: 'scan-1',
    name: 'Burger',
    description: null,
    priceAmount: 12.99,
    priceCurrency: 'USD',
    priceDisplay: '$12.99',
    spiceLevel: 0,
    tags: [],
    ingredientItems: [
      { name: 'beef', origin: null },
      { name: 'bun', origin: 'Local bakery' },
      { name: 'lettuce', origin: null },
    ],
  };

  it('updates restaurant_menu_dishes with correct fields and touches scan', async () => {
    let callCount = 0;
    const dishChain = makeChain({ data: null, error: null });
    const scanChain = makeChain({ data: null, error: null });
    mockFrom.mockImplementation(() => { callCount++; return callCount === 1 ? dishChain : scanChain; });

    const result = await saveRestaurantDish(baseInput);
    expect(result.ok).toBe(true);
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'restaurant_menu_dishes');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'restaurant_menu_scans');
    expect(dishChain.eq as jest.Mock).toHaveBeenCalledWith('id', 'dish-1');
    expect(dishChain.update as jest.Mock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Burger',
        price_currency: 'USD',
        spice_level: 0,
        tags: [],
        ingredients: ['beef', 'bun', 'lettuce'],
        ingredient_items: [
          { name: 'beef', origin: null },
          { name: 'bun', origin: 'Local bakery' },
          { name: 'lettuce', origin: null },
        ],
      }),
    );
    expect(scanChain.eq as jest.Mock).toHaveBeenCalledWith('id', 'scan-1');
  });

  it('returns ok:false when Supabase update returns an error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'update failed' } }));
    const result = await saveRestaurantDish(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('update failed');
  });

  it('returns ok:false when an ingredient origin exceeds max length', async () => {
    const long = 'a'.repeat(101);
    const result = await saveRestaurantDish({
      ...baseInput,
      ingredientItems: [{ name: 'salt', origin: long }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('salt');
  });

  it('rejects when dish update succeeds but touchRestaurantMenuScan fails', async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return makeChain({ data: null, error: null }); // dish update succeeds
      return makeChain({ data: null, error: { message: 'scan touch failed' } }); // scan touch fails
    });
    await expect(saveRestaurantDish(baseInput)).rejects.toMatchObject({ message: 'scan touch failed' });
  });

  it('marks needs_review true when name is empty', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    const updateSpy = jest.fn().mockReturnThis();
    mockFrom.mockImplementation(() => ({ ...makeChain({ data: null, error: null }), update: updateSpy }));

    await saveRestaurantDish({ ...baseInput, name: '' });

    const updateArgs = updateSpy.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(updateArgs?.needs_review).toBe(true);
  });

  it('does not call touchRestaurantMenuScan when touchScan is false', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    await saveRestaurantDish({ ...baseInput, touchScan: false });
    // Only one `from` call (for the dish update), not a second one for the scan touch
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// updateRestaurantDishHighlightFlags
// ---------------------------------------------------------------------------

describe('updateRestaurantDishHighlightFlags', () => {
  it('updates restaurant_menu_dishes with is_featured flag and correct id filter', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await updateRestaurantDishHighlightFlags('dish-1', { is_featured: true });
    expect(result.ok).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('restaurant_menu_dishes');
    expect(chain.eq as jest.Mock).toHaveBeenCalledWith('id', 'dish-1');
    expect(chain.update as jest.Mock).toHaveBeenCalledWith({ is_featured: true });
  });

  it('updates restaurant_menu_dishes with is_new flag and correct id filter', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await updateRestaurantDishHighlightFlags('dish-1', { is_new: false });
    expect(result.ok).toBe(true);
    expect(chain.update as jest.Mock).toHaveBeenCalledWith({ is_new: false });
  });

  it('returns ok:true without calling Supabase when no flags are provided', async () => {
    const result = await updateRestaurantDishHighlightFlags('dish-1', {});
    expect(result.ok).toBe(true);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns ok:false when Supabase update returns an error', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: { message: 'update failed' } }));
    const result = await updateRestaurantDishHighlightFlags('dish-1', { is_featured: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('update failed');
  });
});
