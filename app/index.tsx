import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Colors, Typography } from '@/constants/theme';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PickMyPlate</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...Typography.heading,
    fontSize: 32,
    color: Colors.white,
    fontWeight: '700',
  },
});
