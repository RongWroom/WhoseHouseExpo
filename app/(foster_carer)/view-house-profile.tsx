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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  MapPin,
  Users,
  Home,
  Tv,
  Gamepad2,
  Heart,
  Sparkles,
  Edit3,
  Share2,
  CheckCircle,
} from 'lucide-react-native';
import { Text } from '../../src/components/ui';
import { SunbeamSurface } from '../../src/components/sunbeam';
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
      <View className="flex-1 items-center justify-center bg-[#F8F8F5]">
        <ActivityIndicator size="large" color="#F9F506" />
        <Text className="mt-4 text-sm text-[#8C8B5F]">Loading profile...</Text>
      </View>
    );
  }

  // If no user after auth has loaded, show error
  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F8F5] items-center justify-center p-5">
        <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
          <Home size={32} color="#9CA3AF" />
        </View>
        <Text className="text-[#8C8B5F] text-center mb-4">
          Please sign in to view your profile.
        </Text>
        <TouchableOpacity
          onPress={() => router.replace('/(auth)')}
          className="bg-[#F9F506] px-6 py-3 rounded-full"
          activeOpacity={0.8}
        >
          <Text className="text-[#181811] font-bold">Sign In</Text>
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
      <SafeAreaView className="flex-1 bg-[#F8F8F5] items-center justify-center p-5">
        <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
          <Home size={40} color="#9CA3AF" />
        </View>
        <Text className="text-lg font-bold text-[#181811] mb-2">No Profile Yet</Text>
        <Text className="text-[#8C8B5F] text-center mb-6">
          Create your house profile to share with children.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(foster_carer)/(tabs)/house-profile')}
          className="bg-[#F9F506] px-6 py-3 rounded-full mb-3"
          activeOpacity={0.8}
        >
          <Text className="text-[#181811] font-bold">Create Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} className="px-6 py-2" activeOpacity={0.7}>
          <Text className="text-[#8C8B5F] font-medium">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-[#F8F8F5]">
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
                      className="w-full h-80"
                      resizeMode="cover"
                    />
                    {/* Gradient overlay */}
                    <View className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <View className="absolute bottom-4 left-4 bg-white/95 px-3 py-1.5 rounded-full shadow-sm">
                      <Text className="text-[#181811] text-xs font-bold">
                        {CATEGORY_LABELS[photo.category] || photo.category}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              {/* Pagination dots */}
              {sortedPhotos.length > 1 && (
                <View className="absolute bottom-4 right-4 bg-black/40 rounded-full px-2.5 py-1.5 flex-row gap-1.5">
                  {sortedPhotos.map((photo, idx) => (
                    <View
                      key={photo.id}
                      className={`w-2 h-2 rounded-full ${
                        idx === activePhotoIndex ? 'bg-white' : 'bg-white/40'
                      }`}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View className="w-full h-80 bg-gray-100 items-center justify-center">
              <View className="w-20 h-20 rounded-full bg-gray-200 items-center justify-center mb-3">
                <Home size={40} color="#9CA3AF" />
              </View>
              <Text className="text-gray-400 font-medium">No photos yet</Text>
            </View>
          )}

          {/* Back button overlay */}
          <SafeAreaView className="absolute top-0 left-0 right-0">
            <View className="flex-row items-center justify-between px-4 pt-2">
              <TouchableOpacity
                onPress={() => router.back()}
                className="w-11 h-11 rounded-full bg-white/95 items-center justify-center shadow-md"
                accessibilityRole="button"
                accessibilityLabel="Go back"
                activeOpacity={0.8}
              >
                <ChevronLeft size={22} color="#181811" />
              </TouchableOpacity>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="w-11 h-11 rounded-full bg-white/95 items-center justify-center shadow-md"
                  accessibilityRole="button"
                  accessibilityLabel="Share profile"
                  activeOpacity={0.8}
                >
                  <Share2 size={18} color="#181811" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(foster_carer)/(tabs)/house-profile')}
                  className="w-11 h-11 rounded-full bg-[#F9F506] items-center justify-center shadow-md"
                  accessibilityRole="button"
                  accessibilityLabel="Edit profile"
                  activeOpacity={0.8}
                >
                  <Edit3 size={18} color="#181811" />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View className="px-4 pt-5 pb-8 -mt-4 bg-[#F8F8F5] rounded-t-3xl">
          {/* Title Section */}
          <Animated.View entering={FadeIn.duration(300)} className="mb-5">
            <Text className="text-2xl font-bold text-[#181811] mb-2">
              {userProfile?.full_name ? `${userProfile.full_name}'s Home` : 'Our Home'}
            </Text>
            <View className="flex-row items-center">
              <View className="flex-row items-center bg-green-50 px-2.5 py-1 rounded-full">
                <CheckCircle size={14} color="#10B981" />
                <Text className="text-xs font-bold text-green-700 ml-1">Published</Text>
              </View>
              <Text className="text-xs text-[#8C8B5F] ml-2">Ready for children to view</Text>
            </View>
          </Animated.View>

          {/* Quick Stats */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            className="flex-row mb-6 gap-3"
          >
            <SunbeamSurface className="flex-1">
              <View className="p-4 items-center">
                <View className="w-10 h-10 rounded-full bg-[#F9F506]/20 items-center justify-center mb-2">
                  <Users size={20} color="#181811" />
                </View>
                <Text className="text-xl font-bold text-[#181811]">
                  {profileData.householdMembers.length}
                </Text>
                <Text className="text-xs text-[#8C8B5F]">People</Text>
              </View>
            </SunbeamSurface>
            <SunbeamSurface className="flex-1">
              <View className="p-4 items-center">
                <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mb-2">
                  <Home size={20} color="#1d4ed8" />
                </View>
                <Text className="text-xl font-bold text-[#181811]">{sortedPhotos.length}</Text>
                <Text className="text-xs text-[#8C8B5F]">Photos</Text>
              </View>
            </SunbeamSurface>
            <SunbeamSurface className="flex-1">
              <View className="p-4 items-center">
                <View className="w-10 h-10 rounded-full bg-pink-50 items-center justify-center mb-2">
                  <Heart size={20} color="#ec4899" />
                </View>
                <Text className="text-xl font-bold text-[#181811]">
                  {profileData.houseRules.length}
                </Text>
                <Text className="text-xs text-[#8C8B5F]">Rules</Text>
              </View>
            </SunbeamSurface>
          </Animated.View>

          {/* Who Lives Here */}
          {profileData.householdMembers.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(300)} className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-8 h-8 rounded-lg bg-[#F9F506]/20 items-center justify-center">
                  <Users size={16} color="#181811" />
                </View>
                <Text className="text-lg font-bold text-[#181811]">Who Lives Here</Text>
              </View>

              <SunbeamSurface>
                <View className="p-4">
                  {profileData.householdMembers.map((member, index) => (
                    <View
                      key={member.id}
                      className={`flex-row items-start ${index > 0 ? 'mt-4 pt-4 border-t border-gray-100' : ''}`}
                    >
                      <View className="w-14 h-14 rounded-2xl bg-[#F9F506]/10 items-center justify-center mr-4">
                        <Text className="text-xl font-bold text-[#181811]">
                          {member.name ? member.name.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-[#181811]">
                          {member.name || 'Unnamed'}
                        </Text>
                        {member.relationshipLabel && (
                          <Text className="text-sm text-[#8C8B5F] font-medium">
                            {member.relationshipLabel}
                            {member.age ? ` • ${member.age}` : ''}
                          </Text>
                        )}
                        {member.description && (
                          <Text className="text-sm text-[#8C8B5F] mt-1 leading-relaxed">
                            {member.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </SunbeamSurface>
            </Animated.View>
          )}

          {/* Local Area */}
          {(profileData.localArea.overview || profileData.localArea.highlights.length > 0) && (
            <Animated.View entering={FadeInDown.delay(300).duration(300)} className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center">
                  <MapPin size={16} color="#1d4ed8" />
                </View>
                <Text className="text-lg font-bold text-[#181811]">Local Area</Text>
              </View>

              <SunbeamSurface>
                <View className="p-4">
                  {profileData.localArea.overview && (
                    <Text className="text-sm text-[#181811] leading-relaxed mb-4">
                      {profileData.localArea.overview}
                    </Text>
                  )}

                  {profileData.localArea.highlights.length > 0 && (
                    <View className="flex-row flex-wrap gap-2">
                      {profileData.localArea.highlights.map((highlight) => (
                        <View key={highlight.id} className="bg-blue-50 rounded-xl px-3 py-2">
                          <Text className="text-sm font-bold text-blue-700">{highlight.name}</Text>
                          {highlight.description && (
                            <Text className="text-xs text-blue-600 mt-0.5" numberOfLines={2}>
                              {highlight.description}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </SunbeamSurface>
            </Animated.View>
          )}

          {/* House Rules */}
          {profileData.houseRules.length > 0 && (
            <Animated.View entering={FadeInDown.delay(400).duration(300)} className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-8 h-8 rounded-lg bg-amber-50 items-center justify-center">
                  <Sparkles size={16} color="#d97706" />
                </View>
                <Text className="text-lg font-bold text-[#181811]">House Rules</Text>
              </View>

              <SunbeamSurface className="bg-amber-50/50">
                <View className="p-4">
                  {profileData.houseRules.map((rule, index) => (
                    <View key={index} className={`flex-row items-start ${index > 0 ? 'mt-2' : ''}`}>
                      <View className="w-5 h-5 rounded-full bg-amber-100 items-center justify-center mr-2 mt-0.5">
                        <Text className="text-xs font-bold text-amber-700">{index + 1}</Text>
                      </View>
                      <Text className="text-sm text-[#181811] flex-1">{rule}</Text>
                    </View>
                  ))}
                </View>
              </SunbeamSurface>
            </Animated.View>
          )}

          {/* Entertainment */}
          {(profileData.entertainment.tvShows.length > 0 ||
            profileData.entertainment.games.length > 0 ||
            profileData.entertainment.hobbies.length > 0) && (
            <Animated.View entering={FadeInDown.delay(500).duration(300)} className="mb-6">
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-8 h-8 rounded-lg bg-purple-50 items-center justify-center">
                  <Gamepad2 size={16} color="#7c3aed" />
                </View>
                <Text className="text-lg font-bold text-[#181811]">Things We Enjoy</Text>
              </View>

              <SunbeamSurface>
                <View className="p-4">
                  {profileData.entertainment.tvShows.length > 0 && (
                    <View className="mb-4">
                      <View className="flex-row items-center gap-2 mb-2">
                        <Tv size={14} color="#8C8B5F" />
                        <Text className="text-xs font-bold text-[#8C8B5F] uppercase tracking-wider">
                          TV & YouTube
                        </Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        {profileData.entertainment.tvShows.map((show, index) => (
                          <View key={index} className="bg-blue-50 px-3 py-1.5 rounded-full">
                            <Text className="text-xs font-medium text-blue-700">{show}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {profileData.entertainment.games.length > 0 && (
                    <View
                      className={
                        profileData.entertainment.tvShows.length > 0
                          ? 'mb-4 pt-4 border-t border-gray-100'
                          : 'mb-4'
                      }
                    >
                      <View className="flex-row items-center gap-2 mb-2">
                        <Gamepad2 size={14} color="#8C8B5F" />
                        <Text className="text-xs font-bold text-[#8C8B5F] uppercase tracking-wider">
                          Games We Play
                        </Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        {profileData.entertainment.games.map((game, index) => (
                          <View key={index} className="bg-purple-50 px-3 py-1.5 rounded-full">
                            <Text className="text-xs font-medium text-purple-700">{game}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {profileData.entertainment.hobbies.length > 0 && (
                    <View
                      className={
                        profileData.entertainment.tvShows.length > 0 ||
                        profileData.entertainment.games.length > 0
                          ? 'pt-4 border-t border-gray-100'
                          : ''
                      }
                    >
                      <View className="flex-row items-center gap-2 mb-2">
                        <Heart size={14} color="#8C8B5F" />
                        <Text className="text-xs font-bold text-[#8C8B5F] uppercase tracking-wider">
                          Hobbies & Fun
                        </Text>
                      </View>
                      <View className="flex-row flex-wrap gap-2">
                        {profileData.entertainment.hobbies.map((hobby, index) => (
                          <View key={index} className="bg-pink-50 px-3 py-1.5 rounded-full">
                            <Text className="text-xs font-medium text-pink-700">{hobby}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              </SunbeamSurface>
            </Animated.View>
          )}

          {/* Edit Button */}
          <Animated.View entering={FadeInDown.delay(600).duration(300)}>
            <TouchableOpacity
              onPress={() => router.push('/(foster_carer)/(tabs)/house-profile')}
              className="bg-[#F9F506] rounded-2xl py-4 items-center"
              accessibilityRole="button"
              accessibilityLabel="Edit house profile"
              activeOpacity={0.8}
            >
              <View className="flex-row items-center">
                <Edit3 size={18} color="#181811" />
                <Text className="text-[#181811] font-bold text-base ml-2">Edit Profile</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}
