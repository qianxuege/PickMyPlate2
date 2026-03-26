import { Stack } from "expo-router";

import { AuthDeepLinkHandler } from "@/components/AuthDeepLinkHandler";
import { ActiveRoleProvider } from "@/contexts/ActiveRoleContext";
import { RoleSwitchToastProvider } from "@/contexts/RoleSwitchToastContext";

const noSwipeOptions = { gestureEnabled: false, animation: 'none' as const };

export default function RootLayout() {
  return (
    <ActiveRoleProvider>
    <RoleSwitchToastProvider>
    <AuthDeepLinkHandler />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="role-picker" options={noSwipeOptions} />
      <Stack.Screen name="add-restaurant" options={noSwipeOptions} />
      <Stack.Screen name="add-diner-role" options={noSwipeOptions} />
      <Stack.Screen name="diner-home" options={noSwipeOptions} />
      <Stack.Screen name="dish/[dishId]" options={noSwipeOptions} />
      <Stack.Screen name="diner-menu-processing" options={noSwipeOptions} />
      <Stack.Screen name="diner-menu" options={noSwipeOptions} />
      <Stack.Screen name="diner-search" options={noSwipeOptions} />
      <Stack.Screen name="diner-search-results" options={noSwipeOptions} />
      <Stack.Screen name="diner-favorites" options={noSwipeOptions} />
      <Stack.Screen name="diner-partner-qr-scan" options={noSwipeOptions} />
      <Stack.Screen name="diner-highlight" options={noSwipeOptions} />
      <Stack.Screen name="partner-menu" options={noSwipeOptions} />
      <Stack.Screen name="diner-profile" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-home" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-menu" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-menu-processing" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-review-menu" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-add-dish" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-edit-dish/[dishId]" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-highlight" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-dish/[dishId]" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-profile" options={noSwipeOptions} />
    </Stack>
    </RoleSwitchToastProvider>
    </ActiveRoleProvider>
  );
}
