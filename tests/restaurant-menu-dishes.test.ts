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
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));
    const result = await getRestaurantSectionNextDishSortOrder('sec-1');
    expect(result).toBe(0);
  });

  it('returns max sort_order + 1 when dishes exist', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: [{ sort_order: 4 }], error: null }));
    const result = await getRestaurantSectionNextDishSortOrder('sec-1');
    expect(result).toBe(5);
  });

  it('throws when Supabase returns an error', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: { message: 'DB error' } }));
    await expect(getRestaurantSectionNextDishSortOrder('sec-1')).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// createRestaurantDishDraft
// ---------------------------------------------------------------------------

describe('createRestaurantDishDraft', () => {
  it('returns ok:true with dishId on success', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: { id: 'dish-99' }, error: null }));
    const result = await createRestaurantDishDraft({ sectionId: 'sec-1', sortOrder: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.dishId).toBe('dish-99');
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
  it('resolves without error on success', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    await expect(touchRestaurantMenuScan('scan-1')).resolves.toBeUndefined();
  });

  it('throws when Supabase update returns an error', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: { message: 'update failed' } }));
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
    ingredients: ['beef', 'bun', 'lettuce'],
  };

  it('returns ok:true on success', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    const result = await saveRestaurantDish(baseInput);
    expect(result.ok).toBe(true);
  });

  it('returns ok:false when Supabase update returns an error', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: { message: 'update failed' } }));
    const result = await saveRestaurantDish(baseInput);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('update failed');
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
  it('returns ok:true when is_featured flag is updated', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    const result = await updateRestaurantDishHighlightFlags('dish-1', { is_featured: true });
    expect(result.ok).toBe(true);
  });

  it('returns ok:true when is_new flag is updated', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    const result = await updateRestaurantDishHighlightFlags('dish-1', { is_new: false });
    expect(result.ok).toBe(true);
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
