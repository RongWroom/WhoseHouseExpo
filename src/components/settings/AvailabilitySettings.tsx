import React, { useState, useEffect } from 'react';
import { View, Pressable, Alert, ActivityIndicator, Switch } from 'react-native';
import { Bed, Calendar, Clock, Check, X, Home } from 'lucide-react-native';
import { Card, CardContent, Text } from '../ui';
import { THEME } from '../../lib/theme';
import {
  getHouseholdCapacity,
  updateHouseholdCapacity,
  updateHouseholdAvailability,
  AvailabilityStatus,
  HouseholdCapacity,
} from '../../lib/supabase';

interface AvailabilitySettingsProps {
  isPrimaryCarer: boolean;
}

export function AvailabilitySettings({ isPrimaryCarer }: AvailabilitySettingsProps) {
  const [capacity, setCapacity] = useState<HouseholdCapacity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [totalBedrooms, setTotalBedrooms] = useState(1);
  const [allowsSharing, setAllowsSharing] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>('available');

  const fosterCarerColor = THEME.roles.fosterCarer.primary;

  useEffect(() => {
    loadCapacity();
  }, []);

  const loadCapacity = async () => {
    setLoading(true);
    const { data, error } = await getHouseholdCapacity();
    if (error) {
      console.error('Failed to load capacity:', error);
    } else if (data) {
      setCapacity(data);
      setTotalBedrooms(data.total_bedrooms);
      setAllowsSharing(data.allows_house_sharing);
      setAvailabilityStatus(data.availability_status);
    }
    setLoading(false);
  };

  const handleSaveCapacity = async () => {
    if (!isPrimaryCarer) {
      Alert.alert('Permission Denied', 'Only the primary carer can update household capacity.');
      return;
    }

    setSaving(true);
    const { success, error } = await updateHouseholdCapacity({
      totalBedrooms,
      allowsHouseSharing: allowsSharing,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else if (success) {
      Alert.alert('Saved', 'Household capacity updated successfully.');
      loadCapacity();
    }
    setSaving(false);
  };

  const handleSetAvailability = async (status: AvailabilityStatus) => {
    setSaving(true);
    const { success, error } = await updateHouseholdAvailability({
      availabilityStatus: status,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else if (success) {
      setAvailabilityStatus(status);
      loadCapacity();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <Card variant="elevated" className="mb-4">
        <CardContent className="items-center py-8">
          <ActivityIndicator size="small" color={fosterCarerColor} />
          <Text variant="caption" color="muted" className="mt-2">
            Loading availability settings...
          </Text>
        </CardContent>
      </Card>
    );
  }

  if (!capacity) {
    return (
      <Card variant="elevated" className="mb-4">
        <CardContent className="items-center py-6">
          <Home size={32} color="#9CA3AF" />
          <Text variant="body" color="muted" className="mt-2 text-center">
            No household found. Please set up your household first.
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <View className="gap-4">
      {/* Availability Status */}
      <Card variant="elevated">
        <CardContent>
          <View className="flex-row items-center mb-4">
            <Calendar size={20} color={fosterCarerColor} />
            <Text variant="body" weight="semibold" className="ml-2">
              Availability Status
            </Text>
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleSetAvailability('available')}
              disabled={saving}
              className={`flex-1 py-3 rounded-lg items-center border-2 ${
                availabilityStatus === 'available'
                  ? 'bg-green-50 border-green-500'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Check size={20} color={availabilityStatus === 'available' ? '#22C55E' : '#9CA3AF'} />
              <Text
                variant="caption"
                weight={availabilityStatus === 'available' ? 'semibold' : 'normal'}
                className={`mt-1 ${availabilityStatus === 'available' ? 'text-green-600' : 'text-gray-500'}`}
              >
                Available
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSetAvailability('away')}
              disabled={saving}
              className={`flex-1 py-3 rounded-lg items-center border-2 ${
                availabilityStatus === 'away'
                  ? 'bg-yellow-50 border-yellow-500'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <Clock size={20} color={availabilityStatus === 'away' ? '#EAB308' : '#9CA3AF'} />
              <Text
                variant="caption"
                weight={availabilityStatus === 'away' ? 'semibold' : 'normal'}
                className={`mt-1 ${availabilityStatus === 'away' ? 'text-yellow-600' : 'text-gray-500'}`}
              >
                Away
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleSetAvailability('full')}
              disabled={saving}
              className={`flex-1 py-3 rounded-lg items-center border-2 ${
                availabilityStatus === 'full'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <X size={20} color={availabilityStatus === 'full' ? '#EF4444' : '#9CA3AF'} />
              <Text
                variant="caption"
                weight={availabilityStatus === 'full' ? 'semibold' : 'normal'}
                className={`mt-1 ${availabilityStatus === 'full' ? 'text-red-600' : 'text-gray-500'}`}
              >
                Full
              </Text>
            </Pressable>
          </View>

          {capacity.availability_notes && (
            <Text variant="caption" color="muted" className="mt-3">
              Note: {capacity.availability_notes}
            </Text>
          )}
        </CardContent>
      </Card>

      {/* Bed Capacity */}
      <Card variant="elevated">
        <CardContent>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Bed size={20} color={fosterCarerColor} />
              <Text variant="body" weight="semibold" className="ml-2">
                Bed Capacity
              </Text>
            </View>
            {!isPrimaryCarer && (
              <Text variant="caption" color="muted">
                Primary carer only
              </Text>
            )}
          </View>

          {/* Current Status */}
          <View className="bg-foster-carer-50 rounded-lg p-4 mb-4">
            <View className="flex-row justify-between items-center">
              <Text variant="body" color="muted">
                Total Bedrooms
              </Text>
              <Text variant="h3" weight="bold" className="text-foster-carer-600">
                {capacity.total_bedrooms}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mt-2">
              <Text variant="body" color="muted">
                Available Beds
              </Text>
              <Text
                variant="h3"
                weight="bold"
                className={capacity.available_beds > 0 ? 'text-green-600' : 'text-red-600'}
              >
                {capacity.available_beds}
              </Text>
            </View>
          </View>

          {isPrimaryCarer && (
            <>
              {/* Bedroom Count */}
              <View className="mb-4">
                <Text variant="caption" weight="semibold" className="mb-2">
                  Number of Bedrooms
                </Text>
                <View className="flex-row items-center gap-3">
                  <Pressable
                    onPress={() => setTotalBedrooms(Math.max(1, totalBedrooms - 1))}
                    className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <Text variant="h3" weight="bold">
                      -
                    </Text>
                  </Pressable>
                  <View className="flex-1 items-center">
                    <Text variant="h2" weight="bold">
                      {totalBedrooms}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setTotalBedrooms(totalBedrooms + 1)}
                    className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
                  >
                    <Text variant="h3" weight="bold">
                      +
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* House Sharing Toggle */}
              <View className="flex-row items-center justify-between py-3 border-t border-gray-100">
                <View className="flex-1 mr-4">
                  <Text variant="body" weight="medium">
                    Allow House Sharing
                  </Text>
                  <Text variant="caption" color="muted">
                    Other foster children can be placed here
                  </Text>
                </View>
                <Switch
                  value={allowsSharing}
                  onValueChange={setAllowsSharing}
                  trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                  thumbColor={allowsSharing ? fosterCarerColor : '#9CA3AF'}
                />
              </View>

              {/* Save Button */}
              <Pressable
                onPress={handleSaveCapacity}
                disabled={saving}
                className={`mt-4 py-3 rounded-lg items-center ${saving ? 'opacity-50' : ''}`}
                style={{ backgroundColor: fosterCarerColor }}
              >
                <Text className="text-white font-semibold">
                  {saving ? 'Saving...' : 'Save Capacity'}
                </Text>
              </Pressable>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bed Block Explanation */}
      <Card variant="outlined" className="bg-blue-50 border-blue-200">
        <CardContent>
          <Text variant="caption" weight="semibold" className="text-blue-800 mb-2">
            How Bed Blocking Works
          </Text>
          <Text variant="caption" className="text-blue-700">
            • If a child needs their own room, all remaining beds are blocked{'\n'}• If a child can
            share, only 1 bed is used{'\n'}• Blocked beds are still paid for by the council{'\n'}•
            Your social worker sets sharing preferences for each child
          </Text>
        </CardContent>
      </Card>
    </View>
  );
}
