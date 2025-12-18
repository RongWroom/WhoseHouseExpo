import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveCaseForCarer } from '@/hooks/useCases';
import { MessagingScreen } from '@/components/messaging/MessagingScreen';
import {
  Screen,
  Container,
  TitleBar,
  Text,
  LoadingSpinner,
  EmptyState,
} from '../../../src/components/ui';
import { THEME } from '../../../src/lib/theme';

export default function FosterCarerMessagesScreen() {
  const { user } = useAuth();
  const { caseData, loading } = useActiveCaseForCarer(user?.id || null);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
          <Text variant="body" color="muted" className="mt-3">
            Loading messages...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!caseData || !caseData.social_worker_id) {
    return (
      <Screen backgroundColor="bg-gray-50">
        <Container className="py-6">
          <TitleBar
            title="Messages"
            subtitle="Secure communication with your social worker"
            accentColor={THEME.roles.fosterCarer.primary}
          />
          <View className="flex-1 items-center justify-center px-6 py-12">
            <EmptyState
              icon={<MessageCircle size={48} color="#9CA3AF" />}
              title="No Active Case"
              description="You'll be able to message your social worker once a case is assigned to you."
            />
          </View>
        </Container>
      </Screen>
    );
  }

  // Get the social worker's name from the case data
  const socialWorkerName = caseData.social_worker?.full_name || 'Your Social Worker';

  return (
    <MessagingScreen
      caseId={caseData.id}
      recipientId={caseData.social_worker_id}
      recipientName={socialWorkerName}
      recipientRole="social_worker"
    />
  );
}
