import React, { useEffect, useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { Screen } from '../../src/components/ui/Screen';
import { Card } from '../../src/components/ui/Card';
import { Text } from '../../src/components/ui/Text';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { Alert } from '../../src/components/ui/Alert';
import { useAuth } from '../../src/contexts/AuthContext';
import { getOrganizationStats } from '../../src/lib/supabase';
import {
  Users,
  UserCheck,
  Briefcase,
  Home,
  ShieldCheck,
  FileText,
  Archive,
  MessageSquare,
} from 'lucide-react-native';

const ADMIN_COLOR = '#FF9500';

interface StatCardProps {
  icon: any;
  label: string;
  value: number;
  color?: string;
}

const StatCard = ({ icon: Icon, label, value, color = ADMIN_COLOR }: StatCardProps) => (
  <Card className="flex-1 m-1 p-4">
    <View className="items-center">
      <Icon size={28} color={color} />
      <Text className="text-2xl font-bold mt-2">{value}</Text>
      <Text className="text-gray-600 text-sm mt-1">{label}</Text>
    </View>
  </Card>
);

interface OrgStats {
  totalUsers: number;
  activeUsers: number;
  socialWorkers: number;
  fosterCarers: number;
  admins: number;
  activeCases: number;
  closedCases: number;
  messagesThisMonth: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await getOrganizationStats();

    if (fetchError) {
      setError('Failed to load organization statistics');
      console.error('Error fetching stats:', fetchError);
    } else if (data) {
      setStats(data);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading && !isRefreshing) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchStats(true)} />
        }
        className="flex-1"
      >
        <View className="p-5 pb-6">
          <Card className="mb-5 p-5 bg-orange-50">
            <Text className="text-2xl font-bold text-gray-900">Welcome, {profile?.full_name}</Text>
            <Text className="text-gray-600 mt-1">Organization Administrator</Text>
          </Card>

          {error && <Alert variant="danger" message={error} className="mb-4" />}

          {stats && (
            <>
              <Text className="text-lg font-semibold text-gray-900 mb-3">User Statistics</Text>
              <View className="flex-row mb-3">
                <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
                <StatCard
                  icon={UserCheck}
                  label="Active Users"
                  value={stats.activeUsers}
                  color="#34C759"
                />
              </View>

              <Text className="text-lg font-semibold text-gray-900 mb-3 mt-3">User Roles</Text>
              <View className="flex-row mb-3">
                <StatCard
                  icon={Briefcase}
                  label="Social Workers"
                  value={stats.socialWorkers}
                  color="#007AFF"
                />
                <StatCard
                  icon={Home}
                  label="Foster Carers"
                  value={stats.fosterCarers}
                  color="#34C759"
                />
                <StatCard icon={ShieldCheck} label="Admins" value={stats.admins} />
              </View>

              <Text className="text-lg font-semibold text-gray-900 mb-3 mt-3">Case Statistics</Text>
              <View className="flex-row mb-3">
                <StatCard
                  icon={FileText}
                  label="Active Cases"
                  value={stats.activeCases}
                  color="#007AFF"
                />
                <StatCard
                  icon={Archive}
                  label="Closed Cases"
                  value={stats.closedCases}
                  color="#6B7280"
                />
              </View>

              <Text className="text-lg font-semibold text-gray-900 mb-3 mt-3">Activity</Text>
              <Card className="p-4">
                <View className="flex-row items-center">
                  <MessageSquare size={24} color="#5B21B6" />
                  <View className="ml-3 flex-1">
                    <Text className="text-2xl font-bold">{stats.messagesThisMonth}</Text>
                    <Text className="text-gray-600">Messages This Month</Text>
                  </View>
                </View>
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
