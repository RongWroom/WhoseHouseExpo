/**
 * Push Notification Service for WhoseHouse App
 * Handles notification registration, permissions, and sending
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Storage keys
const PUSH_TOKEN_KEY = '@whosehouse:push_token';
const NOTIFICATION_PREFS_KEY = '@whosehouse:notification_prefs';

// Notification types
export type NotificationType =
  | 'message'
  | 'urgent_message'
  | 'case_update'
  | 'child_access'
  | 'system';

export interface NotificationPreferences {
  enabled: boolean;
  messages: boolean;
  urgentMessages: boolean;
  caseUpdates: boolean;
  childAccess: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string;
}

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  type: NotificationType;
  priority?: 'default' | 'high';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  messages: true,
  urgentMessages: true,
  caseUpdates: true,
  childAccess: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

/**
 * Notification Service Class
 * Manages push notification registration, preferences, and sending
 */
export class NotificationService {
  private static instance: NotificationService;
  private pushToken: string | null = null;
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private initialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load stored preferences
      const storedPrefs = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (storedPrefs) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(storedPrefs) };
      }

      // Load stored token
      const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (storedToken) {
        this.pushToken = storedToken;
      }

      this.initialized = true;
      console.log('📱 NotificationService initialized');
    } catch (error) {
      console.error('Failed to initialize NotificationService:', error);
    }
  }

  /**
   * Request notification permissions
   * Returns true if permissions were granted
   */
  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return false;
    }

    try {
      // Dynamic import to avoid issues on web
      const Notifications = await import('expo-notifications');

      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted for push notifications');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(userId: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return null;
    }

    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const Notifications = await import('expo-notifications');

      // Get the project ID for Expo push notifications
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      const token = tokenData.data;
      this.pushToken = token;

      // Store locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      // Store in database
      await this.savePushTokenToDatabase(userId, token);

      console.log('📱 Push token registered:', token.substring(0, 20) + '...');
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Save push token to database using RPC function
   */
  private async savePushTokenToDatabase(userId: string, token: string): Promise<void> {
    try {
      const { error } = await (supabase.rpc as any)('register_push_token', {
        p_token: token,
        p_platform: Platform.OS,
        p_device_info: {
          os: Platform.OS,
          version: Platform.Version,
          userId,
        },
      });

      if (error) {
        console.error('Error saving push token to database:', error);
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  /**
   * Remove push token (on logout)
   */
  async unregisterPushToken(userId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);

      await supabase.from('push_tokens').delete().eq('user_id', userId);

      this.pushToken = null;
      console.log('📱 Push token unregistered');
    } catch (error) {
      console.error('Error unregistering push token:', error);
    }
  }

  /**
   * Get current push token
   */
  getPushToken(): string | null {
    return this.pushToken;
  }

  /**
   * Update notification preferences (local + database)
   */
  async updatePreferences(prefs: Partial<NotificationPreferences>): Promise<void> {
    this.preferences = { ...this.preferences, ...prefs };
    await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(this.preferences));

    // Sync to database
    try {
      await (supabase.rpc as any)('update_notification_preferences', {
        p_enabled: prefs.enabled,
        p_messages: prefs.messages,
        p_urgent_messages: prefs.urgentMessages,
        p_case_updates: prefs.caseUpdates,
        p_child_access: prefs.childAccess,
        p_quiet_hours_enabled: prefs.quietHoursEnabled,
        p_quiet_hours_start: prefs.quietHoursStart,
        p_quiet_hours_end: prefs.quietHoursEnd,
      });
    } catch (error) {
      console.error('Error syncing preferences to database:', error);
    }

    console.log('📱 Notification preferences updated');
  }

  /**
   * Load preferences from database
   */
  async loadPreferencesFromDatabase(): Promise<NotificationPreferences> {
    try {
      const { data, error } = await (supabase.rpc as any)('get_notification_preferences');

      if (error) throw error;

      if (data) {
        const d = data as any;
        const dbPrefs: NotificationPreferences = {
          enabled: d.enabled ?? true,
          messages: d.messages ?? true,
          urgentMessages: d.urgent_messages ?? true,
          caseUpdates: d.case_updates ?? true,
          childAccess: d.child_access ?? true,
          quietHoursEnabled: d.quiet_hours_enabled ?? false,
          quietHoursStart: d.quiet_hours_start ?? '22:00',
          quietHoursEnd: d.quiet_hours_end ?? '07:00',
        };

        this.preferences = dbPrefs;
        await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(dbPrefs));
        return dbPrefs;
      }
    } catch (error) {
      console.error('Error loading preferences from database:', error);
    }

    return this.preferences;
  }

  /**
   * Get notification preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Check if notifications should be sent (respects quiet hours)
   */
  shouldSendNotification(type: NotificationType): boolean {
    if (!this.preferences.enabled) return false;

    // Always send urgent messages
    if (type === 'urgent_message') return true;

    // Check quiet hours
    if (this.preferences.quietHoursEnabled && this.isInQuietHours()) {
      return false;
    }

    // Check type-specific preferences
    switch (type) {
      case 'message':
        return this.preferences.messages;
      case 'case_update':
        return this.preferences.caseUpdates;
      case 'child_access':
        return this.preferences.childAccess;
      default:
        return true;
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = this.preferences.quietHoursEnd.split(':').map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime;
    }

    return currentTime >= startTime && currentTime < endTime;
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(notification: PushNotificationData): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    if (!this.shouldSendNotification(notification.type)) {
      console.log('Notification blocked by preferences:', notification.type);
      return null;
    }

    try {
      const Notifications = await import('expo-notifications');

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: notification.priority === 'high' ? 'default' : undefined,
          priority:
            notification.priority === 'high'
              ? Notifications.AndroidNotificationPriority.HIGH
              : Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Immediate
      });

      return id;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  /**
   * Setup notification handlers
   */
  async setupNotificationHandlers(
    onNotificationReceived?: (notification: any) => void,
    onNotificationResponse?: (response: any) => void,
  ): Promise<() => void> {
    if (Platform.OS === 'web') {
      return () => {};
    }

    try {
      const Notifications = await import('expo-notifications');

      const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
        console.log('📱 Notification received:', notification);
        onNotificationReceived?.(notification);
      });

      const responseSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          console.log('📱 Notification response:', response);
          onNotificationResponse?.(response);
        },
      );

      // Return cleanup function
      return () => {
        receivedSubscription.remove();
        responseSubscription.remove();
      };
    } catch (error) {
      console.error('Error setting up notification handlers:', error);
      return () => {};
    }
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    if (Platform.OS === 'web') return 0;

    try {
      const Notifications = await import('expo-notifications');
      return await Notifications.getBadgeCountAsync();
    } catch {
      return 0;
    }
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const Notifications = await import('expo-notifications');
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      const Notifications = await import('expo-notifications');
      await Notifications.dismissAllNotificationsAsync();
      await this.setBadgeCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

/**
 * Helper function to send notification for new message
 */
export async function notifyNewMessage(
  senderName: string,
  preview: string,
  caseId: string,
  isUrgent: boolean = false,
): Promise<void> {
  await notificationService.scheduleLocalNotification({
    title: isUrgent ? `⚠️ Urgent: ${senderName}` : `New message from ${senderName}`,
    body: preview.length > 50 ? preview.substring(0, 47) + '...' : preview,
    data: { caseId, type: 'message' },
    type: isUrgent ? 'urgent_message' : 'message',
    priority: isUrgent ? 'high' : 'default',
  });
}

/**
 * Helper function to send notification for case update
 */
export async function notifyCaseUpdate(
  caseNumber: string,
  updateType: string,
  caseId: string,
): Promise<void> {
  await notificationService.scheduleLocalNotification({
    title: 'Case Update',
    body: `${caseNumber}: ${updateType}`,
    data: { caseId, type: 'case_update' },
    type: 'case_update',
    priority: 'default',
  });
}

/**
 * Helper function to send notification for child access
 */
export async function notifyChildAccess(childInitials: string, caseId: string): Promise<void> {
  await notificationService.scheduleLocalNotification({
    title: 'Child Access',
    body: `${childInitials} has accessed their page`,
    data: { caseId, type: 'child_access' },
    type: 'child_access',
    priority: 'default',
  });
}
