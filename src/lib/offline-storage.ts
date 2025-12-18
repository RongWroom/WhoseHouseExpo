/**
 * Offline Storage Service
 * Handles local data persistence for offline support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  MESSAGES_QUEUE: '@whosehouse:messages_queue',
  PENDING_ACTIONS: '@whosehouse:pending_actions',
  CACHED_CASES: '@whosehouse:cached_cases',
  CACHED_MESSAGES: '@whosehouse:cached_messages',
  LAST_SYNC: '@whosehouse:last_sync',
  USER_PREFERENCES: '@whosehouse:user_preferences',
} as const;

// Types
export interface QueuedMessage {
  id: string;
  caseId: string;
  content: string;
  recipientId: string;
  isUrgent: boolean;
  createdAt: string;
  retryCount: number;
}

export interface PendingAction {
  id: string;
  type: 'message' | 'read_receipt' | 'media_upload' | 'profile_update';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastAttempt?: string;
}

export interface CachedData<T> {
  data: T;
  cachedAt: string;
  expiresAt: string;
}

export interface SyncStatus {
  lastSync: string | null;
  pendingCount: number;
  isOnline: boolean;
}

/**
 * Offline Storage Class
 */
export class OfflineStorage {
  private static instance: OfflineStorage;

  private constructor() {}

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  // ============================================
  // MESSAGE QUEUE
  // ============================================

  /**
   * Add a message to the offline queue
   */
  async queueMessage(
    message: Omit<QueuedMessage, 'id' | 'createdAt' | 'retryCount'>,
  ): Promise<string> {
    const queue = await this.getMessageQueue();
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newMessage: QueuedMessage = {
      ...message,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(newMessage);
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES_QUEUE, JSON.stringify(queue));

    console.log('📤 Message queued for offline send:', id);
    return id;
  }

  /**
   * Get all queued messages
   */
  async getMessageQueue(): Promise<QueuedMessage[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MESSAGES_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Remove a message from the queue (after successful send)
   */
  async removeFromQueue(messageId: string): Promise<void> {
    const queue = await this.getMessageQueue();
    const filtered = queue.filter((m) => m.id !== messageId);
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES_QUEUE, JSON.stringify(filtered));
    console.log('✅ Message removed from queue:', messageId);
  }

  /**
   * Update retry count for a queued message
   */
  async incrementRetryCount(messageId: string): Promise<void> {
    const queue = await this.getMessageQueue();
    const updated = queue.map((m) =>
      m.id === messageId ? { ...m, retryCount: m.retryCount + 1 } : m,
    );
    await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES_QUEUE, JSON.stringify(updated));
  }

  /**
   * Clear all queued messages
   */
  async clearMessageQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.MESSAGES_QUEUE);
  }

  // ============================================
  // PENDING ACTIONS
  // ============================================

  /**
   * Add a pending action
   */
  async addPendingAction(
    action: Omit<PendingAction, 'id' | 'createdAt' | 'retryCount'>,
  ): Promise<string> {
    const actions = await this.getPendingActions();
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newAction: PendingAction = {
      ...action,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    actions.push(newAction);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(actions));

    return id;
  }

  /**
   * Get all pending actions
   */
  async getPendingActions(): Promise<PendingAction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Remove a pending action
   */
  async removePendingAction(actionId: string): Promise<void> {
    const actions = await this.getPendingActions();
    const filtered = actions.filter((a) => a.id !== actionId);
    await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(filtered));
  }

  /**
   * Clear all pending actions
   */
  async clearPendingActions(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ACTIONS);
  }

  // ============================================
  // DATA CACHING
  // ============================================

  /**
   * Cache data with expiration
   */
  async cacheData<T>(key: string, data: T, expirationMinutes: number = 30): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);

    const cached: CachedData<T> = {
      data,
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await AsyncStorage.setItem(key, JSON.stringify(cached));
  }

  /**
   * Get cached data if not expired
   */
  async getCachedData<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (!stored) return null;

      const cached: CachedData<T> = JSON.parse(stored);
      const now = new Date();
      const expiresAt = new Date(cached.expiresAt);

      if (now > expiresAt) {
        // Data expired, remove it
        await AsyncStorage.removeItem(key);
        return null;
      }

      return cached.data;
    } catch {
      return null;
    }
  }

  /**
   * Cache cases for offline access
   */
  async cacheCases(cases: any[]): Promise<void> {
    await this.cacheData(STORAGE_KEYS.CACHED_CASES, cases, 60); // 1 hour
  }

  /**
   * Get cached cases
   */
  async getCachedCases(): Promise<any[] | null> {
    return this.getCachedData(STORAGE_KEYS.CACHED_CASES);
  }

  /**
   * Cache messages for a case
   */
  async cacheMessages(caseId: string, messages: any[]): Promise<void> {
    const key = `${STORAGE_KEYS.CACHED_MESSAGES}:${caseId}`;
    await this.cacheData(key, messages, 30); // 30 minutes
  }

  /**
   * Get cached messages for a case
   */
  async getCachedMessages(caseId: string): Promise<any[] | null> {
    const key = `${STORAGE_KEYS.CACHED_MESSAGES}:${caseId}`;
    return this.getCachedData(key);
  }

  // ============================================
  // SYNC STATUS
  // ============================================

  /**
   * Update last sync timestamp
   */
  async updateLastSync(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    const queue = await this.getMessageQueue();
    const actions = await this.getPendingActions();

    return {
      lastSync,
      pendingCount: queue.length + actions.length,
      isOnline: true, // Will be updated by network listener
    };
  }

  // ============================================
  // USER PREFERENCES
  // ============================================

  /**
   * Save user preferences
   */
  async saveUserPreferences(prefs: Record<string, unknown>): Promise<void> {
    const existing = await this.getUserPreferences();
    const merged = { ...existing, ...prefs };
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(merged));
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(): Promise<Record<string, unknown>> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  // ============================================
  // CLEANUP
  // ============================================

  /**
   * Clear all offline data (on logout)
   */
  async clearAllData(): Promise<void> {
    const keys = Object.values(STORAGE_KEYS);
    await AsyncStorage.multiRemove(keys);
    console.log('🧹 All offline data cleared');
  }

  /**
   * Clear expired cached data
   */
  async cleanupExpiredCache(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter((key) => key.startsWith('@whosehouse:cached_'));

    for (const key of cacheKeys) {
      try {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const cached = JSON.parse(stored);
          const now = new Date();
          const expiresAt = new Date(cached.expiresAt);

          if (now > expiresAt) {
            await AsyncStorage.removeItem(key);
            console.log('🧹 Cleaned up expired cache:', key);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
}

// Export singleton instance
export const offlineStorage = OfflineStorage.getInstance();

// ============================================
// HOOKS FOR REACT COMPONENTS
// ============================================

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to get sync status
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    lastSync: null,
    pendingCount: 0,
    isOnline: true,
  });

  const refresh = useCallback(async () => {
    const newStatus = await offlineStorage.getSyncStatus();
    setStatus(newStatus);
  }, []);

  useEffect(() => {
    refresh();
    // Refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { status, refresh };
}

/**
 * Hook to get pending message count
 */
export function usePendingMessageCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    const queue = await offlineStorage.getMessageQueue();
    setCount(queue.length);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { count, refresh };
}
