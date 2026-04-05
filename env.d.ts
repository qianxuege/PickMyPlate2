declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SUPABASE_KEY?: string;
    /** Base URL of the Flask menu API (no trailing slash), e.g. http://192.168.1.10:8080 */
    EXPO_PUBLIC_MENU_API_URL?: string;
    /**
     * Optional fixed Supabase auth redirect URL for password recovery (must be listed in Supabase Redirect URLs).
     * If unset, the app uses Linking.createURL('/reset-password') on the device (recommended for Expo Go).
     */
    EXPO_PUBLIC_AUTH_REDIRECT_URL?: string;
  }
}
