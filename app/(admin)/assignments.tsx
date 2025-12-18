import React, { useEffect, useState } from 'react';
import { ScrollView, View, TouchableOpacity } from 'react-native';
import { Screen } from '../../src/components/ui/Screen';
import { Card } from '../../src/components/ui/Card';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Alert } from '../../src/components/ui/Alert';
import { LoadingSpinner } from '../../src/components/ui/LoadingSpinner';
import { Badge } from '../../src/components/ui/Badge';
import { listOrganizationUsers, assignSocialWorkerToCarer } from '../../src/lib/supabase';
import { Link, Briefcase, Home, Plus, CheckCircle } from 'lucide-react-native';

interface UserOption {
  id: string;
  fullName: string;
  email: string;
  activeCaseCount: number;
}

export default function Assignments() {
  const [socialWorkers, setSocialWorkers] = useState<UserOption[]>([]);
  const [fosterCarers, setFosterCarers] = useState<UserOption[]>([]);
  const [selectedSocialWorker, setSelectedSocialWorker] = useState<string | null>(null);
  const [selectedFosterCarer, setSelectedFosterCarer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    // Fetch social workers
    const { data: swData, error: swError } = await listOrganizationUsers({
      roleFilter: 'social_worker',
      activeOnly: true,
    });

    if (swError) {
      setError('Failed to load social workers');
    } else if (swData) {
      setSocialWorkers(
        swData.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          activeCaseCount: user.activeCaseCount,
        })),
      );
    }

    // Fetch foster carers
    const { data: fcData, error: fcError } = await listOrganizationUsers({
      roleFilter: 'foster_carer',
      activeOnly: true,
    });

    if (fcError) {
      setError('Failed to load foster carers');
    } else if (fcData) {
      setFosterCarers(
        fcData.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          activeCaseCount: user.activeCaseCount,
        })),
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateAssignment = async () => {
    if (!selectedSocialWorker || !selectedFosterCarer) {
      setError('Please select both a social worker and a foster carer');
      return;
    }

    setIsAssigning(true);
    setError(null);
    setSuccess(null);

    const caseNumber = `CASE-${Date.now().toString(36).toUpperCase()}`;

    const { data, error: assignError } = await assignSocialWorkerToCarer({
      socialWorkerId: selectedSocialWorker,
      fosterCarerId: selectedFosterCarer,
      caseNumber,
    });

    if (assignError) {
      setError(assignError.message);
    } else if (data) {
      setSuccess(`Assignment created successfully! Case ID: ${data.caseId}`);
      setSelectedSocialWorker(null);
      setSelectedFosterCarer(null);
      // Refresh the lists to update case counts
      fetchUsers();
    }

    setIsAssigning(false);
  };

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5">
          <Card className="mb-4 p-5 bg-orange-50">
            <View className="flex-row items-center">
              <Link size={24} color="#FF9500" />
              <Text className="text-xl font-bold text-gray-900 ml-2">Case Assignments</Text>
            </View>
            <Text className="text-gray-600 mt-2">Assign social workers to foster carers</Text>
          </Card>

          {error && <Alert variant="danger" message={error} className="mb-4" />}
          {success && <Alert variant="success" message={success} className="mb-4" />}

          {/* Social Worker Selection */}
          <Card className="mb-4 p-4">
            <View className="flex-row items-center mb-3">
              <Briefcase size={20} color="#007AFF" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">Select Social Worker</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-2">
                {socialWorkers.map((sw) => (
                  <TouchableOpacity
                    key={sw.id}
                    onPress={() => setSelectedSocialWorker(sw.id)}
                    className={`p-3 rounded-lg border-2 min-w-[150px] ${
                      selectedSocialWorker === sw.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {selectedSocialWorker === sw.id && (
                      <View className="absolute right-2 top-2">
                        <CheckCircle size={16} color="#007AFF" />
                      </View>
                    )}
                    <Text className="font-medium text-gray-900">{sw.fullName}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{sw.email}</Text>
                    <Badge variant="primary" className="mt-2">
                      <Text className="text-xs text-white">{sw.activeCaseCount} Active Cases</Text>
                    </Badge>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Card>

          {/* Foster Carer Selection */}
          <Card className="mb-4 p-4">
            <View className="flex-row items-center mb-3">
              <Home size={20} color="#34C759" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">Select Foster Carer</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-2">
                {fosterCarers.map((fc) => (
                  <TouchableOpacity
                    key={fc.id}
                    onPress={() => setSelectedFosterCarer(fc.id)}
                    className={`p-3 rounded-lg border-2 min-w-[150px] ${
                      selectedFosterCarer === fc.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    {selectedFosterCarer === fc.id && (
                      <View className="absolute right-2 top-2">
                        <CheckCircle size={16} color="#34C759" />
                      </View>
                    )}
                    <Text className="font-medium text-gray-900">{fc.fullName}</Text>
                    <Text className="text-xs text-gray-500 mt-1">{fc.email}</Text>
                    <Badge variant="success" className="mt-2">
                      <Text className="text-xs text-white">
                        {fc.activeCaseCount === 0
                          ? 'Available'
                          : `${fc.activeCaseCount} Active Case`}
                      </Text>
                    </Badge>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Card>

          {/* Assignment Summary */}
          {(selectedSocialWorker || selectedFosterCarer) && (
            <Card className="mb-4 p-4 bg-gray-50">
              <Text className="text-sm font-medium text-gray-700 mb-2">Assignment Preview</Text>
              <View className="space-y-2">
                {selectedSocialWorker && (
                  <View className="flex-row items-center">
                    <Briefcase size={16} color="#007AFF" />
                    <Text className="ml-2 text-sm text-gray-700">
                      Social Worker:{' '}
                      <Text className="font-medium">
                        {socialWorkers.find((sw) => sw.id === selectedSocialWorker)?.fullName}
                      </Text>
                    </Text>
                  </View>
                )}
                {selectedFosterCarer && (
                  <View className="flex-row items-center">
                    <Home size={16} color="#34C759" />
                    <Text className="ml-2 text-sm text-gray-700">
                      Foster Carer:{' '}
                      <Text className="font-medium">
                        {fosterCarers.find((fc) => fc.id === selectedFosterCarer)?.fullName}
                      </Text>
                    </Text>
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Create Assignment Button */}
          <Button
            onPress={handleCreateAssignment}
            disabled={isAssigning || !selectedSocialWorker || !selectedFosterCarer}
            className="w-full"
          >
            {isAssigning ? (
              <LoadingSpinner size="small" color="white" />
            ) : (
              <View className="flex-row items-center">
                <Plus size={20} color="#FFFFFF" />
                <Text className="text-white font-semibold text-base ml-2">Create Assignment</Text>
              </View>
            )}
          </Button>

          {/* Info Card */}
          <Card className="mt-4 p-4 bg-blue-50">
            <Text className="text-sm text-blue-900 font-medium mb-1">Assignment Notes:</Text>
            <Text className="text-xs text-blue-800">
              • Existing active cases for a foster carer will be automatically closed{'\n'}• Foster
              carers can only have one active case at a time{'\n'}• Social workers can manage
              multiple cases simultaneously{'\n'}• Case numbers are automatically generated
            </Text>
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}
