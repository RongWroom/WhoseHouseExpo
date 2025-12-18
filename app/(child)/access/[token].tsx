import React, { useState, useEffect } from 'react';
import {
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { validateChildToken, sendChildMessage, supabase } from '../../../src/lib/supabase';
import { MessageCircle, Send, Home, User, Heart, Star, Sparkles, Phone } from 'lucide-react-native';
import {
  Screen,
  Container,
  Card,
  CardContent,
  Text,
  Button,
  Input,
  LoadingSpinner,
  TitleBar,
} from '../../../src/components/ui';

// const { width: screenWidth } = Dimensions.get('window');
// const PHOTO_WIDTH = (screenWidth - 48) / 2; // 2 columns with padding - Removed as not needed

interface HousePhoto {
  id: string;
  file_url: string;
  description?: string;
  category: string;
}

export default function ChildViewScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showMessageBox, setShowMessageBox] = useState(false);
  const [housePhotos, setHousePhotos] = useState<HousePhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [_selectedPhoto, setSelectedPhoto] = useState<HousePhoto | null>(null);

  useEffect(() => {
    validateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const validateSession = async () => {
    if (!token) {
      Alert.alert('Error', 'No access code provided');
      return;
    }

    try {
      const { data } = await validateChildToken(token);
      if (!data) {
        Alert.alert('Session Expired', 'Your access code has expired. Please ask for a new one.');
      } else {
        setSessionData(data);
        // Fetch house photos after successful validation
        fetchHousePhotos(data.case_number);
      }
    } catch {
      Alert.alert('Error', 'Could not validate your access');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHousePhotos = async (caseId: string) => {
    try {
      const { data, error } = await supabase
        .from('case_media')
        .select('*')
        .eq('case_id', caseId)
        .eq('metadata->>for_child_viewing', 'true')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const photos = await Promise.all(
          data.map(async (photo: any) => {
            const { data: urlData } = supabase.storage
              .from('case-media')
              .getPublicUrl(photo.file_path);

            return {
              id: photo.id,
              file_url: urlData.publicUrl,
              description: photo.description,
              category: photo.metadata?.category || 'other',
            };
          }),
        );
        setHousePhotos(photos);
      }
    } catch (error) {
      console.error('Failed to fetch house photos:', error);
    } finally {
      setPhotosLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsSending(true);
    try {
      const { data } = await sendChildMessage(token, message);
      if (data) {
        Alert.alert('Message Sent!', 'Your social worker will see your message soon.');
        setMessage('');
        setShowMessageBox(false);
      } else {
        Alert.alert('Error', 'Could not send message. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsSending(false);
    }
  };

  const handleEmergencyCall = async () => {
    const phoneNumber = sessionData?.foster_carer?.phone_number as string | undefined;

    if (!phoneNumber) {
      Alert.alert(
        'Talk to your carer',
        "Ask your foster carer, or another adult you trust, to help you if you don't feel safe.",
      );
      return;
    }

    const url = `tel:${phoneNumber}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Call not available',
          "We couldn't start a phone call on this device. Please ask an adult nearby to help you.",
        );
      }
    } catch (error) {
      console.error('Failed to start emergency call:', error);
      Alert.alert(
        'Call not available',
        'Something went wrong when trying to start the call. Please ask an adult nearby to help you.',
      );
    }
  };

  if (isLoading) {
    return (
      <Screen className="bg-child-50">
        <View className="flex-1 items-center justify-center">
          <LoadingSpinner size="large" />
          <Text variant="body" color="muted" className="mt-4">
            Loading your page...
          </Text>
        </View>
      </Screen>
    );
  }

  if (!sessionData) {
    return (
      <Screen className="bg-child-50">
        <Container>
          <View className="flex-1 items-center justify-center">
            <Text variant="h2" className="text-child-800">
              Could not load your page
            </Text>
            <Text variant="body" color="muted" className="mt-2 text-center">
              Your access link may have expired. Please ask for a new one.
            </Text>
          </View>
        </Container>
      </Screen>
    );
  }

  return (
    <Screen className="bg-child-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1" contentContainerClassName="flex-grow p-5">
          <TitleBar
            title="Welcome!"
            subtitle={`Your Code: ${sessionData.case_number}`}
            accentColor="#4CAF50"
            className="mb-5"
          />

          <Card variant="elevated" className="mb-5">
            <CardContent>
              <Text variant="h3" weight="bold" className="text-center mb-4">
                Your Social Worker
              </Text>
              <View className="items-center">
                {sessionData.social_worker?.avatar_url ? (
                  <Image
                    source={{ uri: sessionData.social_worker.avatar_url }}
                    className="w-20 h-20 rounded-full mb-3"
                  />
                ) : (
                  <View className="w-20 h-20 rounded-full bg-social-worker-500 items-center justify-center mb-3">
                    <User size={40} color="white" />
                  </View>
                )}
                <Text variant="h3" weight="bold" className="mb-1">
                  {sessionData.social_worker?.name}
                </Text>
                <Text variant="caption" color="muted">
                  Social Worker
                </Text>
              </View>
            </CardContent>
          </Card>

          {/* House Photos Gallery */}
          {housePhotos.length > 0 && (
            <Card variant="elevated" className="mb-5">
              <CardContent>
                <View className="flex-row items-center justify-center mb-4">
                  <Sparkles size={20} color="#FFC107" />
                  <Text variant="h3" weight="bold" className="mx-2 text-center">
                    Your New Home!
                  </Text>
                  <Sparkles size={20} color="#FFC107" />
                </View>

                {photosLoading ? (
                  <View className="items-center p-8">
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text variant="body" color="muted" className="mt-3">
                      Loading photos...
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={housePhotos}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                      <TouchableOpacity onPress={() => setSelectedPhoto(item)} className="mr-3">
                        <Image
                          source={{ uri: item.file_url }}
                          className="w-64 h-48 rounded-xl"
                          resizeMode="cover"
                        />
                        {item.description && (
                          <Text variant="caption" className="mt-2 text-center">
                            {item.description}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                    keyExtractor={(item) => item.id}
                    ListEmptyComponent={
                      <View className="items-center p-8">
                        <Home size={50} color="#81C784" />
                        <Text variant="body" color="muted" className="mt-3 text-center">
                          Photos are being prepared for you!
                        </Text>
                      </View>
                    }
                  />
                )}

                {housePhotos.length > 0 && (
                  <View className="flex-row items-center justify-center mt-4">
                    <Heart size={16} color="#E91E63" />
                    <Text variant="caption" color="muted" className="mx-2">
                      Swipe to see more photos
                    </Text>
                    <Heart size={16} color="#E91E63" />
                  </View>
                )}
              </CardContent>
            </Card>
          )}

          {/* Emergency help card */}
          <Card variant="elevated" className="mb-5 bg-white">
            <CardContent>
              <Text variant="h3" weight="bold" className="mb-2 text-center text-child-800">
                Need help right now?
              </Text>
              <Text variant="body" color="muted" className="mb-4 text-center">
                If you feel worried or unsafe, you can ask to call your foster carer straight away.
              </Text>
              <View className="items-center">
                <Button
                  variant="danger"
                  size="lg"
                  className="px-6"
                  onPress={handleEmergencyCall}
                  accessibilityRole="button"
                  accessibilityLabel="Call my foster carer for urgent help"
                >
                  <View className="flex-row items-center">
                    <Phone size={22} color="white" />
                    <Text className="ml-2 text-white font-semibold">
                      Call {sessionData.foster_carer?.name || 'my foster carer'}
                    </Text>
                  </View>
                </Button>
              </View>
            </CardContent>
          </Card>

          {/* Empty State if no photos */}
          {!photosLoading && housePhotos.length === 0 && (
            <Card variant="elevated" className="mb-5 bg-child-50/50">
              <CardContent>
                <View className="items-center p-6">
                  <View className="flex-row mb-4">
                    <Star size={24} color="#FFC107" />
                    <Star size={24} color="#FFC107" className="mx-2" />
                    <Star size={24} color="#FFC107" />
                  </View>
                  <Text variant="h3" weight="bold" className="mb-2">
                    Photos Coming Soon!
                  </Text>
                  <Text variant="body" color="muted" className="text-center">
                    Your foster family is preparing special photos just for you
                  </Text>
                </View>
              </CardContent>
            </Card>
          )}

          {!showMessageBox ? (
            <Button onPress={() => setShowMessageBox(true)} size="lg" className="bg-child-500">
              <View className="flex-row items-center">
                <MessageCircle size={24} color="white" />
                <Text className="ml-2 text-white text-lg font-bold">
                  Message {sessionData.social_worker?.name}
                </Text>
              </View>
            </Button>
          ) : (
            <Card variant="elevated">
              <CardContent>
                <Text variant="h3" weight="bold" className="mb-4">
                  Send a Message
                </Text>
                <Input
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Type your message here..."
                  multiline
                  numberOfLines={4}
                  editable={!isSending}
                  className="mb-4"
                />
                <View className="flex-row justify-between">
                  <Button
                    variant="ghost"
                    onPress={() => {
                      setShowMessageBox(false);
                      setMessage('');
                    }}
                    disabled={isSending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={handleSendMessage}
                    loading={isSending}
                    disabled={isSending}
                    className="bg-child-500"
                  >
                    <View className="flex-row items-center">
                      <Send size={20} color="white" />
                      <Text className="ml-2 text-white font-semibold">Send</Text>
                    </View>
                  </Button>
                </View>
              </CardContent>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
