import React from 'react';
import { View, Pressable, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LogOut, User, ChevronRight, Shield, HelpCircle, Lock } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import {
  Screen,
  Container,
  Card,
  CardContent,
  Text,
  Divider,
  TitleBar,
} from '../../src/components/ui';
import { THEME } from '../../src/lib/theme';
import { NotificationSettings } from '../../src/components/settings/NotificationSettings';

function getInitials(fullName?: string | null) {
  if (!fullName) return '';

  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

// Settings menu item component
function SettingsItem({
  icon: Icon,
  label,
  value,
  onPress,
  showChevron = true,
  rightElement,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center py-3"
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={label}
    >
      <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center mr-3">
        <Icon size={20} color="#666" />
      </View>
      <View className="flex-1">
        <Text variant="body">{label}</Text>
        {value && (
          <Text variant="caption" color="muted">
            {value}
          </Text>
        )}
      </View>
      {rightElement}
      {showChevron && onPress && <ChevronRight size={20} color="#999" />}
    </TouchableOpacity>
  );
}

export default function SocialWorkerSettingsScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();

  // Get avatar URL from profile metadata
  const avatarUrl = (profile as any)?.metadata?.avatarUrl || null;

  const handleSignOut = async () => {
    await signOut();
  };

  const navigateToProfile = () => {
    router.push('/(social_worker)/profile');
  };

  return (
    <Screen
      backgroundColor="bg-gray-50"
      scroll
      scrollProps={{ showsVerticalScrollIndicator: false }}
    >
      <Container className="py-6">
        <TitleBar
          title="Settings"
          subtitle="Manage your account"
          accentColor={THEME.roles.socialWorker.primary}
          className="mb-6"
        />

        {/* Profile Card - Tap to edit full profile */}
        <TouchableOpacity onPress={navigateToProfile} activeOpacity={0.7}>
          <Card variant="elevated" className="mb-6">
            <CardContent className="flex-row items-center">
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  className="w-16 h-16 rounded-full mr-4"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 rounded-full bg-social-worker-500 items-center justify-center mr-4">
                  {getInitials(profile?.full_name) ? (
                    <Text className="text-white text-xl font-bold">
                      {getInitials(profile?.full_name)}
                    </Text>
                  ) : (
                    <User size={28} color="white" />
                  )}
                </View>
              )}

              <View className="flex-1">
                <Text variant="body" weight="semibold">
                  {profile?.full_name || 'Social Worker'}
                </Text>
                <Text variant="caption" color="muted" className="mt-0.5">
                  {profile?.email || 'Email not available'}
                </Text>
                <Text className="text-sm text-social-worker-600 font-medium mt-1">
                  View & Edit Profile
                </Text>
              </View>
              <ChevronRight size={20} color="#999" />
            </CardContent>
          </Card>
        </TouchableOpacity>

        {/* Notifications Section */}
        <Text variant="label" color="muted" className="mb-2 ml-1">
          NOTIFICATIONS
        </Text>
        <View className="mb-6">
          <NotificationSettings accentColor={THEME.roles.socialWorker.primary} />
        </View>

        {/* Security Section */}
        <Text variant="label" color="muted" className="mb-2 ml-1">
          SECURITY
        </Text>
        <Card className="mb-6">
          <CardContent>
            <SettingsItem
              icon={Lock}
              label="Change Password"
              onPress={() => {
                /* TODO: Navigate to change password */
              }}
            />
            <Divider className="my-1" />
            <SettingsItem
              icon={Shield}
              label="Privacy & Data"
              value="Manage your data preferences"
              onPress={() => {
                /* TODO: Navigate to privacy settings */
              }}
            />
          </CardContent>
        </Card>

        {/* Support Section */}
        <Text variant="label" color="muted" className="mb-2 ml-1">
          SUPPORT
        </Text>
        <Card className="mb-6">
          <CardContent>
            <SettingsItem
              icon={HelpCircle}
              label="Help & Support"
              value="FAQs and contact support"
              onPress={() => {
                /* TODO: Navigate to help */
              }}
            />
          </CardContent>
        </Card>

        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          accessibilityHint="Logs you out of the WhoseHouse app"
          className="mt-2 flex-row items-center justify-center rounded-xl bg-red-600 py-4 active:bg-red-700"
        >
          <LogOut size={20} color="#ffffff" />
          <Text className="ml-2 text-base font-semibold text-white">Sign Out</Text>
        </Pressable>

        {/* App Info */}
        <View className="mt-6 items-center pb-6">
          <Text variant="caption" color="muted">
            WhoseHouse v1.0.0
          </Text>
          <Text variant="caption" color="muted" className="mt-1">
            © 2024 WhoseHouse. All rights reserved.
          </Text>
        </View>
      </Container>
    </Screen>
  );
}
