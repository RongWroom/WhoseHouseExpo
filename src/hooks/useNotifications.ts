/**
 * React hooks for push notifications
 * Wraps NotificationService for easy component integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  notificationService,
  NotificationPreferences,
  NotificationType,
} from '../lib/notifications';

/**
 * Hook for managing push token registration
 */
export function usePushToken(userId: string | null) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      await notificationService.initialize();
      const existingToken = notificationService.getPushToken();
      if (existingToken) {
        setToken(existingToken);
      }
    };

    init();
  }, [userId]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'web') {
      setPermissionGranted(false);
      return false;
    }

    setLoading(true);
    try {
      const granted = await notificationService.requestPermissions();
      setPermissionGranted(granted);
      return granted;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permission');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const registerToken = useCallback(async (): Promise<string | null> => {
    if (!userId) {
      setError('User ID required');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const newToken = await notificationService.registerForPushNotifications(userId);
      setToken(newToken);
      if (newToken) {
        setPermissionGranted(true);
      }
      return newToken;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register');
      return null;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const unregisterToken = useCallback(async (): Promise<void> => {
    if (!userId) return;

    setLoading(true);
    try {
      await notificationService.unregisterPushToken(userId);
      setToken(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unregister');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    token,
    loading,
    error,
    permissionGranted,
    requestPermission,
    registerToken,
    unregisterToken,
  };
}

/**
 * Hook for managing notification preferences
 */
export function useNotificationPreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    notificationService.getPreferences(),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  // Load preferences on mount
  useEffect(() => {
    if (!userId || initialLoadDone.current) return;

    const loadPrefs = async () => {
      setLoading(true);
      try {
        await notificationService.initialize();
        const dbPrefs = await notificationService.loadPreferencesFromDatabase();
        setPreferences(dbPrefs);
        initialLoadDone.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();
  }, [userId]);

  const updatePreference = useCallback(
    async <K extends keyof NotificationPreferences>(
      key: K,
      value: NotificationPreferences[K],
    ): Promise<void> => {
      setSaving(true);
      setError(null);

      const newPrefs = { ...preferences, [key]: value };
      setPreferences(newPrefs); // Optimistic update

      try {
        await notificationService.updatePreferences({ [key]: value });
      } catch (err) {
        // Revert on error
        setPreferences(preferences);
        setError(err instanceof Error ? err.message : 'Failed to save preference');
      } finally {
        setSaving(false);
      }
    },
    [preferences],
  );

  const updateMultiplePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>): Promise<void> => {
      setSaving(true);
      setError(null);

      const newPrefs = { ...preferences, ...updates };
      setPreferences(newPrefs); // Optimistic update

      try {
        await notificationService.updatePreferences(updates);
      } catch (err) {
        // Revert on error
        setPreferences(preferences);
        setError(err instanceof Error ? err.message : 'Failed to save preferences');
      } finally {
        setSaving(false);
      }
    },
    [preferences],
  );

  const refreshPreferences = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const dbPrefs = await notificationService.loadPreferencesFromDatabase();
      setPreferences(dbPrefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh preferences');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    preferences,
    loading,
    saving,
    error,
    updatePreference,
    updateMultiplePreferences,
    refreshPreferences,
  };
}

/**
 * Hook for notification handlers (foreground/background)
 */
export function useNotificationHandlers(
  onReceived?: (notification: any) => void,
  onResponse?: (response: any) => void,
) {
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const setup = async () => {
      cleanup = await notificationService.setupNotificationHandlers(onReceived, onResponse);
    };

    setup();

    return () => {
      cleanup?.();
    };
  }, [onReceived, onResponse]);
}

/**
 * Hook for badge count management
 */
export function useBadgeCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const loadCount = async () => {
      const badgeCount = await notificationService.getBadgeCount();
      setCount(badgeCount);
    };
    loadCount();
  }, []);

  const setBadgeCount = useCallback(async (newCount: number) => {
    await notificationService.setBadgeCount(newCount);
    setCount(newCount);
  }, []);

  const clearBadge = useCallback(async () => {
    await notificationService.setBadgeCount(0);
    setCount(0);
  }, []);

  return { count, setBadgeCount, clearBadge };
}

/**
 * Check if a notification type should be shown
 */
export function useShouldNotify(type: NotificationType): boolean {
  return notificationService.shouldSendNotification(type);
}
