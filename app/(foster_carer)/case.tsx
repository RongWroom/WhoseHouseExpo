import { View, Pressable, ActivityIndicator, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  MessageCircle,
  Phone,
  AlertCircle,
  Calendar,
  Home,
  FileText,
  Inbox,
} from 'lucide-react-native';
import { Screen, Container, Card, CardContent, Text, Avatar } from '../../src/components/ui';
import { THEME } from '../../src/lib/theme';
import { useActiveCase } from '../../src/hooks/useCases';
import { Anonymizer } from '../../src/utils/privacy';

export default function FosterCarerCaseScreen() {
  const router = useRouter();
  const { caseData, loading, error } = useActiveCase();
  const fosterCarerColor = THEME.roles.fosterCarer.primary;

  // Navigation handlers
  const handleMessageSocialWorker = () => {
    router.push('/(foster_carer)/messages');
  };

  const handleCallSocialWorker = () => {
    const phoneNumber = caseData?.social_worker?.phone_number;
    if (!phoneNumber) {
      Alert.alert('No Phone Number', 'Social worker phone number not available.');
      return;
    }
    Linking.openURL(`tel:${phoneNumber}`);
  };

  // Helper to format dates
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Helper to calculate placement duration
  const getPlacementDuration = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return 'Unknown';
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffInDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day';
    if (diffInDays < 7) return `${diffInDays} days`;
    if (diffInDays < 14) return '1 week';
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks`;
    if (diffInDays < 60) return '1 month';
    return `${Math.floor(diffInDays / 30)} months`;
  };

  // Show loading state
  if (loading) {
    return (
      <Screen backgroundColor="bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={fosterCarerColor} />
          <Text variant="body" color="muted" className="mt-4">
            Loading case details...
          </Text>
        </View>
      </Screen>
    );
  }

  // Show error state
  if (error) {
    return (
      <Screen backgroundColor="bg-gray-50">
        <Container className="flex-1 justify-center">
          <Card variant="elevated">
            <CardContent className="items-center py-8">
              <AlertCircle size={48} color="#FF3B30" />
              <Text variant="h3" weight="semibold" className="mt-4">
                Error Loading Case
              </Text>
              <Text variant="body" color="muted" className="mt-2 text-center">
                {error}
              </Text>
            </CardContent>
          </Card>
        </Container>
      </Screen>
    );
  }

  // Show no active case state
  if (!caseData) {
    return (
      <Screen backgroundColor="bg-gray-50">
        <Container className="flex-1 justify-center px-6">
          <View className="items-center">
            <View className="w-24 h-24 rounded-full bg-foster-carer-100 items-center justify-center mb-6">
              <Inbox size={48} color={fosterCarerColor} />
            </View>
            <Text variant="h2" weight="bold" className="text-center mb-3">
              No Active Placement
            </Text>
            <Text variant="body" color="muted" className="text-center mb-8 max-w-sm">
              You don't currently have an active case assignment. Your social worker will notify you
              when a placement is available.
            </Text>
            <View className="w-full max-w-sm">
              <Card variant="outlined" className="bg-foster-carer-50/50">
                <CardContent className="py-4">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-foster-carer-500 items-center justify-center mr-3">
                      <Text className="text-white font-bold">📋</Text>
                    </View>
                    <View className="flex-1">
                      <Text variant="caption" weight="semibold" className="mb-1">
                        Case Details
                      </Text>
                      <Text variant="caption" color="muted">
                        Once assigned, you'll see placement information, social worker contact
                        details, and important case notes here.
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            </View>
          </View>
        </Container>
      </Screen>
    );
  }

  // Get social worker info
  const socialWorker = caseData.social_worker;
  const socialWorkerName = socialWorker?.full_name || 'Social Worker';
  const socialWorkerInitials = Anonymizer.nameToInitials(socialWorkerName);
  const childInitials = Anonymizer.nameToInitials(caseData.child_name || 'Child');

  return (
    <Screen scroll backgroundColor="bg-gray-50">
      <Container className="py-6">
        {/* Header */}
        <View className="mb-6">
          <Text variant="h2" weight="bold" className="mb-2">
            Case Details
          </Text>
          <Text variant="body" color="muted">
            Information about your current placement
          </Text>
        </View>

        {/* Case Information Card */}
        <View className="mb-6">
          <Text variant="h3" weight="semibold" className="mb-3">
            Case Information
          </Text>
          <Card variant="elevated">
            <CardContent>
              <View className="flex-row items-center mb-4">
                <Avatar initials={childInitials} size="lg" backgroundColor="bg-foster-carer-500" />
                <View className="flex-1 ml-3">
                  <Text variant="body" weight="semibold">
                    {caseData.case_number || caseData.id?.slice(0, 12).toUpperCase() || 'N/A'}
                  </Text>
                  <Text variant="caption" color="muted" className="mt-1">
                    Child: {childInitials}
                  </Text>
                </View>
              </View>

              <View className="space-y-3">
                <View className="flex-row items-center">
                  <Calendar size={20} color="#9CA3AF" className="mr-3" />
                  <View className="flex-1">
                    <Text variant="caption" color="muted">
                      Placement Started
                    </Text>
                    <Text variant="body" weight="medium">
                      {formatDate(caseData.created_at)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center">
                  <Home size={20} color="#9CA3AF" className="mr-3" />
                  <View className="flex-1">
                    <Text variant="caption" color="muted">
                      Placement Duration
                    </Text>
                    <Text variant="body" weight="medium">
                      {getPlacementDuration(caseData.created_at, null)}
                    </Text>
                  </View>
                </View>

                {caseData.closed_at && (
                  <View className="flex-row items-center">
                    <Calendar size={20} color="#9CA3AF" className="mr-3" />
                    <View className="flex-1">
                      <Text variant="caption" color="muted">
                        Expected End Date
                      </Text>
                      <Text variant="body" weight="medium">
                        {formatDate(caseData.closed_at)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Social Worker Contact */}
        <View className="mb-6">
          <Text variant="h3" weight="semibold" className="mb-3">
            Social Worker Contact
          </Text>
          <Card variant="elevated">
            <CardContent>
              <View className="flex-row items-center mb-4">
                <Avatar
                  initials={socialWorkerInitials}
                  size="md"
                  backgroundColor="bg-social-worker-500"
                />
                <View className="flex-1 ml-3">
                  <Text variant="body" weight="semibold">
                    {socialWorkerName}
                  </Text>
                  <Text variant="caption" color="muted">
                    Social Worker
                  </Text>
                </View>
              </View>

              <View className="space-y-3">
                {socialWorker?.email && (
                  <View className="flex-row items-center">
                    <FileText size={20} color="#9CA3AF" className="mr-3" />
                    <View className="flex-1">
                      <Text variant="caption" color="muted">
                        Email
                      </Text>
                      <Text variant="body" weight="medium">
                        {socialWorker.email}
                      </Text>
                    </View>
                  </View>
                )}

                {socialWorker?.phone_number && (
                  <View className="flex-row items-center">
                    <Phone size={20} color="#9CA3AF" className="mr-3" />
                    <View className="flex-1">
                      <Text variant="caption" color="muted">
                        Phone
                      </Text>
                      <Text variant="body" weight="medium">
                        {socialWorker.phone_number}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Quick Actions */}
              <View className="flex-row gap-3 mt-4">
                <Pressable
                  onPress={handleMessageSocialWorker}
                  className="flex-1 bg-foster-carer-500 rounded-lg py-3 items-center active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Message social worker"
                >
                  <View className="flex-row items-center">
                    <MessageCircle size={20} color="white" />
                    <Text className="text-white font-medium ml-2">Message</Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={handleCallSocialWorker}
                  className="flex-1 bg-foster-carer-500 rounded-lg py-3 items-center active:opacity-70"
                  accessibilityRole="button"
                  accessibilityLabel="Call social worker"
                >
                  <View className="flex-row items-center">
                    <Phone size={20} color="white" />
                    <Text className="text-white font-medium ml-2">Call</Text>
                  </View>
                </Pressable>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Case Status */}
        <View className="mb-6">
          <Text variant="h3" weight="semibold" className="mb-3">
            Case Status
          </Text>
          <Card variant="elevated">
            <CardContent>
              <View className="flex-row items-center">
                <View
                  className={`w-3 h-3 rounded-full mr-3 ${
                    caseData.status === 'active'
                      ? 'bg-green-500'
                      : caseData.status === 'pending'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                  }`}
                />
                <Text variant="body" weight="medium" className="capitalize">
                  {caseData.status || 'Unknown'}
                </Text>
              </View>
            </CardContent>
          </Card>
        </View>
      </Container>
    </Screen>
  );
}
