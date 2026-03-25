import { useEffect, useState } from 'react';

import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { supabase } from '@/lib/supabase';

/**
 * Restaurant display name for the signed-in owner, if any.
 */
export function useOwnedRestaurantName() {
  const { session } = useActiveRole();
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const uid = session?.user?.id;
    if (!uid) {
      setName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('restaurants').select('name').eq('owner_id', uid).maybeSingle();
      if (!cancelled) setName(typeof data?.name === 'string' && data.name.trim() ? data.name.trim() : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  return name;
}
