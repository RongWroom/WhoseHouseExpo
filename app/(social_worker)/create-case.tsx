import React, { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Users, Bed, Clock, Send, Check, AlertCircle } from 'lucide-react-native';
import { Card, CardContent, Text, Avatar } from '../../src/components/ui';
import { THEME } from '../../src/lib/theme';
import {
  createCaseForChild,
  createChildProfile,
  createPlacementReferral,
  searchAvailableHouseholds,
  sendPlacementReferral,
  sendPlacementRequest,
  upsertChildFamilyTime,
  upsertChildNeeds,
  upsertChildRisk,
  PlacementType,
  AvailableHousehold,
} from '../../src/lib/supabase';

type Step = 'details' | 'search' | 'confirm';
const CREATE_CASE_DRAFT_KEY = 'social_worker_create_case_draft_v1';

type CreateCaseDraft = {
  childPid: string;
  dateOfBirth: string;
  sexAtBirth: string;
  genderIdentity: string;
  ethnicity: string;
  legalStatus: string;
  childSummary: string;
  penPicture: string;
  educationSummary: string;
  healthSummary: string;
  communicationSummary: string;
  emotionalSummary: string;
  physicalSummary: string;
  culturalSummary: string;
  selfCareSummary: string;
  supportRequired: string;
  riskType: string;
  riskHasRisk: boolean;
  riskDetails: string;
  riskTriggers: string;
  riskStrategies: string;
  familyContactPerson: string;
  familyFrequency: string;
  familyPreferredLocation: string;
  familySupervised: boolean;
  familyTimeNotes: string;
  placementType: PlacementType;
  childCanShare: boolean;
  matchingRequirements: string;
  locationRestrictions: string;
  internalNotes: string;
  expectedEndDate: string;
  referralRequestDate: string;
  completedByName: string;
  completedByContact: string;
  managerApprovalGranted: boolean;
  managerApprovedBy: string;
  managerApprovedAt: string;
  requestMessage: string;
};

export default function CreateCaseScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  // Child profile details
  const [childPid, setChildPid] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sexAtBirth, setSexAtBirth] = useState('');
  const [genderIdentity, setGenderIdentity] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [legalStatus, setLegalStatus] = useState('');
  const [childSummary, setChildSummary] = useState('');
  const [penPicture, setPenPicture] = useState('');
  const [educationSummary, setEducationSummary] = useState('');
  const [healthSummary, setHealthSummary] = useState('');
  const [communicationSummary, setCommunicationSummary] = useState('');
  const [emotionalSummary, setEmotionalSummary] = useState('');
  const [physicalSummary, setPhysicalSummary] = useState('');
  const [culturalSummary, setCulturalSummary] = useState('');
  const [selfCareSummary, setSelfCareSummary] = useState('');
  const [supportRequired, setSupportRequired] = useState('');
  const [riskType, setRiskType] = useState('');
  const [riskHasRisk, setRiskHasRisk] = useState(false);
  const [riskDetails, setRiskDetails] = useState('');
  const [riskTriggers, setRiskTriggers] = useState('');
  const [riskStrategies, setRiskStrategies] = useState('');
  const [familyContactPerson, setFamilyContactPerson] = useState('');
  const [familyFrequency, setFamilyFrequency] = useState('');
  const [familyPreferredLocation, setFamilyPreferredLocation] = useState('');
  const [familySupervised, setFamilySupervised] = useState(false);
  const [familyTimeNotes, setFamilyTimeNotes] = useState('');

  // Placement and case details
  const [placementType, setPlacementType] = useState<PlacementType>('long_term');
  const [childCanShare, setChildCanShare] = useState(true);
  const [matchingRequirements, setMatchingRequirements] = useState('');
  const [locationRestrictions, setLocationRestrictions] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [expectedEndDate, setExpectedEndDate] = useState('');

  // Referral governance
  const [referralRequestDate, setReferralRequestDate] = useState('');
  const [completedByName, setCompletedByName] = useState('');
  const [completedByContact, setCompletedByContact] = useState('');
  const [managerApprovalGranted, setManagerApprovalGranted] = useState(false);
  const [managerApprovedBy, setManagerApprovedBy] = useState('');
  const [managerApprovedAt, setManagerApprovedAt] = useState('');

  // Created records
  const [childProfileId, setChildProfileId] = useState<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);

  // Search results
  const [availableHouseholds, setAvailableHouseholds] = useState<AvailableHousehold[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<AvailableHousehold | null>(null);

  // Request message
  const [requestMessage, setRequestMessage] = useState('');

  const socialWorkerColor = THEME.roles.socialWorker.primary;

  const clearLocalDraft = async () => {
    await AsyncStorage.removeItem(CREATE_CASE_DRAFT_KEY);
  };

  useEffect(() => {
    const loadDraft = async () => {
      try {
        const rawDraft = await AsyncStorage.getItem(CREATE_CASE_DRAFT_KEY);
        if (!rawDraft) return;

        const parsed = JSON.parse(rawDraft) as CreateCaseDraft;
        Alert.alert('Resume Draft?', 'We found a saved draft for this form.', [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              clearLocalDraft().catch(() => undefined);
            },
          },
          {
            text: 'Resume',
            onPress: () => {
              setChildPid(parsed.childPid || '');
              setDateOfBirth(parsed.dateOfBirth || '');
              setSexAtBirth(parsed.sexAtBirth || '');
              setGenderIdentity(parsed.genderIdentity || '');
              setEthnicity(parsed.ethnicity || '');
              setLegalStatus(parsed.legalStatus || '');
              setChildSummary(parsed.childSummary || '');
              setPenPicture(parsed.penPicture || '');
              setEducationSummary(parsed.educationSummary || '');
              setHealthSummary(parsed.healthSummary || '');
              setCommunicationSummary(parsed.communicationSummary || '');
              setEmotionalSummary(parsed.emotionalSummary || '');
              setPhysicalSummary(parsed.physicalSummary || '');
              setCulturalSummary(parsed.culturalSummary || '');
              setSelfCareSummary(parsed.selfCareSummary || '');
              setSupportRequired(parsed.supportRequired || '');
              setRiskType(parsed.riskType || '');
              setRiskHasRisk(parsed.riskHasRisk || false);
              setRiskDetails(parsed.riskDetails || '');
              setRiskTriggers(parsed.riskTriggers || '');
              setRiskStrategies(parsed.riskStrategies || '');
              setFamilyContactPerson(parsed.familyContactPerson || '');
              setFamilyFrequency(parsed.familyFrequency || '');
              setFamilyPreferredLocation(parsed.familyPreferredLocation || '');
              setFamilySupervised(parsed.familySupervised || false);
              setFamilyTimeNotes(parsed.familyTimeNotes || '');
              setPlacementType(parsed.placementType || 'long_term');
              setChildCanShare(parsed.childCanShare ?? true);
              setMatchingRequirements(parsed.matchingRequirements || '');
              setLocationRestrictions(parsed.locationRestrictions || '');
              setInternalNotes(parsed.internalNotes || '');
              setExpectedEndDate(parsed.expectedEndDate || '');
              setReferralRequestDate(parsed.referralRequestDate || '');
              setCompletedByName(parsed.completedByName || '');
              setCompletedByContact(parsed.completedByContact || '');
              setManagerApprovalGranted(parsed.managerApprovalGranted || false);
              setManagerApprovedBy(parsed.managerApprovedBy || '');
              setManagerApprovedAt(parsed.managerApprovedAt || '');
              setRequestMessage(parsed.requestMessage || '');
            },
          },
        ]);
      } catch (error) {
        console.error('Failed to load create case draft:', error);
      }
    };

    loadDraft().catch(() => undefined);
  }, []);

  useEffect(() => {
    const draft: CreateCaseDraft = {
      childPid,
      dateOfBirth,
      sexAtBirth,
      genderIdentity,
      ethnicity,
      legalStatus,
      childSummary,
      penPicture,
      educationSummary,
      healthSummary,
      communicationSummary,
      emotionalSummary,
      physicalSummary,
      culturalSummary,
      selfCareSummary,
      supportRequired,
      riskType,
      riskHasRisk,
      riskDetails,
      riskTriggers,
      riskStrategies,
      familyContactPerson,
      familyFrequency,
      familyPreferredLocation,
      familySupervised,
      familyTimeNotes,
      placementType,
      childCanShare,
      matchingRequirements,
      locationRestrictions,
      internalNotes,
      expectedEndDate,
      referralRequestDate,
      completedByName,
      completedByContact,
      managerApprovalGranted,
      managerApprovedBy,
      managerApprovedAt,
      requestMessage,
    };

    const timeoutId = setTimeout(() => {
      AsyncStorage.setItem(CREATE_CASE_DRAFT_KEY, JSON.stringify(draft)).catch((error) => {
        console.error('Failed to autosave create case draft:', error);
      });
    }, 600);

    return () => clearTimeout(timeoutId);
  }, [
    childPid,
    dateOfBirth,
    sexAtBirth,
    genderIdentity,
    ethnicity,
    legalStatus,
    childSummary,
    penPicture,
    educationSummary,
    healthSummary,
    communicationSummary,
    emotionalSummary,
    physicalSummary,
    culturalSummary,
    selfCareSummary,
    supportRequired,
    riskType,
    riskHasRisk,
    riskDetails,
    riskTriggers,
    riskStrategies,
    familyContactPerson,
    familyFrequency,
    familyPreferredLocation,
    familySupervised,
    familyTimeNotes,
    placementType,
    childCanShare,
    matchingRequirements,
    locationRestrictions,
    internalNotes,
    expectedEndDate,
    referralRequestDate,
    completedByName,
    completedByContact,
    managerApprovalGranted,
    managerApprovedBy,
    managerApprovedAt,
    requestMessage,
  ]);

  const getReferralValidation = () => {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    if (!completedByName.trim()) {
      blockingIssues.push('Referral completed by is required');
    }

    if (!completedByContact.trim()) {
      blockingIssues.push('Contact details are required');
    }

    if (!managerApprovalGranted) {
      warnings.push('Manager approval is not marked as granted');
    }

    if (managerApprovalGranted && !managerApprovedBy.trim()) {
      blockingIssues.push('Approved by is required when manager approval is granted');
    }

    if (managerApprovalGranted && !managerApprovedAt.trim()) {
      blockingIssues.push('Approval date is required when manager approval is granted');
    }

    if (!penPicture.trim()) {
      warnings.push('Pen picture is empty');
    }

    if (!childSummary.trim()) {
      warnings.push('Child summary is empty');
    }

    if (!supportRequired.trim()) {
      warnings.push('Support required section is empty');
    }

    return { blockingIssues, warnings };
  };

  const createChildProfileAndCase = async (status: 'draft' | 'pending') => {
    if (!childPid.trim()) {
      Alert.alert('Missing Child PID', 'Please enter a child PID before continuing.');
      return { caseId: null as string | null };
    }

    const { data: childData, error: childError } = await createChildProfile({
      pid: childPid,
      dateOfBirth: dateOfBirth || undefined,
      sexAtBirth: sexAtBirth || undefined,
      genderIdentity: genderIdentity || undefined,
      ethnicity: ethnicity || undefined,
      legalStatus: legalStatus || undefined,
      summary: childSummary || undefined,
      penPicture: penPicture || undefined,
    });

    if (childError || !childData?.childProfileId) {
      Alert.alert('Error', childError?.message || 'Failed to create child profile');
      return { caseId: null as string | null };
    }

    setChildProfileId(childData.childProfileId);

    const hasNeeds =
      !!educationSummary.trim() ||
      !!healthSummary.trim() ||
      !!communicationSummary.trim() ||
      !!emotionalSummary.trim() ||
      !!physicalSummary.trim() ||
      !!culturalSummary.trim() ||
      !!selfCareSummary.trim() ||
      !!supportRequired.trim();

    if (hasNeeds) {
      const { error: needsError } = await upsertChildNeeds({
        childProfileId: childData.childProfileId,
        educationSummary: educationSummary || undefined,
        healthSummary: healthSummary || undefined,
        communicationSummary: communicationSummary || undefined,
        emotionalSummary: emotionalSummary || undefined,
        physicalSummary: physicalSummary || undefined,
        culturalSummary: culturalSummary || undefined,
        selfCareSummary: selfCareSummary || undefined,
        supportRequired: supportRequired || undefined,
      });

      if (needsError) {
        Alert.alert('Error', needsError.message || 'Failed to save child needs');
        return { caseId: null as string | null };
      }
    }

    if (riskType.trim()) {
      const { error: riskError } = await upsertChildRisk({
        childProfileId: childData.childProfileId,
        riskType: riskType.trim(),
        hasRisk: riskHasRisk,
        details: riskDetails || undefined,
        knownTriggers: riskTriggers || undefined,
        successfulStrategies: riskStrategies || undefined,
      });

      if (riskError) {
        Alert.alert('Error', riskError.message || 'Failed to save child risk');
        return { caseId: null as string | null };
      }
    }

    if (familyContactPerson.trim()) {
      const { error: familyError } = await upsertChildFamilyTime({
        childProfileId: childData.childProfileId,
        contactPerson: familyContactPerson.trim(),
        frequency: familyFrequency || undefined,
        preferredLocation: familyPreferredLocation || undefined,
        supervised: familySupervised,
        notes: familyTimeNotes || undefined,
      });

      if (familyError) {
        Alert.alert('Error', familyError.message || 'Failed to save family time');
        return { caseId: null as string | null };
      }
    }

    const { data: caseData, error: caseError } = await createCaseForChild({
      childProfileId: childData.childProfileId,
      placementType,
      childCanShare,
      internalNotes: internalNotes || undefined,
      expectedEndDate: expectedEndDate || undefined,
      status,
    });

    if (caseError || !caseData?.caseId) {
      Alert.alert('Error', caseError?.message || 'Failed to create case');
      return { caseId: null as string | null };
    }

    setCaseId(caseData.caseId);
    return { caseId: caseData.caseId };
  };

  const handleCreateCase = async () => {
    setLoading(true);
    const result = await createChildProfileAndCase('pending');

    if (result.caseId) {
      // Search for available households
      await searchHouseholds();
      setStep('search');
    }
    setLoading(false);
  };

  const handleSaveDraft = async () => {
    setLoading(true);
    const result = await createChildProfileAndCase('draft');

    if (!result.caseId) {
      setLoading(false);
      return;
    }

    Alert.alert(
      'Draft Saved',
      'Case saved as draft. You can find it in your caseload and continue later.',
      [{ text: 'OK', onPress: () => router.back() }],
    );
    await clearLocalDraft();
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

  const executeSendRequest = async () => {
    if (!caseId || !selectedHousehold) return;

    setSending(true);

    const { data: referralData, error: referralError } = await createPlacementReferral({
      caseId,
      referralRequestDate: referralRequestDate || undefined,
      completedByName: completedByName || undefined,
      completedByContact: completedByContact || undefined,
      managerApprovalGranted,
      managerApprovedBy: managerApprovedBy || undefined,
      managerApprovedAt: managerApprovedAt || undefined,
      additionalSnapshot: {
        matching_requirements: matchingRequirements || null,
        location_restrictions: locationRestrictions || null,
      },
    });

    if (referralError || !referralData?.referralId) {
      Alert.alert('Error', referralError?.message || 'Failed to create referral');
      setSending(false);
      return;
    }

    const { success: sentReferral, error: sendReferralError } = await sendPlacementReferral(
      referralData.referralId,
    );

    if (!sentReferral || sendReferralError) {
      Alert.alert('Error', sendReferralError?.message || 'Failed to send referral');
      setSending(false);
      return;
    }

    const { error } = await sendPlacementRequest({
      caseId,
      householdId: selectedHousehold.household_id,
      message: requestMessage || undefined,
      referralId: referralData.referralId,
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
    await clearLocalDraft();
    setSending(false);
  };

  const handleSendRequest = async () => {
    const { blockingIssues, warnings } = getReferralValidation();

    if (blockingIssues.length > 0) {
      Alert.alert(
        'Complete Referral Before Sending',
        blockingIssues.map((issue) => `• ${issue}`).join('\n'),
      );
      return;
    }

    if (warnings.length > 0) {
      Alert.alert(
        'Referral Review Warnings',
        `${warnings.map((warning) => `• ${warning}`).join('\n')}\n\nYou can continue, but review is recommended.`,
        [
          { text: 'Review', style: 'cancel' },
          {
            text: 'Send Anyway',
            onPress: () => {
              executeSendRequest().catch(() => undefined);
            },
          },
        ],
      );
      return;
    }

    await executeSendRequest();
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
        {step === 'details' && 'New Child + Case'}
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

      {/* Child Profile */}
      <Card variant="elevated" className="mb-4">
        <CardContent>
          <Text variant="body" weight="semibold" className="mb-3">
            Child Profile
          </Text>

          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Child PID
            </Text>
            <TextInput
              value={childPid}
              onChangeText={setChildPid}
              placeholder="e.g., 2032969"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>

          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Date of Birth (optional)
            </Text>
            <TextInput
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              placeholder="YYYY-MM-DD"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>

          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Sex at Birth (optional)
            </Text>
            <View className="flex-row gap-2">
              {['male', 'female', 'unknown'].map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setSexAtBirth(option)}
                  className={`flex-1 py-2 rounded-lg items-center border ${
                    sexAtBirth === option
                      ? 'bg-social-worker-50 border-social-worker-500'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <Text
                    variant="caption"
                    className={sexAtBirth === option ? 'text-social-worker-600' : 'text-gray-600'}
                  >
                    {option === 'unknown'
                      ? 'Unknown'
                      : option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Gender Identity (optional)
            </Text>
            <TextInput
              value={genderIdentity}
              onChangeText={setGenderIdentity}
              placeholder="e.g., boy"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>

          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Ethnicity (optional)
            </Text>
            <TextInput
              value={ethnicity}
              onChangeText={setEthnicity}
              placeholder="e.g., White British"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>

          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Legal Status (optional)
            </Text>
            <TextInput
              value={legalStatus}
              onChangeText={setLegalStatus}
              placeholder="e.g., CPP"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>

          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Child Summary (optional)
            </Text>
            <TextInput
              value={childSummary}
              onChangeText={setChildSummary}
              placeholder="High-level anonymized summary..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50 min-h-[80px]"
            />
          </View>

          <View>
            <Text variant="caption" weight="medium" className="mb-1">
              Pen Picture (optional)
            </Text>
            <TextInput
              value={penPicture}
              onChangeText={setPenPicture}
              placeholder="Strengths, interests, routines, child voice..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50 min-h-[100px]"
            />
          </View>
        </CardContent>
      </Card>

      {/* Placement Matching */}
      <Card variant="elevated" className="mb-4">
        <CardContent>
          <Text variant="body" weight="semibold" className="mb-3">
            Placement Matching (Optional)
          </Text>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Matching Requirements
            </Text>
            <TextInput
              value={matchingRequirements}
              onChangeText={setMatchingRequirements}
              placeholder="e.g., no pets, age of other children, specific needs"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Location Restrictions
            </Text>
            <TextInput
              value={locationRestrictions}
              onChangeText={setLocationRestrictions}
              placeholder="e.g., not close to family area"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
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

      {/* Needs & Risks */}
      <Card variant="elevated" className="mb-4">
        <CardContent>
          <Text variant="body" weight="semibold" className="mb-3">
            Needs & Risks (Optional)
          </Text>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Education Summary
            </Text>
            <TextInput
              value={educationSummary}
              onChangeText={setEducationSummary}
              placeholder="Schooling, attendance, support..."
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Health Summary
            </Text>
            <TextInput
              value={healthSummary}
              onChangeText={setHealthSummary}
              placeholder="Medication, appointments, health needs..."
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Communication Summary
            </Text>
            <TextInput
              value={communicationSummary}
              onChangeText={setCommunicationSummary}
              placeholder="Communication style and support needs..."
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Emotional / Mental Health Summary
            </Text>
            <TextInput
              value={emotionalSummary}
              onChangeText={setEmotionalSummary}
              placeholder="Emotional wellbeing, behaviour patterns..."
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Physical / Sensory Summary
            </Text>
            <TextInput
              value={physicalSummary}
              onChangeText={setPhysicalSummary}
              placeholder="Physical needs, sensory considerations..."
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Cultural / Identity Summary
            </Text>
            <TextInput
              value={culturalSummary}
              onChangeText={setCulturalSummary}
              placeholder="Faith, identity, culture and routines..."
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Self-care Summary
            </Text>
            <TextInput
              value={selfCareSummary}
              onChangeText={setSelfCareSummary}
              placeholder="Daily living and self-care support..."
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Support Required
            </Text>
            <TextInput
              value={supportRequired}
              onChangeText={setSupportRequired}
              placeholder="Specific supports carers will need to provide..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50 min-h-[80px]"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Risk Type
            </Text>
            <TextInput
              value={riskType}
              onChangeText={setRiskType}
              placeholder="e.g., absconding, self-harm, aggression"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 mr-4">
              <Text variant="body" weight="semibold">
                Risk Present
              </Text>
              <Text variant="caption" color="muted">
                Set to yes if this risk currently applies
              </Text>
            </View>
            <Switch
              value={riskHasRisk}
              onValueChange={setRiskHasRisk}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={riskHasRisk ? socialWorkerColor : '#9CA3AF'}
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Risk Details
            </Text>
            <TextInput
              value={riskDetails}
              onChangeText={setRiskDetails}
              placeholder="Describe the risk history and context..."
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Known Triggers
            </Text>
            <TextInput
              value={riskTriggers}
              onChangeText={setRiskTriggers}
              placeholder="What triggers this risk?"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View>
            <Text variant="caption" weight="medium" className="mb-1">
              Successful Strategies
            </Text>
            <TextInput
              value={riskStrategies}
              onChangeText={setRiskStrategies}
              placeholder="What de-escalation/support strategies work?"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
        </CardContent>
      </Card>

      {/* Family Time */}
      <Card variant="elevated" className="mb-4">
        <CardContent>
          <Text variant="body" weight="semibold" className="mb-3">
            Family Time (Optional)
          </Text>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Contact Person
            </Text>
            <TextInput
              value={familyContactPerson}
              onChangeText={setFamilyContactPerson}
              placeholder="e.g., mother, sibling, grandparent"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Frequency
            </Text>
            <TextInput
              value={familyFrequency}
              onChangeText={setFamilyFrequency}
              placeholder="e.g., weekly supervised"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Preferred Location
            </Text>
            <TextInput
              value={familyPreferredLocation}
              onChangeText={setFamilyPreferredLocation}
              placeholder="e.g., contact centre"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 mr-4">
              <Text variant="body" weight="semibold">
                Supervised
              </Text>
              <Text variant="caption" color="muted">
                Whether family time must be supervised
              </Text>
            </View>
            <Switch
              value={familySupervised}
              onValueChange={setFamilySupervised}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={familySupervised ? socialWorkerColor : '#9CA3AF'}
            />
          </View>
          <View>
            <Text variant="caption" weight="medium" className="mb-1">
              Notes
            </Text>
            <TextInput
              value={familyTimeNotes}
              onChangeText={setFamilyTimeNotes}
              placeholder="Any relevant family-time considerations..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50 min-h-[80px]"
            />
          </View>
        </CardContent>
      </Card>

      {/* Referral Governance */}
      <Card variant="elevated" className="mb-4">
        <CardContent>
          <Text variant="body" weight="semibold" className="mb-3">
            Referral Governance
          </Text>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Date of Referral Request
            </Text>
            <TextInput
              value={referralRequestDate}
              onChangeText={setReferralRequestDate}
              placeholder="YYYY-MM-DD"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Referral Completed By
            </Text>
            <TextInput
              value={completedByName}
              onChangeText={setCompletedByName}
              placeholder="Social worker name"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Contact Details
            </Text>
            <TextInput
              value={completedByContact}
              onChangeText={setCompletedByContact}
              placeholder="email or phone"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1 mr-4">
              <Text variant="body" weight="semibold">
                Manager Approval Granted
              </Text>
              <Text variant="caption" color="muted">
                Capture approval before sharing referral
              </Text>
            </View>
            <Switch
              value={managerApprovalGranted}
              onValueChange={setManagerApprovalGranted}
              trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
              thumbColor={managerApprovalGranted ? socialWorkerColor : '#9CA3AF'}
            />
          </View>
          <View className="mb-3">
            <Text variant="caption" weight="medium" className="mb-1">
              Approved By
            </Text>
            <TextInput
              value={managerApprovedBy}
              onChangeText={setManagerApprovedBy}
              placeholder="Manager name"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
          <View>
            <Text variant="caption" weight="medium" className="mb-1">
              Approval Date
            </Text>
            <TextInput
              value={managerApprovedAt}
              onChangeText={setManagerApprovedAt}
              placeholder="YYYY-MM-DD"
              className="border border-gray-300 rounded-lg px-3 py-2.5 text-base bg-gray-50"
            />
          </View>
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
            <Text className="text-white font-semibold ml-2">
              Create Child + Case & Find Placement
            </Text>
          </>
        )}
      </Pressable>

      {/* Save as Draft Button */}
      <Pressable
        onPress={handleSaveDraft}
        disabled={loading}
        className={`mt-3 py-4 rounded-xl items-center flex-row justify-center border-2 border-gray-300 bg-white ${loading ? 'opacity-50' : ''}`}
      >
        <Text className="text-gray-700 font-semibold">Save as Draft</Text>
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
    const { blockingIssues, warnings } = getReferralValidation();

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
              {childProfileId && (
                <Text variant="caption" className="text-social-worker-700">
                  • Child profile attached
                </Text>
              )}
            </View>
          </CardContent>
        </Card>

        {/* Referral Review */}
        <Card variant="elevated" className="mb-4">
          <CardContent>
            <Text variant="body" weight="semibold" className="mb-2">
              Referral Review
            </Text>
            <Text variant="caption" color="muted" className="mb-3">
              Check governance and safeguarding completeness before sending
            </Text>
            <View className="gap-1 mb-3">
              <Text variant="caption" className="text-gray-700">
                • Completed by: {completedByName.trim() || 'Not provided'}
              </Text>
              <Text variant="caption" className="text-gray-700">
                • Contact: {completedByContact.trim() || 'Not provided'}
              </Text>
              <Text variant="caption" className="text-gray-700">
                • Manager approval: {managerApprovalGranted ? 'Granted' : 'Not granted'}
              </Text>
              <Text variant="caption" className="text-gray-700">
                • Approved by: {managerApprovedBy.trim() || 'Not provided'}
              </Text>
              <Text variant="caption" className="text-gray-700">
                • Approval date: {managerApprovedAt.trim() || 'Not provided'}
              </Text>
            </View>
            {blockingIssues.length > 0 && (
              <View className="bg-red-50 rounded-lg p-3 mb-2">
                <Text variant="caption" weight="semibold" className="text-red-700 mb-1">
                  Must Fix Before Send
                </Text>
                {blockingIssues.map((issue) => (
                  <Text key={issue} variant="caption" className="text-red-700">
                    • {issue}
                  </Text>
                ))}
              </View>
            )}
            {warnings.length > 0 && (
              <View className="bg-yellow-50 rounded-lg p-3">
                <Text variant="caption" weight="semibold" className="text-yellow-700 mb-1">
                  Warnings
                </Text>
                {warnings.map((warning) => (
                  <Text key={warning} variant="caption" className="text-yellow-700">
                    • {warning}
                  </Text>
                ))}
              </View>
            )}
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
