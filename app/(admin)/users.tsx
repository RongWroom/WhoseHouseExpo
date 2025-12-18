import React, { useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity, RefreshControl } from 'react-native';
import { Screen } from '../../src/components/ui/Screen';
import { Card } from '../../src/components/ui/Card';
import { Text } from '../../src/components/ui/Text';
import { Badge } from '../../src/components/ui/Badge';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { Alert } from '../../src/components/ui/Alert';
import { Button } from '../../src/components/ui/Button';
import {
  listOrganizationUsers,
  deactivateUserAccount,
  reactivateUserAccount,
} from '../../src/lib/supabase';
import { User, UserCheck, Phone, Calendar, Briefcase } from 'lucide-react-native';

interface OrganizationUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  phoneNumber?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  activeCaseCount: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'social_worker' | 'foster_carer' | 'admin'>(
    'all',
  );
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const fetchUsers = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const { data, error: fetchError } = await listOrganizationUsers({
      roleFilter: roleFilter === 'all' ? undefined : roleFilter,
      activeOnly: false,
    });

    if (fetchError) {
      setError('Failed to load users');
      console.error('Error fetching users:', fetchError);
    } else if (data) {
      setUsers(data);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  const handleToggleUserStatus = async (user: OrganizationUser) => {
    const action = user.isActive ? 'deactivate' : 'reactivate';
    // In a real app, you'd show a confirmation dialog here
    // For now, we'll proceed directly
    const result = user.isActive
      ? await deactivateUserAccount(user.id)
      : await reactivateUserAccount(user.id);

    if (result.error) {
      setError(`Failed to ${action} user`);
    } else {
      // Refresh the user list
      fetchUsers();
    }
  };

  const getRoleClasses = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          badge: 'bg-orange-100',
          text: 'text-orange-700',
        };
      case 'social_worker':
        return {
          badge: 'bg-blue-100',
          text: 'text-blue-700',
        };
      case 'foster_carer':
        return {
          badge: 'bg-green-100',
          text: 'text-green-700',
        };
      default:
        return {
          badge: 'bg-gray-100',
          text: 'text-gray-700',
        };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-UK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

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
          <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchUsers(true)} />
        }
        className="flex-1"
      >
        <View className="p-5">
          {/* Role Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row space-x-2">
              {(['all', 'social_worker', 'foster_carer', 'admin'] as const).map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => setRoleFilter(role)}
                  className={`px-4 py-2 rounded-full ${
                    roleFilter === role ? 'bg-orange-500' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className={roleFilter === role ? 'text-white font-semibold' : 'text-gray-700'}
                  >
                    {role === 'all'
                      ? 'All Users'
                      : role === 'social_worker'
                        ? 'Social Workers'
                        : role === 'foster_carer'
                          ? 'Foster Carers'
                          : 'Admins'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {error && <Alert variant="danger" message={error} className="mb-4" />}

          <Text className="text-lg font-semibold text-gray-900 mb-3">
            {users.length} Users Found
          </Text>

          {/* User List */}
          {users.map((user) => {
            const isExpanded = expandedUserId === user.id;
            return (
              <Card key={user.id} className="mb-3">
                <TouchableOpacity
                  onPress={() => setExpandedUserId(isExpanded ? null : user.id)}
                  className="p-4"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center flex-1">
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                          user.isActive ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        <User size={20} color={user.isActive ? '#34C759' : '#FF3B30'} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-semibold text-gray-900">
                          {user.fullName}
                        </Text>
                        <Text className="text-sm text-gray-500">{user.email}</Text>
                      </View>
                    </View>
                    <View className="items-end">
                      {(() => {
                        const roleClasses = getRoleClasses(user.role);
                        return (
                          <Badge variant="default" className={roleClasses.badge}>
                            <Text className={`font-semibold ${roleClasses.text}`}>
                              {user.role.replace('_', ' ').toUpperCase()}
                            </Text>
                          </Badge>
                        );
                      })()}
                      <Text className="text-xs text-gray-500 mt-1">
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                  </View>

                  {isExpanded && (
                    <View className="mt-4 pt-4 border-t border-gray-200">
                      <View className="space-y-2">
                        {user.phoneNumber && (
                          <View className="flex-row items-center">
                            <Phone size={16} color="#6B7280" />
                            <Text className="ml-2 text-gray-600">{user.phoneNumber}</Text>
                          </View>
                        )}
                        <View className="flex-row items-center">
                          <Calendar size={16} color="#6B7280" />
                          <Text className="ml-2 text-gray-600">
                            Joined: {formatDate(user.createdAt)}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <UserCheck size={16} color="#6B7280" />
                          <Text className="ml-2 text-gray-600">
                            Last Login: {formatDate(user.lastLogin)}
                          </Text>
                        </View>
                        {(user.role === 'social_worker' || user.role === 'foster_carer') && (
                          <View className="flex-row items-center">
                            <Briefcase size={16} color="#6B7280" />
                            <Text className="ml-2 text-gray-600">
                              Active Cases: {user.activeCaseCount}
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row space-x-2 mt-4">
                        <Button
                          onPress={() => handleToggleUserStatus(user)}
                          variant={user.isActive ? 'outline' : 'primary'}
                          size="sm"
                          className="flex-1"
                        >
                          <Text
                            className={
                              user.isActive
                                ? 'text-red-600 font-semibold'
                                : 'text-white font-semibold'
                            }
                          >
                            {user.isActive ? 'Deactivate' : 'Reactivate'}
                          </Text>
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Text className="text-gray-700 font-semibold">Edit</Text>
                        </Button>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              </Card>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}
