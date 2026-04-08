/**
 * Fluent Supabase client mock.
 *
 * Usage in tests:
 *   import { mockSupabase, resetSupabaseMocks } from '../__mocks__/supabase';
 *
 *   beforeEach(() => resetSupabaseMocks());
 *
 *   mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
 *   mockSupabase._setQueryResult('diner_favorite_dishes', { data: [...], error: null });
 */

// Per-table resolved values (for the next query on that table)
const tableResults: Record<string, unknown> = {};
// Stack of resolved values for generic queries (when table name isn't checked)
let genericResult: unknown = { data: null, error: null };

/** Override the result returned for a specific table in the NEXT call. */
export function setTableResult(table: string, result: unknown) {
  tableResults[table] = result;
}

/** Override the result for any query not matched by setTableResult. */
export function setGenericResult(result: unknown) {
  genericResult = result;
}

function makeChain(table: string) {
  const resolved = tableResults[table] ?? genericResult;
  // Clear the per-table override so it doesn't bleed into the next test
  delete tableResults[table];

  const chain: Record<string, unknown> = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolved),
    maybeSingle: jest.fn().mockResolvedValue(resolved),
    // Awaiting the chain itself resolves (e.g. .insert() with no trailing call)
    then: jest.fn((resolve: (v: unknown) => unknown) => Promise.resolve(resolved).then(resolve)),
  };
  return chain;
}

export const mockSupabase = {
  from: jest.fn((table: string) => makeChain(table)),

  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
  },

  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),

  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/image.jpg' } })),
    })),
  },

  _setTableResult: setTableResult,
  _setGenericResult: setGenericResult,
};

export function resetSupabaseMocks() {
  jest.clearAllMocks();
  Object.keys(tableResults).forEach((k) => delete tableResults[k]);
  genericResult = { data: null, error: null };

  // Re-attach implementations after clearAllMocks
  mockSupabase.from.mockImplementation((table: string) => makeChain(table));
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: { user: null }, error: null });
  mockSupabase.auth.signOut.mockResolvedValue({ error: null });
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: jest.fn() } },
  });
  mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
}
