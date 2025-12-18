import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, User, Phone, Heart, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';
import { Screen, Card, CardContent, Text } from '../../src/components/ui';
import { THEME } from '../../src/lib/theme';
import { Household } from '../../src/types/database';

function getInitials(fullName?: string | null) {
  if (!fullName) return '';
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export default function FosterCarerProfileScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);

  // Profile fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');

  // Household address fields (only for primary carer)
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');

  const isPrimaryCarer = profile?.is_primary_carer === true;
  const avatarUrl = localAvatarUri || (profile as any)?.metadata?.avatarUrl || null;

  // Load data on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const loadData = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      // Set profile fields
      setPhoneNumber(profile.phone_number || '');
      setEmergencyName(profile.emergency_contact_name || '');
      setEmergencyPhone(profile.emergency_contact_phone || '');
      setEmergencyRelationship(profile.emergency_contact_relationship || '');

      // Fetch household if exists
      if (profile.household_id) {
        const { data, error } = await supabase
          .from('households')
          .select('*')
          .eq('id', profile.household_id)
          .single();

        if (!error && data) {
          const householdData = data as Household;
          setHousehold(householdData);
          setAddressLine1(householdData.address_line1 || '');
          setAddressLine2(householdData.address_line2 || '');
          setCity(householdData.city || '');
          setPostcode(householdData.postcode || '');
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setHasChanges(true);
  };

  const saveProfile = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      // Update profile
      const { error: profileError } = await (supabase.from('profiles') as any)
        .update({
          phone_number: phoneNumber.trim() || null,
          emergency_contact_name: emergencyName.trim() || null,
          emergency_contact_phone: emergencyPhone.trim() || null,
          emergency_contact_relationship: emergencyRelationship.trim() || null,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Update household address if primary carer
      if (isPrimaryCarer && profile.household_id) {
        const { error: householdError } = await (supabase.from('households') as any)
          .update({
            address_line1: addressLine1.trim() || null,
            address_line2: addressLine2.trim() || null,
            city: city.trim() || null,
            postcode: postcode.trim() || null,
          })
          .eq('id', profile.household_id);

        if (householdError) throw householdError;
      }

      // Refresh profile
      if (refreshProfile) {
        await refreshProfile();
      }

      Alert.alert('Success', 'Your profile has been updated.');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save your changes. Please try again.');
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
          <ActivityIndicator size="large" color={THEME.roles.fosterCarer.primary} />
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
                className="bg-foster-carer-500 px-4 py-2 rounded-lg flex-row items-center"
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
                      <View className="w-16 h-16 rounded-full bg-foster-carer-100 items-center justify-center">
                        {getInitials(profile?.full_name) ? (
                          <Text className="text-foster-carer-600 text-xl font-bold">
                            {getInitials(profile?.full_name)}
                          </Text>
                        ) : (
                          <User size={28} color={THEME.roles.fosterCarer.primary} />
                        )}
                      </View>
                    )}
                    <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-foster-carer-500 items-center justify-center border-2 border-white">
                      {isUploading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Camera size={12} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>
                  <View className="ml-4 flex-1">
                    <Text variant="body" weight="semibold" className="text-gray-900">
                      {profile?.full_name || 'Foster Carer'}
                    </Text>
                    <Text variant="caption" color="muted">
                      {profile?.email}
                    </Text>
                    {isPrimaryCarer && (
                      <View className="bg-foster-carer-100 px-2 py-0.5 rounded-full mt-1 self-start">
                        <Text className="text-foster-carer-700 text-xs font-medium">
                          Primary Carer
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </CardContent>
            </Card>
            {/* Contact Information */}
            <Card className="mb-4">
              <CardContent>
                <View className="flex-row items-center mb-4">
                  <Phone size={20} color={THEME.roles.fosterCarer.primary} />
                  <Text variant="body" weight="semibold" className="ml-3">
                    Contact Information
                  </Text>
                </View>

                <Text variant="label" color="muted" className="mb-1">
                  Phone Number
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50"
                  value={phoneNumber}
                  onChangeText={handleFieldChange(setPhoneNumber)}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                />
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="mb-4">
              <CardContent>
                <View className="flex-row items-center mb-4">
                  <Heart size={20} color="#EF4444" />
                  <Text variant="body" weight="semibold" className="ml-3">
                    Emergency Contact
                  </Text>
                </View>

                <Text variant="label" color="muted" className="mb-1">
                  Contact Name
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50 mb-4"
                  value={emergencyName}
                  onChangeText={handleFieldChange(setEmergencyName)}
                  placeholder="e.g., John Smith"
                  autoCapitalize="words"
                />

                <Text variant="label" color="muted" className="mb-1">
                  Contact Phone
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50 mb-4"
                  value={emergencyPhone}
                  onChangeText={handleFieldChange(setEmergencyPhone)}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />

                <Text variant="label" color="muted" className="mb-1">
                  Relationship
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50"
                  value={emergencyRelationship}
                  onChangeText={handleFieldChange(setEmergencyRelationship)}
                  placeholder="e.g., Spouse, Parent, Sibling"
                  autoCapitalize="words"
                />
              </CardContent>
            </Card>

            {/* Household Address - Only for Primary Carer */}
            {isPrimaryCarer && profile?.household_id && (
              <Card className="mb-4">
                <CardContent>
                  <View className="flex-row items-center mb-4">
                    <MapPin size={20} color={THEME.roles.fosterCarer.primary} />
                    <Text variant="body" weight="semibold" className="ml-3">
                      Household Address
                    </Text>
                  </View>

                  <Text variant="caption" color="muted" className="mb-3">
                    As the primary carer, you can update your household address.
                  </Text>

                  <Text variant="label" color="muted" className="mb-1">
                    Address Line 1
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50 mb-4"
                    value={addressLine1}
                    onChangeText={handleFieldChange(setAddressLine1)}
                    placeholder="Street address"
                    autoCapitalize="words"
                  />

                  <Text variant="label" color="muted" className="mb-1">
                    Address Line 2 (Optional)
                  </Text>
                  <TextInput
                    className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50 mb-4"
                    value={addressLine2}
                    onChangeText={handleFieldChange(setAddressLine2)}
                    placeholder="Apartment, suite, etc."
                    autoCapitalize="words"
                  />

                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Text variant="label" color="muted" className="mb-1">
                        City
                      </Text>
                      <TextInput
                        className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50"
                        value={city}
                        onChangeText={handleFieldChange(setCity)}
                        placeholder="City"
                        autoCapitalize="words"
                      />
                    </View>
                    <View className="flex-1">
                      <Text variant="label" color="muted" className="mb-1">
                        Postcode
                      </Text>
                      <TextInput
                        className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50"
                        value={postcode}
                        onChangeText={handleFieldChange(setPostcode)}
                        placeholder="Postcode"
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                </CardContent>
              </Card>
            )}

            {/* Non-primary carers see address in read-only */}
            {!isPrimaryCarer && household && (household.address_line1 || household.city) && (
              <Card className="mb-4">
                <CardContent>
                  <View className="flex-row items-center mb-3">
                    <MapPin size={20} color={THEME.roles.fosterCarer.primary} />
                    <Text variant="body" weight="semibold" className="ml-3">
                      Household Address
                    </Text>
                  </View>

                  <Text variant="body">
                    {[
                      household.address_line1,
                      household.address_line2,
                      household.city,
                      household.postcode,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>

                  <Text variant="caption" color="muted" className="mt-2">
                    Contact the primary carer to update the address.
                  </Text>
                </CardContent>
              </Card>
            )}

            {/* Bottom spacing */}
            <View className="h-24" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
