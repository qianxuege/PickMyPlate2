import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BorderRadius, Colors, Spacing, Typography } from '@/constants/theme';

type RoleSwitchToastContextValue = {
  showRoleSwitchToast: (message: string) => void;
};

const RoleSwitchToastContext = createContext<RoleSwitchToastContextValue | null>(null);

export function RoleSwitchToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showRoleSwitchToast = useCallback(
    (msg: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(msg);
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        hideTimer.current = setTimeout(() => {
          Animated.timing(opacity, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start(() => setMessage(null));
        }, 2000);
      });
    },
    [opacity]
  );

  const value = useMemo(() => ({ showRoleSwitchToast }), [showRoleSwitchToast]);

  return (
    <RoleSwitchToastContext.Provider value={value}>
      <View style={styles.providerRoot}>
        {children}
        {message !== null && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toastWrap,
              {
                bottom: Math.max(insets.bottom, Spacing.base) + 72,
                opacity,
              },
            ]}
          >
            <View style={styles.toastInner}>
              <Text style={styles.toastText}>{message}</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </RoleSwitchToastContext.Provider>
  );
}

export function useRoleSwitchToast() {
  const ctx = useContext(RoleSwitchToastContext);
  if (!ctx) {
    throw new Error('useRoleSwitchToast must be used within RoleSwitchToastProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  providerRoot: {
    flex: 1,
  },
  toastWrap: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: 'center',
    zIndex: 10000,
  },
  toastInner: {
    backgroundColor: Colors.text,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    maxWidth: '100%',
  },
  toastText: {
    ...Typography.captionMedium,
    color: Colors.white,
    textAlign: 'center',
  },
});
