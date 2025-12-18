import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Users, Bed, Clock, Send, Check, AlertCircle } from 'lucide-react-native';
import { Card, CardContent, Text, Avatar } from '../../src/components/ui';
import { THEME } from '../../src/lib/theme';
import {
  createCase,
  searchAvailableHouseholds,
  sendPlacementRequest,
  PlacementType,
  AvailableHousehold,
} from '../../src/lib/supabase';

type Step = 'details' | 'search' | 'confirm';

export default function CreateCaseScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  // Case details
  const [placementType, setPlacementType] = useState<PlacementType>('long_term');
  const [childCanShare, setChildCanShare] = useState(true);
  const [childAgeRange, setChildAgeRange] = useState('');
  const [childGender, setChildGender] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');

  // Created case
  const [caseId, setCaseId] = useState<string | null>(null);

  // Search results
  const [availableHouseholds, setAvailableHouseholds] = useState<AvailableHousehold[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<AvailableHousehold | null>(null);

  // Request message
  const [requestMessage, setRequestMessage] = useState('');

  const socialWorkerColor = THEME.roles.socialWorker.primary;

  const handleCreateCase = async () => {
    setLoading(true);
    const { data, error } = await createCase({
      placementType,
      childCanShare,
      childAgeRange: childAgeRange || undefined,
      childGender: childGender || undefined,
      internalNotes: internalNotes || undefined,
      expectedEndDate: expectedEndDate || undefined,
    });

    if (error) {
      Alert.alert('Error', error.message);
      setLoading(false);
      return;
    }

    if (data) {
      setCaseId(data.caseId);
      // Search for available households
      await searchHouseholds();
      setStep('search');
    }
    setLoading(false);
  };

  const searchHouseholds = async () => {
    setSearching(true);
    const { data, error } = await searchAvailableHouseholds({
      childCanShare,
      placementType,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else if (data) {
      setAvailableHouseholds(data);
    }
    setSearching(false);
  };

  const handleSelectHousehold = (household: AvailableHousehold) => {
    setSelectedHousehold(household);
    setStep('confirm');
  };

  const handleSendRequest = async () => {
    if (!caseId || !selectedHousehold) return;

    setSending(true);
    const { error } = await sendPlacementRequest({
      caseId,
      householdId: selectedHousehold.household_id,
      message: requestMessage || undefined,
    });

    if (error) {
      Alert.alert('Error', error.message);
      setSending(false);
      return;
    }

    Alert.alert(
      'Request Sent',
      `Placement request sent to ${selectedHousehold.household_name}. They have 48 hours to respond.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
    setSending(false);
  };

  const renderHeader = () => (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-200 bg-white">
      <Pressable
        onPress={() => {
          if (step === 'confirm') {
            setStep('search');
          } else if (step === 'search') {
            setStep('details');
          } else {
            router.back();
          }
        }}
        className="p-2 -ml-2"
      >
        <ArrowLeft size={24} color="#374151" />
      </Pressable>
      <Text variant="h3" weight="semibold" className="flex-1 ml-2">
        {step === 'details' && 'New Case'}
        {step === 'search' && 'Find Placement'}
        {step === 'confirm' && 'Confirm Request'}
      </Text>
      <View className="flex-row gap-1">
        <View
          className={`w-2 h-2 rounded-full ${step === 'details' ? 'bg-social-worker-500' : 'bg-gray-300'}`}
        />
        <View
          className={`w-2 h-2 rounded-full ${step === 'search' ? 'bg-social-worker-500' : 'bg-gray-300'}`}
        />
        <View
          className={`w-2 h-2 rounded-full ${step === 'confirm' ? 'bg-social-worker-500' : 'bg-gray-300'}`}
        />
      </View>
    </View>
  );

  const renderDetailsStep = () => (
    <ScrollView className="flex-1 p-4">
      {/* Placement Type */}
      <Card variant="elevated" className="mb-4">
        <CardContent>
          <Text variant="body" weight="semibold" className="mb-3">
            Placement Type
          </Text>
          <View className="flex-row gap-2">
            {(['respite', 'long_term', 'emergency'] as PlacementType[]).map((type) => (
              <Pressable
                key={type}
                onPress={() => setPlacementType(type)}
                className={`flex-1 py-3 rounded-lg items-center border-2 ${
                  placementType === type
                    ? 'bg-social-worker-50 border-social-worker-500'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text
                  variant="caption"
                  weight={placementType === type ? 'semibold' : 'normal'}
                  className={placementType === type ? 'text-social-worker-600' : 'text-gray-600'}
                >
                  {type === 'long_term'
                    ? 'Long Term'
                    : type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </CardContent>
      </Card>

      {/* Room Sharing */}
      <Card variant="elevated" className="mb-4">
        <CardContent>
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text variant="body" weight="semibold">
                Child Can Share House
              </Text>
              <Text variant="caption" color="muted">
                Based on child's assessment and needs
              </Text>
            </View>
            <Switch
              value={childCanShare}
              onValueChange={setChildCanShare}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={childCanShare ? socialWorkerColor : '#9CA3AF'}
            />
          </View>
          {!childCanShare && (
            <View className="mt-3 bg-yellow-50 p-3 rounded-lg">
              <Text variant="caption" className="text-yellow-800">
                ⚠️ This child needs exclusive placement. This will block all beds in the placement
                household.
              </Text>
            </View>
          )}
        </CardContent>
      </Card>

      {/* Child Details (Anonymized) */}
      <Card variant="elevated" className="mb-4">
        <CardContent>
          <Text variant="body" weight="semibold" className="mb-3">
            Child Details (Optional)
          </Text>

          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Age Range
            </Text>
            <TextInput
              value={childAgeRange}
              onChangeText={setChildAgeRange}
              placeholder="e.g., 8-10"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>

          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Gender
            </Text>
            <View className="flex-row gap-2">
              {['Male', 'Female', 'Any'].map((g) => (
                <Pressable
                  key={g}
                  onPress={() => setChildGender(g.toLowerCase())}
                  className={`flex-1 py-2 rounded-lg items-center border ${
                    childGender === g.toLowerCase()
                      ? 'bg-social-worker-50 border-social-worker-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    variant="caption"
                    className={
                      childGender === g.toLowerCase() ? 'text-social-worker-600' : 'text-gray-600'
                    }
                  >
                    {g}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {placementType === 'respite' && (
            <View>
              <Text variant="caption" weight="medium" className="mb-1">
                Expected End Date
              </Text>
              <TextInput
                value={expectedEndDate}
                onChangeText={setExpectedEndDate}
                placeholder="YYYY-MM-DD"
                className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
              />
            </View>
          )}
        </CardContent>
      </Card>

      {/* Internal Notes */}
      <Card variant="elevated" className="mb-4">
        <CardContent>
          <Text variant="body" weight="semibold" className="mb-2">
            Internal Notes
          </Text>
          <Text variant="caption" color="muted" className="mb-3">
            Only visible to social workers
          </Text>
          <TextInput
            value={internalNotes}
            onChangeText={setInternalNotes}
            placeholder="Any additional notes about this case..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50 min-h-[100px]"
          />
        </CardContent>
      </Card>

      {/* Create Button */}
      <Pressable
        onPress={handleCreateCase}
        disabled={loading}
        className={`py-4 rounded-xl items-center flex-row justify-center ${loading ? 'opacity-50' : ''}`}
        style={{ backgroundColor: socialWorkerColor }}
      >
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <Plus size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Create Case & Find Placement</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );

  const renderSearchStep = () => (
    <View className="flex-1">
      {searching ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={socialWorkerColor} />
          <Text variant="body" color="muted" className="mt-4">
            Searching for available placements...
          </Text>
        </View>
      ) : availableHouseholds.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6">
          <AlertCircle size={48} color="#9CA3AF" />
          <Text variant="h3" weight="semibold" className="mt-4 text-center">
            No Available Placements
          </Text>
          <Text variant="body" color="muted" className="mt-2 text-center">
            No households are currently available for this placement type.
            {!childCanShare && ' Consider if the child can share the house to see more options.'}
          </Text>
          <Pressable onPress={searchHouseholds} className="mt-6 px-6 py-3 rounded-lg bg-gray-100">
            <Text variant="body" weight="semibold">
              Refresh Search
            </Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView className="flex-1 p-4">
          <Text variant="caption" color="muted" className="mb-3">
            {availableHouseholds.length} household{availableHouseholds.length !== 1 ? 's' : ''}{' '}
            available
          </Text>

          {availableHouseholds.map((household) => (
            <Pressable
              key={household.household_id}
              onPress={() => handleSelectHousehold(household)}
              className="mb-3"
            >
              <Card variant="elevated">
                <CardContent>
                  <View className="flex-row items-center">
                    <Avatar
                      initials={household.household_name.charAt(0)}
                      size="lg"
                      backgroundColor="bg-foster-carer-500"
                    />
                    <View className="flex-1 ml-3">
                      <Text variant="body" weight="semibold">
                        {household.household_name}
                      </Text>
                      <Text variant="caption" color="muted">
                        Primary: {household.primary_carer_name}
                      </Text>
                    </View>
                    <View className="items-end">
                      <View className="flex-row items-center">
                        <Bed size={14} color="#34C759" />
                        <Text variant="body" weight="bold" className="text-green-600 ml-1">
                          {household.available_beds}
                        </Text>
                      </View>
                      <Text variant="caption" color="muted">
                        of {household.total_bedrooms} beds
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row mt-3 pt-3 border-t border-gray-100 gap-4">
                    <View className="flex-row items-center">
                      <Users size={14} color="#6B7280" />
                      <Text variant="caption" color="muted" className="ml-1">
                        {household.active_cases_count} active{' '}
                        {household.active_cases_count === 1 ? 'case' : 'cases'}
                      </Text>
                    </View>
                    {household.allows_house_sharing && (
                      <View className="flex-row items-center">
                        <Check size={14} color="#22C55E" />
                        <Text variant="caption" className="text-green-600 ml-1">
                          Can share
                        </Text>
                      </View>
                    )}
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderConfirmStep = () => {
    if (!selectedHousehold) return null;

    return (
      <ScrollView className="flex-1 p-4">
        {/* Selected Household */}
        <Card variant="elevated" className="mb-4">
          <CardContent>
            <Text variant="caption" color="muted" className="mb-2">
              SENDING REQUEST TO
            </Text>
            <View className="flex-row items-center">
              <Avatar
                initials={selectedHousehold.household_name.charAt(0)}
                size="lg"
                backgroundColor="bg-foster-carer-500"
              />
              <View className="flex-1 ml-3">
                <Text variant="h3" weight="semibold">
                  {selectedHousehold.household_name}
                </Text>
                <Text variant="body" color="muted">
                  {selectedHousehold.primary_carer_name}
                </Text>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Case Summary */}
        <Card variant="outlined" className="mb-4 bg-social-worker-50 border-social-worker-200">
          <CardContent>
            <Text variant="caption" weight="semibold" className="text-social-worker-800 mb-2">
              Placement Details
            </Text>
            <View className="gap-1">
              <Text variant="caption" className="text-social-worker-700">
                • Type:{' '}
                {placementType === 'long_term'
                  ? 'Long Term'
                  : placementType.charAt(0).toUpperCase() + placementType.slice(1)}
              </Text>
              <Text variant="caption" className="text-social-worker-700">
                • Room Sharing: {childCanShare ? 'Yes' : 'No (requires own room)'}
              </Text>
              {childAgeRange && (
                <Text variant="caption" className="text-social-worker-700">
                  • Age Range: {childAgeRange}
                </Text>
              )}
            </View>
          </CardContent>
        </Card>

        {/* Message */}
        <Card variant="elevated" className="mb-4">
          <CardContent>
            <Text variant="body" weight="semibold" className="mb-2">
              Message to Carer (Optional)
            </Text>
            <TextInput
              value={requestMessage}
              onChangeText={setRequestMessage}
              placeholder="Add any additional information for the foster carer..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50 min-h-[100px]"
            />
          </CardContent>
        </Card>

        {/* Expiry Notice */}
        <View className="flex-row items-center bg-yellow-50 p-3 rounded-lg mb-4">
          <Clock size={18} color="#D97706" />
          <Text variant="caption" className="text-yellow-800 ml-2 flex-1">
            The carer has 48 hours to respond to this request
          </Text>
        </View>

        {/* Send Button */}
        <Pressable
          onPress={handleSendRequest}
          disabled={sending}
          className={`py-4 rounded-xl items-center flex-row justify-center ${sending ? 'opacity-50' : ''}`}
          style={{ backgroundColor: socialWorkerColor }}
        >
          {sending ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Send size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Send Placement Request</Text>
            </>
          )}
        </Pressable>

        {/* Choose Different */}
        <Pressable onPress={() => setStep('search')} className="mt-3 py-3 items-center">
          <Text variant="body" className="text-gray-600">
            Choose a different household
          </Text>
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {renderHeader()}
      {step === 'details' && renderDetailsStep()}
      {step === 'search' && renderSearchStep()}
      {step === 'confirm' && renderConfirmStep()}
    </SafeAreaView>
  );
}
