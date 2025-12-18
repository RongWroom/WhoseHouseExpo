import { View, ScrollView, ActivityIndicator, Alert, Share } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, Stack } from 'expo-router';
import { supabase, generateChildAccessToken } from '../../../src/lib/supabase';
import { DEEP_LINK_CONFIG, TOKEN_EXPIRY_OPTIONS } from '../../../src/config/constants';
import {
  Screen,
  Container,
  Card,
  CardContent,
  Text,
  Button,
  Badge,
  Divider,
  EmptyState,
} from '../../../src/components/ui';
import { Calendar, Link as LinkIcon, QrCode, Share2, Clock } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

interface CaseData {
  id: string;
  case_number: string;
  child_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  foster_carer?: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface TokenData {
  token: string;
  token_id: string;
  expires_at: string;
  access_url: string;
}

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);
  const qrRef = useRef<any>(null);

  useEffect(() => {
    if (id) {
      fetchCaseDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCaseDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select(
          `
          *,
          foster_carer:profiles!foster_carer_id(id, full_name, email)
        `,
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      setCaseData(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load case details');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async (expiresInHours: number = 24) => {
    if (!id) return;

    setGeneratingToken(true);
    try {
      const { data, error } = await generateChildAccessToken(id, expiresInHours);

      if (error) {
        Alert.alert('Error', error.message || 'Failed to generate access token');
        return;
      }

      setTokenData(data);
      Alert.alert(
        'Token Generated!',
        `A secure access link has been created. It will expire in ${expiresInHours} hours.`,
      );
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyLink = async () => {
    if (!tokenData) return;

    const fullUrl = DEEP_LINK_CONFIG.getChildAccessUrl(tokenData.token);
    await Clipboard.setStringAsync(fullUrl);
    Alert.alert('Copied!', 'Access link copied to clipboard');
  };

  const handleShareLink = async () => {
    if (!tokenData) return;

    const fullUrl = DEEP_LINK_CONFIG.getChildAccessUrl(tokenData.token);
    try {
      await Share.share({
        message: `Here's your secure access link for Whose House:\n\n${fullUrl}\n\nThis link will expire on ${new Date(tokenData.expires_at).toLocaleString()}`,
        title: 'Whose House Access Link',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleShareQRCode = async () => {
    if (!qrRef.current) return;

    try {
      qrRef.current.toDataURL((_dataURL: string) => {
        // In a real app, you'd save this to the file system and share
        Alert.alert('QR Code', 'QR code ready to share (implementation pending)');
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </Screen>
    );
  }

  if (!caseData) {
    return (
      <Screen>
        <Container>
          <EmptyState title="Case Not Found" description="This case could not be loaded" />
        </Container>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: caseData.case_number,
          headerBackTitle: 'Caseload',
        }}
      />
      <Screen>
        <ScrollView>
          <Container>
            {/* Case Header */}
            <Card variant="elevated" className="mb-4">
              <CardContent>
                <View className="flex-row items-center justify-between mb-3">
                  <Text variant="h2" weight="bold">
                    {caseData.child_name}
                  </Text>
                  <Badge
                    variant={
                      caseData.status === 'active'
                        ? 'success'
                        : caseData.status === 'pending'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {caseData.status}
                  </Badge>
                </View>

                <View className="flex-row items-center mb-2">
                  <Calendar size={16} color="#666" />
                  <Text variant="caption" color="muted" className="ml-2">
                    Created: {new Date(caseData.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {caseData.foster_carer && (
                  <>
                    <Divider className="my-3" />
                    <View>
                      <Text variant="caption" color="muted" className="mb-1">
                        Foster Carer
                      </Text>
                      <Text variant="body" weight="semibold">
                        {caseData.foster_carer.full_name}
                      </Text>
                      <Text variant="caption" color="muted">
                        {caseData.foster_carer.email}
                      </Text>
                    </View>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Child Access Section */}
            <Card variant="elevated" className="mb-4">
              <CardContent>
                <View className="flex-row items-center mb-3">
                  <LinkIcon size={20} color="#007AFF" />
                  <Text variant="h3" weight="bold" className="ml-2">
                    Child Access
                  </Text>
                </View>

                <Text variant="body" color="muted" className="mb-4">
                  Generate a secure access link or QR code for the child to view their page
                </Text>

                {!tokenData ? (
                  <View className="space-y-2">
                    <Button
                      onPress={() => handleGenerateToken(TOKEN_EXPIRY_OPTIONS.SHORT.hours)}
                      loading={generatingToken}
                      disabled={caseData.status !== 'active'}
                    >
                      Generate {TOKEN_EXPIRY_OPTIONS.SHORT.label} Access Link
                    </Button>
                    <Button
                      variant="outline"
                      onPress={() => handleGenerateToken(TOKEN_EXPIRY_OPTIONS.MEDIUM.hours)}
                      loading={generatingToken}
                      disabled={caseData.status !== 'active'}
                    >
                      Generate {TOKEN_EXPIRY_OPTIONS.MEDIUM.label} Access Link
                    </Button>

                    {caseData.status !== 'active' && (
                      <Text variant="caption" color="danger" className="text-center mt-2">
                        Case must be active to generate access links
                      </Text>
                    )}
                  </View>
                ) : (
                  <View>
                    {/* QR Code */}
                    <View className="items-center mb-4 p-4 bg-white rounded-lg">
                      <QRCode
                        value={DEEP_LINK_CONFIG.getChildAccessUrl(tokenData.token)}
                        size={200}
                        backgroundColor="white"
                        color="black"
                        getRef={(ref) => (qrRef.current = ref)}
                      />
                    </View>

                    {/* Expiry Info */}
                    <View className="flex-row items-center justify-center mb-4 p-3 bg-amber-50 rounded-lg">
                      <Clock size={16} color="#D97706" />
                      <Text variant="caption" className="ml-2 text-amber-700">
                        Expires: {new Date(tokenData.expires_at).toLocaleString()}
                      </Text>
                    </View>

                    {/* Action Buttons */}
                    <View className="space-y-2">
                      <Button variant="outline" onPress={handleCopyLink}>
                        <View className="flex-row items-center">
                          <LinkIcon size={18} color="#007AFF" />
                          <Text className="ml-2">Copy Link</Text>
                        </View>
                      </Button>

                      <Button variant="outline" onPress={handleShareLink}>
                        <View className="flex-row items-center">
                          <Share2 size={18} color="#007AFF" />
                          <Text className="ml-2">Share Link</Text>
                        </View>
                      </Button>

                      <Button variant="outline" onPress={handleShareQRCode}>
                        <View className="flex-row items-center">
                          <QrCode size={18} color="#007AFF" />
                          <Text className="ml-2">Share QR Code</Text>
                        </View>
                      </Button>

                      <Divider className="my-2" />

                      <Button variant="ghost" onPress={() => setTokenData(null)} size="sm">
                        Generate New Token
                      </Button>
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>
          </Container>
        </ScrollView>
      </Screen>
    </>
  );
}
