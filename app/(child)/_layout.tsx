import { Stack } from 'expo-router';

export default function ChildLayout() {
  // No authentication check here - child access is token-based

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="access/[token]" options={{ headerShown: false }} />
    </Stack>
  );
}
