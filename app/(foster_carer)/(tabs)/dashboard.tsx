import { useState } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../src/contexts/AuthContext';
import {
  AlertCircle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Inbox,
  MessageCircle,
  Phone,
} from 'lucide-react-native';
import { Screen, Container, Card, CardContent, Text, Avatar } from '../../../src/components/ui';
import {
  SunbeamActionTile,
  SunbeamActivityRow,
  SunbeamHeader,
  SunbeamSurface,
} from '../../../src/components/sunbeam';
import { THEME } from '../../../src/lib/theme';
import { useActiveCase } from '../../../src/hooks/useCases';
import { useUnreadMessageCount } from '../../../src/hooks/useUnreadMessageCount';
import { useRecentPhotos } from '../../../src/hooks/useRecentPhotos';
import { Anonymizer } from '../../../src/utils/privacy';

export default function FosterCarerDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const { caseData, loading, error, refetch: refetchCase } = useActiveCase();
  const { unreadCount, refetch: refetchMessages } = useUnreadMessageCount();
  const {
    photos: recentPhotos,
    loading: photosLoading,
    error: photosError,
    refetch: refetchPhotos,
  } = useRecentPhotos(3);
  const fosterCarerColor = THEME.roles.fosterCarer.primary;
  const [refreshing, setRefreshing] = useState(false);

  const handleBellPress = () => {
    Alert.alert('Coming Soon', 'Notifications will appear here.');
  };

  const handleDailyLog = () => {
    Alert.alert('Coming Soon', 'Daily logs will be available here.');
  };

  const handleCalendar = () => {
    Alert.alert('Coming Soon', 'Calendar will be available here.');
  };

  const formatToday = () => {
    return new Date().toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Pull to refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchCase(), refetchMessages(), refetchPhotos()]);
    } catch (err) {
      console.error('Error refreshing dashboard:', err);
    } finally {
      setRefreshing(false);
    }
  };

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

  const handleHouseProfile = () => {
    router.push('/(foster_carer)/house-profile');
  };

  const handleViewCase = () => {
    router.push('/(foster_carer)/case');
  };

  // Helper to calculate time since placement started
  const getTimeSincePlacement = (createdAt: string | null) => {
    if (!createdAt) return 'Unknown';

    const now = new Date();
    const placementDate = new Date(createdAt);
    const diffInMs = now.getTime() - placementDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 14) return '1 week ago';
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 60) return '1 month ago';
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  // Show loading state
  if (loading) {
    return (
      <Screen backgroundColor="bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={fosterCarerColor} />
          <Text variant="body" color="muted" className="mt-4">
            Loading your dashboard...
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
                Error Loading Dashboard
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
              You don't currently have an active case assignment. Your social worker will notify
              when a placement is available.
            </Text>
            <View className="w-full max-w-sm">
              <Card variant="outlined" className="bg-foster-carer-50/50">
                <CardContent className="py-4">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-foster-carer-500 items-center justify-center mr-3">
                      <Text className="text-white font-bold">💡</Text>
                    </View>
                    <View className="flex-1">
                      <Text variant="caption" weight="semibold" className="mb-1">
                        Getting Started
                      </Text>
                      <Text variant="caption" color="muted">
                        Once assigned, you'll see case details, photos, and can message your social
                        worker here.
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={handleMessageSocialWorker}
                    className="mt-4 rounded-xl bg-foster-carer-500 px-4 py-3 items-center active:opacity-80"
                    accessibilityRole="button"
                    accessibilityLabel="Message social worker"
                  >
                    <Text className="text-white font-semibold">Message my social worker</Text>
                  </Pressable>
                </CardContent>
              </Card>
            </View>
          </View>
        </Container>
      </Screen>
    );
  }

  // Get social worker info (with safety checks)
  const socialWorker = caseData.social_worker;
  const socialWorkerName = socialWorker?.full_name || 'Social Worker';
  const socialWorkerInitials = Anonymizer.nameToInitials(socialWorkerName);
  const placementTime = getTimeSincePlacement(caseData.created_at);

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const householdName = profile?.household_id ? 'Your Household' : 'The Miller House';
  const profileAvatar = profile?.avatar_url ? { uri: profile.avatar_url } : undefined;
  const socialWorkerAvatar = socialWorker?.avatar_url
    ? { uri: socialWorker.avatar_url }
    : undefined;

  return (
    <Screen
      scroll
      backgroundColor="bg-[#F8F8F5]"
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={fosterCarerColor}
            colors={[fosterCarerColor]}
          />
        ),
      }}
    >
      <Container className="pt-4 pb-10">
        <SunbeamHeader
          title={`Good Morning, ${firstName}`}
          subtitle={formatToday()}
          avatarSource={profileAvatar}
          initials={Anonymizer.nameToInitials(profile?.full_name || firstName)}
          onBellPress={handleBellPress}
          showBellDot
          showStatusDot
        />

        {/* Social Worker Card */}
        <View className="mb-6">
          <SunbeamSurface className="" contentClassName="p-4">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-1 pr-4">
                <Text className="text-sm font-semibold text-[#8C8B5F] uppercase tracking-wider mb-1">
                  Your Social Worker
                </Text>
                <Text className="text-xl font-bold text-[#181811]">{socialWorkerName}</Text>
                <View className="flex-row items-center gap-1 mt-1">
                  <View className="w-2 h-2 rounded-full bg-green-500" />
                  <Text className="text-xs font-medium text-[#8C8B5F]">Available Now</Text>
                </View>
              </View>

              <View className="rounded-full border-4 border-[#F8F8F5] overflow-hidden">
                <Avatar
                  source={socialWorkerAvatar}
                  initials={socialWorkerInitials}
                  size="lg"
                  backgroundColor="bg-social-worker-500"
                />
              </View>
            </View>

            <View className="flex-row gap-3">
              <Pressable
                onPress={handleCallSocialWorker}
                className="flex-1 h-12 rounded-full bg-[#F9F506] items-center justify-center flex-row gap-2 shadow-sm active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel={`Call ${socialWorkerName}`}
              >
                <Phone size={18} color="#111827" />
                <Text className="text-black font-bold text-sm">
                  Call {socialWorkerName.split(' ')[0]}
                </Text>
              </Pressable>

              <Pressable
                onPress={handleMessageSocialWorker}
                className="flex-1 h-12 rounded-full bg-[#F8F8F5] items-center justify-center flex-row gap-2 border border-black/5 active:opacity-80"
                accessibilityRole="button"
                accessibilityLabel={`Message ${socialWorkerName}`}
              >
                <MessageCircle size={18} color="#111827" />
                <Text className="text-[#181811] font-bold text-sm">Message</Text>
              </Pressable>
            </View>
          </SunbeamSurface>
        </View>

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-[#181811] mb-3">Quick Actions</Text>

          <View className="flex-row gap-3">
            <SunbeamActionTile
              onPress={handleDailyLog}
              icon={<ClipboardList size={20} color="#181811" />}
              iconContainerClassName="bg-[#F9F506]/20"
              title="Add Daily Log"
              subtitle="Record today's updates"
            />

            <SunbeamActionTile
              onPress={handleCalendar}
              icon={<CalendarDays size={20} color="#1d4ed8" />}
              iconContainerClassName="bg-blue-100"
              title="Calendar"
              subtitle="Next: Dentist 2pm"
            />
          </View>
        </View>

        {/* House Profile */}
        <View className="mb-6">
          <SunbeamSurface
            onPress={handleHouseProfile}
            accessibilityLabel="Manage house profile"
            className="overflow-hidden"
          >
            <View className="relative">
              <View className="absolute -top-10 -right-10 w-32 h-32 bg-[#F9F506]/10 rounded-bl-full" />

              <View className="p-4">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-5 h-5 rounded-md bg-black/5 items-center justify-center">
                    <View className="w-2.5 h-2.5 rounded bg-black/30" />
                  </View>
                  <Text className="text-sm font-bold text-[#8C8B5F] uppercase tracking-wider">
                    House Profile
                  </Text>
                </View>

                <Text className="text-xl font-bold text-[#181811] mb-1">{householdName}</Text>
                <Text className="text-sm text-[#8C8B5F]">2 Placements • 1 Respite Available</Text>

                <View className="mt-4 flex-row items-center justify-between border-t border-black/5 pt-4">
                  <View className="flex-row -space-x-2">
                    <View className="rounded-full border-2 border-white overflow-hidden">
                      <Avatar initials="A" size="sm" backgroundColor="bg-gray-300" />
                    </View>
                    <View className="rounded-full border-2 border-white overflow-hidden">
                      <Avatar initials="B" size="sm" backgroundColor="bg-gray-300" />
                    </View>
                    <View className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white items-center justify-center">
                      <Text className="text-xs font-bold text-gray-500">+1</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center gap-1">
                    <Text className="text-sm font-bold text-[#181811]">Manage</Text>
                    <ChevronRight size={16} color="#181811" />
                  </View>
                </View>
              </View>
            </View>
          </SunbeamSurface>
        </View>

        {/* Recent Activity */}
        <View>
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-lg font-bold text-[#181811]">Recent Activity</Text>
            <Pressable
              onPress={() => Alert.alert('Coming Soon', 'Activity history will appear here.')}
              className="active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="View all recent activity"
            >
              <Text className="text-sm font-bold text-[#8C8B5F]">View All</Text>
            </Pressable>
          </View>

          <SunbeamActivityRow
            onPress={handleViewCase}
            accessibilityLabel="View placement details"
            icon={<CheckCircle2 size={20} color="#16a34a" />}
            iconContainerClassName="bg-green-100"
            title="Placement active"
            subtitle={`Started ${placementTime}`}
          />

          <SunbeamActivityRow
            onPress={handleMessageSocialWorker}
            accessibilityLabel="Open messages"
            icon={<MessageCircle size={20} color="#181811" />}
            iconContainerClassName="bg-yellow-100"
            title="Unread messages"
            subtitle={`${unreadCount} unread ${unreadCount === 1 ? 'message' : 'messages'}`}
          />

          <SunbeamActivityRow
            onPress={handleHouseProfile}
            accessibilityLabel="Open house profile"
            icon={<Camera size={20} color="#1d4ed8" />}
            iconContainerClassName="bg-blue-100"
            title="House photos"
            subtitle={
              photosLoading
                ? 'Loading...'
                : photosError
                  ? 'Unable to load photos'
                  : recentPhotos.length === 0
                    ? 'No photos yet'
                    : `${recentPhotos.length} recent photo${recentPhotos.length === 1 ? '' : 's'}`
            }
            right={
              recentPhotos[0]?.file_url ? (
                <View className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100">
                  <Image source={{ uri: recentPhotos[0].file_url }} className="w-full h-full" />
                </View>
              ) : (
                <ChevronRight size={18} color="#9CA3AF" />
              )
            }
          />
        </View>
      </Container>
    </Screen>
  );
}
