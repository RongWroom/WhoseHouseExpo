import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Text } from '../ui/Text';
import { AlertTriangle, Send, Clock } from 'lucide-react-native';

interface MessageComposerProps {
  onSendMessage: (content: string, isUrgent: boolean) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  showUrgentOption?: boolean; // Only for social workers
  accentRole?: 'social_worker' | 'foster_carer';
}

export function MessageComposer({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...',
  showUrgentOption = false,
  accentRole = 'social_worker',
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [sending, setSending] = useState(false);

  const activeSendBgClass = accentRole === 'foster_carer' ? 'bg-foster-carer-500' : 'bg-blue-500';

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const messageContent = message.trim();
    setMessage('');
    setSending(true);

    try {
      await onSendMessage(messageContent, isUrgent);
      setIsUrgent(false); // Reset urgent flag after sending
    } catch {
      // Restore message if send failed
      setMessage(messageContent);
      Alert.alert('Failed to send', 'Please try again');
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="border-t border-gray-200 bg-white"
    >
      <View className="px-4 py-2">
        {/* Urgent Toggle (only for social workers) */}
        {showUrgentOption && (
          <TouchableOpacity
            onPress={() => setIsUrgent(!isUrgent)}
            className={`flex-row items-center self-start px-3 py-1.5 mb-2 rounded-full ${
              isUrgent ? 'bg-red-500' : 'bg-gray-100'
            }`}
          >
            <AlertTriangle size={16} color={isUrgent ? '#fff' : '#6b7280'} />
            <Text
              className={`ml-1.5 text-sm font-medium ${isUrgent ? 'text-white' : 'text-gray-600'}`}
            >
              Mark as Urgent
            </Text>
          </TouchableOpacity>
        )}

        {/* Message Input Row */}
        <View className="flex-row items-end">
          {/* Text Input */}
          <View
            className={`flex-1 mr-2 border rounded-3xl px-4 py-2 min-h-[44px] max-h-[120px] ${
              isUrgent ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'
            }`}
          >
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder={placeholder}
              placeholderTextColor="#9ca3af"
              multiline
              maxLength={1000}
              editable={!disabled && !sending}
              className={`text-base text-gray-900 ${Platform.OS === 'ios' ? 'pt-2' : 'pt-1'}`}
            />
          </View>

          {/* Send Button */}
          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim() || disabled || sending}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              message.trim() && !disabled && !sending ? activeSendBgClass : 'bg-gray-200'
            }`}
          >
            {sending ? (
              <Clock size={20} color="#9ca3af" />
            ) : (
              <Send
                size={20}
                color={message.trim() && !disabled && !sending ? '#fff' : '#9ca3af'}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
