import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  InputField,
  PreferencePill,
  PrimaryButton,
  ScreenContainer,
} from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

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
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [location, setLocation] = useState('');

  const toggleCuisine = (value: string) => {
    if (cuisines.includes(value)) {
      setCuisines(cuisines.filter((c) => c !== value));
    } else {
      setCuisines([...cuisines, value]);
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
          onPress={() => router.replace('/restaurant-home')}
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
