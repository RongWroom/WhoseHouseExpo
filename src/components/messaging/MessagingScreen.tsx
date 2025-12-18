import React from 'react';
import { View, SafeAreaView } from 'react-native';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Alert } from '../ui/Alert';
import { Text } from '../ui/Text';
import { useMessages } from '../../hooks/useMessages';
import { useAuth } from '../../contexts/AuthContext';

interface MessagingScreenProps {
  caseId: string;
  recipientId: string;
  recipientName: string;
  recipientRole?: 'social_worker' | 'foster_carer' | null;
  isChildMessaging?: boolean;
  showHeader?: boolean;
  accentRole?: 'social_worker' | 'foster_carer';
}

export function MessagingScreen({
  caseId,
  recipientId,
  recipientName,
  recipientRole,
  isChildMessaging = false,
  showHeader = true,
  accentRole,
}: MessagingScreenProps) {
  const { user, profile } = useAuth();
  const userId = user?.id || '';
  const userRole = profile?.role || null;

  const effectiveAccentRole: 'social_worker' | 'foster_carer' =
    accentRole || (userRole === 'foster_carer' ? 'foster_carer' : 'social_worker');

  const { messages, loading, error, sending, sendMessage } = useMessages(
    caseId,
    userId,
    userRole === 'admin' ? null : userRole,
  );

  const handleSendMessage = async (content: string, isUrgent: boolean) => {
    if (!recipientId) {
      throw new Error('No recipient specified');
    }
    await sendMessage(content, recipientId, isUrgent);
  };

  // For child messaging, they might not have a userId
  const effectiveUserId = isChildMessaging ? 'child' : userId;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
          <Text className="mt-2 text-gray-500">Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 p-4">
          <Alert variant="danger" message={error} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1">
        {/* Message Header */}
        {showHeader && (
          <View className="px-4 py-3 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900">{recipientName}</Text>
            {recipientRole && (
              <Text className="text-sm text-gray-500 mt-0.5">
                {recipientRole === 'social_worker' ? 'Social Worker' : 'Foster Carer'}
              </Text>
            )}
          </View>
        )}

        {/* Messages */}
        <View className="flex-1 px-4">
          <MessageList
            messages={messages}
            currentUserId={effectiveUserId}
            userRole={userRole === 'admin' ? null : userRole}
            accentRole={effectiveAccentRole}
          />
        </View>

        {/* Composer */}
        <MessageComposer
          onSendMessage={handleSendMessage}
          disabled={sending}
          placeholder={`Message ${recipientName}...`}
          showUrgentOption={userRole === 'social_worker'}
          accentRole={effectiveAccentRole}
        />
      </View>
    </SafeAreaView>
  );
}
