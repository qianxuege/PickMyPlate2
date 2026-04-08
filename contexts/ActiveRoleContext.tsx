import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ACTIVE_APP_ROLE_STORAGE_KEY, type AppRole, isAppRole } from '@/lib/app-role';
import { supabase } from '@/lib/supabase';
import { fetchUserRoles } from '@/lib/user-roles';

type ActiveRoleContextValue = {
  session: Session | null;
  roles: AppRole[];
  activeRole: AppRole | null;
  bootstrapped: boolean;
  refreshRoles: () => Promise<AppRole[]>;
  setActiveRole: (role: AppRole) => Promise<void>;
  signOut: () => Promise<void>;
};

const ActiveRoleContext = createContext<ActiveRoleContextValue | null>(null);

export function ActiveRoleProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [activeRole, setActiveRoleState] = useState<AppRole | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const applyRoles = useCallback(async (userId: string) => {
    const list = await fetchUserRoles(userId);
    setRoles(list);

    if (list.length === 1) {
      const only = list[0];
      setActiveRoleState(only);
      await AsyncStorage.setItem(ACTIVE_APP_ROLE_STORAGE_KEY, only);
      return list;
    }

    if (list.length > 1) {
      const saved = await AsyncStorage.getItem(ACTIVE_APP_ROLE_STORAGE_KEY);
      if (isAppRole(saved) && list.includes(saved)) {
        setActiveRoleState(saved);
        return list;
      }
      setActiveRoleState(null);
      return list;
    }

    setActiveRoleState(null);
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const next = data.session ?? null;
      setSession(next);
      if (next?.user?.id) {
        try {
          await applyRoles(next.user.id);
        } catch {
          setRoles([]);
          setActiveRoleState(null);
        }
      } else {
        setRoles([]);
        setActiveRoleState(null);
      }
      setBootstrapped(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user?.id) {
        try {
          await applyRoles(nextSession.user.id);
        } catch {
          setRoles([]);
          setActiveRoleState(null);
        }
      } else {
        setRoles([]);
        setActiveRoleState(null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applyRoles]);

  const refreshRoles = useCallback(async () => {
    // Read session from Supabase, not only React state — after signIn (e.g. link diner + restaurant)
    // the in-memory session can lag one tick behind; stale state would clear roles incorrectly.
    const { data } = await supabase.auth.getSession();
    const next = data.session ?? null;
    setSession(next);
    const userId = next?.user?.id;
    if (!userId) {
      setRoles([]);
      setActiveRoleState(null);
      return [];
    }
    try {
      return await applyRoles(userId);
    } catch {
      setRoles([]);
      setActiveRoleState(null);
      return [];
    }
  }, [applyRoles]);

  const setActiveRole = useCallback(async (role: AppRole) => {
    await AsyncStorage.setItem(ACTIVE_APP_ROLE_STORAGE_KEY, role);
    setActiveRoleState(role);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    await AsyncStorage.removeItem(ACTIVE_APP_ROLE_STORAGE_KEY);
    setRoles([]);
    setActiveRoleState(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      roles,
      activeRole,
      bootstrapped,
      refreshRoles,
      setActiveRole,
      signOut,
    }),
    [session, roles, activeRole, bootstrapped, refreshRoles, setActiveRole, signOut]
  );

  return <ActiveRoleContext.Provider value={value}>{children}</ActiveRoleContext.Provider>;
}

export function useActiveRole() {
  const ctx = useContext(ActiveRoleContext);
  if (!ctx) {
    throw new Error('useActiveRole must be used within ActiveRoleProvider');
  }
  return ctx;
}
