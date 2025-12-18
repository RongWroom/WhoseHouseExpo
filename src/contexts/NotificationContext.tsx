import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Animated, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { MessageCircle, X, AlertTriangle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'message' | 'urgent' | 'info' | 'success' | 'error';
  timestamp: Date;
  onPress?: () => void;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  clearNotification: (id: string) => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp'>) => {
      const newNotification: Notification = {
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date(),
      };

      setNotifications((prev) => [newNotification, ...prev].slice(0, 3));

      setTimeout(() => {
        clearNotification(newNotification.id);
      }, 5000);
    },
    [clearNotification],
  );

  const updateUnreadCount = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .neq('status', 'read');

    if (!error && data) {
      setUnreadCount(data as unknown as number);
    }
  }, [user]);

  // Listen for real-time messages
  useEffect(() => {
    if (!user || !profile) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const message = payload.new as any;

          // Get sender info
          const { data: sender } = (await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', message.sender_id)
            .single()) as { data: { full_name?: string } | null };

          showNotification({
            title: message.is_urgent ? '🚨 Urgent Message' : 'New Message',
            message: `From ${sender?.full_name || 'Unknown'}: ${message.content.substring(0, 50)}${
              message.content.length > 50 ? '...' : ''
            }`,
            type: message.is_urgent ? 'urgent' : 'message',
          });

          // Update unread count
          updateUnreadCount();
        },
      )
      .subscribe();

    // Initial unread count
    updateUnreadCount();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, profile, showNotification, updateUnreadCount]);

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotification, unreadCount }}>
      {children}
      <NotificationDisplay notifications={notifications} onDismiss={clearNotification} />
    </NotificationContext.Provider>
  );
}

function NotificationDisplay({
  notifications,
  onDismiss,
}: {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}) {
  const slideAnimsRef = useRef<Animated.Value[]>([]);

  useEffect(() => {
    slideAnimsRef.current = notifications.map((_, index) => {
      if (!slideAnimsRef.current[index]) {
        slideAnimsRef.current[index] = new Animated.Value(-100);
      }
      return slideAnimsRef.current[index];
    });

    notifications.forEach((_, index) => {
      Animated.spring(slideAnimsRef.current[index], {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    });
  }, [notifications]);

  if (notifications.length === 0) return null;

  return (
    <SafeAreaView className="absolute inset-x-0 top-0 z-[9999]" pointerEvents="box-none">
      <View className="px-4 pt-2" pointerEvents="box-none">
        {notifications.map((notification, index) => (
          <Animated.View
            key={notification.id}
            className="mb-2"
            style={{ transform: [{ translateY: slideAnimsRef.current[index] || 0 }] }}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                if (notification.onPress) notification.onPress();
                onDismiss(notification.id);
              }}
              className={`
                flex-row items-center p-3 rounded-xl shadow-lg
                ${
                  notification.type === 'urgent'
                    ? 'bg-red-500'
                    : notification.type === 'error'
                      ? 'bg-red-600'
                      : notification.type === 'success'
                        ? 'bg-green-500'
                        : 'bg-gray-800'
                }
              `}
            >
              <View className="mr-3">
                {notification.type === 'urgent' ? (
                  <AlertTriangle size={20} color="white" />
                ) : (
                  <MessageCircle size={20} color="white" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold text-sm">{notification.title}</Text>
                <Text className="text-white/90 text-xs mt-0.5">{notification.message}</Text>
              </View>
              <TouchableOpacity
                onPress={() => onDismiss(notification.id)}
                className="ml-2 p-1"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={16} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </SafeAreaView>
  );
}
