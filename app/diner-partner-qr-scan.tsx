import { CameraView, type BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { restaurantRoleTheme } from '@/constants/role-theme';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { useGuardActiveRole } from '@/hooks/use-guard-active-role';

const t = restaurantRoleTheme;

function extractTokenFromScannedData(data: string): string | null {
  const raw = data.trim();
  if (!raw) return null;

  // Accept plain token for testing.
  if (/^[A-Za-z0-9_-]{8,}$/.test(raw) && !raw.includes('://')) return raw;

  try {
    const url = new URL(raw);
    const token = url.searchParams.get('pm');
    return token?.trim() || null;
  } catch {
    return null;
  }
}

export default function DinerPartnerQrScanScreen() {
  useGuardActiveRole('diner');
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const canScan = useMemo(() => !!permission?.granted && !busy, [permission?.granted, busy]);

  const onScanned = useCallback(
    (event: BarcodeScanningResult) => {
      if (!canScan) return;
      const token = extractTokenFromScannedData(event.data ?? '');
      if (!token) return;
      setBusy(true);
      router.replace({ pathname: '/partner-menu', params: { pm: token } });
    },
    [canScan, router],
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Preparing camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Camera access needed</Text>
        <Text style={styles.body}>Allow camera permission to scan partner menu QR codes.</Text>
        <Pressable style={styles.button} onPress={() => void requestPermission()}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </Pressable>
        <Pressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={onScanned}
      />
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Scan Partner QR</Text>
        <Text style={styles.overlayBody}>Point your camera at the restaurant QR code.</Text>
        <Pressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: Colors.white,
  },
  title: {
    ...Typography.headingSmall,
    color: Colors.text,
    textAlign: 'center',
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.sm,
    backgroundColor: t.primary,
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  buttonText: {
    ...Typography.bodyMedium,
    color: Colors.white,
    fontWeight: '700',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.xl,
    backgroundColor: 'rgba(16,24,40,0.55)',
    alignItems: 'center',
    gap: 8,
  },
  overlayTitle: {
    ...Typography.headingSmall,
    color: Colors.white,
    fontWeight: '700',
  },
  overlayBody: {
    ...Typography.body,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  secondary: {
    marginTop: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  secondaryText: {
    ...Typography.captionMedium,
    color: Colors.white,
    fontWeight: '700',
  },
});
