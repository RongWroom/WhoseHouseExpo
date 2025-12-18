import { Stack } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { Redirect } from 'expo-router';

export default function FosterCarerLayout() {
  const { profile } = useAuth();

  if (profile && profile.role !== 'foster_carer') {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="case" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="preview-house-profile" options={{ headerShown: false }} />
      <Stack.Screen name="view-house-profile" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
