import {
  spiceLabelToDb,
  spiceDbToLabel,
  fetchDinerPreferences,
  savePersonalizationFormPrefs,
  type SavePersonalizationFormPrefs,
} from '@/lib/diner-preferences';

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabase } from '@/lib/supabase';

const mockGetUser = supabase.auth.getUser as jest.Mock;
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
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  mockFrom.mockImplementation(() => makeChain());
});

// ---------------------------------------------------------------------------
// spiceLabelToDb  (pure)
// ---------------------------------------------------------------------------

describe('spiceLabelToDb', () => {
  it('converts "Mild" to "mild"', () => {
    expect(spiceLabelToDb('Mild')).toBe('mild');
  });

  it('converts "Medium" to "medium"', () => {
    expect(spiceLabelToDb('Medium')).toBe('medium');
  });

  it('converts "Spicy" to "spicy"', () => {
    expect(spiceLabelToDb('Spicy')).toBe('spicy');
  });

  it('returns null for null input', () => {
    expect(spiceLabelToDb(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(spiceLabelToDb(undefined)).toBeNull();
  });

  it('returns null for an unrecognised label', () => {
    expect(spiceLabelToDb('Extra Hot')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// spiceDbToLabel  (pure)
// ---------------------------------------------------------------------------

describe('spiceDbToLabel', () => {
  it('converts "mild" to "Mild"', () => {
    expect(spiceDbToLabel('mild')).toBe('Mild');
  });

  it('converts "medium" to "Medium"', () => {
    expect(spiceDbToLabel('medium')).toBe('Medium');
  });

  it('converts "spicy" to "Spicy"', () => {
    expect(spiceDbToLabel('spicy')).toBe('Spicy');
  });

  it('returns null for null input', () => {
    expect(spiceDbToLabel(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(spiceDbToLabel(undefined)).toBeNull();
  });

  it('returns null for an unrecognised DB value', () => {
    expect(spiceDbToLabel('nuclear')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchDinerPreferences
// ---------------------------------------------------------------------------

describe('fetchDinerPreferences', () => {
  it('returns null when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await fetchDinerPreferences();
    expect(result).toBeNull();
  });

  it('returns a snapshot with correct shape when user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFrom.mockImplementation((table: string) => {
      const results: Record<string, unknown> = {
        diner_preferences: { data: { budget_tier: '$$', spice_level: 'mild' }, error: null },
        diner_dietary_preferences: { data: [{ dietary_key: 'Vegetarian' }], error: null },
        diner_cuisine_interests: { data: [], error: null },
        diner_smart_tags: { data: [], error: null },
      };
      return makeChain(results[table] ?? { data: null, error: null });
    });

    const result = await fetchDinerPreferences();
    expect(result).not.toBeNull();
    expect(result?.budget_tier).toBe('$$');
    expect(result?.spice_level).toBe('mild');
    expect(result?.dietaryKeys).toContain('Vegetarian');
  });

  it('filters out dietary keys not in the allowed set', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFrom.mockImplementation((table: string) => {
      const results: Record<string, unknown> = {
        diner_preferences: { data: null, error: null },
        diner_dietary_preferences: {
          data: [{ dietary_key: 'Vegetarian' }, { dietary_key: 'Halal' }],
          error: null,
        },
        diner_cuisine_interests: { data: [], error: null },
        diner_smart_tags: { data: [], error: null },
      };
      return makeChain(results[table] ?? { data: null, error: null });
    });

    const result = await fetchDinerPreferences();
    expect(result?.dietaryKeys).toContain('Vegetarian');
    expect(result?.dietaryKeys).not.toContain('Halal');
  });

  it('filters out smart tags with invalid categories', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFrom.mockImplementation((table: string) => {
      const results: Record<string, unknown> = {
        diner_preferences: { data: null, error: null },
        diner_dietary_preferences: { data: [], error: null },
        diner_cuisine_interests: { data: [], error: null },
        diner_smart_tags: {
          data: [
            { id: '1', category: 'like', label: 'Spicy food' },
            { id: '2', category: 'unknown_cat', label: 'Bad tag' },
          ],
          error: null,
        },
      };
      return makeChain(results[table] ?? { data: null, error: null });
    });

    const result = await fetchDinerPreferences();
    expect(result?.smartTags).toHaveLength(1);
    expect(result?.smartTags[0].category).toBe('like');
  });

  it('throws when Supabase returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFrom.mockImplementation((table: string) => {
      const results: Record<string, unknown> = {
        diner_preferences: { data: null, error: { message: 'DB error' } },
        diner_dietary_preferences: { data: [], error: null },
        diner_cuisine_interests: { data: [], error: null },
        diner_smart_tags: { data: [], error: null },
      };
      return makeChain(results[table] ?? { data: null, error: null });
    });

    await expect(fetchDinerPreferences()).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// savePersonalizationFormPrefs
// ---------------------------------------------------------------------------

describe('savePersonalizationFormPrefs', () => {
  const baseInput: SavePersonalizationFormPrefs = {
    budgetTier: '$$',
    spiceLabel: 'Mild',
    dietaryKeys: ['Vegetarian'],
    cuisineNames: [],
    smartTags: [],
  };

  it('throws when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(savePersonalizationFormPrefs(baseInput)).rejects.toThrow('Not signed in');
  });

  it('filters out unknown dietary keys before saving', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    const upsertMock = jest.fn().mockReturnThis();
    const deleteMock = jest.fn().mockReturnThis();
    const insertMock = jest.fn().mockReturnThis();
    mockFrom.mockImplementation(() => ({
      ...makeChain({ data: null, error: null }),
      upsert: upsertMock,
      delete: deleteMock,
      insert: insertMock,
      eq: jest.fn().mockReturnThis(),
    }));

    await savePersonalizationFormPrefs({
      ...baseInput,
      dietaryKeys: ['Vegetarian', 'Halal'],
    });

    // insertMock is called with only the allowed dietary key
    const insertCalls = insertMock.mock.calls;
    const dietaryInsert = insertCalls.find(
      (args: unknown[]) => Array.isArray(args[0]) && (args[0] as { dietary_key: string }[]).some(r => r.dietary_key)
    );
    if (dietaryInsert) {
      const rows = dietaryInsert[0] as { dietary_key: string }[];
      expect(rows.map((r) => r.dietary_key)).toContain('Vegetarian');
      expect(rows.map((r) => r.dietary_key)).not.toContain('Halal');
    }
  });

  it('completes without error when input is valid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFrom.mockImplementation(() => makeChain({ data: null, error: null }));
    await expect(savePersonalizationFormPrefs(baseInput)).resolves.toBeUndefined();
  });

  it('throws when upsert returns an error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
    mockFrom.mockImplementation(() => ({
      ...makeChain({ data: null, error: { message: 'upsert failed' } }),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    }));
    await expect(savePersonalizationFormPrefs(baseInput)).rejects.toBeDefined();
  });
});
