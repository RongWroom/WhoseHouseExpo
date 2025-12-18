import { View, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useCases, type CaseWithDetails } from '../../src/hooks/useCases';
import { Screen, Container, Text, Badge, Input } from '../../src/components/ui';
import { SunbeamHeader, SunbeamSurface } from '../../src/components/sunbeam';
import { useAuth } from '../../src/contexts/AuthContext';
import { THEME } from '../../src/lib/theme';

export default function CaseloadScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { cases, loading, error, refetch } = useCases();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'closed'>('all');

  // Filter cases based on search
  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base = cases.filter((c: CaseWithDetails) => {
      if (!q) return true;
      const child = c.child_name?.toLowerCase() || '';
      const carer = c.foster_carer?.full_name?.toLowerCase() || '';
      const caseNumber = c.case_number?.toLowerCase() || '';
      return child.includes(q) || carer.includes(q) || caseNumber.includes(q);
    });

    if (statusFilter === 'all') return base;
    return base.filter((c: CaseWithDetails) => c.status === statusFilter);
  }, [cases, searchQuery, statusFilter]);

  // Group cases by status
  const activeCases = useMemo(
    () => filteredCases.filter((c: CaseWithDetails) => c.status === 'active'),
    [filteredCases],
  );
  const pendingCases = useMemo(
    () => filteredCases.filter((c: CaseWithDetails) => c.status === 'pending'),
    [filteredCases],
  );
  const closedCases = useMemo(
    () => filteredCases.filter((c: CaseWithDetails) => c.status === 'closed'),
    [filteredCases],
  );

  const totalActive = useMemo(
    () => cases.filter((c: CaseWithDetails) => c.status === 'active').length,
    [cases],
  );
  const totalPending = useMemo(
    () => cases.filter((c: CaseWithDetails) => c.status === 'pending').length,
    [cases],
  );
  const totalClosed = useMemo(
    () => cases.filter((c: CaseWithDetails) => c.status === 'closed').length,
    [cases],
  );

  if (loading && cases.length === 0) {
    return (
      <Screen backgroundColor="bg-[#F8F8F5]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={THEME.roles.socialWorker.primary} />
        </View>
      </Screen>
    );
  }

  const renderCaseCard = (caseItem: CaseWithDetails) => (
    <SunbeamSurface
      key={caseItem.id}
      onPress={() => router.push(`/(social_worker)/case/${caseItem.id}`)}
      accessibilityLabel="Open case"
      className="mb-3"
      contentClassName="p-4"
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-1 pr-3">
          <Text className="text-sm font-bold text-[#181811]">{caseItem.child_name}</Text>
          <Text className="text-xs text-[#8C8B5F] mt-1">{caseItem.case_number}</Text>
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

      <View className="mb-2">
        <Text className="text-xs font-medium text-[#8C8B5F]">Foster Carer</Text>
        <Text className="text-sm text-[#181811] mt-1">
          {caseItem.foster_carer?.full_name || 'Unassigned'}
        </Text>
      </View>

      <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-black/5">
        <Text className="text-xs text-[#8C8B5F]">
          Created: {new Date(caseItem.created_at).toLocaleDateString()}
        </Text>
        {caseItem.updated_at && (
          <Text className="text-xs text-[#8C8B5F]">
            Updated: {new Date(caseItem.updated_at).toLocaleDateString()}
          </Text>
        )}
      </View>
    </SunbeamSurface>
  );

  return (
    <Screen
      backgroundColor="bg-[#F8F8F5]"
      scroll
      scrollProps={{
        refreshControl: (
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={THEME.roles.socialWorker.primary}
          />
        ),
      }}
      overlay={
        <Pressable
          onPress={() => router.push('/(social_worker)/create-case')}
          className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg active:opacity-80"
          style={{ backgroundColor: THEME.roles.socialWorker.primary }}
          accessibilityRole="button"
          accessibilityLabel="Create new case"
        >
          <Plus size={28} color="white" />
        </Pressable>
      }
    >
      <Container className="py-4">
        <SunbeamHeader
          title="My Caseload"
          subtitle={`${cases.length} total case${cases.length !== 1 ? 's' : ''}`}
          initials={profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'S'}
          avatarSource={profile?.avatar_url ? { uri: profile.avatar_url } : undefined}
          onBellPress={() => {
            // Placeholder
          }}
          showBellDot
          showStatusDot
        />

        {/* Search */}
        <View className="mb-6">
          <Input
            placeholder="Search by case or foster carer..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row gap-2 mb-6">
          <SunbeamSurface
            onPress={() => setStatusFilter('all')}
            accessibilityLabel="Show all cases"
            className={statusFilter === 'all' ? 'flex-1' : 'flex-1 opacity-70'}
            contentClassName="py-3 items-center"
          >
            <Text className="text-sm font-semibold text-[#181811]">All ({cases.length})</Text>
          </SunbeamSurface>
          <SunbeamSurface
            onPress={() => setStatusFilter('active')}
            accessibilityLabel="Show active cases"
            className={statusFilter === 'active' ? 'flex-1' : 'flex-1 opacity-70'}
            contentClassName="py-3 items-center"
          >
            <Text className="text-sm font-semibold text-[#181811]">Active ({totalActive})</Text>
          </SunbeamSurface>
          <SunbeamSurface
            onPress={() => setStatusFilter('pending')}
            accessibilityLabel="Show pending cases"
            className={statusFilter === 'pending' ? 'flex-1' : 'flex-1 opacity-70'}
            contentClassName="py-3 items-center"
          >
            <Text className="text-sm font-semibold text-[#181811]">Pending ({totalPending})</Text>
          </SunbeamSurface>
          <SunbeamSurface
            onPress={() => setStatusFilter('closed')}
            accessibilityLabel="Show closed cases"
            className={statusFilter === 'closed' ? 'flex-1' : 'flex-1 opacity-70'}
            contentClassName="py-3 items-center"
          >
            <Text className="text-sm font-semibold text-[#181811]">Closed ({totalClosed})</Text>
          </SunbeamSurface>
        </View>

        {/* Error State */}
        {error && (
          <SunbeamSurface className="mb-4" contentClassName="p-4">
            <Text className="text-red-600">{error}</Text>
          </SunbeamSurface>
        )}

        {/* Empty State */}
        {filteredCases.length === 0 && !loading && (
          <SunbeamSurface className="" contentClassName="p-4">
            <Text className="text-sm text-[#8C8B5F] text-center">
              {searchQuery
                ? 'No cases match your search'
                : statusFilter === 'all'
                  ? 'No cases assigned yet'
                  : 'No cases in this category'}
            </Text>
          </SunbeamSurface>
        )}

        {/* Active Cases */}
        {activeCases.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-[#181811] mb-3">
              Active Cases ({activeCases.length})
            </Text>
            {activeCases.map(renderCaseCard)}
          </View>
        )}

        {/* Pending Cases */}
        {pendingCases.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-[#181811] mb-3">
              Pending Cases ({pendingCases.length})
            </Text>
            {pendingCases.map(renderCaseCard)}
          </View>
        )}

        {/* Closed Cases */}
        {closedCases.length > 0 && (
          <View className="mb-6">
            <Text className="text-lg font-bold text-[#181811] mb-3">
              Closed Cases ({closedCases.length})
            </Text>
            {closedCases.map(renderCaseCard)}
          </View>
        )}
      </Container>
    </Screen>
  );
}
