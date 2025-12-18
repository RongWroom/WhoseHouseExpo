import React, { useState } from 'react';
import { ScrollView, View, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { Screen } from '../../src/components/ui/Screen';
import { Card } from '../../src/components/ui/Card';
import { Text } from '../../src/components/ui/Text';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Alert } from '../../src/components/ui/Alert';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { useAuth } from '../../src/contexts/AuthContext';
import { createUserAccount } from '../../src/lib/supabase';
import { validateEmail, validatePassword } from '../../src/utils/validation';
import { router } from 'expo-router';
import { UserPlus, Mail, User, Phone, Shield } from 'lucide-react-native';

export default function CreateUser() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phoneNumber: '',
    role: 'social_worker' as 'social_worker' | 'foster_carer' | 'admin',
    temporaryPassword: '',
  });

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, temporaryPassword: password });
  };

  const handleCreateUser = async () => {
    setError(null);
    setSuccess(null);

    // Validate inputs
    if (!formData.email || !formData.fullName) {
      setError('Please fill in all required fields');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.temporaryPassword) {
      setError('Please generate a temporary password');
      return;
    }

    if (!validatePassword(formData.temporaryPassword)) {
      setError('Password does not meet security requirements');
      return;
    }

    setIsLoading(true);

    const { data, error: createError } = await createUserAccount({
      email: formData.email,
      fullName: formData.fullName,
      role: formData.role,
      organizationId: profile?.organization_id || '',
      phoneNumber: formData.phoneNumber || undefined,
    });

    setIsLoading(false);

    if (createError) {
      setError(createError.message);
    } else if (data) {
      setSuccess(`User created successfully! User ID: ${data.userId}`);
      // Reset form
      setFormData({
        email: '',
        fullName: '',
        phoneNumber: '',
        role: 'social_worker',
        temporaryPassword: '',
      });

      // Navigate to users list after a delay
      setTimeout(() => {
        router.push('/(admin)/users');
      }, 2000);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-orange-500';
      case 'social_worker':
        return 'bg-blue-500';
      case 'foster_carer':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-5">
            <Card className="mb-4 p-5 bg-orange-50">
              <View className="flex-row items-center">
                <UserPlus size={24} color="#FF9500" />
                <Text className="text-xl font-bold text-gray-900 ml-2">Create New User</Text>
              </View>
              <Text className="text-gray-600 mt-2">Add a new user to your organization</Text>
            </Card>

            {error && <Alert variant="danger" message={error} className="mb-4" />}
            {success && <Alert variant="success" message={success} className="mb-4" />}

            <Card className="p-5">
              <View className="space-y-4">
                {/* Full Name */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Full Name <Text className="text-red-500">*</Text>
                  </Text>
                  <View className="relative">
                    <View className="absolute left-3 top-3.5 z-10">
                      <User size={20} color="#6B7280" />
                    </View>
                    <Input
                      value={formData.fullName}
                      onChangeText={(text) => setFormData({ ...formData, fullName: text })}
                      placeholder="Enter full name"
                      className="pl-10"
                    />
                  </View>
                </View>

                {/* Email */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Email Address <Text className="text-red-500">*</Text>
                  </Text>
                  <View className="relative">
                    <View className="absolute left-3 top-3.5 z-10">
                      <Mail size={20} color="#6B7280" />
                    </View>
                    <Input
                      value={formData.email}
                      onChangeText={(text) => setFormData({ ...formData, email: text })}
                      placeholder="user@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="pl-10"
                    />
                  </View>
                </View>

                {/* Phone Number */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">Phone Number</Text>
                  <View className="relative">
                    <View className="absolute left-3 top-3.5 z-10">
                      <Phone size={20} color="#6B7280" />
                    </View>
                    <Input
                      value={formData.phoneNumber}
                      onChangeText={(text) => setFormData({ ...formData, phoneNumber: text })}
                      placeholder="+44 7XXX XXXXXX"
                      keyboardType="phone-pad"
                      className="pl-10"
                    />
                  </View>
                </View>

                {/* Role Selection */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    User Role <Text className="text-red-500">*</Text>
                  </Text>
                  <View className="flex-row space-x-2">
                    {(['social_worker', 'foster_carer', 'admin'] as const).map((role) => (
                      <TouchableOpacity
                        key={role}
                        onPress={() => setFormData({ ...formData, role })}
                        className={`flex-1 p-3 rounded-lg items-center ${
                          formData.role === role ? getRoleColor(role) : 'bg-gray-200'
                        }`}
                      >
                        <Shield size={20} color={formData.role === role ? '#FFFFFF' : '#6B7280'} />
                        <Text
                          className={`text-xs mt-1 font-medium ${
                            formData.role === role ? 'text-white' : 'text-gray-700'
                          }`}
                        >
                          {role === 'social_worker'
                            ? 'Social Worker'
                            : role === 'foster_carer'
                              ? 'Foster Carer'
                              : 'Admin'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Temporary Password */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Temporary Password <Text className="text-red-500">*</Text>
                  </Text>
                  <View className="flex-row space-x-2">
                    <Input
                      value={formData.temporaryPassword}
                      onChangeText={(text) => setFormData({ ...formData, temporaryPassword: text })}
                      placeholder="Generate or enter password"
                      className="flex-1"
                      secureTextEntry
                    />
                    <Button onPress={generateTempPassword} variant="outline" size="md">
                      <Text className="text-gray-700 font-medium">Generate</Text>
                    </Button>
                  </View>
                  <Text className="text-xs text-gray-500 mt-1">
                    User will be required to change this on first login
                  </Text>
                </View>

                {/* Submit Button */}
                <View className="pt-4">
                  <Button onPress={handleCreateUser} disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <LoadingSpinner size="small" color="white" />
                    ) : (
                      <Text className="text-white font-semibold text-base">
                        Create User Account
                      </Text>
                    )}
                  </Button>
                </View>
              </View>
            </Card>

            {/* Info Card */}
            <Card className="mt-4 p-4 bg-blue-50">
              <Text className="text-sm text-blue-900 font-medium mb-1">Important Notes:</Text>
              <Text className="text-xs text-blue-800">
                • The temporary password should be shared securely with the user{'\n'}• Users must
                change their password on first login{'\n'}• Email verification may be required based
                on settings
              </Text>
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
