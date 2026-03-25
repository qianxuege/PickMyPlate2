import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useActiveRole } from '@/contexts/ActiveRoleContext';
import type { AppRole } from '@/lib/app-role';

/**
 * Keeps the user on the correct shell when they hold multiple roles.
 */
export function useGuardActiveRole(expected: AppRole) {
  const router = useRouter();
  const { session, roles, activeRole, bootstrapped } = useActiveRole();

  useEffect(() => {
    if (!bootstrapped) return;

    if (!session?.user) {
      router.replace('/login');
      return;
    }

    if (!roles.includes(expected)) {
      if (roles.includes('restaurant')) {
        router.replace('/restaurant-home');
      } else if (roles.includes('diner')) {
        router.replace('/diner-home');
      } else {
        router.replace('/login');
      }
      return;
    }

    if (roles.length > 1) {
      if (!activeRole) {
        router.replace('/role-picker' as never);
        return;
      }
      if (activeRole !== expected) {
        router.replace(activeRole === 'diner' ? '/diner-home' : '/restaurant-home');
      }
    }
  }, [bootstrapped, session?.user, roles, activeRole, expected, router]);
}
