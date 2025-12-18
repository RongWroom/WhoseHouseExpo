import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Home, UserPlus, Users, Crown, LogOut, Mail } from 'lucide-react-native';
import {
  getMyHousehold,
  inviteCarerToHousehold,
  updateHouseholdName,
  leaveHousehold,
  transferPrimaryCarer,
  getPendingInvitations,
  acceptHouseholdInvitation,
  HouseholdMember,
  HouseholdInvitation,
} from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface HouseholdSettingsProps {
  onHouseholdChange?: () => void;
}

export function HouseholdSettings({ onHouseholdChange }: HouseholdSettingsProps) {
  const { user, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [household, setHousehold] = useState<{
    id: string;
    name: string;
    members: HouseholdMember[];
  } | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<HouseholdInvitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const isPrimaryCarer = household?.members.find((m) => m.id === user?.id)?.is_primary_carer;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [householdResult, invitationsResult] = await Promise.all([
        getMyHousehold(),
        getPendingInvitations(),
      ]);

      if (householdResult.data) {
        setHousehold(householdResult.data);
        setNewHouseholdName(householdResult.data.name);
      }

      if (invitationsResult.data) {
        setPendingInvitations(invitationsResult.data);
      }
    } catch (error) {
      console.error('Failed to load household data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setIsInviting(true);
    const { error } = await inviteCarerToHousehold(inviteEmail.trim());
    setIsInviting(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', `Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
    }
  };

  const handleUpdateName = async () => {
    if (!household || !newHouseholdName.trim()) return;

    setIsSavingName(true);
    const { error } = await updateHouseholdName(household.id, newHouseholdName.trim());
    setIsSavingName(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setIsEditingName(false);
      await loadData();
      onHouseholdChange?.();
    }
  };

  const handleLeaveHousehold = () => {
    Alert.alert(
      'Leave Household',
      'Are you sure you want to leave this household? You will lose access to shared case information.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            const { error } = await leaveHousehold();
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              await refreshProfile();
              await loadData();
              onHouseholdChange?.();
            }
          },
        },
      ],
    );
  };

  const handleTransferPrimary = (member: HouseholdMember) => {
    Alert.alert(
      'Transfer Primary Carer',
      `Make ${member.full_name} the primary carer? They will be able to manage the household and invite others.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: async () => {
            const { error } = await transferPrimaryCarer(member.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              await loadData();
              onHouseholdChange?.();
            }
          },
        },
      ],
    );
  };

  const handleAcceptInvitation = async (invitation: HouseholdInvitation) => {
    const { error } = await acceptHouseholdInvitation(invitation.id);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'You have joined the household!');
      await refreshProfile();
      await loadData();
      onHouseholdChange?.();
    }
  };

  if (isLoading) {
    return (
      <View className="bg-white rounded-xl p-5 items-center">
        <ActivityIndicator size="large" color="#34C759" />
        <Text className="text-gray-500 mt-3">Loading household...</Text>
      </View>
    );
  }

  // Show pending invitations if user has no household
  if (!household && pendingInvitations.length > 0) {
    return (
      <View className="bg-white rounded-xl p-5">
        <View className="flex-row items-center mb-4">
          <Mail size={24} color="#34C759" />
          <Text className="text-lg font-semibold text-gray-900 ml-3">Pending Invitations</Text>
        </View>

        {pendingInvitations.map((invitation) => (
          <View
            key={invitation.id}
            className="bg-green-50 rounded-lg p-4 mb-3 border border-green-200"
          >
            <Text className="text-gray-900 font-medium mb-2">
              You've been invited to join a household
            </Text>
            <Text className="text-gray-600 text-sm mb-3">
              Expires: {new Date(invitation.expires_at).toLocaleDateString()}
            </Text>
            <TouchableOpacity
              className="bg-foster-carer-500 rounded-lg py-2.5 items-center"
              onPress={() => handleAcceptInvitation(invitation)}
            >
              <Text className="text-white font-semibold">Accept Invitation</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  }

  // No household
  if (!household) {
    return (
      <View className="bg-white rounded-xl p-5">
        <View className="flex-row items-center mb-4">
          <Home size={24} color="#34C759" />
          <Text className="text-lg font-semibold text-gray-900 ml-3">My Household</Text>
        </View>
        <Text className="text-gray-600">
          You are not part of a household yet. Your household will be created when you sign up, or
          you can accept an invitation from another carer.
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-xl p-5">
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <Home size={24} color="#34C759" />
        <Text className="text-lg font-semibold text-gray-900 ml-3">My Household</Text>
      </View>

      {/* Household Name */}
      <View className="mb-5">
        <Text className="text-sm font-medium text-gray-500 mb-2">Household Name</Text>
        {isEditingName ? (
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
              value={newHouseholdName}
              onChangeText={setNewHouseholdName}
              placeholder="Enter household name"
              autoFocus
            />
            <TouchableOpacity
              className="ml-2 bg-foster-carer-500 rounded-lg px-4 py-2.5"
              onPress={handleUpdateName}
              disabled={isSavingName}
            >
              {isSavingName ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">Save</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="ml-2 px-3 py-2.5"
              onPress={() => {
                setIsEditingName(false);
                setNewHouseholdName(household.name);
              }}
            >
              <Text className="text-gray-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            className="flex-row items-center justify-between bg-gray-50 rounded-lg p-3"
            onPress={() => isPrimaryCarer && setIsEditingName(true)}
            disabled={!isPrimaryCarer}
          >
            <Text className="text-gray-900 text-base font-medium">{household.name}</Text>
            {isPrimaryCarer && <Text className="text-foster-carer-500 text-sm">Edit</Text>}
          </TouchableOpacity>
        )}
      </View>

      {/* Members */}
      <View className="mb-5">
        <View className="flex-row items-center mb-3">
          <Users size={18} color="#666" />
          <Text className="text-sm font-medium text-gray-500 ml-2">
            Members ({household.members.length})
          </Text>
        </View>

        {household.members.map((member) => (
          <View
            key={member.id}
            className="flex-row items-center justify-between bg-gray-50 rounded-lg p-3 mb-2"
          >
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-full bg-foster-carer-500 items-center justify-center">
                <Text className="text-white font-semibold">
                  {member.full_name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </Text>
              </View>
              <View className="ml-3 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-gray-900 font-medium">{member.full_name}</Text>
                  {member.is_primary_carer && (
                    <View className="ml-2 flex-row items-center bg-yellow-100 px-2 py-0.5 rounded">
                      <Crown size={12} color="#F59E0B" />
                      <Text className="text-yellow-700 text-xs ml-1">Primary</Text>
                    </View>
                  )}
                  {member.id === user?.id && (
                    <Text className="text-gray-400 text-xs ml-2">(You)</Text>
                  )}
                </View>
                <Text className="text-gray-500 text-sm">{member.email}</Text>
              </View>
            </View>

            {/* Transfer primary button (only for primary carer, only on other members) */}
            {isPrimaryCarer && !member.is_primary_carer && member.id !== user?.id && (
              <TouchableOpacity
                className="p-2"
                onPress={() => handleTransferPrimary(member)}
                accessibilityLabel={`Make ${member.full_name} primary carer`}
              >
                <Crown size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Invite Carer (Primary only) */}
      {isPrimaryCarer && (
        <View className="mb-5 pt-4 border-t border-gray-200">
          <View className="flex-row items-center mb-3">
            <UserPlus size={18} color="#34C759" />
            <Text className="text-sm font-medium text-gray-700 ml-2">Invite Another Carer</Text>
          </View>
          <View className="flex-row items-center">
            <TextInput
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
              value={inviteEmail}
              onChangeText={setInviteEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              className={`ml-2 bg-foster-carer-500 rounded-lg px-4 py-2.5 ${isInviting ? 'opacity-60' : ''}`}
              onPress={handleInvite}
              disabled={isInviting}
            >
              {isInviting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-semibold">Invite</Text>
              )}
            </TouchableOpacity>
          </View>
          <Text className="text-gray-500 text-xs mt-2">
            The invited person will receive an invitation that expires in 7 days.
          </Text>
        </View>
      )}

      {/* Leave Household (Non-primary only) */}
      {!isPrimaryCarer && household.members.length > 1 && (
        <TouchableOpacity
          className="flex-row items-center justify-center py-3 border-t border-gray-200 mt-2"
          onPress={handleLeaveHousehold}
        >
          <LogOut size={18} color="#EF4444" />
          <Text className="text-red-500 font-medium ml-2">Leave Household</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
