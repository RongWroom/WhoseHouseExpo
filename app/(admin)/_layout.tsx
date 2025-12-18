import React from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { Users, LayoutDashboard, UserPlus, Link, Settings } from 'lucide-react-native';

const ADMIN_COLOR = '#FF9500'; // Orange for admin role

type TabIconProps = { color: string; size: number };

const DashboardTabIcon = ({ color, size }: TabIconProps) => (
  <LayoutDashboard size={size} color={color} />
);
const UsersTabIcon = ({ color, size }: TabIconProps) => <Users size={size} color={color} />;
const CreateUserTabIcon = ({ color, size }: TabIconProps) => <UserPlus size={size} color={color} />;
const AssignmentsTabIcon = ({ color, size }: TabIconProps) => <Link size={size} color={color} />;
const SettingsTabIcon = ({ color, size }: TabIconProps) => <Settings size={size} color={color} />;

export default function AdminLayout() {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <LoadingSpinner size="large" />
      </View>
    );
  }

  if (!profile || profile.role !== 'admin') {
    console.log('🚫 Unauthorized access to admin area');
    return <Redirect href="/(auth)" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ADMIN_COLOR,
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e0e0e0',
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: ADMIN_COLOR,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: DashboardTabIcon,
          headerTitle: 'Admin Dashboard',
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarLabel: 'Users',
          tabBarIcon: UsersTabIcon,
          headerTitle: 'User Management',
        }}
      />
      <Tabs.Screen
        name="create-user"
        options={{
          title: 'Create User',
          tabBarLabel: 'Add User',
          tabBarIcon: CreateUserTabIcon,
          headerTitle: 'Create New User',
        }}
      />
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          tabBarLabel: 'Assign',
          tabBarIcon: AssignmentsTabIcon,
          headerTitle: 'Case Assignments',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: SettingsTabIcon,
          headerTitle: 'Admin Settings',
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
