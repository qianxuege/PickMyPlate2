import {
  isDuplicateEmailSignupError,
  linkRestaurantToExistingAccount,
  linkDinerToExistingAccount,
} from '@/lib/link-account';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signInWithPassword: jest.fn() },
  },
}));

jest.mock('@/lib/user-roles', () => ({
  fetchUserRoles: jest.fn(),
}));

jest.mock('@/lib/restaurant-setup', () => ({
  ensureRestaurantRole: jest.fn(),
  ensureDinerRole: jest.fn(),
}));

import { supabase } from '@/lib/supabase';
import { fetchUserRoles } from '@/lib/user-roles';
import { ensureRestaurantRole, ensureDinerRole } from '@/lib/restaurant-setup';

const mockSignIn             = supabase.auth.signInWithPassword as jest.Mock;
const mockFetchUserRoles     = fetchUserRoles as jest.Mock;
const mockEnsureRestaurant   = ensureRestaurantRole as jest.Mock;
const mockEnsureDiner        = ensureDinerRole as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockSignIn.mockResolvedValue({ data: { user: { id: 'uid-1' } }, error: null });
  mockFetchUserRoles.mockResolvedValue([]);
  mockEnsureRestaurant.mockResolvedValue({ error: null });
  mockEnsureDiner.mockResolvedValue({ error: null });
});

// ---------------------------------------------------------------------------
// isDuplicateEmailSignupError
// ---------------------------------------------------------------------------

describe('isDuplicateEmailSignupError', () => {
  it('returns true for message containing "already"', () => {
    // 'taken' does not contain 'registered' or 'user already' — isolates the "already" clause
    expect(isDuplicateEmailSignupError(new Error('account already taken'))).toBe(true);
  });

  it('returns true for message containing "registered"', () => {
    // does not contain 'already' — isolates the "registered" clause
    expect(isDuplicateEmailSignupError(new Error('Email is registered'))).toBe(true);
  });

  it('is case-insensitive (lowercases before matching)', () => {
    expect(isDuplicateEmailSignupError(new Error('USER ALREADY EXISTS'))).toBe(true);
  });

  it('returns true for real-world Supabase-style messages (clauses are defensively overlapping)', () => {
    // These also satisfy the "already" / "registered" clauses; the implementation is
    // intentionally redundant for robustness across Supabase versions.
    expect(isDuplicateEmailSignupError(new Error('user already exists'))).toBe(true);
    expect(isDuplicateEmailSignupError(new Error('This email address has been registered'))).toBe(true);
  });

  it('returns false for an unrelated error message', () => {
    expect(isDuplicateEmailSignupError(new Error('Invalid password'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// linkRestaurantToExistingAccount
// ---------------------------------------------------------------------------

describe('linkRestaurantToExistingAccount', () => {
  it('returns auth_failed when signInWithPassword errors', async () => {
    mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: 'invalid credentials' } });
    const result = await linkRestaurantToExistingAccount('user@example.com', 'wrongpw');
    expect(result.status).toBe('auth_failed');
    if (result.status === 'auth_failed') expect(result.message).toBe('invalid credentials');
  });

  it('returns auth_failed when sign-in succeeds but user id is missing', async () => {
    mockSignIn.mockResolvedValue({ data: { user: null }, error: null });
    const result = await linkRestaurantToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('auth_failed');
    if (result.status === 'auth_failed') expect(result.message).toBe('No user id returned.');
  });

  it('returns already_restaurant when user already has restaurant role', async () => {
    mockFetchUserRoles.mockResolvedValue(['restaurant']);
    const result = await linkRestaurantToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('already_restaurant');
  });

  it('returns role_failed when ensureRestaurantRole errors', async () => {
    mockEnsureRestaurant.mockResolvedValue({ error: new Error('role upsert failed') });
    const result = await linkRestaurantToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('role_failed');
    if (result.status === 'role_failed') expect(result.message).toBe('role upsert failed');
  });

  it('returns linked on success and calls signInWithPassword with correct credentials', async () => {
    const result = await linkRestaurantToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('linked');
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'user@example.com', password: 'pw' });
  });
});

// ---------------------------------------------------------------------------
// linkDinerToExistingAccount
// ---------------------------------------------------------------------------

describe('linkDinerToExistingAccount', () => {
  it('returns auth_failed when signInWithPassword errors', async () => {
    mockSignIn.mockResolvedValue({ data: { user: null }, error: { message: 'invalid credentials' } });
    const result = await linkDinerToExistingAccount('user@example.com', 'wrongpw');
    expect(result.status).toBe('auth_failed');
    if (result.status === 'auth_failed') expect(result.message).toBe('invalid credentials');
  });

  it('returns auth_failed when sign-in succeeds but user id is missing', async () => {
    mockSignIn.mockResolvedValue({ data: { user: null }, error: null });
    const result = await linkDinerToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('auth_failed');
    if (result.status === 'auth_failed') expect(result.message).toBe('No user id returned.');
  });

  it('returns already_diner when user already has diner role', async () => {
    mockFetchUserRoles.mockResolvedValue(['diner']);
    const result = await linkDinerToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('already_diner');
  });

  it('returns role_failed when ensureDinerRole errors', async () => {
    mockEnsureDiner.mockResolvedValue({ error: new Error('role upsert failed') });
    const result = await linkDinerToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('role_failed');
    if (result.status === 'role_failed') expect(result.message).toBe('role upsert failed');
  });

  it('returns linked on success and calls signInWithPassword with correct credentials', async () => {
    const result = await linkDinerToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('linked');
    expect(mockSignIn).toHaveBeenCalledWith({ email: 'user@example.com', password: 'pw' });
  });
});
