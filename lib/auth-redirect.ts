import * as Linking from 'expo-linking';

/**
 * Redirect target for Supabase password recovery. Built on-device so Expo Go gets
 * an exp://<your-lan-ip>:port/--/reset-password URL that opens on a physical phone.
 * Add the exact URL (or your production pickmyplate:// URL) to Supabase → Auth → Redirect URLs.
 */
export function getPasswordRecoveryRedirectUrl(): string {
  const override = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim();
  if (override) return override;
  return Linking.createURL('/reset-password');
}
