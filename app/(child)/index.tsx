import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { validateChildToken } from '../../src/lib/supabase';

export default function ChildAccessScreen() {
  const [token, setToken] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const router = useRouter();

  const handleTokenSubmit = async () => {
    if (!token.trim()) {
      Alert.alert('Error', 'Please enter your access code');
      return;
    }

    setIsValidating(true);
    try {
      const { data, error } = await validateChildToken(token);

      if (error) {
        Alert.alert('Invalid Code', 'The code you entered is not valid or has expired.');
      } else if (data) {
        // Navigate to the child view with the validated token
        router.push(`/(child)/access/${token}`);
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-child-50">
      <View className="flex-1 p-5 justify-center">
        <View className="items-center mb-8">
          <Text className="text-4xl font-bold text-child-800 mb-2">Whose House</Text>
          <Text className="text-lg text-child-600">Enter Your Special Code</Text>
        </View>

        <View className="bg-white rounded-3xl p-8 shadow-sm">
          <Text className="text-base text-gray-800 text-center mb-8 leading-6">
            Your social worker gave you a special code. Enter it below to see your page!
          </Text>

          <TextInput
            className="border-2 border-child-300 rounded-xl px-4 py-3.5 text-lg bg-child-50 mb-5 text-center"
            value={token}
            onChangeText={setToken}
            placeholder="Enter your code here"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isValidating}
          />

          <TouchableOpacity
            className={`bg-child-500 rounded-xl py-4 items-center ${isValidating ? 'opacity-60' : ''}`}
            onPress={handleTokenSubmit}
            disabled={isValidating}
          >
            {isValidating ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-lg font-bold">Go to My Page</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="mt-8 items-center">
          <Text className="text-sm text-gray-600 text-center">
            If you need help, ask your foster carer or social worker
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
