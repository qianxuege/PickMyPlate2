/**
 * @jest-environment jsdom
 */
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ActiveRoleProvider, useActiveRole } from '@/contexts/ActiveRoleContext';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('@/lib/user-roles', () => ({
  fetchUserRoles: jest.fn(),
}));

import { supabase } from '@/lib/supabase';
import { fetchUserRoles } from '@/lib/user-roles';
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockGetSession        = supabase.auth.getSession as jest.Mock;
const mockSignOut           = supabase.auth.signOut as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
const mockFetchUserRoles    = fetchUserRoles as jest.Mock;

/** Render a hook inside ActiveRoleProvider. */
function renderWithProvider<T>(hook: () => T) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ActiveRoleProvider>{children}</ActiveRoleProvider>
  );
  return renderHook(hook, { wrapper });
}

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage as unknown as { _reset: () => void })._reset();

  // Default: no session
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
  mockSignOut.mockResolvedValue({ error: null });
  mockFetchUserRoles.mockResolvedValue([]);
});

// ---------------------------------------------------------------------------
// useActiveRole — guard
// ---------------------------------------------------------------------------

describe('useActiveRole', () => {
  it('throws when used outside ActiveRoleProvider', () => {
    // Suppress the expected React error boundary console output
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useActiveRole())).toThrow(
      'useActiveRole must be used within ActiveRoleProvider'
    );
    (console.error as jest.Mock).mockRestore();
  });
});

// ---------------------------------------------------------------------------
// ActiveRoleProvider — initial state
// ---------------------------------------------------------------------------

describe('ActiveRoleProvider — initial state', () => {
  it('starts with bootstrapped:false then sets it to true', async () => {
    const { result } = renderWithProvider(() => useActiveRole());
    expect(result.current.bootstrapped).toBe(false);

    await act(async () => {
      await Promise.resolve(); // flush session fetch
    });

    expect(result.current.bootstrapped).toBe(true);
  });

  it('has null session and empty roles when no user is signed in', async () => {
    const { result } = renderWithProvider(() => useActiveRole());

    await act(async () => { await Promise.resolve(); });

    expect(result.current.session).toBeNull();
    expect(result.current.roles).toEqual([]);
    expect(result.current.activeRole).toBeNull();
  });

  it('sets single role as activeRole automatically', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockResolvedValue(['diner']);

    const { result } = renderWithProvider(() => useActiveRole());

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.roles).toEqual(['diner']);
    expect(result.current.activeRole).toBe('diner');
  });

  it('restores saved role from AsyncStorage for dual-role accounts', async () => {
    await AsyncStorage.setItem('@pickmyplate/active_app_role', 'restaurant');
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockResolvedValue(['diner', 'restaurant']);

    const { result } = renderWithProvider(() => useActiveRole());

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.activeRole).toBe('restaurant');
  });

  it('sets activeRole to null when dual-role account has no valid saved role', async () => {
    // No entry in AsyncStorage — saved value missing
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockResolvedValue(['diner', 'restaurant']);

    const { result } = renderWithProvider(() => useActiveRole());

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.roles).toEqual(['diner', 'restaurant']);
    expect(result.current.activeRole).toBeNull();
  });

  it('clears roles and sets bootstrapped after fetchUserRoles error during bootstrap', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockRejectedValue(new Error('network error'));

    const { result } = renderWithProvider(() => useActiveRole());

    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.roles).toEqual([]);
    expect(result.current.activeRole).toBeNull();
    expect(result.current.bootstrapped).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// setActiveRole
// ---------------------------------------------------------------------------

describe('setActiveRole', () => {
  it('updates activeRole and persists to AsyncStorage', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockResolvedValue(['diner', 'restaurant']);

    const { result } = renderWithProvider(() => useActiveRole());
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      await result.current.setActiveRole('restaurant');
    });

    expect(result.current.activeRole).toBe('restaurant');
    expect(await AsyncStorage.getItem('@pickmyplate/active_app_role')).toBe('restaurant');
  });
});

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

describe('signOut', () => {
  it('calls supabase signOut and clears roles and activeRole', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockResolvedValue(['diner']);

    const { result } = renderWithProvider(() => useActiveRole());
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(result.current.roles).toEqual([]);
    expect(result.current.activeRole).toBeNull();
  });

  it('removes saved role from AsyncStorage on sign-out', async () => {
    await AsyncStorage.setItem('@pickmyplate/active_app_role', 'diner');
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockResolvedValue(['diner']);

    const { result } = renderWithProvider(() => useActiveRole());
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    await act(async () => { await result.current.signOut(); });

    expect(await AsyncStorage.getItem('@pickmyplate/active_app_role')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// refreshRoles
// ---------------------------------------------------------------------------

describe('refreshRoles', () => {
  it('returns empty array and clears roles when no session exists', async () => {
    const { result } = renderWithProvider(() => useActiveRole());
    await act(async () => { await Promise.resolve(); });

    let roles: string[] = [];
    await act(async () => {
      roles = await result.current.refreshRoles();
    });

    expect(roles).toEqual([]);
    expect(result.current.roles).toEqual([]);
  });

  it('re-fetches roles via fetchUserRoles when session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockResolvedValue(['diner']);

    const { result } = renderWithProvider(() => useActiveRole());
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    mockFetchUserRoles.mockResolvedValue(['diner', 'restaurant']);
    let roles: string[] = [];
    await act(async () => {
      roles = await result.current.refreshRoles();
    });

    expect(roles).toEqual(['diner', 'restaurant']);
    expect(result.current.roles).toEqual(['diner', 'restaurant']);
  });

  it('returns empty array and clears roles when fetchUserRoles throws', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockResolvedValue(['diner']);

    const { result } = renderWithProvider(() => useActiveRole());
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    mockFetchUserRoles.mockRejectedValue(new Error('fetch error'));
    let roles: string[] = ['placeholder'];
    await act(async () => {
      roles = await result.current.refreshRoles();
    });

    expect(roles).toEqual([]);
    expect(result.current.roles).toEqual([]);
    expect(result.current.activeRole).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// onAuthStateChange — async handler registered inside useEffect
// ---------------------------------------------------------------------------

describe('onAuthStateChange handler', () => {
  /** Render the provider and return the captured auth-state-change callback. */
  async function renderAndGetHandler() {
    const { result } = renderWithProvider(() => useActiveRole());
    // flush the initial getSession IIFE
    await act(async () => { await Promise.resolve(); });

    // The handler was registered synchronously during useEffect
    const handler = mockOnAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: unknown
    ) => Promise<void>;
    return { result, handler };
  }

  it('loads roles when a signed-in session arrives via the listener', async () => {
    mockFetchUserRoles.mockResolvedValue(['diner']);
    const { result, handler } = await renderAndGetHandler();

    await act(async () => {
      await handler('SIGNED_IN', { user: { id: 'uid-2' }, access_token: 'tok2' });
    });
    await act(async () => { await Promise.resolve(); });

    expect(result.current.roles).toEqual(['diner']);
    expect(result.current.activeRole).toBe('diner');
  });

  it('clears roles and activeRole when a null session arrives via the listener', async () => {
    // Bootstrap with a session first
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'uid-1' }, access_token: 'tok' } },
      error: null,
    });
    mockFetchUserRoles.mockResolvedValue(['diner']);
    const { result, handler } = await renderAndGetHandler();
    await act(async () => { await Promise.resolve(); }); // flush applyRoles

    // Simulate sign-out event via listener
    await act(async () => {
      await handler('SIGNED_OUT', null);
    });

    expect(result.current.roles).toEqual([]);
    expect(result.current.activeRole).toBeNull();
  });

  it('clears roles when fetchUserRoles throws inside the listener', async () => {
    mockFetchUserRoles.mockRejectedValue(new Error('listener fetch error'));
    const { result, handler } = await renderAndGetHandler();

    await act(async () => {
      await handler('SIGNED_IN', { user: { id: 'uid-2' }, access_token: 'tok2' });
    });

    expect(result.current.roles).toEqual([]);
    expect(result.current.activeRole).toBeNull();
  });
});
