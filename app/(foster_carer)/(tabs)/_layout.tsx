import { View, Text, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Home, MessageCircle, Settings, Camera } from 'lucide-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useUnreadMessageCount } from '../../../src/hooks/useUnreadMessageCount';
import { Redirect } from 'expo-router';
import { useCallback } from 'react';
import { THEME } from '../../../src/lib/theme';

const badgeStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <View style={badgeStyles.badge}>
      <Text style={badgeStyles.badgeText}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

function MessageIconWithBadge({
  color,
  size,
  unreadCount,
}: {
  color: string;
  size: number;
  unreadCount: number;
}) {
  return (
    <View>
      <MessageCircle color={color} size={size} />
      <UnreadBadge count={unreadCount} />
    </View>
  );
}

export default function FosterCarerTabsLayout() {
  const { profile } = useAuth();
  const { unreadCount } = useUnreadMessageCount();

  const renderHomeIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => <Home color={color} size={size} />,
    [],
  );

  const renderMessagesIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <MessageIconWithBadge color={color} size={size} unreadCount={unreadCount} />
    ),
    [unreadCount],
  );

  const renderPhotosIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => <Camera color={color} size={size} />,
    [],
  );

  const renderSettingsIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => <Settings color={color} size={size} />,
    [],
  );

  if (profile && profile.role !== 'foster_carer') {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: THEME.colors.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        },
        headerTintColor: THEME.colors.text.primary,
        headerTitleStyle: {
          fontWeight: '600',
          color: THEME.colors.text.primary,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: renderHomeIcon,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: renderMessagesIcon,
        }}
      />
      <Tabs.Screen
        name="house-profile"
        options={{
          title: 'House Profile',
          tabBarIcon: renderPhotosIcon,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: renderSettingsIcon,
        }}
      />
    </Tabs>
  );
}
