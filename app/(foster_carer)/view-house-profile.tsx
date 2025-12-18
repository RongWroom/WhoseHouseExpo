import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  MapPin,
  Users,
  Home,
  Tv,
  Gamepad2,
  Heart,
  Star,
  Edit3,
  Share2,
} from 'lucide-react-native';
import { Text, Card } from '../../src/components/ui';
import { useAuth } from '../../src/contexts/AuthContext';
import { supabase } from '../../src/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface HousePhoto {
  id: string;
  file_name: string;
  file_url: string;
  description?: string;
  uploaded_at: string;
  category: string;
}

interface HouseholdMember {
  id: string;
  name: string;
  role: 'parent' | 'sibling' | 'pet' | 'other';
  relationshipLabel?: string;
  age?: string;
  description?: string;
}

interface LocalAreaHighlight {
  id: string;
  name: string;
  description: string;
}

interface HouseProfileData {
  photos: HousePhoto[];
  householdMembers: HouseholdMember[];
  localArea: {
    overview: string;
    highlights: LocalAreaHighlight[];
  };
  houseRules: string[];
  entertainment: {
    tvShows: string[];
    games: string[];
    hobbies: string[];
  };
  isPublished: boolean;
}

const CATEGORY_ORDER = [
  'exterior',
  'living_room',
  'kitchen',
  'bedroom',
  'bathroom',
  'dining_room',
  'garden',
];

const CATEGORY_LABELS: Record<string, string> = {
  exterior: 'Outside',
  living_room: 'Living Room',
  kitchen: 'Kitchen',
  bedroom: 'Bedroom',
  bathroom: 'Bathroom',
  dining_room: 'Dining Room',
  garden: 'Garden',
};

export default function ViewHouseProfileScreen() {
  const router = useRouter();
  const { user, profile: userProfile, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState<HouseProfileData | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      if (!user) {
        setIsLoading(false);
        setHasAttemptedLoad(true);
        return;
      }

      setIsLoading(true);
      try {
        console.log('Loading profile for user:', user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('metadata')
          .eq('id', user.id)
          .single();

        console.log('Profile data response:', JSON.stringify({ data, error }, null, 2));

        if (error) throw error;

        const metadata = (data as any)?.metadata;
        console.log('Metadata:', JSON.stringify(metadata, null, 2));

        if (metadata?.houseProfile) {
          console.log('House profile found!');
          setProfileData(metadata.houseProfile as HouseProfileData);
        } else {
          console.log('No house profile in metadata');
          setProfileData(null);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setProfileData(null);
      } finally {
        setIsLoading(false);
        setHasAttemptedLoad(true);
      }
    };

    loadProfileData();
  }, [user, authLoading]);

  // Show loading while auth is loading or data is loading
  if (authLoading || isLoading || !hasAttemptedLoad) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#34C759" />
      </View>
    );
  }

  // If no user after auth has loaded, show error
  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-5">
        <Text className="text-gray-500 text-center mb-4">Please sign in to view your profile.</Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)')}
          className="bg-foster-carer-500 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-semibold">Sign In</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const sortedPhotos = profileData?.photos
    ? [...profileData.photos].sort((a, b) => {
        const aIndex = CATEGORY_ORDER.indexOf(a.category);
        const bIndex = CATEGORY_ORDER.indexOf(b.category);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      })
    : [];

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePhotoIndex(slideIndex);
  };

  if (!profileData) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center p-5">
        <Text className="text-gray-500 text-center mb-4">No house profile found.</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-foster-carer-500 px-6 py-3 rounded-full"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Image Gallery */}
        <View className="relative">
          {sortedPhotos.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              >
                {sortedPhotos.map((photo) => (
                  <View key={photo.id} style={{ width: SCREEN_WIDTH }}>
                    <Image
                      source={{ uri: photo.file_url }}
                      className="w-full h-72"
                      resizeMode="cover"
                    />
                    <View className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-full">
                      <Text className="text-white text-xs font-medium">
                        {CATEGORY_LABELS[photo.category] || photo.category}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              {/* Pagination dots */}
              {sortedPhotos.length > 1 && (
                <View className="absolute bottom-4 right-4 flex-row gap-1.5">
                  {sortedPhotos.map((photo, idx) => (
                    <View
                      key={photo.id}
                      className={`w-2 h-2 rounded-full ${
                        idx === activePhotoIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View className="w-full h-72 bg-gray-100 items-center justify-center">
              <Home size={48} color="#9CA3AF" />
              <Text className="text-gray-400 mt-2">No photos yet</Text>
            </View>
          )}

          {/* Back button overlay */}
          <SafeAreaView className="absolute top-0 left-0 right-0">
            <View className="flex-row items-center justify-between px-4 pt-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-sm"
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <ChevronLeft size={24} color="#374151" />
              </TouchableOpacity>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-sm"
                  accessibilityRole="button"
                  accessibilityLabel="Share profile"
                >
                  <Share2 size={20} color="#374151" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(foster_carer)/(tabs)/house-profile')}
                  className="w-10 h-10 rounded-full bg-white/90 items-center justify-center shadow-sm"
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                >
                  <Edit3 size={20} color="#374151" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View className="px-5 pt-5 pb-8">
          {/* Title Section */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-1">
              {userProfile?.full_name ? `${userProfile.full_name}'s Home` : 'Our Home'}
            </Text>
            <View className="flex-row items-center">
              <Star size={16} color="#34C759" fill="#34C759" />
              <Text className="text-sm font-medium text-gray-700 ml-1">
                Published • Ready for children
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="flex-row mb-6 -mx-1.5">
            <View className="flex-1 px-1.5">
              <View className="bg-foster-carer-50 rounded-2xl p-4 items-center">
                <Users size={24} color="#34C759" />
                <Text className="text-lg font-bold text-gray-900 mt-2">
                  {profileData.householdMembers.length}
                </Text>
                <Text className="text-xs text-gray-500">People</Text>
              </View>
            </View>
            <View className="flex-1 px-1.5">
              <View className="bg-foster-carer-50 rounded-2xl p-4 items-center">
                <Home size={24} color="#34C759" />
                <Text className="text-lg font-bold text-gray-900 mt-2">{sortedPhotos.length}</Text>
                <Text className="text-xs text-gray-500">Photos</Text>
              </View>
            </View>
            <View className="flex-1 px-1.5">
              <View className="bg-foster-carer-50 rounded-2xl p-4 items-center">
                <Heart size={24} color="#34C759" />
                <Text className="text-lg font-bold text-gray-900 mt-2">
                  {profileData.houseRules.length}
                </Text>
                <Text className="text-xs text-gray-500">Rules</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-200 mb-6" />

          {/* Who Lives Here */}
          {profileData.householdMembers.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <Users size={20} color="#374151" />
                <Text className="text-lg font-semibold text-gray-900 ml-2">Who lives here</Text>
              </View>

              {profileData.householdMembers.map((member) => (
                <Card key={member.id} variant="outlined" className="mb-3">
                  <View className="p-4 flex-row items-start">
                    <View className="w-12 h-12 rounded-full bg-foster-carer-100 items-center justify-center mr-4">
                      <Text className="text-lg font-bold text-foster-carer-600">
                        {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-gray-900">
                        {member.name || 'Unnamed'}
                      </Text>
                      {member.relationshipLabel && (
                        <Text className="text-sm text-foster-carer-600 font-medium">
                          {member.relationshipLabel}
                          {member.age ? ` • ${member.age}` : ''}
                        </Text>
                      )}
                      {member.description && (
                        <Text className="text-sm text-gray-600 mt-1">{member.description}</Text>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {/* Local Area */}
          {(profileData.localArea.overview || profileData.localArea.highlights.length > 0) && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <MapPin size={20} color="#374151" />
                <Text className="text-lg font-semibold text-gray-900 ml-2">The local area</Text>
              </View>

              {profileData.localArea.overview && (
                <Text className="text-base text-gray-700 mb-4 leading-relaxed">
                  {profileData.localArea.overview}
                </Text>
              )}

              {profileData.localArea.highlights.length > 0 && (
                <View className="flex-row flex-wrap -mx-1.5">
                  {profileData.localArea.highlights.map((highlight) => (
                    <View key={highlight.id} className="w-1/2 px-1.5 mb-3">
                      <View className="bg-gray-50 rounded-xl p-3 h-full">
                        <Text className="text-sm font-semibold text-gray-900 mb-1">
                          {highlight.name}
                        </Text>
                        {highlight.description && (
                          <Text className="text-xs text-gray-600" numberOfLines={3}>
                            {highlight.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* House Rules */}
          {profileData.houseRules.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <Home size={20} color="#374151" />
                <Text className="text-lg font-semibold text-gray-900 ml-2">House rules</Text>
              </View>

              <View className="bg-amber-50 rounded-2xl p-4">
                {profileData.houseRules.map((rule, index) => (
                  <View key={index} className="flex-row items-start mb-2 last:mb-0">
                    <Text className="text-amber-600 mr-2">•</Text>
                    <Text className="text-sm text-gray-700 flex-1">{rule}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Entertainment */}
          {(profileData.entertainment.tvShows.length > 0 ||
            profileData.entertainment.games.length > 0 ||
            profileData.entertainment.hobbies.length > 0) && (
            <View className="mb-8">
              <View className="flex-row items-center mb-4">
                <Gamepad2 size={20} color="#374151" />
                <Text className="text-lg font-semibold text-gray-900 ml-2">Things we enjoy</Text>
              </View>

              {profileData.entertainment.tvShows.length > 0 && (
                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Tv size={16} color="#6B7280" />
                    <Text className="text-sm font-medium text-gray-600 ml-2">TV & YouTube</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {profileData.entertainment.tvShows.map((show, index) => (
                      <View key={index} className="bg-blue-50 px-3 py-1.5 rounded-full">
                        <Text className="text-sm text-blue-700">{show}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {profileData.entertainment.games.length > 0 && (
                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Gamepad2 size={16} color="#6B7280" />
                    <Text className="text-sm font-medium text-gray-600 ml-2">Games we play</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {profileData.entertainment.games.map((game, index) => (
                      <View key={index} className="bg-purple-50 px-3 py-1.5 rounded-full">
                        <Text className="text-sm text-purple-700">{game}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {profileData.entertainment.hobbies.length > 0 && (
                <View className="mb-4">
                  <View className="flex-row items-center mb-2">
                    <Heart size={16} color="#6B7280" />
                    <Text className="text-sm font-medium text-gray-600 ml-2">
                      Hobbies & weekend fun
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    {profileData.entertainment.hobbies.map((hobby, index) => (
                      <View key={index} className="bg-pink-50 px-3 py-1.5 rounded-full">
                        <Text className="text-sm text-pink-700">{hobby}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Edit Button */}
          <TouchableOpacity
            onPress={() => router.push('/(foster_carer)/(tabs)/house-profile')}
            className="bg-foster-carer-500 rounded-xl py-4 items-center mt-4"
            accessibilityRole="button"
            accessibilityLabel="Edit house profile"
          >
            <View className="flex-row items-center">
              <Edit3 size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">Edit Profile</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
