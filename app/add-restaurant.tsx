import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
import { clampDisplayName, DISPLAY_NAME_MAX_LENGTH } from '@/lib/display-name';
import { ensureRestaurantRole, upsertRestaurantForOwner } from '@/lib/restaurant-setup';

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

export default function AddRestaurantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshRoles, setActiveRole } = useActiveRole();
  const [name, setName] = useState('');
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
    if (!name.trim()) {
      Alert.alert('Restaurant name', 'Enter your restaurant name.');
      return;
    }
    setLoading(true);
    try {
      const { error: roleErr } = await ensureRestaurantRole();
      if (roleErr) {
        Alert.alert('Could not add restaurant access', roleErr.message);
        return;
      }

      const { error } = await upsertRestaurantForOwner({
        name: clampDisplayName(name.trim()),
        cuisineNames: cuisines,
        locationShort: location.trim() || undefined,
      });

      if (error) {
        Alert.alert('Could not save', error.message);
        return;
      }

      await refreshRoles();
      await setActiveRole('restaurant');
      router.replace('/restaurant-home');
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
        <Text style={styles.title}>Add your restaurant</Text>
        <Text style={styles.lead}>
          Use the same account as your diner profile. You can switch between diner and restaurant anytime.
        </Text>

        <InputField
          label="Restaurant name"
          placeholder="Your restaurant name"
          value={name}
          onChangeText={(t) => setName(clampDisplayName(t.replace(/\r?\n/g, ' ')))}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          multiline
        />

        <Text style={styles.sectionLabel}>Cuisine type</Text>
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
            onChangeText={(t) => setLocation(t.replace(/\r?\n/g, ' '))}
            containerStyle={styles.locationFieldNoLabel}
            multiline
          />
        </View>

        <PrimaryButton
          text="Save & continue"
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
    marginBottom: Spacing.sm,
    textAlign: 'left',
  },
  lead: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
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
