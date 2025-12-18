import { View, Text, StyleSheet } from 'react-native';
import { Tabs, Redirect } from 'expo-router';
import { Home, Users, MessageCircle, Settings } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useUnreadMessageCount } from '../../src/hooks/useUnreadMessageCount';
import { useCallback } from 'react';

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

export default function SocialWorkerLayout() {
  const { profile } = useAuth();
  const { unreadCount } = useUnreadMessageCount();

  const renderDashboardIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => <Home color={color} size={size} />,
    [],
  );

  const renderCaseloadIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => <Users color={color} size={size} />,
    [],
  );

  const renderMessagesIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <View>
        <MessageCircle color={color} size={size} />
        <UnreadBadge count={unreadCount} />
      </View>
    ),
    [unreadCount],
  );

  const renderSettingsIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => <Settings color={color} size={size} />,
    [],
  );

  // Ensure only social workers and admins can access this layout
  if (profile && profile.role !== 'social_worker' && profile.role !== 'admin') {
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          paddingBottom: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: renderDashboardIcon,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="caseload"
        options={{
          title: 'Caseload',
          tabBarIcon: renderCaseloadIcon,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: renderMessagesIcon,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: renderSettingsIcon,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="case/[id]"
        options={{
          href: null, // Hide from tab bar - this is a stack screen, not a tab
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Hide from tab bar - accessed from settings
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="create-case"
        options={{
          href: null, // Hide from tab bar - accessed via FAB
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
