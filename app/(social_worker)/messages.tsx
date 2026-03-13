import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, ChevronLeft } from 'lucide-react-native';
import { useCases, type CaseWithDetails } from '../../src/hooks/useCases';
import { MessagingScreen } from '../../src/components/messaging/MessagingScreen';
import {
  Screen,
  Container,
  Card,
  CardContent,
  Text,
  TitleBar,
  Badge,
  EmptyState,
} from '../../src/components/ui';
import { THEME } from '../../src/lib/theme';

export default function MessagesScreen() {
  const { cases, loading } = useCases();
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const selectedCaseData = selectedCase
    ? cases.find((c: CaseWithDetails) => c.id === selectedCase)
    : null;

  const getCaseLabel = (caseData: CaseWithDetails) =>
    caseData.case_number || `Case-${String(caseData.id).slice(0, 8).toUpperCase()}`;

  useEffect(() => {
    if (selectedCase && !selectedCaseData) {
      setSelectedCase(null);
    }
  }, [selectedCase, selectedCaseData]);

  // If a case is selected, show the messaging screen
  if (selectedCase && selectedCaseData) {
    const caseData = selectedCaseData;

    const caseLabel = getCaseLabel(caseData);

    return (
      <View className="flex-1 bg-white">
        <SafeAreaView edges={['top']} className="bg-white border-b border-gray-200">
          <View className="flex-row items-center px-4 py-3">
            <TouchableOpacity
              onPress={() => setSelectedCase(null)}
              className="mr-3 w-10 h-10 items-center justify-center rounded-full bg-gray-100"
              accessibilityLabel="Back to conversations"
              accessibilityRole="button"
            >
              <ChevronLeft size={24} color="#007AFF" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text variant="body" weight="semibold">
                {caseLabel}
              </Text>
              <Text variant="caption" color="muted">
                {caseData.foster_carer?.full_name || 'Foster Carer'}
              </Text>
            </View>
          </View>
        </SafeAreaView>
        <MessagingScreen
          caseId={caseData.id}
          recipientId={caseData.foster_carer_id || ''}
          recipientName={caseData.foster_carer?.full_name || 'Foster Carer'}
          recipientRole="foster_carer"
          showHeader={false}
          accentRole="social_worker"
        />
      </View>
    );
  }

  // Show list of cases to message
  return (
    <Screen backgroundColor="bg-[#F8F8F5]">
      <Container className="py-4">
        <TitleBar
          title="Messages"
          subtitle="Select a case to start messaging"
          accentColor={THEME.roles.socialWorker.primary}
          className="mb-6"
        />

        {loading ? (
          <View className="flex-1 items-center justify-center py-12">
            <ActivityIndicator size="large" color={THEME.roles.socialWorker.primary} />
          </View>
        ) : cases.length === 0 ? (
          <EmptyState
            icon={<MessageCircle size={48} color="#9CA3AF" />}
            title="No Cases Yet"
            description="Cases assigned to you will appear here for messaging"
          />
        ) : (
          <FlatList
            data={cases}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedCase(item.id)}
                accessibilityLabel={`Message about ${getCaseLabel(item)}`}
                accessibilityRole="button"
              >
                <Card variant="elevated" className="mb-3">
                  <CardContent>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text variant="body" weight="semibold">
                            {getCaseLabel(item)}
                          </Text>
                          <Badge variant={item.status === 'active' ? 'success' : 'default'}>
                            {item.status}
                          </Badge>
                        </View>
                        <Text variant="caption" color="muted">
                          Foster Carer: {item.foster_carer?.full_name || 'Unassigned'}
                        </Text>
                      </View>
                      <View className="ml-3">
                        <MessageCircle size={20} color={THEME.roles.socialWorker.primary} />
                      </View>
                    </View>
                  </CardContent>
                </Card>
              </TouchableOpacity>
            )}
          />
        )}
      </Container>
    </Screen>
  );
}
