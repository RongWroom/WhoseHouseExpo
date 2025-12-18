import { View, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Briefcase, MessageSquare, TrendingUp } from 'lucide-react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { useCases } from '../../src/hooks/useCases';
import { useUnreadCount } from '../../src/hooks/useMessages';
import { useSocialCareNews } from '../../src/hooks/useSocialCareNews';
import { Screen, Container, Card, CardContent, Text, Badge } from '../../src/components/ui';
import { SunbeamHeader, SunbeamSurface } from '../../src/components/sunbeam';
import { NewsFeed } from '../../src/components/news';
import { THEME } from '../../src/lib/theme';

export default function SocialWorkerDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const { cases, loading, error, refetch } = useCases();
  const unreadCount = useUnreadCount(profile?.id || '');
  const { news, loading: newsLoading, refetch: refetchNews } = useSocialCareNews();

  // Calculate stats
  const activeCases = cases.filter((c) => c.status === 'active').length;
  const pendingCases = cases.filter((c) => c.status === 'pending').length;

  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const profileAvatar = profile?.avatar_url ? { uri: profile.avatar_url } : undefined;

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchNews()]);
  };

  if (loading && cases.length === 0) {
    return (
      <Screen backgroundColor="bg-[#F8F8F5]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={THEME.roles.socialWorker.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      backgroundColor="bg-[#F8F8F5]"
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={loading || newsLoading}
            onRefresh={handleRefresh}
            tintColor={THEME.roles.socialWorker.primary}
          />
        ),
      }}
    >
      <Container className="py-4">
        <SunbeamHeader
          title={`Good Morning, ${firstName}`}
          subtitle="Your caseload at a glance"
          avatarSource={profileAvatar}
          initials={profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'S'}
          onBellPress={() => {
            // Placeholder
          }}
          showBellDot
          showStatusDot
        />

        {/* Quick Stats Row */}
        <View className="flex-row gap-3 mb-6">
          <SunbeamSurface
            onPress={() => router.push('/(social_worker)/caseload')}
            accessibilityLabel="View caseload"
            className="flex-1"
            contentClassName="py-4 items-center"
          >
            <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mb-2">
              <Briefcase size={20} color={THEME.roles.socialWorker.primary} />
            </View>
            <Text className="text-2xl font-bold text-[#181811]">{activeCases}</Text>
            <Text className="text-xs text-[#8C8B5F] mt-1">Active Cases</Text>
          </SunbeamSurface>

          <SunbeamSurface
            onPress={() => router.push('/(social_worker)/messages')}
            accessibilityLabel="View messages"
            className="flex-1"
            contentClassName="py-4 items-center"
          >
            <View
              className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${
                unreadCount > 0 ? 'bg-yellow-100' : 'bg-blue-100'
              }`}
            >
              <MessageSquare
                size={20}
                color={unreadCount > 0 ? '#f59e0b' : THEME.roles.socialWorker.primary}
              />
            </View>
            <Text
              className={`text-2xl font-bold ${unreadCount > 0 ? 'text-red-600' : 'text-[#181811]'}`}
            >
              {unreadCount}
            </Text>
            <Text className="text-xs text-[#8C8B5F] mt-1">Unread</Text>
          </SunbeamSurface>

          <SunbeamSurface className="flex-1" contentClassName="py-4 items-center">
            <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mb-2">
              <TrendingUp size={20} color="#22c55e" />
            </View>
            <Text className="text-2xl font-bold text-[#181811]">{pendingCases}</Text>
            <Text className="text-xs text-[#8C8B5F] mt-1">Pending</Text>
          </SunbeamSurface>
        </View>

        {/* Recent Cases Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <Briefcase size={18} color={THEME.roles.socialWorker.primary} />
              <Text className="text-lg font-bold text-[#181811]">Recent Cases</Text>
            </View>
            <Text
              variant="caption"
              style={{ color: THEME.roles.socialWorker.primary }}
              onPress={() => router.push('/(social_worker)/caseload')}
            >
              View all
            </Text>
          </View>

          {error && (
            <Card variant="outlined" className="mb-3 bg-red-50">
              <CardContent>
                <Text color="danger">{error}</Text>
              </CardContent>
            </Card>
          )}

          {cases.length === 0 ? (
            <SunbeamSurface className="" contentClassName="p-4">
              <Text className="text-sm text-[#8C8B5F] text-center">No cases assigned yet</Text>
            </SunbeamSurface>
          ) : (
            cases.slice(0, 3).map((caseItem) => (
              <SunbeamSurface
                key={caseItem.id}
                onPress={() => router.push(`/(social_worker)/case/${caseItem.id}`)}
                accessibilityLabel="Open case"
                className="mb-2"
                contentClassName="p-4"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-[#181811]">{caseItem.child_name}</Text>
                    {caseItem.foster_carer && (
                      <Text className="text-xs text-[#8C8B5F] mt-1">
                        {caseItem.foster_carer.full_name || 'Carer not assigned'}
                      </Text>
                    )}
                  </View>
                  <Badge
                    variant={
                      caseItem.status === 'active'
                        ? 'success'
                        : caseItem.status === 'pending'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {caseItem.status}
                  </Badge>
                </View>
              </SunbeamSurface>
            ))
          )}
        </View>

        {/* News Feed Section */}
        <View className="mb-6">
          <NewsFeed news={news} loading={newsLoading} maxItems={5} />
        </View>
      </Container>
    </Screen>
  );
}
