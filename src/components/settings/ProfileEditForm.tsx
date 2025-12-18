import React, { useState, useEffect } from 'react';
import { View, TextInput, Alert, ActivityIndicator, Pressable } from 'react-native';
import { Save, Phone, Heart, MapPin } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, Text } from '../ui';
import { THEME } from '../../lib/theme';
import { Household } from '../../types/database';

interface ProfileEditFormProps {
  accentColor?: string;
  onSave?: () => void;
}

export function ProfileEditForm({
  accentColor = THEME.roles.fosterCarer.primary,
  onSave,
}: ProfileEditFormProps) {
  const { profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingHousehold, setIsFetchingHousehold] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);

  // Profile fields
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [emergencyName, setEmergencyName] = useState(profile?.emergency_contact_name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(profile?.emergency_contact_phone || '');
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    profile?.emergency_contact_relationship || '',
  );

  // Household address fields (only for primary carer)
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postcode, setPostcode] = useState('');

  const isPrimaryCarer = profile?.is_primary_carer === true;

  // Fetch household data
  useEffect(() => {
    const fetchHousehold = async () => {
      if (!profile?.household_id) return;

      setIsFetchingHousehold(true);
      try {
        const { data, error } = await supabase
          .from('households')
          .select('*')
          .eq('id', profile.household_id)
          .single();

        if (error) {
          console.error('Failed to fetch household:', error);
        } else if (data) {
          const householdData = data as Household;
          setHousehold(householdData);
          setAddressLine1(householdData.address_line1 || '');
          setAddressLine2(householdData.address_line2 || '');
          setCity(householdData.city || '');
          setPostcode(householdData.postcode || '');
        }
      } catch (err) {
        console.error('Error fetching household:', err);
      } finally {
        setIsFetchingHousehold(false);
      }
    };

    fetchHousehold();
  }, [profile?.household_id]);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setPhoneNumber(profile.phone_number || '');
      setEmergencyName(profile.emergency_contact_name || '');
      setEmergencyPhone(profile.emergency_contact_phone || '');
      setEmergencyRelationship(profile.emergency_contact_relationship || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;

    setIsLoading(true);
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
      onSave?.();
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save your changes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetchingHousehold) {
    return (
      <Card>
        <CardContent className="items-center py-8">
          <ActivityIndicator size="small" color={accentColor} />
          <Text variant="caption" color="muted" className="mt-2">
            Loading profile...
          </Text>
        </CardContent>
      </Card>
    );
  }

  return (
    <View>
      {/* Contact Information */}
      <Card className="mb-4">
        <CardContent>
          <View className="flex-row items-center mb-4">
            <Phone size={18} color={accentColor} />
            <Text variant="body" weight="semibold" className="ml-2">
              Contact Information
            </Text>
          </View>

          <Text variant="label" color="muted" className="mb-1">
            Phone Number
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50 mb-4"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
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
            <Heart size={18} color="#EF4444" />
            <Text variant="body" weight="semibold" className="ml-2">
              Emergency Contact
            </Text>
          </View>

          <Text variant="label" color="muted" className="mb-1">
            Contact Name
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50 mb-4"
            value={emergencyName}
            onChangeText={setEmergencyName}
            placeholder="e.g., John Smith"
            autoCapitalize="words"
          />

          <Text variant="label" color="muted" className="mb-1">
            Contact Phone
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50 mb-4"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />

          <Text variant="label" color="muted" className="mb-1">
            Relationship
          </Text>
          <TextInput
            className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50"
            value={emergencyRelationship}
            onChangeText={setEmergencyRelationship}
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
              <MapPin size={18} color={accentColor} />
              <Text variant="body" weight="semibold" className="ml-2">
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
              onChangeText={setAddressLine1}
              placeholder="Street address"
              autoCapitalize="words"
            />

            <Text variant="label" color="muted" className="mb-1">
              Address Line 2 (Optional)
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50 mb-4"
              value={addressLine2}
              onChangeText={setAddressLine2}
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
                  onChangeText={setCity}
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
                  onChangeText={setPostcode}
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
              <MapPin size={18} color={accentColor} />
              <Text variant="body" weight="semibold" className="ml-2">
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

      {/* Save Button */}
      <Pressable
        onPress={handleSave}
        disabled={isLoading}
        className={`mt-2 flex-row items-center justify-center rounded-lg py-3.5 ${isLoading ? 'opacity-60' : ''}`}
        style={{ backgroundColor: accentColor }}
      >
        {!isLoading && <Save size={18} color="white" />}
        {isLoading && <ActivityIndicator size="small" color="white" />}
        <Text className="ml-2 text-white font-semibold text-base">
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Text>
      </Pressable>
    </View>
  );
}
