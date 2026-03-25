import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  InputField,
  PreferencePill,
  PrimaryButton,
  ScreenContainer,
} from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { navigateAfterAuth } from '@/lib/auth-navigation';
import { upsertRestaurantForOwner } from '@/lib/restaurant-setup';
import { supabase } from '@/lib/supabase';

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

export default function RestaurantRegistration2Screen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ restaurantName?: string | string[] }>();
  const { refreshRoles } = useActiveRole();
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleCuisine = (value: string) => {
    if (cuisines.includes(value)) {
      setCuisines(cuisines.filter((c) => c !== value));
    } else {
      setCuisines([...cuisines, value]);
    }
  };

  const onContinue = async () => {
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
      const name =
        fromParam ||
        (typeof user.user_metadata?.display_name === 'string' && user.user_metadata.display_name) ||
        'My Restaurant';

      const { error } = await upsertRestaurantForOwner({
        name,
        cuisineNames: cuisines,
        locationShort: location.trim() || undefined,
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

        <View style={styles.locationBlock}>
          <Text style={styles.optionalLabel}>Location (optional)</Text>
          <InputField
            placeholder="City, State"
            value={location}
            onChangeText={setLocation}
            containerStyle={styles.locationFieldNoLabel}
          />
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  locationBlock: {
    marginBottom: Spacing.xxl,
  },
  optionalLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  locationFieldNoLabel: {
    marginBottom: 0,
  },
  continueButton: {
    marginTop: Spacing.base,
  },
});
