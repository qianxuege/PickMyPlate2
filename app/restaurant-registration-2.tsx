import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, PreferencePill, PrimaryButton, ScreenContainer } from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';
import { navigateAfterAuth } from '@/lib/auth-navigation';
import { clampDisplayName } from '@/lib/display-name';
import { upsertRestaurantForOwner } from '@/lib/restaurant-setup';
import { supabase } from '@/lib/supabase';
import { validateOptionalBusinessPhone, validateRequiredBusinessAddress } from '@/lib/venue-contact-validation';

const CUISINE_OPTIONS = [
  'Italian',
  'Chinese',
  'Mexican',
  'American',
  'Japanese',
  'Thai',
  'Indian',
  'Mediterranean',
  'French',
  'Korean',
];

const PRICE_OPTIONS = ['$', '$$', '$$$', '$$$$'] as const;

function paramString(v: string | string[] | undefined): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
  return '';
}

export default function RestaurantRegistration2Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    restaurantName?: string | string[];
    address?: string | string[];
    phone?: string | string[];
  }>();
  const { refreshRoles } = useActiveRole();
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleCuisine = (value: string) => {
    if (cuisines.includes(value)) {
      setCuisines(cuisines.filter((c) => c !== value));
    } else {
      setCuisines([...cuisines, value]);
    }
  };

  const onContinue = async () => {
    const addressFromReg = paramString(params.address).trim();
    if (!addressFromReg) {
      Alert.alert(
        'Missing address',
        'Go back and complete restaurant registration with your business address.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
      return;
    }
    const addressCheck = validateRequiredBusinessAddress(addressFromReg);
    if (!addressCheck.ok) {
      Alert.alert('Business address', addressCheck.message, [
        { text: 'OK', onPress: () => router.replace('/restaurant-registration') },
      ]);
      return;
    }
    const phoneFromReg = paramString(params.phone);
    const phoneCheck = validateOptionalBusinessPhone(phoneFromReg);
    if (!phoneCheck.ok) {
      Alert.alert('Phone number', phoneCheck.message, [
        { text: 'OK', onPress: () => router.replace('/restaurant-registration') },
      ]);
      return;
    }
    setLoading(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      const user = userData?.user;
      if (userErr || !user) {
        Alert.alert('Session required', 'Sign in again to finish setup.', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
        return;
      }

      const paramName = params.restaurantName;
      const fromParam =
        typeof paramName === 'string'
          ? paramName.trim()
          : Array.isArray(paramName) && typeof paramName[0] === 'string'
            ? paramName[0].trim()
            : '';
      const name = clampDisplayName(
        fromParam ||
          (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name) ||
          'My Restaurant',
      );

      const { error } = await upsertRestaurantForOwner({
        name,
        cuisineNames: cuisines,
        address: addressCheck.value,
        phone: phoneCheck.value || undefined,
        priceRange: priceRange.trim() || undefined,
      });

      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }

      const roles = await refreshRoles();
      await navigateAfterAuth({ router, roles });
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <BackButton />
      <LinearGradient
        colors={[Colors.primaryLight, Colors.white]}
        locations={[0, 0.35]}
        style={StyleSheet.absoluteFill}
      />
      <ScreenContainer scroll padding="xl" backgroundColor="transparent">
        <View style={{ height: insets.top + 36 }} />
        <Text style={styles.title}>Tell us about Your Restaurant</Text>

        <Text style={styles.sectionLabel}>Cuisine Type</Text>
        <View style={styles.pillRow}>
          {CUISINE_OPTIONS.map((opt) => (
            <PreferencePill
              key={opt}
              label={opt}
              selected={cuisines.includes(opt)}
              onPress={() => toggleCuisine(opt)}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Price range</Text>
        <Text style={styles.hint}>Optional. Typical cost for a meal per person.</Text>
        <View style={styles.priceRow}>
          {PRICE_OPTIONS.map((p) => {
            const active = priceRange === p;
            return (
              <Pressable
                key={p}
                accessibilityRole="button"
                accessibilityLabel={active ? `${p}, selected` : p}
                onPress={() => setPriceRange(active ? '' : p)}
                style={[
                  styles.pricePill,
                  active && { backgroundColor: Colors.primary, borderColor: Colors.primary },
                ]}
              >
                <Text style={[styles.pricePillText, active && { color: Colors.white }]}>{p}</Text>
              </Pressable>
            );
          })}
        </View>

        <PrimaryButton
          text="Continue"
          onPress={onContinue}
          loading={loading}
          disabled={loading}
          style={styles.continueButton}
        />
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  title: {
    ...Typography.heading,
    color: Colors.text,
    marginBottom: Spacing.xxxl,
    textAlign: 'left',
  },
  sectionLabel: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  hint: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  pricePill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.textPlaceholder,
    backgroundColor: Colors.white,
  },
  pricePillText: {
    ...Typography.bodyMedium,
    color: Colors.text,
    fontWeight: '600',
  },
  continueButton: {
    marginTop: Spacing.base,
  },
});
