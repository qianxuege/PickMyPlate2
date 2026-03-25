import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY;

// Fail fast with clear error
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase environment variables.

    Please make sure you have set:
    - EXPO_PUBLIC_SUPABASE_URL
    - EXPO_PUBLIC_SUPABASE_KEY

    You can add them to your .env file like:

    EXPO_PUBLIC_SUPABASE_URL=your_project_url
    EXPO_PUBLIC_SUPABASE_KEY=your_anon_key
    `,
  );
}

const isServer = typeof window === "undefined";
const noopStorage = {
  getItem: async () => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isServer ? noopStorage : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});
