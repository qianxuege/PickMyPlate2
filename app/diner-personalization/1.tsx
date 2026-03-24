import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  PreferenceInput,
  PreferencePill,
  PrimaryButton,
  ScreenContainer,
} from '@/components';
import { Colors, Spacing, Typography } from '@/constants/theme';

const DIETARY_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free'];
const COMFORT_OPTIONS = ['Play it safe', 'I want to be adventurous'];
const SPICE_OPTIONS = ['Mild', 'Medium', 'Spicy'];
const CUISINE_OPTIONS = ['Chinese', 'Italian', 'Indian', 'American', 'Mexican', 'Thai'];
const POPULAR_PREFERENCES = [
  "I don't like cilantro",
  'I love spicy food',
  'I have a peanut allergy',
];

export default function DinerPersonalizationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [dietary, setDietary] = useState<string[]>([]);
  const [comfort, setComfort] = useState<string | null>(null);
  const [spice, setSpice] = useState<string | null>(null);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [showMoreCuisines, setShowMoreCuisines] = useState(false);
  const [addedPreferences, setAddedPreferences] = useState<string[]>([]);

  const toggleMulti = (value: string, selected: string[], setSelected: (v: string[]) => void) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((s) => s !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const toggleSingle = (
    value: string,
    selected: string | null,
    setSelected: (v: string | null) => void
  ) => {
    setSelected(selected === value ? null : value);
  };

  const handleAddPreference = (value: string) => {
    if (value && !addedPreferences.includes(value)) {
      setAddedPreferences([...addedPreferences, value]);
    }
  };

  const handlePopularPress = (pref: string) => {
    if (!addedPreferences.includes(pref)) {
      setAddedPreferences([...addedPreferences, pref]);
    }
  };

  return (
    <View style={styles.wrapper}>
      <BackButton />
      <LinearGradient
        colors={[Colors.primaryLight, Colors.white]}
        locations={[0, 0.4]}
        style={StyleSheet.absoluteFill}
      />
      <ScreenContainer scroll padding="xl" backgroundColor="transparent">
        <View style={{ height: insets.top + 36 }} />
        <Text style={styles.title}>Personalize your experience</Text>
        <Text style={styles.subtitle}>Tell us what you love — and what to avoid</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Any dietary preferences?</Text>
          <View style={styles.pillRow}>
            {DIETARY_OPTIONS.map((opt) => (
              <PreferencePill
                key={opt}
                label={opt}
                selected={dietary.includes(opt)}
                onPress={() => toggleMulti(opt, dietary, setDietary)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comfort food or something new?</Text>
          <View style={styles.pillRow}>
            {COMFORT_OPTIONS.map((opt) => (
              <PreferencePill
                key={opt}
                label={opt}
                selected={comfort === opt}
                onPress={() => toggleSingle(opt, comfort, setComfort)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How spicy do you like it? 🌶️</Text>
          <View style={styles.pillRow}>
            {SPICE_OPTIONS.map((opt) => (
              <PreferencePill
                key={opt}
                label={opt}
                selected={spice === opt}
                onPress={() => toggleSingle(opt, spice, setSpice)}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What cuisines do you enjoy?</Text>
          <View style={styles.pillRow}>
            {CUISINE_OPTIONS.map((opt) => (
              <PreferencePill
                key={opt}
                label={opt}
                selected={cuisines.includes(opt)}
                onPress={() => toggleMulti(opt, cuisines, setCuisines)}
              />
            ))}
          </View>
          <Pressable onPress={() => setShowMoreCuisines(!showMoreCuisines)} style={styles.showMore}>
            <Text style={styles.showMoreText}>Show more ↓</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anything else we should know? ✨</Text>
          <Text style={styles.sectionSubtitle}>
            Tell us about allergies, dislikes, or what you love
          </Text>
          <PreferenceInput
            placeholder="e.g. I have a peanut allergy, I love..."
            onSubmit={handleAddPreference}
          />
          <Text style={styles.popularLabel}>Popular preferences:</Text>
          <View style={styles.pillRow}>
            {POPULAR_PREFERENCES.map((pref) => (
              <PreferencePill
                key={pref}
                label={pref}
                selected={addedPreferences.includes(pref)}
                onPress={() => handlePopularPress(pref)}
              />
            ))}
          </View>
          <Text style={styles.aiDisclaimer}>
            We'll use AI to turn this into smarter recommendations
          </Text>
        </View>

        <PrimaryButton
          text="Continue"
          onPress={() => router.replace('/diner-home')}
          style={styles.continueButton}
        />
        <Pressable onPress={() => router.replace('/diner-home')} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
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
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxxl,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    ...Typography.bodyMedium,
    color: Colors.text,
    marginBottom: Spacing.base,
  },
  sectionSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  showMore: {
    alignSelf: 'center',
    marginTop: Spacing.base,
  },
  showMoreText: {
    ...Typography.caption,
    color: Colors.primary,
  },
  popularLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  aiDisclaimer: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
  continueButton: {
    marginTop: Spacing.base,
  },
  skipButton: {
    alignSelf: 'center',
    marginTop: Spacing.base,
  },
  skipText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
