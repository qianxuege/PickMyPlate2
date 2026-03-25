declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    EXPO_PUBLIC_SUPABASE_KEY?: string;
    /** Base URL of the Flask menu API (no trailing slash), e.g. http://192.168.1.10:8080 */
    EXPO_PUBLIC_MENU_API_URL?: string;
  }
}
