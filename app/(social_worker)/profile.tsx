import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  User,
  Building2,
  MapPin,
  Shield,
  Calendar,
  Clock,
  GraduationCap,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Screen, Card, CardContent, Text, Input, Divider } from '../../src/components/ui';
import { THEME } from '../../src/lib/theme';

// Types for the social worker profile
interface SocialWorkerProfile {
  id?: string;
  profile_id: string;
  employer_name: string | null;
  team_name: string | null;
  office_location: string | null;
  manager_name: string | null;
  work_phone: string | null;
  swe_registration_number: string | null;
  swe_registration_expiry: string | null;
  dbs_certificate_date: string | null;
  dbs_update_service: boolean;
  working_days: string[];
  working_hours_start: string | null;
  working_hours_end: string | null;
  is_on_leave: boolean;
  leave_start_date: string | null;
  leave_end_date: string | null;
  out_of_office_message: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  service_areas: string[] | null;
  qualifications: Qualification[];
  bio: string | null;
  specialisms: string[] | null;
}

interface Qualification {
  name: string;
  institution: string;
  year: string;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

function getInitials(fullName?: string | null) {
  if (!fullName) return '';
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function isDateExpiringSoon(dateString: string | null, daysThreshold = 30): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = date.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= daysThreshold;
}

function isDateExpired(dateString: string | null): boolean {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date < new Date();
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="mb-4">
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        className="flex-row items-center justify-between p-4"
        accessibilityRole="button"
        accessibilityLabel={`${title} section, ${isOpen ? 'expanded' : 'collapsed'}`}
      >
        <View className="flex-row items-center">
          <Icon size={20} color={THEME.roles.socialWorker.primary} />
          <Text variant="body" weight="semibold" className="ml-3">
            {title}
          </Text>
        </View>
        {isOpen ? <ChevronUp size={20} color="#666" /> : <ChevronDown size={20} color="#666" />}
      </TouchableOpacity>
      {isOpen && (
        <>
          <Divider />
          <CardContent>{children}</CardContent>
        </>
      )}
    </Card>
  );
}

export default function SocialWorkerProfileScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  const [swProfile, setSwProfile] = useState<SocialWorkerProfile>({
    profile_id: user?.id || '',
    employer_name: null,
    team_name: null,
    office_location: null,
    manager_name: null,
    work_phone: null,
    swe_registration_number: null,
    swe_registration_expiry: null,
    dbs_certificate_date: null,
    dbs_update_service: false,
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    working_hours_start: '09:00',
    working_hours_end: '17:00',
    is_on_leave: false,
    leave_start_date: null,
    leave_end_date: null,
    out_of_office_message: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    service_areas: null,
    qualifications: [],
    bio: null,
    specialisms: null,
  });

  // Get avatar URL
  const avatarUrl = localAvatarUri || (profile as any)?.metadata?.avatarUrl || null;

  // Load profile data
  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // First, ensure the profile exists (creates if not)
      await (supabase.rpc as any)('get_or_create_sw_profile', { p_profile_id: user.id });

      // Then fetch the profile
      const { data, error } = await supabase
        .from('social_worker_profiles')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading SW profile:', error);
      }

      if (data) {
        setSwProfile({
          ...swProfile,
          ...(data as SocialWorkerProfile),
          qualifications: (data as SocialWorkerProfile).qualifications || [],
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = useCallback((field: keyof SocialWorkerProfile, value: any) => {
    setSwProfile((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const toggleWorkingDay = useCallback((day: string) => {
    setSwProfile((prev) => {
      const days = prev.working_days || [];
      const newDays = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
      return { ...prev, working_days: newDays };
    });
    setHasChanges(true);
  }, []);

  const saveProfile = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      const { error } = await (supabase.from('social_worker_profiles') as any)
        .upsert({
          ...swProfile,
          profile_id: user.id,
        })
        .eq('profile_id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Your profile has been updated.');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const pickProfilePhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('ImagePicker error:', error);
      Alert.alert('Error', 'Failed to open image picker.');
    }
  };

  const uploadProfilePhoto = async (uri: string) => {
    if (!user) return;

    setIsUploading(true);
    setLocalAvatarUri(uri);

    try {
      const currentMetadata = (profile as any)?.metadata || {};
      const { error } = await (supabase.from('profiles') as any)
        .update({
          metadata: { ...currentMetadata, avatarUrl: uri },
        })
        .eq('id', user.id);

      if (error) throw error;
      if (refreshProfile) await refreshProfile();
    } catch (error) {
      console.error('Failed to update photo:', error);
      Alert.alert('Error', 'Failed to update profile photo.');
      setLocalAvatarUri(null);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <Screen backgroundColor="bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={THEME.roles.socialWorker.primary} />
          <Text variant="body" color="muted" className="mt-4">
            Loading profile...
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor="bg-gray-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Compact Header */}
        <View className="bg-white border-b border-gray-200 px-4 pt-12 pb-3">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-3 p-2 -ml-2"
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={24} color="#374151" />
            </TouchableOpacity>
            <Text className="text-gray-900 text-lg font-semibold flex-1">Edit Profile</Text>
            {hasChanges && (
              <TouchableOpacity
                onPress={saveProfile}
                disabled={isSaving}
                className="bg-social-worker-500 px-4 py-2 rounded-lg flex-row items-center"
                accessibilityRole="button"
                accessibilityLabel="Save changes"
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold">Save</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView className="flex-1">
          <View className="p-4">
            {/* Profile Card with Avatar */}
            <Card className="mb-4">
              <CardContent>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={pickProfilePhoto}
                    disabled={isUploading}
                    className="relative"
                    accessibilityRole="button"
                    accessibilityLabel="Change profile photo"
                  >
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        className="w-16 h-16 rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-16 h-16 rounded-full bg-social-worker-100 items-center justify-center">
                        {getInitials(profile?.full_name) ? (
                          <Text className="text-social-worker-600 text-xl font-bold">
                            {getInitials(profile?.full_name)}
                          </Text>
                        ) : (
                          <User size={28} color={THEME.roles.socialWorker.primary} />
                        )}
                      </View>
                    )}
                    <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-social-worker-500 items-center justify-center border-2 border-white">
                      {isUploading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Camera size={12} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <View className="ml-4 flex-1">
                    <Text variant="body" weight="semibold" className="text-gray-900">
                      {profile?.full_name || 'Social Worker'}
                    </Text>
                    <Text variant="caption" color="muted">
                      {profile?.email}
                    </Text>
                  </View>
                </View>
              </CardContent>
            </Card>
            {/* Registration Status Banner */}
            {swProfile.swe_registration_expiry && (
              <View
                className={`rounded-xl p-4 mb-4 flex-row items-center ${
                  isDateExpired(swProfile.swe_registration_expiry)
                    ? 'bg-red-100'
                    : isDateExpiringSoon(swProfile.swe_registration_expiry)
                      ? 'bg-amber-100'
                      : 'bg-green-100'
                }`}
              >
                {isDateExpired(swProfile.swe_registration_expiry) ? (
                  <AlertTriangle size={20} color="#DC2626" />
                ) : isDateExpiringSoon(swProfile.swe_registration_expiry) ? (
                  <AlertTriangle size={20} color="#D97706" />
                ) : (
                  <Check size={20} color="#16A34A" />
                )}
                <View className="ml-3 flex-1">
                  <Text
                    variant="caption"
                    weight="semibold"
                    className={
                      isDateExpired(swProfile.swe_registration_expiry)
                        ? 'text-red-800'
                        : isDateExpiringSoon(swProfile.swe_registration_expiry)
                          ? 'text-amber-800'
                          : 'text-green-800'
                    }
                  >
                    {isDateExpired(swProfile.swe_registration_expiry)
                      ? 'SWE Registration Expired'
                      : isDateExpiringSoon(swProfile.swe_registration_expiry)
                        ? 'SWE Registration Expiring Soon'
                        : 'SWE Registration Valid'}
                  </Text>
                  <Text variant="caption" color="muted">
                    Expires: {formatDate(swProfile.swe_registration_expiry)}
                  </Text>
                </View>
              </View>
            )}

            {/* Employment Section */}
            <CollapsibleSection title="Employment Details" icon={Building2} defaultOpen>
              <View className="space-y-4">
                <View>
                  <Text variant="label" color="muted" className="mb-1">
                    Employer / Local Authority
                  </Text>
                  <Input
                    value={swProfile.employer_name || ''}
                    onChangeText={(v) => updateField('employer_name', v)}
                    placeholder="e.g., Manchester City Council"
                  />
                </View>

                <View className="mt-4">
                  <Text variant="label" color="muted" className="mb-1">
                    Team Name
                  </Text>
                  <Input
                    value={swProfile.team_name || ''}
                    onChangeText={(v) => updateField('team_name', v)}
                    placeholder="e.g., Fostering Team"
                  />
                </View>

                <View className="mt-4">
                  <Text variant="label" color="muted" className="mb-1">
                    Office Location
                  </Text>
                  <Input
                    value={swProfile.office_location || ''}
                    onChangeText={(v) => updateField('office_location', v)}
                    placeholder="e.g., Town Hall, Albert Square"
                  />
                </View>

                <View className="mt-4">
                  <Text variant="label" color="muted" className="mb-1">
                    Line Manager
                  </Text>
                  <Input
                    value={swProfile.manager_name || ''}
                    onChangeText={(v) => updateField('manager_name', v)}
                    placeholder="Manager's name"
                  />
                </View>

                <View className="mt-4">
                  <Text variant="label" color="muted" className="mb-1">
                    Work Mobile
                  </Text>
                  <Input
                    value={swProfile.work_phone || ''}
                    onChangeText={(v) => updateField('work_phone', v)}
                    placeholder="07XXX XXXXXX"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </CollapsibleSection>

            {/* Professional Registration Section */}
            <CollapsibleSection title="Professional Registration" icon={Shield} defaultOpen>
              <View className="space-y-4">
                <View>
                  <Text variant="label" color="muted" className="mb-1">
                    SWE Registration Number
                  </Text>
                  <Input
                    value={swProfile.swe_registration_number || ''}
                    onChangeText={(v) => updateField('swe_registration_number', v)}
                    placeholder="e.g., SW12345"
                  />
                  <Text variant="caption" color="muted" className="mt-1">
                    Your Social Work England registration number
                  </Text>
                </View>

                <View className="mt-4">
                  <Text variant="label" color="muted" className="mb-1">
                    SWE Registration Expiry
                  </Text>
                  <Input
                    value={swProfile.swe_registration_expiry || ''}
                    onChangeText={(v) => updateField('swe_registration_expiry', v)}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <Divider className="my-4" />

                <View>
                  <Text variant="label" color="muted" className="mb-1">
                    DBS Certificate Date
                  </Text>
                  <Input
                    value={swProfile.dbs_certificate_date || ''}
                    onChangeText={(v) => updateField('dbs_certificate_date', v)}
                    placeholder="YYYY-MM-DD"
                  />
                  <Text variant="caption" color="muted" className="mt-1">
                    Enhanced DBS with barred list check
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => updateField('dbs_update_service', !swProfile.dbs_update_service)}
                  className="flex-row items-center mt-4"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: swProfile.dbs_update_service }}
                >
                  <View
                    className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${
                      swProfile.dbs_update_service
                        ? 'bg-social-worker-500 border-social-worker-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {swProfile.dbs_update_service && <Check size={16} color="white" />}
                  </View>
                  <Text variant="body">Registered with DBS Update Service</Text>
                </TouchableOpacity>
              </View>
            </CollapsibleSection>

            {/* Working Pattern Section */}
            <CollapsibleSection title="Working Pattern" icon={Clock}>
              <View>
                <Text variant="label" color="muted" className="mb-2">
                  Working Days
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <TouchableOpacity
                      key={day.key}
                      onPress={() => toggleWorkingDay(day.key)}
                      className={`px-4 py-2 rounded-full ${
                        swProfile.working_days?.includes(day.key)
                          ? 'bg-social-worker-500'
                          : 'bg-gray-200'
                      }`}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: swProfile.working_days?.includes(day.key) }}
                      accessibilityLabel={day.label}
                    >
                      <Text
                        className={
                          swProfile.working_days?.includes(day.key) ? 'text-white' : 'text-gray-600'
                        }
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="flex-row mt-4 gap-4">
                  <View className="flex-1">
                    <Text variant="label" color="muted" className="mb-1">
                      Start Time
                    </Text>
                    <Input
                      value={swProfile.working_hours_start || ''}
                      onChangeText={(v) => updateField('working_hours_start', v)}
                      placeholder="09:00"
                    />
                  </View>
                  <View className="flex-1">
                    <Text variant="label" color="muted" className="mb-1">
                      End Time
                    </Text>
                    <Input
                      value={swProfile.working_hours_end || ''}
                      onChangeText={(v) => updateField('working_hours_end', v)}
                      placeholder="17:00"
                    />
                  </View>
                </View>
              </View>
            </CollapsibleSection>

            {/* Availability Section */}
            <CollapsibleSection title="Availability & Cover" icon={Calendar}>
              <View>
                <TouchableOpacity
                  onPress={() => updateField('is_on_leave', !swProfile.is_on_leave)}
                  className="flex-row items-center mb-4"
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: swProfile.is_on_leave }}
                >
                  <View
                    className={`w-6 h-6 rounded border-2 items-center justify-center mr-3 ${swProfile.is_on_leave ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}
                  >
                    {swProfile.is_on_leave && <Check size={16} color="white" />}
                  </View>
                  <Text variant="body">Currently on leave / unavailable</Text>
                </TouchableOpacity>

                {swProfile.is_on_leave && (
                  <>
                    <View className="flex-row gap-4 mb-4">
                      <View className="flex-1">
                        <Text variant="label" color="muted" className="mb-1">
                          Leave Start
                        </Text>
                        <Input
                          value={swProfile.leave_start_date || ''}
                          onChangeText={(v) => updateField('leave_start_date', v)}
                          placeholder="YYYY-MM-DD"
                        />
                      </View>
                      <View className="flex-1">
                        <Text variant="label" color="muted" className="mb-1">
                          Leave End
                        </Text>
                        <Input
                          value={swProfile.leave_end_date || ''}
                          onChangeText={(v) => updateField('leave_end_date', v)}
                          placeholder="YYYY-MM-DD"
                        />
                      </View>
                    </View>

                    <View className="mb-4">
                      <Text variant="label" color="muted" className="mb-1">
                        Out of Office Message
                      </Text>
                      <Input
                        value={swProfile.out_of_office_message || ''}
                        onChangeText={(v) => updateField('out_of_office_message', v)}
                        placeholder="I am currently out of the office..."
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  </>
                )}

                <Divider className="my-4" />

                <Text variant="body" weight="semibold" className="mb-3">
                  Emergency Cover Contact
                </Text>
                <View>
                  <Text variant="label" color="muted" className="mb-1">
                    Duty Team / Cover Name
                  </Text>
                  <Input
                    value={swProfile.emergency_contact_name || ''}
                    onChangeText={(v) => updateField('emergency_contact_name', v)}
                    placeholder="e.g., Duty Team"
                  />
                </View>
                <View className="mt-4">
                  <Text variant="label" color="muted" className="mb-1">
                    Emergency Contact Number
                  </Text>
                  <Input
                    value={swProfile.emergency_contact_phone || ''}
                    onChangeText={(v) => updateField('emergency_contact_phone', v)}
                    placeholder="0161 XXX XXXX"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </CollapsibleSection>

            {/* Service Area Section */}
            <CollapsibleSection title="Service Area" icon={MapPin}>
              <View>
                <Text variant="label" color="muted" className="mb-1">
                  Areas / Regions Served
                </Text>
                <Input
                  value={swProfile.service_areas?.join(', ') || ''}
                  onChangeText={(v) =>
                    updateField(
                      'service_areas',
                      v
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="e.g., North Manchester, Salford"
                />
                <Text variant="caption" color="muted" className="mt-1">
                  Separate multiple areas with commas
                </Text>
              </View>
            </CollapsibleSection>

            {/* Qualifications Section */}
            <CollapsibleSection title="Qualifications" icon={GraduationCap}>
              <View>
                <Text variant="label" color="muted" className="mb-1">
                  Professional Bio
                </Text>
                <Input
                  value={swProfile.bio || ''}
                  onChangeText={(v) => updateField('bio', v)}
                  placeholder="A short introduction about yourself..."
                  multiline
                  numberOfLines={4}
                />
                <Text variant="caption" color="muted" className="mt-1">
                  This may be visible to foster carers and children
                </Text>

                <Divider className="my-4" />

                <Text variant="label" color="muted" className="mb-1">
                  Specialisms
                </Text>
                <Input
                  value={swProfile.specialisms?.join(', ') || ''}
                  onChangeText={(v) =>
                    updateField(
                      'specialisms',
                      v
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    )
                  }
                  placeholder="e.g., Adolescents, Sibling groups, Therapeutic fostering"
                />
                <Text variant="caption" color="muted" className="mt-1">
                  Separate multiple specialisms with commas
                </Text>
              </View>
            </CollapsibleSection>

            {/* Bottom spacing */}
            <View className="h-24" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
