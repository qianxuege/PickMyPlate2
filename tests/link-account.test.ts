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
    expect(isDuplicateEmailSignupError(new Error('User already exists'))).toBe(true);
  });

  it('returns true for message containing "registered"', () => {
    expect(isDuplicateEmailSignupError(new Error('Email is registered'))).toBe(true);
  });

  it('returns true for message containing "user already"', () => {
    expect(isDuplicateEmailSignupError(new Error('user already registered'))).toBe(true);
  });

  it('returns true when message contains both "email address" and "registered"', () => {
    expect(isDuplicateEmailSignupError(new Error('This email address is already registered'))).toBe(true);
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

  it('returns already_restaurant when user already has restaurant role', async () => {
    mockFetchUserRoles.mockResolvedValue(['diner', 'restaurant']);
    const result = await linkRestaurantToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('already_restaurant');
  });

  it('returns role_failed when ensureRestaurantRole errors', async () => {
    mockEnsureRestaurant.mockResolvedValue({ error: new Error('role upsert failed') });
    const result = await linkRestaurantToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('role_failed');
    if (result.status === 'role_failed') expect(result.message).toBe('role upsert failed');
  });

  it('returns linked on success', async () => {
    const result = await linkRestaurantToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('linked');
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

  it('returns already_diner when user already has diner role', async () => {
    mockFetchUserRoles.mockResolvedValue(['diner', 'restaurant']);
    const result = await linkDinerToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('already_diner');
  });

  it('returns role_failed when ensureDinerRole errors', async () => {
    mockEnsureDiner.mockResolvedValue({ error: new Error('role upsert failed') });
    const result = await linkDinerToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('role_failed');
    if (result.status === 'role_failed') expect(result.message).toBe('role upsert failed');
  });

  it('returns linked on success', async () => {
    const result = await linkDinerToExistingAccount('user@example.com', 'pw');
    expect(result.status).toBe('linked');
  });
});
