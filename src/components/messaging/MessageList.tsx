import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../ui/Text';
import { Avatar } from '../ui/Avatar';
import { AlertTriangle, Check, CheckCheck, MessageCircle } from 'lucide-react-native';
import type { MessageWithDetails } from '../../hooks/useMessages';

interface MessageListProps {
  messages: MessageWithDetails[];
  currentUserId: string;
  userRole: 'social_worker' | 'foster_carer' | null;
  onMessagePress?: (message: MessageWithDetails) => void;
  accentRole?: 'social_worker' | 'foster_carer';
}

export function MessageList({
  messages,
  currentUserId,
  userRole,
  onMessagePress,
  accentRole = 'social_worker',
}: MessageListProps) {
  const accentHex = accentRole === 'foster_carer' ? '#34C759' : '#007AFF';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((word) => word[0]?.toUpperCase() || '')
      .join('')
      .slice(0, 2);
  };

  const renderMessage = (message: MessageWithDetails, _index: number) => {
    const isOwnMessage = message.sender_id === currentUserId;
    const senderName =
      message.sender_id === null
        ? message.child_initials || 'Child'
        : message.sender_profile?.full_name || 'Unknown';

    // Don't show read receipts to children (for their sent messages)
    const showReadReceipt = userRole !== null && isOwnMessage;

    return (
      <TouchableOpacity
        key={message.id}
        onPress={() => onMessagePress?.(message)}
        disabled={!onMessagePress}
        className={`mb-4 ${isOwnMessage ? 'items-end' : 'items-start'}`}
      >
        <View className={`flex-row ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          {!isOwnMessage && (
            <Avatar initials={getInitials(senderName)} size="sm" className="mr-2" />
          )}

          {/* Message Content */}
          <View className={`max-w-[75%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
            {/* Sender Name (only for received messages) */}
            {!isOwnMessage && <Text className="text-xs text-gray-500 mb-1">{senderName}</Text>}

            {/* Message Bubble */}
            <View
              className={`px-4 py-2.5 rounded-2xl ${
                isOwnMessage
                  ? accentRole === 'foster_carer'
                    ? 'bg-foster-carer-500'
                    : 'bg-social-worker-500'
                  : 'bg-gray-100'
              } ${message.is_urgent ? 'border-2 border-red-500' : ''}`}
            >
              {/* Urgent Badge */}
              {message.is_urgent && (
                <View className="flex-row items-center mb-1">
                  <AlertTriangle size={14} color={isOwnMessage ? '#fff' : '#ef4444'} />
                  <Text
                    className={`text-xs font-semibold ml-1 ${
                      isOwnMessage ? 'text-white' : 'text-red-500'
                    }`}
                  >
                    Urgent
                  </Text>
                </View>
              )}

              {/* Message Text */}
              <Text className={`text-base ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                {message.content}
              </Text>
            </View>

            {/* Message Meta */}
            <View className="flex-row items-center mt-1 px-1">
              <Text className="text-xs text-gray-500">{formatTime(message.created_at)}</Text>

              {/* Read Receipt (not shown for children) */}
              {showReadReceipt && (
                <View className="ml-2">
                  {message.status === 'read' && <CheckCheck size={14} color={accentHex} />}
                  {message.status === 'delivered' && <CheckCheck size={14} color="#9ca3af" />}
                  {message.status === 'sent' && <Check size={14} color="#9ca3af" />}
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Group messages by date
  const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = new Date(message.created_at).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, MessageWithDetails[]>,
  );

  return (
    <ScrollView
      className="flex-1"
      showsVerticalScrollIndicator={false}
      // eslint-disable-next-line react-native/no-inline-styles
      contentContainerStyle={{ paddingVertical: 16 }}
    >
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <View key={date}>
          {/* Date Separator */}
          <View className="flex-row items-center my-4">
            <View className="flex-1 h-[1px] bg-gray-200" />
            <Text className="mx-3 text-xs text-gray-500 font-medium">
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
            <View className="flex-1 h-[1px] bg-gray-200" />
          </View>

          {/* Messages for this date */}
          {dateMessages.map((message, index) => renderMessage(message, index))}
        </View>
      ))}

      {messages.length === 0 && (
        <View className="flex-1 items-center justify-center py-8">
          <MessageCircle size={48} color="#9ca3af" />
          <Text className="text-gray-500 mt-2">No messages yet</Text>
          <Text className="text-gray-400 text-sm mt-1">Start a conversation</Text>
        </View>
      )}
    </ScrollView>
  );
}
