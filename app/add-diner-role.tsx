import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackButton, PrimaryButton, ScreenContainer } from '@/components';
import { useActiveRole } from '@/contexts/ActiveRoleContext';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { ensureDinerRole } from '@/lib/restaurant-setup';

export default function AddDinerRoleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refreshRoles, setActiveRole } = useActiveRole();
  const [loading, setLoading] = useState(false);

  const onEnable = async () => {
    setLoading(true);
    try {
      const { error } = await ensureDinerRole();
      if (error) {
        Alert.alert('Could not enable diner profile', error.message);
        return;
      }
      await refreshRoles();
      await setActiveRole('diner');
      router.replace('/diner-home');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <BackButton />
      <ScreenContainer scroll padding="xl">
        <View style={{ height: insets.top + 36 }} />
        <Text style={styles.title}>Explore as a diner</Text>
        <Text style={styles.body}>
          Add diner access to this account so you can browse menus and get recommendations with the same email you
          use for your restaurant.
        </Text>
        <PrimaryButton text="Enable diner profile" onPress={onEnable} loading={loading} disabled={loading} />
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
    marginBottom: Spacing.base,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xxxl,
  },
});
