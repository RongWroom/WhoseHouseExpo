import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  Camera,
  Trash2,
  Home,
  ChevronLeft,
  ChevronRight,
  Users,
  MapPin,
  Sparkles,
  CheckCircle,
  Eye,
  User,
  ImagePlus,
  Gamepad2,
  Clock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Text, Input } from '../../../src/components/ui';
import { SunbeamSurface } from '../../../src/components/sunbeam';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_GRID_GAP = 12;
const PHOTO_ITEM_WIDTH = (SCREEN_WIDTH - 48 - PHOTO_GRID_GAP) / 2;

interface HousePhoto {
  id: string;
  file_name: string;
  file_url: string;
  description?: string;
  uploaded_at: string;
  category:
    | 'bedroom'
    | 'common_area'
    | 'exterior'
    | 'other'
    | 'living_room'
    | 'kitchen'
    | 'dining_room'
    | 'bathroom'
    | 'garden'
    | 'carers'
    | 'pets';
}

interface HouseholdMember {
  id: string;
  name: string;
  role: 'parent' | 'sibling' | 'pet' | 'other';
  relationshipLabel?: string;
  age?: string;
  description?: string;
  photoUrl?: string;
}

interface LocalAreaHighlight {
  id: string;
  name: string;
  description: string;
}

interface LocalAreaInfo {
  overview: string;
  highlights: LocalAreaHighlight[];
}

interface HouseProfileData {
  photos: HousePhoto[];
  householdMembers: HouseholdMember[];
  localArea: LocalAreaInfo;
  houseRules: string[];
  entertainment: {
    tvShows: string[];
    games: string[];
    hobbies: string[];
  };
  isPublished: boolean;
}

type EntertainmentCategory = keyof HouseProfileData['entertainment'];

const HOUSE_IMAGE_SLOTS = [
  {
    key: 'exterior',
    label: 'Outside of the house',
    description: 'What your home looks like from the street or front path.',
    required: true,
  },
  {
    key: 'living_room',
    label: 'Living room',
    description: 'Where you usually relax, watch TV, or play games together.',
    required: true,
  },
  {
    key: 'kitchen',
    label: 'Kitchen',
    description: 'Where you prepare food and have meals.',
    required: true,
  },
  {
    key: 'dining_room',
    label: 'Dining room (if you have one)',
    description: 'A table space where you might eat together.',
    required: false,
  },
  {
    key: 'bedroom',
    label: "Bedroom they'll sleep in",
    description: 'The room where the child is most likely to sleep.',
    required: true,
  },
  {
    key: 'bathroom',
    label: 'Bathroom',
    description: 'Where they can brush teeth and get ready.',
    required: true,
  },
  {
    key: 'garden',
    label: 'Garden or outside space',
    description: 'Any garden, yard, or outdoor area you use.',
    required: false,
  },
] as const;

const QUICK_MEMBER_TAGS = [
  { label: 'Mum', role: 'parent' },
  { label: 'Dad', role: 'parent' },
  { label: 'Foster Mum', role: 'parent' },
  { label: 'Foster Dad', role: 'parent' },
  { label: 'Partner', role: 'parent' },
  { label: 'Sister', role: 'sibling' },
  { label: 'Brother', role: 'sibling' },
  { label: 'Grandparent', role: 'other' },
  { label: 'Best friend', role: 'other' },
  { label: 'Pet', role: 'pet' },
] as const;

const createHouseholdMember = (overrides: Partial<HouseholdMember> = {}): HouseholdMember => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  role: 'other',
  relationshipLabel: '',
  age: '',
  description: '',
  ...overrides,
});

const createLocalAreaHighlight = (
  overrides: Partial<LocalAreaHighlight> = {},
): LocalAreaHighlight => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  description: '',
  ...overrides,
});

const LOCAL_AREA_TAGS = [
  'Crazy Kingdom play area',
  'Cinema trip',
  'Bowling alley',
  'Local library',
  'Swimming baths',
  'Skate park',
  'Nature walk',
] as const;

const HOUSE_RULE_SUGGESTIONS = [
  'Phones stay downstairs overnight',
  'Quiet time after 9pm',
  'Let us know before opening the front door',
  'Meals happen together at the table',
  'Shoes off at the door',
] as const;

const ENTERTAINMENT_SUGGESTIONS: Record<'tvShows' | 'games' | 'hobbies', string[]> = {
  tvShows: ['Bluey', 'Frozen', 'Nat Geo Kids', 'Football highlights'],
  games: ['Mario Kart', 'Uno', 'FIFA', 'Monopoly Deal'],
  hobbies: ['Drawing', 'Gardening', 'Baking cupcakes', 'Skateboarding'],
};

const ENTERTAINMENT_CONFIG: Record<EntertainmentCategory, { label: string; placeholder: string }> =
  {
    tvShows: {
      label: 'TV shows / YouTube',
      placeholder: 'Bluey, football highlights…',
    },
    games: {
      label: 'Games we play',
      placeholder: 'Monopoly Deal, Mario Kart…',
    },
    hobbies: {
      label: 'Hobbies & weekend fun',
      placeholder: 'Baking cupcakes, swimming…',
    },
  };

export default function HouseProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [profileData, setProfileData] = useState<HouseProfileData>({
    photos: [],
    householdMembers: [],
    localArea: {
      overview: '',
      highlights: [],
    },
    houseRules: [],
    entertainment: {
      tvShows: [],
      games: [],
      hobbies: [],
    },
    isPublished: false,
  });
  const [newRuleText, setNewRuleText] = useState('');
  const [newEntertainment, setNewEntertainment] = useState<Record<EntertainmentCategory, string>>({
    tvShows: '',
    games: '',
    hobbies: '',
  });
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProfileData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch existing profile data from user's profile metadata
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('metadata')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      // If profile exists, load it
      if (profile && (profile as any).metadata?.houseProfile) {
        setProfileData((profile as any).metadata.houseProfile as HouseProfileData);
      }

      // Fetch photos from case_media (uploaded by this user)
      const { data: photosData, error: photosError } = await supabase
        .from('case_media')
        .select('*')
        .eq('uploaded_by', user.id)
        .eq('file_type', 'image')
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      const fetchedPhotos = ((photosData as any[]) || []).map((photo: any) => {
        const { data: urlData } = supabase.storage.from('case-media').getPublicUrl(photo.file_path);

        return {
          id: photo.id,
          file_name: photo.file_name || 'photo',
          file_url: urlData?.publicUrl || '',
          description: photo.description || '',
          uploaded_at: photo.created_at || new Date().toISOString(),
          category: photo.metadata?.category || 'other',
        } as HousePhoto;
      });

      const latestByCategory = Object.values(
        fetchedPhotos.reduce(
          (acc, photo) => {
            const existing = acc[photo.category];
            if (
              !existing ||
              new Date(photo.uploaded_at).getTime() > new Date(existing.uploaded_at).getTime()
            ) {
              acc[photo.category] = photo;
            }
            return acc;
          },
          {} as Record<string, HousePhoto>,
        ),
      );

      setProfileData((prev) => ({ ...prev, photos: latestByCategory }));
    } catch (err) {
      console.error('Failed to fetch profile data:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProfileData = async () => {
    if (!user) return;

    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({
          metadata: {
            houseProfile: profileData,
          },
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to save profile data:', err);
    }
  };

  const goToNextStep = async () => {
    await saveProfileData();
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = async () => {
    await saveProfileData();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const publishProfile = async () => {
    if (!user) return;

    // Update state
    const updatedData = { ...profileData, isPublished: true };
    setProfileData(updatedData);

    // Save directly with the updated data (don't rely on state which is async)
    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({
          metadata: {
            houseProfile: updatedData,
          },
        })
        .eq('id', user.id);

      if (error) throw error;

      // Show celebration animation
      setShowCelebration(true);
    } catch (err) {
      console.error('Failed to publish profile:', err);
      Alert.alert('Error', 'Failed to publish profile. Please try again.');
    }
  };

  const pickImage = async (source: 'camera' | 'library', category?: HousePhoto['category']) => {
    try {
      let result;

      if (source === 'camera') {
        // Request camera permission first (not needed on web)
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please allow camera access to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        // For library, just launch directly - web handles permissions automatically
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      }

      console.log('ImagePicker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        uploadPhoto(result.assets[0].uri, category);
      }
    } catch (error) {
      console.error('ImagePicker error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  // DEV MODE: Local-only photo storage (no database sync)
  const uploadPhoto = async (uri: string, category: HousePhoto['category'] = 'other') => {
    setUploading(true);
    try {
      // For development: just use the local URI directly
      const newPhoto: HousePhoto = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file_name: `house_photo_${Date.now()}.jpg`,
        file_url: uri, // Use local URI directly
        description: 'House profile photo',
        uploaded_at: new Date().toISOString(),
        category,
      };

      setProfileData((prev) => {
        const remaining = prev.photos.filter((p) => p.category !== newPhoto.category);
        return {
          ...prev,
          photos: [...remaining, newPhoto],
        };
      });

      // No success alert in dev mode - just show the photo
    } catch (err) {
      console.error('Photo selection failed:', err);
      Alert.alert('Error', 'Failed to add photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const addHouseholdMember = (overrides: Partial<HouseholdMember> = {}) => {
    const newMember = createHouseholdMember(overrides);
    setProfileData((prev) => ({
      ...prev,
      householdMembers: [...prev.householdMembers, newMember],
    }));
  };

  const removeHouseholdMember = (memberId: string) => {
    setProfileData((prev) => ({
      ...prev,
      householdMembers: prev.householdMembers.filter((m) => m.id !== memberId),
    }));
  };

  const updateHouseholdMember = (memberId: string, updates: Partial<HouseholdMember>) => {
    setProfileData((prev) => ({
      ...prev,
      householdMembers: prev.householdMembers.map((member) =>
        member.id === memberId ? { ...member, ...updates } : member,
      ),
    }));
  };

  const pickMemberPhoto = async (memberId: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        updateHouseholdMember(memberId, { photoUrl: result.assets[0].uri });
      }
    } catch (error) {
      console.error('ImagePicker error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const updateLocalArea = (updates: Partial<LocalAreaInfo>) => {
    setProfileData((prev) => ({
      ...prev,
      localArea: {
        ...prev.localArea,
        ...updates,
      },
    }));
  };

  const addLocalAreaHighlight = (name = '') => {
    const newHighlight = createLocalAreaHighlight({ name });
    setProfileData((prev) => ({
      ...prev,
      localArea: {
        ...prev.localArea,
        highlights: [...prev.localArea.highlights, newHighlight],
      },
    }));
  };

  const updateLocalAreaHighlight = (highlightId: string, updates: Partial<LocalAreaHighlight>) => {
    setProfileData((prev) => ({
      ...prev,
      localArea: {
        ...prev.localArea,
        highlights: prev.localArea.highlights.map((highlight) =>
          highlight.id === highlightId ? { ...highlight, ...updates } : highlight,
        ),
      },
    }));
  };

  const removeLocalAreaHighlight = (highlightId: string) => {
    setProfileData((prev) => ({
      ...prev,
      localArea: {
        ...prev.localArea,
        highlights: prev.localArea.highlights.filter((highlight) => highlight.id !== highlightId),
      },
    }));
  };

  const addHouseRule = (rule: string) => {
    const trimmed = rule.trim();
    if (!trimmed) return;
    setProfileData((prev) => {
      if (prev.houseRules.includes(trimmed)) return prev;
      return {
        ...prev,
        houseRules: [...prev.houseRules, trimmed],
      };
    });
  };

  const removeHouseRule = (index: number) => {
    setProfileData((prev) => ({
      ...prev,
      houseRules: prev.houseRules.filter((_, i) => i !== index),
    }));
  };

  const addEntertainmentItem = (category: EntertainmentCategory, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setProfileData((prev) => {
      if (prev.entertainment[category].includes(trimmed)) return prev;
      return {
        ...prev,
        entertainment: {
          ...prev.entertainment,
          [category]: [...prev.entertainment[category], trimmed],
        },
      };
    });
  };

  const removeEntertainmentItem = (category: EntertainmentCategory, index: number) => {
    setProfileData((prev) => ({
      ...prev,
      entertainment: {
        ...prev.entertainment,
        [category]: prev.entertainment[category].filter((_, i) => i !== index),
      },
    }));
  };

  const handleAddHouseRule = () => {
    const trimmed = newRuleText.trim();
    if (!trimmed) return;
    addHouseRule(trimmed);
    setNewRuleText('');
  };

  const handleAddEntertainment = (category: EntertainmentCategory) => {
    const trimmed = newEntertainment[category].trim();
    if (!trimmed) return;
    addEntertainmentItem(category, trimmed);
    setNewEntertainment((prev) => ({
      ...prev,
      [category]: '',
    }));
  };

  // Step components
  const renderStep1 = () => {
    const photosByCategory = profileData.photos.reduce<Record<string, HousePhoto>>((acc, photo) => {
      acc[photo.category] = photo;
      return acc;
    }, {});

    const requiredSlots = HOUSE_IMAGE_SLOTS.filter((slot) => slot.required);
    const completedRequired = requiredSlots.filter((slot) => photosByCategory[slot.key]).length;
    const progressPercent = Math.round((completedRequired / requiredSlots.length) * 100);

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        {/* Hero Header */}
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="w-10 h-10 rounded-xl bg-[#F9F506]/20 items-center justify-center">
              <Home size={20} color="#181811" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-[#181811]">Your Home Gallery</Text>
            </View>
          </View>
          <Text className="text-[#8C8B5F] text-base leading-relaxed">
            Help the child picture their new home. Clear, welcoming photos make all the difference.
          </Text>
        </View>

        {/* Progress Card */}
        <SunbeamSurface className="mb-6">
          <View className="p-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Sparkles size={16} color="#F9F506" />
                <Text className="text-sm font-bold text-[#181811]">Photo Progress</Text>
              </View>
              <Text className="text-sm font-bold text-[#181811]">
                {completedRequired}/{requiredSlots.length} required
              </Text>
            </View>
            <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <Animated.View
                entering={FadeIn.delay(200)}
                className="h-full bg-[#F9F506] rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </View>
            {completedRequired === requiredSlots.length && (
              <Animated.View
                entering={FadeInDown.delay(300)}
                className="flex-row items-center gap-2 mt-3"
              >
                <CheckCircle size={16} color="#34C759" />
                <Text className="text-sm font-medium text-foster-carer-600">
                  All required photos complete!
                </Text>
              </Animated.View>
            )}
          </View>
        </SunbeamSurface>

        {/* Photo Grid */}
        <View className="flex-row flex-wrap" style={{ marginHorizontal: -PHOTO_GRID_GAP / 2 }}>
          {HOUSE_IMAGE_SLOTS.map((slot, index) => {
            const photo = photosByCategory[slot.key];
            const isRequired = slot.required;

            return (
              <Animated.View
                key={slot.key}
                entering={FadeInDown.delay(index * 50).duration(300)}
                style={{
                  width: PHOTO_ITEM_WIDTH,
                  marginHorizontal: PHOTO_GRID_GAP / 2,
                  marginBottom: PHOTO_GRID_GAP,
                }}
              >
                <TouchableOpacity
                  onPress={() => pickImage('library', slot.key as HousePhoto['category'])}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={
                    photo ? `Change ${slot.label} photo` : `Add ${slot.label} photo`
                  }
                  className="relative"
                >
                  {photo ? (
                    <View className="rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
                      <Image
                        source={{ uri: photo.file_url }}
                        className="w-full"
                        style={{ aspectRatio: 4 / 3 }}
                        resizeMode="cover"
                      />
                      {/* Overlay gradient */}
                      <View className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      {/* Label */}
                      <View className="absolute bottom-0 left-0 right-0 p-3">
                        <Text className="text-white text-xs font-bold" numberOfLines={1}>
                          {slot.label}
                        </Text>
                      </View>
                      {/* Edit badge */}
                      <View className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 items-center justify-center shadow-sm">
                        <Camera size={14} color="#181811" />
                      </View>
                      {/* Required badge */}
                      {isRequired && (
                        <View className="absolute top-2 left-2 bg-[#F9F506] rounded-full px-2 py-0.5">
                          <Text className="text-[10px] font-bold text-[#181811]">✓</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View
                      className={`rounded-2xl border-2 border-dashed items-center justify-center ${
                        isRequired
                          ? 'border-[#F9F506]/50 bg-[#F9F506]/5'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                      style={{ aspectRatio: 4 / 3 }}
                    >
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${
                          isRequired ? 'bg-[#F9F506]/20' : 'bg-gray-100'
                        }`}
                      >
                        <ImagePlus size={20} color={isRequired ? '#181811' : '#9CA3AF'} />
                      </View>
                      <Text
                        className={`text-xs font-semibold text-center px-2 ${
                          isRequired ? 'text-[#181811]' : 'text-gray-500'
                        }`}
                        numberOfLines={2}
                      >
                        {slot.label}
                      </Text>
                      {isRequired && (
                        <View className="mt-1.5 bg-[#F9F506] rounded-full px-2 py-0.5">
                          <Text className="text-[9px] font-bold text-[#181811]">REQUIRED</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Tip Card */}
        <SunbeamSurface className="mt-2">
          <View className="p-4 flex-row items-start gap-3">
            <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
              <Text className="text-sm">💡</Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-[#181811] mb-1">Photo tips</Text>
              <Text className="text-xs text-[#8C8B5F] leading-relaxed">
                Natural daylight works best. Show spaces as they normally look — tidy but lived-in
                feels more welcoming than too perfect.
              </Text>
            </View>
          </View>
        </SunbeamSurface>
      </Animated.View>
    );
  };

  const renderStep2 = () => (
    <Animated.View entering={FadeIn.duration(300)}>
      {/* Hero Header */}
      <View className="mb-6">
        <View className="flex-row items-center gap-3 mb-2">
          <View className="w-10 h-10 rounded-xl bg-[#F9F506]/20 items-center justify-center">
            <Users size={20} color="#181811" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-[#181811]">Meet the Family</Text>
          </View>
        </View>
        <Text className="text-[#8C8B5F] text-base leading-relaxed">
          Help the child know who they'll be living with. Every family is unique — add as many
          people as you need.
        </Text>
      </View>

      {/* Quick Add Tags */}
      <SunbeamSurface className="mb-6">
        <View className="p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Sparkles size={16} color="#F9F506" />
            <Text className="text-sm font-bold text-[#181811]">Quick Add</Text>
          </View>
          <Text className="text-xs text-[#8C8B5F] mb-4">
            Tap to add someone. You can edit details afterwards.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {QUICK_MEMBER_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag.label}
                onPress={() =>
                  addHouseholdMember({
                    relationshipLabel: tag.label,
                    role: tag.role,
                  })
                }
                activeOpacity={0.7}
                className="rounded-full bg-[#F9F506]/10 border border-[#F9F506]/30 px-4 py-2"
              >
                <Text className="text-sm font-medium text-[#181811]">{tag.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SunbeamSurface>

      {profileData.householdMembers.length === 0 ? (
        <SunbeamSurface className="mb-4">
          <View className="p-6 items-center">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
              <Users size={28} color="#9CA3AF" />
            </View>
            <Text className="text-lg font-bold text-[#181811] mb-1">No one added yet</Text>
            <Text className="text-sm text-[#8C8B5F] text-center mb-4">
              Use the quick tags above or add someone manually below.
            </Text>
            <TouchableOpacity
              className="rounded-full bg-[#F9F506] px-6 py-3"
              onPress={() => addHouseholdMember()}
              activeOpacity={0.8}
            >
              <Text className="text-sm font-bold text-[#181811]">+ Add someone</Text>
            </TouchableOpacity>
          </View>
        </SunbeamSurface>
      ) : (
        <View className="gap-4">
          {profileData.householdMembers.map((member, index) => (
            <Animated.View key={member.id} entering={FadeInDown.delay(index * 100).duration(300)}>
              <SunbeamSurface>
                <View className="p-4">
                  {/* Header with photo and delete */}
                  <View className="flex-row items-start justify-between mb-4">
                    <TouchableOpacity
                      onPress={() => pickMemberPhoto(member.id)}
                      className="relative"
                      accessibilityRole="button"
                      accessibilityLabel={`Add photo for ${member.name || 'this person'}`}
                    >
                      {member.photoUrl ? (
                        <Image
                          source={{ uri: member.photoUrl }}
                          className="w-20 h-20 rounded-2xl"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-20 h-20 rounded-2xl bg-[#F9F506]/10 items-center justify-center border-2 border-dashed border-[#F9F506]/30">
                          <User size={28} color="#181811" />
                        </View>
                      )}
                      <View className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F9F506] items-center justify-center border-2 border-white">
                        <Camera size={12} color="#181811" />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeHouseholdMember(member.id)}
                      className="p-2 rounded-full bg-red-50"
                      accessibilityRole="button"
                      accessibilityLabel="Remove member"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Form fields */}
                  <View className="gap-3">
                    <Input
                      label="Their name"
                      placeholder="e.g. Sarah"
                      value={member.name}
                      onChangeText={(text) => updateHouseholdMember(member.id, { name: text })}
                    />
                    <Input
                      label="How they identify"
                      placeholder={`e.g. "I'm your foster mum"`}
                      value={member.relationshipLabel || ''}
                      onChangeText={(text) =>
                        updateHouseholdMember(member.id, { relationshipLabel: text })
                      }
                    />
                    <View className="flex-row gap-3">
                      <View className="flex-1">
                        <Input
                          label="Age (optional)"
                          placeholder="e.g. 36"
                          value={member.age || ''}
                          onChangeText={(text) => updateHouseholdMember(member.id, { age: text })}
                        />
                      </View>
                    </View>
                    <Input
                      label="About them"
                      placeholder="They love board games and gardening..."
                      value={member.description || ''}
                      onChangeText={(text) =>
                        updateHouseholdMember(member.id, { description: text })
                      }
                      multiline
                      numberOfLines={3}
                    />
                  </View>
                </View>
              </SunbeamSurface>
            </Animated.View>
          ))}

          <TouchableOpacity
            className="rounded-xl border-2 border-dashed border-[#F9F506]/30 bg-[#F9F506]/5 py-4 items-center"
            onPress={() => addHouseholdMember()}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-bold text-[#181811]">+ Add someone else</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View entering={FadeIn.duration(300)}>
      {/* Hero Header */}
      <View className="mb-6">
        <View className="flex-row items-center gap-3 mb-2">
          <View className="w-10 h-10 rounded-xl bg-[#F9F506]/20 items-center justify-center">
            <MapPin size={20} color="#181811" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-[#181811]">Explore the Area</Text>
          </View>
        </View>
        <Text className="text-[#8C8B5F] text-base leading-relaxed">
          Share your favourite local spots — parks, play centres, weekend activities. Help the child
          imagine life in your neighbourhood.
        </Text>
      </View>

      {/* Local Overview */}
      <SunbeamSurface className="mb-6">
        <View className="p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Clock size={16} color="#F9F506" />
            <Text className="text-sm font-bold text-[#181811]">Neighbourhood Overview</Text>
          </View>
          <Text className="text-xs text-[#8C8B5F] mb-4">
            A brief description — e.g. "We live near the park and there's a cinema a short drive
            away."
          </Text>
          <Input
            multiline
            numberOfLines={3}
            placeholder="We're five minutes from school and love walking to Crazy Kingdom on rainy days..."
            value={profileData.localArea.overview}
            onChangeText={(text) => updateLocalArea({ overview: text })}
          />
        </View>
      </SunbeamSurface>

      {/* Quick Add Tags */}
      <SunbeamSurface className="mb-6">
        <View className="p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Sparkles size={16} color="#F9F506" />
            <Text className="text-sm font-bold text-[#181811]">Quick Ideas</Text>
          </View>
          <Text className="text-xs text-[#8C8B5F] mb-4">
            Tap to add, then personalise with details.
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {LOCAL_AREA_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => addLocalAreaHighlight(tag)}
                activeOpacity={0.7}
                className="rounded-full bg-[#F9F506]/10 border border-[#F9F506]/30 px-4 py-2"
              >
                <Text className="text-sm font-medium text-[#181811]">{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SunbeamSurface>

      {profileData.localArea.highlights.length === 0 ? (
        <SunbeamSurface>
          <View className="p-6 items-center">
            <View className="w-16 h-16 rounded-full bg-gray-100 items-center justify-center mb-4">
              <MapPin size={28} color="#9CA3AF" />
            </View>
            <Text className="text-lg font-bold text-[#181811] mb-1">No places added yet</Text>
            <Text className="text-sm text-[#8C8B5F] text-center mb-4">
              Parks, play centres, cinemas — anywhere you enjoy visiting together.
            </Text>
            <TouchableOpacity
              className="rounded-full bg-[#F9F506] px-6 py-3"
              onPress={() => addLocalAreaHighlight()}
              activeOpacity={0.8}
            >
              <Text className="text-sm font-bold text-[#181811]">+ Add a place</Text>
            </TouchableOpacity>
          </View>
        </SunbeamSurface>
      ) : (
        <View className="gap-4">
          {profileData.localArea.highlights.map((highlight, index) => (
            <Animated.View
              key={highlight.id}
              entering={FadeInDown.delay(index * 100).duration(300)}
            >
              <SunbeamSurface>
                <View className="p-4">
                  <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center">
                        <MapPin size={16} color="#1d4ed8" />
                      </View>
                      <Text className="text-sm font-bold text-[#181811]">Place {index + 1}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeLocalAreaHighlight(highlight.id)}
                      className="p-2 rounded-full bg-red-50"
                      accessibilityRole="button"
                      accessibilityLabel="Remove highlight"
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                  <View className="gap-3">
                    <Input
                      label="Place or activity"
                      placeholder="Crazy Kingdom soft play"
                      value={highlight.name}
                      onChangeText={(text) =>
                        updateLocalAreaHighlight(highlight.id, { name: text })
                      }
                    />
                    <Input
                      label="What makes it special?"
                      placeholder="We usually go here after school on Fridays and get slushies."
                      multiline
                      numberOfLines={3}
                      value={highlight.description}
                      onChangeText={(text) =>
                        updateLocalAreaHighlight(highlight.id, { description: text })
                      }
                    />
                  </View>
                </View>
              </SunbeamSurface>
            </Animated.View>
          ))}

          <TouchableOpacity
            className="rounded-xl border-2 border-dashed border-[#F9F506]/30 bg-[#F9F506]/5 py-4 items-center"
            onPress={() => addLocalAreaHighlight()}
            activeOpacity={0.7}
          >
            <Text className="text-sm font-bold text-[#181811]">+ Add another place</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );

  const renderStep4 = () => (
    <Animated.View entering={FadeIn.duration(300)}>
      {/* Hero Header */}
      <View className="mb-6">
        <View className="flex-row items-center gap-3 mb-2">
          <View className="w-10 h-10 rounded-xl bg-[#F9F506]/20 items-center justify-center">
            <Gamepad2 size={20} color="#181811" />
          </View>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-[#181811]">Life at Home</Text>
          </View>
        </View>
        <Text className="text-[#8C8B5F] text-base leading-relaxed">
          Share your house rules and favourite activities. Help the child know what to expect.
        </Text>
      </View>

      {/* House Rules */}
      <SunbeamSurface className="mb-6">
        <View className="p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Home size={16} color="#F9F506" />
            <Text className="text-sm font-bold text-[#181811]">House Rules</Text>
          </View>
          <Text className="text-xs text-[#8C8B5F] mb-4">
            Friendly expectations that help everyone feel safe.
          </Text>

          <View className="flex-row flex-wrap gap-2 mb-4">
            {HOUSE_RULE_SUGGESTIONS.map((rule) => (
              <TouchableOpacity
                key={rule}
                onPress={() => addHouseRule(rule)}
                activeOpacity={0.7}
                className="rounded-full bg-[#F9F506]/10 border border-[#F9F506]/30 px-3 py-1.5"
              >
                <Text className="text-xs font-medium text-[#181811]">{rule}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {profileData.houseRules.length > 0 && (
            <View className="gap-2 mb-4">
              {profileData.houseRules.map((rule, index) => (
                <View
                  key={`${rule}-${index}`}
                  className="flex-row items-center rounded-xl bg-gray-50 border border-gray-100 px-3 py-2"
                >
                  <Text className="text-sm text-[#181811] flex-1">{rule}</Text>
                  <TouchableOpacity
                    onPress={() => removeHouseRule(index)}
                    className="p-1.5 rounded-full bg-red-50"
                  >
                    <Trash2 size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View className="flex-row items-end gap-2">
            <View className="flex-1">
              <Input
                placeholder="Add your own rule..."
                value={newRuleText}
                onChangeText={setNewRuleText}
              />
            </View>
            <TouchableOpacity
              onPress={handleAddHouseRule}
              className="rounded-xl bg-[#F9F506] px-4 py-3"
              activeOpacity={0.8}
            >
              <Text className="text-sm font-bold text-[#181811]">Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SunbeamSurface>

      {/* Entertainment */}
      <SunbeamSurface>
        <View className="p-4">
          <View className="flex-row items-center gap-2 mb-3">
            <Sparkles size={16} color="#F9F506" />
            <Text className="text-sm font-bold text-[#181811]">Things We Enjoy</Text>
          </View>

          {(['tvShows', 'games', 'hobbies'] as EntertainmentCategory[]).map(
            (category, catIndex) => (
              <View
                key={category}
                className={catIndex > 0 ? 'mt-6 pt-6 border-t border-gray-100' : ''}
              >
                <Text className="text-sm font-semibold text-[#181811] mb-1">
                  {ENTERTAINMENT_CONFIG[category].label}
                </Text>
                <Text className="text-xs text-[#8C8B5F] mb-3">
                  Share favourites so they know what to expect.
                </Text>

                {profileData.entertainment[category].length > 0 && (
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    {profileData.entertainment[category].map((item, index) => (
                      <View
                        key={`${item}-${index}`}
                        className="flex-row items-center rounded-full bg-blue-50 pl-3 pr-1.5 py-1"
                      >
                        <Text className="text-xs font-medium text-blue-700 mr-1">{item}</Text>
                        <TouchableOpacity
                          onPress={() => removeEntertainmentItem(category, index)}
                          className="p-1"
                        >
                          <Trash2 size={12} color="#3b82f6" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                <View className="flex-row flex-wrap gap-2 mb-3">
                  {ENTERTAINMENT_SUGGESTIONS[category].map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion}
                      onPress={() => addEntertainmentItem(category, suggestion)}
                      activeOpacity={0.7}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1.5"
                    >
                      <Text className="text-xs font-medium text-[#8C8B5F]">+ {suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View className="flex-row items-end gap-2">
                  <View className="flex-1">
                    <Input
                      placeholder={ENTERTAINMENT_CONFIG[category].placeholder}
                      value={newEntertainment[category]}
                      onChangeText={(text) =>
                        setNewEntertainment((prev) => ({
                          ...prev,
                          [category]: text,
                        }))
                      }
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAddEntertainment(category)}
                    className="rounded-xl bg-[#F9F506] px-4 py-3"
                    activeOpacity={0.8}
                  >
                    <Text className="text-sm font-bold text-[#181811]">Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ),
          )}
        </View>
      </SunbeamSurface>
    </Animated.View>
  );

  const renderStep5 = () => {
    const requiredSlots = HOUSE_IMAGE_SLOTS.filter((slot) => slot.required);
    const photosByCategory = profileData.photos.reduce<Record<string, HousePhoto>>((acc, photo) => {
      acc[photo.category] = photo;
      return acc;
    }, {});
    const completedPhotos = requiredSlots.filter((slot) => photosByCategory[slot.key]).length;
    const isReadyToPublish = completedPhotos >= 3 && profileData.householdMembers.length > 0;

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        {/* Hero Header */}
        <View className="mb-6">
          <View className="flex-row items-center gap-3 mb-2">
            <View className="w-10 h-10 rounded-xl bg-[#F9F506]/20 items-center justify-center">
              <CheckCircle size={20} color="#181811" />
            </View>
            <View className="flex-1">
              <Text className="text-2xl font-bold text-[#181811]">Ready to Share</Text>
            </View>
          </View>
          <Text className="text-[#8C8B5F] text-base leading-relaxed">
            Review your profile before making it visible to children in your care.
          </Text>
        </View>

        {/* Profile Summary */}
        <SunbeamSurface className="mb-6">
          <View className="p-4">
            <View className="flex-row items-center gap-2 mb-4">
              <Sparkles size={16} color="#F9F506" />
              <Text className="text-sm font-bold text-[#181811]">Profile Summary</Text>
            </View>

            <View className="gap-3">
              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <View className="flex-row items-center gap-2">
                  <Home size={16} color="#8C8B5F" />
                  <Text className="text-sm text-[#181811]">Photos</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-[#181811]">
                    {completedPhotos}/{requiredSlots.length}
                  </Text>
                  {completedPhotos >= requiredSlots.length && (
                    <CheckCircle size={14} color="#34C759" />
                  )}
                </View>
              </View>

              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <View className="flex-row items-center gap-2">
                  <Users size={16} color="#8C8B5F" />
                  <Text className="text-sm text-[#181811]">Household Members</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-[#181811]">
                    {profileData.householdMembers.length}
                  </Text>
                  {profileData.householdMembers.length > 0 && (
                    <CheckCircle size={14} color="#34C759" />
                  )}
                </View>
              </View>

              <View className="flex-row items-center justify-between py-2 border-b border-gray-100">
                <View className="flex-row items-center gap-2">
                  <MapPin size={16} color="#8C8B5F" />
                  <Text className="text-sm text-[#181811]">Local Area</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-[#181811]">
                    {profileData.localArea.highlights.length} places
                  </Text>
                  {profileData.localArea.overview && <CheckCircle size={14} color="#34C759" />}
                </View>
              </View>

              <View className="flex-row items-center justify-between py-2">
                <View className="flex-row items-center gap-2">
                  <Gamepad2 size={16} color="#8C8B5F" />
                  <Text className="text-sm text-[#181811]">House Rules & Fun</Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-bold text-[#181811]">
                    {profileData.houseRules.length} rules
                  </Text>
                  {profileData.houseRules.length > 0 && <CheckCircle size={14} color="#34C759" />}
                </View>
              </View>
            </View>
          </View>
        </SunbeamSurface>

        {!profileData.isPublished ? (
          <Animated.View entering={FadeInDown.delay(200)}>
            {!isReadyToPublish && (
              <View className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <Text className="text-sm font-semibold text-amber-800 mb-1">Almost there!</Text>
                <Text className="text-xs text-amber-700">
                  Add at least 3 photos and 1 household member to publish.
                </Text>
              </View>
            )}
            <TouchableOpacity
              className={`w-full rounded-2xl py-4 items-center ${
                isReadyToPublish ? 'bg-[#F9F506]' : 'bg-gray-200'
              }`}
              onPress={isReadyToPublish ? publishProfile : undefined}
              activeOpacity={isReadyToPublish ? 0.8 : 1}
              disabled={!isReadyToPublish}
            >
              <Text
                className={`font-bold text-base ${
                  isReadyToPublish ? 'text-[#181811]' : 'text-gray-400'
                }`}
              >
                Publish Profile
              </Text>
              <Text
                className={`text-sm mt-0.5 ${
                  isReadyToPublish ? 'text-[#181811]/70' : 'text-gray-400'
                }`}
              >
                Make visible to children in your care
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(200)}>
            <SunbeamSurface className="mb-4 bg-green-50 border-green-200">
              <View className="p-6 items-center">
                <View className="w-16 h-16 rounded-full bg-green-100 items-center justify-center mb-3">
                  <CheckCircle size={32} color="#10B981" />
                </View>
                <Text className="text-lg font-bold text-green-700 mb-1">Profile Published!</Text>
                <Text className="text-sm text-green-600 text-center">
                  Your house profile is now visible to children in your care.
                </Text>
              </View>
            </SunbeamSurface>

            <TouchableOpacity
              className="w-full bg-[#F9F506] rounded-2xl py-4 items-center"
              onPress={() => router.push('/(foster_carer)/view-house-profile')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="View your published house profile"
            >
              <View className="flex-row items-center">
                <Eye size={20} color="#181811" />
                <Text className="text-[#181811] font-bold text-base ml-2">View Profile</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        return renderStep5();
      default:
        return renderStep1();
    }
  };

  const getStepTitle = () => {
    const titles = [
      'Photos of your home',
      'Who lives here',
      'Local area highlights',
      'Rules & fun things',
      'Review & publish',
    ];
    return titles[currentStep - 1];
  };

  const getStepIcon = () => {
    const icons = [Home, Users, Clock, Gamepad2, CheckCircle];
    const Icon = icons[currentStep - 1];
    return <Icon size={24} color="#34C759" />;
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8F8F5]">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F9F506" />
          <Text className="mt-4 text-sm text-[#8C8B5F]">Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8F8F5]">
      <View className="flex-1">
        {/* Premium Progress Header */}
        <View className="bg-white border-b border-black/5 px-4 pt-4 pb-4">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 rounded-xl bg-[#F9F506]/20 items-center justify-center mr-3">
                {getStepIcon()}
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-[#8C8B5F] uppercase tracking-wider mb-0.5">
                  House Profile
                </Text>
                <Text className="text-lg font-bold text-[#181811]" numberOfLines={1}>
                  {getStepTitle()}
                </Text>
              </View>
            </View>
            <View className="bg-[#F9F506]/10 rounded-full px-3 py-1">
              <Text className="text-xs font-bold text-[#181811]">{currentStep}/5</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View className="flex-row gap-1.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <View
                key={step}
                className={`h-1.5 flex-1 rounded-full ${
                  step <= currentStep ? 'bg-[#F9F506]' : 'bg-gray-100'
                }`}
              />
            ))}
          </View>
        </View>

        {/* Content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="p-4">
              {/* Preview button */}
              <View className="mb-4 flex-row justify-end">
                <TouchableOpacity
                  className="flex-row items-center rounded-full bg-white border border-black/5 px-4 py-2 shadow-sm"
                  accessibilityRole="button"
                  accessibilityLabel="Preview house profile as the child will see it"
                  onPress={() => router.push('/(foster_carer)/preview-house-profile')}
                  activeOpacity={0.7}
                >
                  <Eye size={14} color="#181811" />
                  <Text className="ml-2 text-xs font-bold text-[#181811]">Preview</Text>
                </TouchableOpacity>
              </View>

              {uploading && (
                <SunbeamSurface className="mb-4">
                  <View className="p-4 flex-row items-center">
                    <ActivityIndicator size="small" color="#F9F506" />
                    <Text className="ml-3 text-sm text-[#181811]">Uploading photo...</Text>
                  </View>
                </SunbeamSurface>
              )}

              {renderCurrentStep()}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Navigation Footer */}
        <View className="bg-white border-t border-black/5 px-4 py-3">
          <View className="flex-row gap-3">
            {currentStep > 1 && (
              <TouchableOpacity
                className="flex-1 bg-gray-100 rounded-xl py-4 items-center"
                onPress={goToPreviousStep}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center">
                  <ChevronLeft size={18} color="#181811" />
                  <Text className="text-[#181811] font-bold ml-1">Back</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className={`${
                currentStep > 1 ? 'flex-1' : 'w-full'
              } bg-[#F9F506] rounded-xl py-4 items-center`}
              activeOpacity={0.8}
              onPress={
                currentStep === 5
                  ? profileData.isPublished
                    ? () => router.push('/(foster_carer)/view-house-profile')
                    : publishProfile
                  : goToNextStep
              }
            >
              <View className="flex-row items-center">
                {currentStep === 5 && profileData.isPublished && <Eye size={18} color="#181811" />}
                <Text
                  className={`text-[#181811] font-bold text-base ${currentStep === 5 && profileData.isPublished ? 'ml-2' : ''}`}
                >
                  {currentStep === 5
                    ? profileData.isPublished
                      ? 'View Profile'
                      : 'Publish'
                    : 'Continue'}
                </Text>
                {currentStep < 5 && <ChevronRight size={18} color="#181811" className="ml-1" />}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Celebration Modal */}
      {showCelebration && (
        <Animated.View
          entering={FadeIn.duration(300)}
          className="absolute inset-0 bg-black/60 items-center justify-center z-50"
        >
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            className="bg-white rounded-3xl mx-6 p-8 items-center shadow-2xl"
          >
            <View className="w-20 h-20 rounded-full bg-green-100 items-center justify-center mb-4">
              <CheckCircle size={40} color="#10B981" />
            </View>
            <Text className="text-2xl font-bold text-[#181811] text-center mb-2">
              Profile Published!
            </Text>
            <Text className="text-base text-[#8C8B5F] text-center mb-6 leading-relaxed">
              Your house profile is now visible to children in your care. They can explore your home
              and get to know your family.
            </Text>
            <View className="w-full gap-3">
              <TouchableOpacity
                onPress={() => {
                  setShowCelebration(false);
                  router.push('/(foster_carer)/view-house-profile');
                }}
                className="w-full bg-[#F9F506] rounded-xl py-4 items-center"
                activeOpacity={0.8}
              >
                <View className="flex-row items-center">
                  <Eye size={18} color="#181811" />
                  <Text className="text-[#181811] font-bold ml-2">View Your Profile</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowCelebration(false)}
                className="w-full py-3 items-center"
                activeOpacity={0.7}
              >
                <Text className="text-[#8C8B5F] font-medium">Continue Editing</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}
