import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Sign In',
        }}
      />
      <Stack.Screen
        name="reset-password"
        options={{
          headerShown: false,
          title: 'Reset Password',
        }}
      />
    </Stack>
  );
}
