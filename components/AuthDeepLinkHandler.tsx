import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { navigateAfterAuth } from '@/lib/auth-navigation';
import { supabase } from '@/lib/supabase';
import { fetchUserRoles } from '@/lib/user-roles';

/**
 * Supabase email confirmations redirect with tokens in the URL fragment (#access_token=…).
 * Browsers handle that for web; in Expo we must parse the opened URL and call setSession.
 */
function parseAuthPayload(url: string): { access_token: string; refresh_token: string } | null {
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const queryPart = url.split('?')[1]?.split('#')[0] ?? '';
  const segment = hash || queryPart;
  if (!segment) return null;
  const params = new URLSearchParams(segment);
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  if (!access || !refresh) return null;
  return { access_token: access, refresh_token: refresh };
}

export function AuthDeepLinkHandler() {
  const router = useRouter();
  const consumedRef = useRef<string | null>(null);

  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      if (!url.includes('access_token')) return;
      if (consumedRef.current === url) return;
      consumedRef.current = url;

      const tokens = parseAuthPayload(url);
      if (!tokens) {
        consumedRef.current = null;
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
      });

      if (error) {
        consumedRef.current = null;
        return;
      }

      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        router.replace('/login' as never);
        return;
      }

      const roles = await fetchUserRoles(uid);
      await navigateAfterAuth({ router, roles });
    };

    Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, [router]);

  return null;
}
