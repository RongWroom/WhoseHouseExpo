import React from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { Screen } from '../../src/components/ui/Screen';
import { Card } from '../../src/components/ui/Card';
import { Text } from '../../src/components/ui/Text';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  Settings as SettingsIcon,
  Building2,
  LogOut,
  ChevronRight,
  Shield,
  Key,
  UserCog,
} from 'lucide-react-native';
import { NotificationSettings } from '../../src/components/settings/NotificationSettings';

interface SettingItemProps {
  icon: React.ComponentType<{ size: number; color: string }>;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}

const SettingItem = ({
  icon: Icon,
  title,
  subtitle,
  onPress,
  danger = false,
}: SettingItemProps) => (
  <TouchableOpacity onPress={onPress} className="py-3 border-b border-gray-200 last:border-0">
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center flex-1">
        <View
          className={`w-9 h-9 rounded-lg items-center justify-center mr-3 ${
            danger ? 'bg-red-100' : 'bg-orange-100'
          }`}
        >
          <Icon size={18} color={danger ? '#DC2626' : '#FF9500'} />
        </View>
        <View className="flex-1">
          <Text className={`text-base font-medium ${danger ? 'text-red-600' : 'text-gray-900'}`}>
            {title}
          </Text>
          {subtitle && <Text className="text-sm text-gray-500 mt-0.5">{subtitle}</Text>}
        </View>
      </View>
      <ChevronRight size={20} color="#9CA3AF" />
    </View>
  </TouchableOpacity>
);

export default function AdminSettings() {
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Screen>
      <ScrollView className="flex-1 bg-gray-50">
        <View className="p-5">
          {/* Profile Card */}
          <Card className="mb-5 p-5 bg-orange-50">
            <View className="flex-row items-center">
              <View className="w-16 h-16 rounded-full bg-orange-500 items-center justify-center mr-4">
                <Shield size={28} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-gray-900">{profile?.full_name}</Text>
                <Text className="text-gray-600">{profile?.email}</Text>
                <View className="mt-2">
                  <View className="bg-orange-500 px-2 py-1 rounded-full self-start">
                    <Text className="text-xs font-medium text-white">ADMINISTRATOR</Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>

          {/* Organization Settings */}
          <Card className="mb-3 p-4">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Organization
            </Text>
            <SettingItem
              icon={Building2}
              title="Organization Settings"
              subtitle="Manage organization details"
              onPress={() => console.log('Organization settings')}
            />
            <SettingItem
              icon={UserCog}
              title="User Permissions"
              subtitle="Configure role-based access"
              onPress={() => console.log('User permissions')}
            />
          </Card>

          {/* Security Settings */}
          <Card className="mb-3 p-4">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Security
            </Text>
            <SettingItem
              icon={Key}
              title="Password Policy"
              subtitle="Configure password requirements"
              onPress={() => console.log('Password policy')}
            />
            <SettingItem
              icon={Shield}
              title="Audit Logs"
              subtitle="View system activity logs"
              onPress={() => console.log('Audit logs')}
            />
          </Card>

          {/* Notification Settings */}
          <View className="mb-3">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 ml-1">
              Notifications
            </Text>
            <NotificationSettings accentColor="#FF9500" />
          </View>

          {/* Account Actions */}
          <Card className="p-4">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Account
            </Text>
            <SettingItem
              icon={SettingsIcon}
              title="Personal Settings"
              subtitle="Update your profile details"
              onPress={() => console.log('Personal settings')}
            />
            <SettingItem
              icon={LogOut}
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleSignOut}
              danger
            />
          </Card>

          {/* App Info */}
          <View className="mt-8 items-center">
            <Text className="text-xs text-gray-500">WhoseHouse Admin Portal</Text>
            <Text className="text-xs text-gray-400 mt-1">Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
