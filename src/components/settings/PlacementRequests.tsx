import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Inbox, Clock, Check, X, Calendar, MessageCircle } from 'lucide-react-native';
import { Card, CardContent, Text, Avatar } from '../ui';
import { THEME } from '../../lib/theme';
import {
  getHouseholdPendingRequests,
  respondToPlacementRequest,
  PlacementRequest,
} from '../../lib/supabase';

export function PlacementRequests() {
  const [requests, setRequests] = useState<PlacementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const fosterCarerColor = THEME.roles.fosterCarer.primary;

  const loadRequests = useCallback(async () => {
    const { data, error } = await getHouseholdPendingRequests();
    if (error) {
      console.error('Failed to load requests:', error);
    } else if (data) {
      setRequests(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleRespond = async (requestId: string, accept: boolean) => {
    Alert.alert(
      accept ? 'Accept Placement' : 'Decline Placement',
      accept
        ? 'Are you sure you want to accept this placement request?'
        : 'Are you sure you want to decline this placement request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: accept ? 'Accept' : 'Decline',
          style: accept ? 'default' : 'destructive',
          onPress: async () => {
            setRespondingTo(requestId);
            const { success, error } = await respondToPlacementRequest({
              requestId,
              accept,
            });

            if (error) {
              Alert.alert('Error', error.message);
            } else if (success) {
              Alert.alert(
                accept ? 'Placement Accepted' : 'Placement Declined',
                accept
                  ? 'The case has been assigned to your household.'
                  : 'The social worker has been notified.',
              );
              loadRequests();
            }
            setRespondingTo(null);
          },
        },
      ],
    );
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 24) {
      return `${Math.floor(diffHours / 24)}d ${diffHours % 24}h remaining`;
    }
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m remaining`;
    }
    return `${diffMins}m remaining`;
  };

  const getPlacementTypeLabel = (type: string) => {
    switch (type) {
      case 'respite':
        return 'Respite';
      case 'long_term':
        return 'Long Term';
      case 'emergency':
        return 'Emergency';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <Card variant="elevated" className="mb-4">
        <CardContent className="items-center py-8">
          <ActivityIndicator size="small" color={fosterCarerColor} />
          <Text variant="caption" color="muted" className="mt-2">
            Loading placement requests...
          </Text>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card variant="elevated" className="mb-4">
        <CardContent className="items-center py-6">
          <Inbox size={32} color="#9CA3AF" />
          <Text variant="body" weight="semibold" className="mt-3">
            No Pending Requests
          </Text>
          <Text variant="caption" color="muted" className="mt-1 text-center">
            You'll be notified when a social worker sends a placement request
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={fosterCarerColor}
        />
      }
    >
      <Text variant="caption" color="muted" className="mb-3">
        {requests.length} pending request{requests.length !== 1 ? 's' : ''}
      </Text>

      {requests.map((request) => (
        <Card key={request.request_id} variant="elevated" className="mb-4">
          <CardContent>
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
              <View
                className={`px-2 py-1 rounded ${
                  request.placement_type === 'emergency'
                    ? 'bg-red-100'
                    : request.placement_type === 'respite'
                      ? 'bg-yellow-100'
                      : 'bg-blue-100'
                }`}
              >
                <Text
                  variant="caption"
                  weight="semibold"
                  className={
                    request.placement_type === 'emergency'
                      ? 'text-red-700'
                      : request.placement_type === 'respite'
                        ? 'text-yellow-700'
                        : 'text-blue-700'
                  }
                >
                  {getPlacementTypeLabel(request.placement_type)}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Clock size={14} color="#F59E0B" />
                <Text variant="caption" className="text-yellow-600 ml-1">
                  {formatTimeRemaining(request.expires_at)}
                </Text>
              </View>
            </View>

            {/* Case Info */}
            <View className="bg-gray-50 rounded-lg p-3 mb-3">
              <Text variant="caption" color="muted" className="mb-1">
                Case Number
              </Text>
              <Text variant="body" weight="semibold">
                {request.case_number}
              </Text>

              <View className="flex-row mt-2 gap-4">
                {request.child_age_range && (
                  <View>
                    <Text variant="caption" color="muted">
                      Age Range
                    </Text>
                    <Text variant="caption" weight="medium">
                      {request.child_age_range}
                    </Text>
                  </View>
                )}
                <View>
                  <Text variant="caption" color="muted">
                    House Sharing
                  </Text>
                  <Text
                    variant="caption"
                    weight="medium"
                    className={request.child_can_share ? 'text-green-600' : 'text-red-600'}
                  >
                    {request.child_can_share ? 'OK' : 'Exclusive'}
                  </Text>
                </View>
              </View>

              {request.expected_start_date && (
                <View className="flex-row items-center mt-2">
                  <Calendar size={14} color="#6B7280" />
                  <Text variant="caption" color="muted" className="ml-1">
                    Start: {new Date(request.expected_start_date).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>

            {/* Social Worker */}
            <View className="flex-row items-center mb-3">
              <Avatar
                initials={request.social_worker_name.charAt(0)}
                size="sm"
                backgroundColor="bg-social-worker-500"
              />
              <View className="ml-2">
                <Text variant="caption" color="muted">
                  Requested by
                </Text>
                <Text variant="body" weight="medium">
                  {request.social_worker_name}
                </Text>
              </View>
            </View>

            {/* Message */}
            {request.message && (
              <View className="bg-blue-50 rounded-lg p-3 mb-3">
                <View className="flex-row items-center mb-1">
                  <MessageCircle size={14} color="#3B82F6" />
                  <Text variant="caption" weight="semibold" className="text-blue-700 ml-1">
                    Message
                  </Text>
                </View>
                <Text variant="caption" className="text-blue-800">
                  {request.message}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-2">
              <Pressable
                onPress={() => handleRespond(request.request_id, false)}
                disabled={respondingTo === request.request_id}
                className={`flex-1 py-3 rounded-lg items-center flex-row justify-center border-2 border-red-500 ${
                  respondingTo === request.request_id ? 'opacity-50' : ''
                }`}
              >
                <X size={18} color="#EF4444" />
                <Text variant="body" weight="semibold" className="text-red-500 ml-2">
                  Decline
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleRespond(request.request_id, true)}
                disabled={respondingTo === request.request_id}
                className={`flex-1 py-3 rounded-lg items-center flex-row justify-center bg-green-500 ${
                  respondingTo === request.request_id ? 'opacity-50' : ''
                }`}
              >
                {respondingTo === request.request_id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Check size={18} color="white" />
                    <Text className="text-white font-semibold ml-2">Accept</Text>
                  </>
                )}
              </Pressable>
            </View>
          </CardContent>
        </Card>
      ))}
    </ScrollView>
  );
}
