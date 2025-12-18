/**
 * Admin Audit Log Viewer
 * Displays and filters immutable audit logs for security and compliance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Shield,
  Filter,
  Download,
  ChevronDown,
  User,
  MessageSquare,
  Key,
  Settings,
  AlertTriangle,
  Eye,
  Calendar,
} from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import {
  Screen,
  Container,
  Card,
  CardContent,
  Text,
  TitleBar,
  Badge,
  LoadingSpinner,
  EmptyState,
} from '../../src/components/ui';

// Admin theme color
const ADMIN_COLOR = '#FF9500';

interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  target_type: string;
  target_id: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

type ActionCategory = 'all' | 'auth' | 'message' | 'case' | 'admin' | 'access';

const ACTION_CATEGORIES: Record<ActionCategory, string[]> = {
  all: [],
  auth: ['login', 'logout', 'password_reset', 'session_created'],
  message: ['message_sent', 'message_read', 'message_deleted'],
  case: ['case_created', 'case_updated', 'case_closed', 'case_assigned'],
  admin: ['user_created', 'user_deactivated', 'user_reactivated', 'role_changed'],
  access: ['child_token_generated', 'child_token_used', 'media_accessed', 'data_exported'],
};

const CATEGORY_ICONS: Record<ActionCategory, React.ReactNode> = {
  all: <Shield size={16} color={ADMIN_COLOR} />,
  auth: <Key size={16} color="#007AFF" />,
  message: <MessageSquare size={16} color="#34C759" />,
  case: <User size={16} color="#5856D6" />,
  admin: <Settings size={16} color="#FF9500" />,
  access: <Eye size={16} color="#FF3B30" />,
};

export default function AuditLogsScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<ActionCategory>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  const fetchLogs = useCallback(async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply date filter
      if (dateRange !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (dateRange) {
          case '24h':
            startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      // Apply category filter
      if (category !== 'all') {
        const actions = ACTION_CATEGORIES[category];
        if (actions.length > 0) {
          query = query.in('action', actions);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (action: string): React.ReactNode => {
    if (action.includes('login') || action.includes('logout') || action.includes('session')) {
      return <Key size={16} color="#007AFF" />;
    }
    if (action.includes('message')) {
      return <MessageSquare size={16} color="#34C759" />;
    }
    if (action.includes('case')) {
      return <User size={16} color="#5856D6" />;
    }
    if (action.includes('user') || action.includes('role')) {
      return <Settings size={16} color="#FF9500" />;
    }
    if (action.includes('token') || action.includes('access')) {
      return <Eye size={16} color="#FF3B30" />;
    }
    return <Shield size={16} color="#666" />;
  };

  const getActionBadgeVariant = (
    action: string,
  ): 'default' | 'success' | 'warning' | 'danger' | 'primary' => {
    if (action.includes('created') || action.includes('login')) return 'success';
    if (action.includes('deleted') || action.includes('deactivated')) return 'danger';
    if (action.includes('updated') || action.includes('changed')) return 'warning';
    if (action.includes('accessed') || action.includes('read')) return 'primary';
    return 'default';
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string): string => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleExport = async () => {
    // In a real implementation, this would generate a CSV/JSON export
    console.log('Exporting audit logs...');
    // Could use expo-file-system and expo-sharing to create and share a file
  };

  const renderLogItem = ({ item }: { item: AuditLog }) => (
    <Card variant="elevated" className="mb-3">
      <CardContent>
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-row items-center flex-1">
            <View className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center mr-3">
              {getActionIcon(item.action)}
            </View>
            <View className="flex-1">
              <Text variant="body" weight="semibold" numberOfLines={1}>
                {formatAction(item.action)}
              </Text>
              <Text variant="caption" color="muted">
                {formatDate(item.created_at)}
              </Text>
            </View>
          </View>
          <Badge variant={getActionBadgeVariant(item.action)}>{item.target_type}</Badge>
        </View>

        {/* Details */}
        <View className="bg-gray-50 rounded-lg p-3 mt-2">
          <View className="flex-row justify-between mb-1">
            <Text variant="caption" color="muted">
              User ID
            </Text>
            <Text variant="caption" className="font-mono">
              {item.user_id?.substring(0, 8)}...
            </Text>
          </View>
          <View className="flex-row justify-between mb-1">
            <Text variant="caption" color="muted">
              Target
            </Text>
            <Text variant="caption" className="font-mono">
              {item.target_id?.substring(0, 8)}...
            </Text>
          </View>
          {item.ip_address && (
            <View className="flex-row justify-between">
              <Text variant="caption" color="muted">
                IP Address
              </Text>
              <Text variant="caption" className="font-mono">
                {item.ip_address}
              </Text>
            </View>
          )}
        </View>
      </CardContent>
    </Card>
  );

  const FilterButton = ({
    label,
    value,
    currentValue,
    onPress,
  }: {
    label: string;
    value: string;
    currentValue: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 mb-2 ${
        value === currentValue ? 'bg-orange-500' : 'bg-gray-100'
      }`}
    >
      <Text
        variant="caption"
        weight="medium"
        className={value === currentValue ? 'text-white' : 'text-gray-700'}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <Screen backgroundColor="bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
          <Text variant="body" color="muted" className="mt-3">
            Loading audit logs...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="bg-gray-50">
      <SafeAreaView edges={['top']} className="flex-1">
        <Container className="py-4 flex-1">
          <TitleBar
            title="Audit Logs"
            subtitle="Security and compliance records"
            accentColor={ADMIN_COLOR}
            className="mb-4"
          />

          {/* Action Bar */}
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              className="flex-row items-center bg-white px-4 py-2 rounded-lg shadow-sm"
            >
              <Filter size={18} color={ADMIN_COLOR} />
              <Text variant="body" weight="medium" className="ml-2">
                Filters
              </Text>
              <ChevronDown
                size={16}
                color="#666"
                style={{ transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleExport}
              className="flex-row items-center bg-orange-500 px-4 py-2 rounded-lg"
            >
              <Download size={18} color="white" />
              <Text variant="body" weight="medium" className="ml-2 text-white">
                Export
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filters Panel */}
          {showFilters && (
            <Card variant="elevated" className="mb-4">
              <CardContent>
                <Text variant="body" weight="semibold" className="mb-3">
                  Category
                </Text>
                <View className="flex-row flex-wrap">
                  {(Object.keys(ACTION_CATEGORIES) as ActionCategory[]).map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setCategory(cat)}
                      className={`flex-row items-center px-3 py-2 rounded-full mr-2 mb-2 ${
                        category === cat ? 'bg-orange-500' : 'bg-gray-100'
                      }`}
                    >
                      {CATEGORY_ICONS[cat]}
                      <Text
                        variant="caption"
                        weight="medium"
                        className={`ml-1.5 ${category === cat ? 'text-white' : 'text-gray-700'}`}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text variant="body" weight="semibold" className="mt-4 mb-3">
                  <View className="flex-row items-center">
                    <Calendar size={16} color="#666" />
                    <Text className="ml-2">Time Range</Text>
                  </View>
                </Text>
                <View className="flex-row flex-wrap">
                  <FilterButton
                    label="Last 24h"
                    value="24h"
                    currentValue={dateRange}
                    onPress={() => setDateRange('24h')}
                  />
                  <FilterButton
                    label="Last 7 days"
                    value="7d"
                    currentValue={dateRange}
                    onPress={() => setDateRange('7d')}
                  />
                  <FilterButton
                    label="Last 30 days"
                    value="30d"
                    currentValue={dateRange}
                    onPress={() => setDateRange('30d')}
                  />
                  <FilterButton
                    label="All time"
                    value="all"
                    currentValue={dateRange}
                    onPress={() => setDateRange('all')}
                  />
                </View>
              </CardContent>
            </Card>
          )}

          {/* Stats Summary */}
          <View className="flex-row mb-4">
            <View className="flex-1 bg-white rounded-lg p-3 mr-2 shadow-sm">
              <Text variant="h3" weight="bold" className="text-orange-500">
                {logs.length}
              </Text>
              <Text variant="caption" color="muted">
                Total Events
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-lg p-3 ml-2 shadow-sm">
              <Text variant="h3" weight="bold" className="text-red-500">
                {logs.filter((l) => l.action.includes('fail') || l.action.includes('error')).length}
              </Text>
              <Text variant="caption" color="muted">
                Warnings
              </Text>
            </View>
          </View>

          {/* Logs List */}
          {logs.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle size={48} color="#9CA3AF" />}
              title="No Audit Logs"
              description="No audit logs match your current filters"
            />
          ) : (
            <FlatList
              data={logs}
              renderItem={renderLogItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={ADMIN_COLOR}
                />
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </Container>
      </SafeAreaView>
    </Screen>
  );
}
