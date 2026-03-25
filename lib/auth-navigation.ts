import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Router } from 'expo-router';

import { ACTIVE_APP_ROLE_STORAGE_KEY, type AppRole, isAppRole } from '@/lib/app-role';

type NavigateAfterAuthParams = {
  router: Router;
  roles: AppRole[];
};

/**
 * After sign-in / sign-up, route by roles and persisted active mode.
 */
export async function navigateAfterAuth({ router, roles }: NavigateAfterAuthParams) {
  if (roles.length === 0) {
    router.replace('/login');
    return;
  }

  if (roles.length === 1) {
    const only = roles[0];
    await AsyncStorage.setItem(ACTIVE_APP_ROLE_STORAGE_KEY, only);
    router.replace(only === 'diner' ? '/diner-home' : '/restaurant-home');
    return;
  }

  const saved = await AsyncStorage.getItem(ACTIVE_APP_ROLE_STORAGE_KEY);
  if (isAppRole(saved) && roles.includes(saved)) {
    router.replace(saved === 'diner' ? '/diner-home' : '/restaurant-home');
    return;
  }

  router.replace('/role-picker' as never);
}

export async function persistActiveRole(role: AppRole) {
  await AsyncStorage.setItem(ACTIVE_APP_ROLE_STORAGE_KEY, role);
}
