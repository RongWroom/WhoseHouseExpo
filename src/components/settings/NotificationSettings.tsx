/**
 * Notification Settings Component
 * Allows users to manage their notification preferences
 */

import React from 'react';
import { View, Switch, TouchableOpacity, Platform } from 'react-native';
import {
  Bell,
  BellOff,
  Moon,
  Clock,
  MessageSquare,
  AlertTriangle,
  User,
  Smartphone,
} from 'lucide-react-native';
import { Text, Card, CardContent, LoadingSpinner } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useNotificationPreferences, usePushToken } from '../../hooks/useNotifications';
import type { NotificationPreferences } from '../../lib/notifications';

interface NotificationSettingsProps {
  accentColor?: string;
}

export function NotificationSettings({ accentColor = '#007AFF' }: NotificationSettingsProps) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const {
    preferences,
    loading,
    saving,
    updatePreference: updatePref,
  } = useNotificationPreferences(userId);

  const { token, permissionGranted, registerToken, loading: tokenLoading } = usePushToken(userId);

  const isWeb = Platform.OS === 'web';
  const needsRegistration = !isWeb && !token && permissionGranted !== false;

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean | string) => {
    await updatePref(key, value as NotificationPreferences[typeof key]);
  };

  if (loading) {
    return (
      <View className="items-center justify-center py-8">
        <LoadingSpinner size="large" />
        <Text variant="caption" color="muted" className="mt-2">
          Loading notification settings...
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4">
      {/* Push Token Registration (mobile only) */}
      {!isWeb && needsRegistration && (
        <Card variant="elevated">
          <CardContent>
            <View className="flex-row items-center">
              <Smartphone size={24} color={accentColor} />
              <View className="ml-3 flex-1">
                <Text variant="body" weight="semibold">
                  Enable Push Notifications
                </Text>
                <Text variant="caption" color="muted">
                  Receive alerts for messages and updates
                </Text>
              </View>
            </View>
            <TouchableOpacity
              className="mt-3 py-2.5 rounded-lg items-center"
              style={{ backgroundColor: accentColor }}
              onPress={registerToken}
              disabled={tokenLoading}
              accessibilityLabel="Enable push notifications"
              accessibilityRole="button"
            >
              <Text variant="body" weight="semibold" className="text-white">
                {tokenLoading ? 'Enabling...' : 'Enable Notifications'}
              </Text>
            </TouchableOpacity>
          </CardContent>
        </Card>
      )}

      {/* Token Status (when registered) */}
      {!isWeb && token && (
        <Card variant="elevated">
          <CardContent>
            <View className="flex-row items-center">
              <Smartphone size={20} color="#34C759" />
              <Text variant="caption" color="muted" className="ml-2">
                Push notifications active on this device
              </Text>
            </View>
          </CardContent>
        </Card>
      )}

      {/* Master Toggle */}
      <Card variant="elevated">
        <CardContent>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {preferences.enabled ? (
                <Bell size={24} color={accentColor} />
              ) : (
                <BellOff size={24} color="#9CA3AF" />
              )}
              <View className="ml-3 flex-1">
                <Text variant="body" weight="semibold">
                  Push Notifications
                </Text>
                <Text variant="caption" color="muted">
                  {preferences.enabled ? 'Notifications are enabled' : 'All notifications disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={preferences.enabled}
              onValueChange={(value) => updatePreference('enabled', value)}
              trackColor={{ false: '#D1D5DB', true: accentColor }}
              thumbColor="white"
            />
          </View>
        </CardContent>
      </Card>

      {/* Notification Types */}
      {preferences.enabled && (
        <Card variant="elevated">
          <CardContent>
            <Text variant="body" weight="semibold" className="mb-4">
              Notification Types
            </Text>

            {/* Messages */}
            <SettingRow
              icon={<MessageSquare size={20} color="#34C759" />}
              title="Messages"
              description="New messages from social workers"
              value={preferences.messages}
              onToggle={(value) => updatePreference('messages', value)}
              accentColor={accentColor}
            />

            {/* Urgent Messages */}
            <SettingRow
              icon={<AlertTriangle size={20} color="#FF3B30" />}
              title="Urgent Messages"
              description="Always receive urgent messages"
              value={preferences.urgentMessages}
              onToggle={(value) => updatePreference('urgentMessages', value)}
              accentColor={accentColor}
              disabled={true}
              disabledReason="Cannot disable urgent messages"
            />

            {/* Case Updates */}
            <SettingRow
              icon={<User size={20} color="#5856D6" />}
              title="Case Updates"
              description="Updates to your active cases"
              value={preferences.caseUpdates}
              onToggle={(value) => updatePreference('caseUpdates', value)}
              accentColor={accentColor}
            />

            {/* Child Access */}
            <SettingRow
              icon={<User size={20} color="#FF9500" />}
              title="Child Access"
              description="When a child accesses their page"
              value={preferences.childAccess}
              onToggle={(value) => updatePreference('childAccess', value)}
              accentColor={accentColor}
              isLast
            />
          </CardContent>
        </Card>
      )}

      {/* Quiet Hours */}
      {preferences.enabled && (
        <Card variant="elevated">
          <CardContent>
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Moon size={20} color="#6366F1" />
                <Text variant="body" weight="semibold" className="ml-2">
                  Quiet Hours
                </Text>
              </View>
              <Switch
                value={preferences.quietHoursEnabled}
                onValueChange={(value) => updatePreference('quietHoursEnabled', value)}
                trackColor={{ false: '#D1D5DB', true: accentColor }}
                thumbColor="white"
              />
            </View>

            {preferences.quietHoursEnabled && (
              <>
                <Text variant="caption" color="muted" className="mb-3">
                  No notifications during quiet hours (except urgent messages)
                </Text>

                <View className="flex-row items-center justify-between bg-gray-50 rounded-lg p-3">
                  <View className="flex-row items-center">
                    <Clock size={16} color="#6B7280" />
                    <Text variant="body" className="ml-2">
                      {preferences.quietHoursStart} - {preferences.quietHoursEnd}
                    </Text>
                  </View>
                  <TouchableOpacity
                    className="px-3 py-1 bg-gray-200 rounded-full"
                    accessibilityLabel="Edit quiet hours"
                    accessibilityRole="button"
                  >
                    <Text variant="caption" weight="medium">
                      Edit
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Saving indicator */}
      {saving && (
        <Text variant="caption" color="muted" className="text-center">
          Saving...
        </Text>
      )}
    </View>
  );
}

// Helper component for individual setting rows
function SettingRow({
  icon,
  title,
  description,
  value,
  onToggle,
  accentColor,
  disabled = false,
  disabledReason,
  isLast = false,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  accentColor: string;
  disabled?: boolean;
  disabledReason?: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}
    >
      <View className="flex-row items-center flex-1">
        {icon}
        <View className="ml-3 flex-1">
          <Text variant="body" weight="medium">
            {title}
          </Text>
          <Text variant="caption" color="muted">
            {disabled && disabledReason ? disabledReason : description}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#D1D5DB', true: accentColor }}
        thumbColor="white"
        disabled={disabled}
      />
    </View>
  );
}
