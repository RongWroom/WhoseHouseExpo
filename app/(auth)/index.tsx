import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      Alert.alert('Login Failed', error.message);
    }
    // If successful, AuthContext will handle navigation
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          // eslint-disable-next-line react-native/no-inline-styles
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center mb-10">
            <Text className="text-3xl font-bold text-gray-800 mb-2">Whose House</Text>
            <Text className="text-base text-gray-600">Secure Foster Care Communication</Text>
          </View>

          <View className="bg-white rounded-xl p-5 shadow-sm">
            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Email</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            <View className="mb-5">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Password</Text>
              <TextInput
                className="border border-gray-300 rounded-lg px-3 py-3 text-base bg-gray-50"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              className={`bg-blue-500 rounded-lg py-3.5 items-center mt-2.5 ${isLoading ? 'opacity-60' : ''}`}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-base font-semibold">Sign In</Text>
              )}
            </TouchableOpacity>

            <Link href="/(auth)/reset-password" asChild>
              <TouchableOpacity className="mt-5 items-center">
                <Text className="text-blue-500 text-sm">Forgot Password?</Text>
              </TouchableOpacity>
            </Link>

            <View className="flex-row justify-center mt-5">
              <Text className="text-sm text-gray-600">Don't have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity>
                  <Text className="text-sm text-blue-500 font-semibold">Sign Up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
          <View className="mt-8 items-center">
            <Text className="text-xs text-gray-600 text-center">
              For children: Access via secure link from your social worker
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
