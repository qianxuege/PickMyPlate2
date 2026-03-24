import { Stack } from "expo-router";

const noSwipeOptions = { gestureEnabled: false, animation: 'none' as const };

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="diner-home" options={noSwipeOptions} />
      <Stack.Screen name="diner-menu" options={noSwipeOptions} />
      <Stack.Screen name="diner-favorites" options={noSwipeOptions} />
      <Stack.Screen name="diner-profile" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-home" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-menu" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-highlight" options={noSwipeOptions} />
      <Stack.Screen name="restaurant-profile" options={noSwipeOptions} />
    </Stack>
  );
}
