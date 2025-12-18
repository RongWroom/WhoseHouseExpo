import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { View, ActivityIndicator, Platform } from 'react-native';

function RootLayoutNav() {
  const { user, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const g = globalThis as unknown as {
      requestAnimationFrame?: (cb: () => void) => void;
      scrollTo?:
        | ((x: number, y: number) => void)
        | ((options: { top: number; left: number; behavior?: 'auto' | 'smooth' }) => void);
    };

    const scrollToTop = () => {
      if (!g.scrollTo) return;
      try {
        (
          g.scrollTo as (options: {
            top: number;
            left: number;
            behavior?: 'auto' | 'smooth';
          }) => void
        )({
          top: 0,
          left: 0,
          behavior: 'auto',
        });
      } catch {
        (g.scrollTo as (x: number, y: number) => void)(0, 0);
      }
    };

    if (g.requestAnimationFrame) {
      g.requestAnimationFrame(scrollToTop);
    } else {
      scrollToTop();
    }
  }, [segments]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inSocialWorkerGroup = segments[0] === '(social_worker)';
    const inFosterCarerGroup = segments[0] === '(foster_carer)';
    const inAdminGroup = segments[0] === '(admin)';
    const inChildGroup = segments[0] === '(child)';

    if (!user && !inAuthGroup && !inChildGroup) {
      // User is not signed in and trying to access protected route
      // Redirect to sign in
      router.replace('/(auth)');
    } else if (user && profile) {
      if (inAuthGroup) {
        if (profile.role === 'social_worker') {
          router.replace('/(social_worker)/dashboard');
        } else if (profile.role === 'foster_carer') {
          router.replace('/(foster_carer)/dashboard');
        } else if (profile.role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else {
          // Unknown role, redirect to auth
          router.replace('/(auth)');
        }
      } else {
        // Ensure user is in the correct role group
        const role = profile.role;

        if (role === 'social_worker' && !inSocialWorkerGroup) {
          // Social worker trying to access wrong area
          if (!inChildGroup) {
            // Allow social workers to access child routes for testing
            router.replace('/(social_worker)/dashboard');
          }
        } else if (role === 'foster_carer' && !inFosterCarerGroup) {
          // Foster carer trying to access wrong area
          router.replace('/(foster_carer)/dashboard');
        } else if (role === 'admin' && !inAdminGroup) {
          // Admin trying to access wrong area
          router.replace('/(admin)/dashboard');
        }
      }
    }
  }, [user, profile, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(social_worker)" options={{ headerShown: false }} />
      <Stack.Screen name="(foster_carer)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="(child)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RootLayoutNav />
      </NotificationProvider>
    </AuthProvider>
  );
}
