import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import {
  Camera,
  Trash2,
  Home,
  ChevronLeft,
  ChevronRight,
  Users,
  Clock,
  Gamepad2,
  CheckCircle,
  Eye,
  User,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Text, Card, Input } from '../../../src/components/ui';
import { useAuth } from '../../../src/contexts/AuthContext';
import { supabase } from '../../../src/lib/supabase';

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

      Alert.alert(
        'Success!',
        'Your house profile has been published and is now visible to the child.',
      );
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

  const updateHouseRule = (index: number, value: string) => {
    setProfileData((prev) => ({
      ...prev,
      houseRules: prev.houseRules.map((rule, i) => (i === index ? value : rule)),
    }));
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

    return (
      <View>
        <Text variant="h2" weight="bold" className="mb-2">
          House profile photos
        </Text>
        <Text variant="body" color="muted" className="mb-4">
          Add one clear photo for each part of your home. This builds the preview card children see,
          similar to an Airbnb listing.
        </Text>

        <Card variant="outlined" className="mb-5 bg-foster-carer-50 border-foster-carer-100">
          <View className="p-3">
            <Text variant="caption" weight="semibold" className="text-foster-carer-700">
              Required photos: {completedRequired} of {requiredSlots.length}
            </Text>
            <Text variant="caption" color="muted" className="mt-1">
              You can always come back and update these later.
            </Text>
          </View>
        </Card>

        {HOUSE_IMAGE_SLOTS.map((slot) => {
          const photo = photosByCategory[slot.key];

          return (
            <Card key={slot.key} variant="outlined" className="mb-4">
              <View className="p-4">
                <View className="mb-3 flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text variant="body" weight="semibold" className="text-gray-900">
                      {slot.label}
                    </Text>
                    {slot.description && (
                      <Text variant="caption" color="muted" className="mt-1">
                        {slot.description}
                      </Text>
                    )}
                  </View>
                  <View
                    className={`rounded-full px-2 py-1 ${
                      slot.required ? 'bg-foster-carer-50' : 'bg-gray-50'
                    }`}
                  >
                    <Text className="text-[10px] font-semibold text-gray-700">
                      {slot.required ? (photo ? 'Required  b7 Done' : 'Required') : 'Optional'}
                    </Text>
                  </View>
                </View>

                {photo ? (
                  <TouchableOpacity
                    className="overflow-hidden rounded-xl bg-gray-100"
                    onPress={() => pickImage('library', slot.key as HousePhoto['category'])}
                    accessibilityRole="button"
                    accessibilityLabel={`Change photo for ${slot.label}`}
                  >
                    <Image
                      source={{ uri: photo.file_url }}
                      className="h-40 w-full"
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    className="mt-1 items-center justify-center rounded-xl border border-dashed border-foster-carer-200 bg-white px-4 py-6"
                    onPress={() => pickImage('library', slot.key as HousePhoto['category'])}
                    accessibilityRole="button"
                    accessibilityLabel={`Add photo for ${slot.label}`}
                  >
                    <Camera size={22} color="#34C759" />
                    <Text className="mt-2 text-sm font-medium text-foster-carer-600">
                      Add photo
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500">
                      Tap to choose from your library
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          );
        })}
      </View>
    );
  };

  const renderStep2 = () => (
    <View>
      <Text variant="h2" weight="bold" className="mb-2">
        Step 2: Household Members
      </Text>
      <Text variant="body" color="muted" className="mb-6">
        Tell us about who lives in the house. Tap the tags below as many times as you need — copies
        are welcome for blended and chosen families.
      </Text>

      <Card variant="outlined" className="mb-4">
        <View className="p-4">
          <Text variant="body" weight="semibold">
            <Users size={20} className="inline mr-2" /> Quick add
          </Text>
          <Text variant="caption" color="muted" className="mt-1">
            Tap to insert a person. You can edit their name or description afterwards.
          </Text>
          <View className="flex-row flex-wrap gap-2 mt-4">
            {QUICK_MEMBER_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag.label}
                onPress={() =>
                  addHouseholdMember({
                    relationshipLabel: tag.label,
                    role: tag.role,
                  })
                }
                className="rounded-full border border-foster-carer-200 bg-foster-carer-50 px-4 py-2"
              >
                <Text className="text-sm font-medium text-foster-carer-600">{tag.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      {profileData.householdMembers.length === 0 ? (
        <Card variant="outlined" className="mb-4">
          <View className="p-4 items-center">
            <Users size={20} color="#9CA3AF" />
            <Text variant="body" weight="medium" className="mt-3 mb-1">
              No one added yet
            </Text>
            <Text variant="caption" color="muted" className="text-center">
              Add someone using the quick tags above or create a custom entry.
            </Text>
            <TouchableOpacity
              className="mt-4 rounded-full bg-foster-carer-500 px-4 py-2"
              onPress={() => addHouseholdMember()}
            >
              <Text className="text-sm font-semibold text-white">+ Add someone</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : (
        <View className="space-y-4">
          {profileData.householdMembers.map((member, index) => (
            <Card key={member.id} variant="outlined">
              <View className="p-4">
                <View className="flex-row items-center justify-between mb-4">
                  <Text variant="body" weight="semibold">
                    {member.role === 'pet' ? 'Pet' : 'Person'} {index + 1}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeHouseholdMember(member.id)}
                    className="p-2"
                    accessibilityRole="button"
                    accessibilityLabel="Remove member"
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>

                {/* Photo Upload Section */}
                <View className="items-center mb-4">
                  <TouchableOpacity
                    onPress={() => pickMemberPhoto(member.id)}
                    className="relative"
                    accessibilityRole="button"
                    accessibilityLabel={`Add photo for ${member.name || 'this person'}`}
                  >
                    {member.photoUrl ? (
                      <Image
                        source={{ uri: member.photoUrl }}
                        className="w-24 h-24 rounded-full"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-24 h-24 rounded-full bg-foster-carer-100 items-center justify-center border-2 border-dashed border-foster-carer-300">
                        <User size={32} color="#34C759" />
                      </View>
                    )}
                    {/* Camera badge */}
                    <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-foster-carer-500 items-center justify-center border-2 border-white">
                      <Camera size={14} color="white" />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => pickMemberPhoto(member.id)} className="mt-2">
                    <Text className="text-sm text-foster-carer-600 font-medium">
                      {member.photoUrl ? 'Change photo' : 'Add photo'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View className="space-y-3">
                  <Input
                    label="Their name"
                    placeholder="e.g. Sarah"
                    value={member.name}
                    onChangeText={(text) => updateHouseholdMember(member.id, { name: text })}
                  />
                  <Input
                    label="How they identify (in their own words)"
                    placeholder={`e.g. "I'm your foster mum"`}
                    value={member.relationshipLabel || ''}
                    onChangeText={(text) =>
                      updateHouseholdMember(member.id, { relationshipLabel: text })
                    }
                  />
                  <Input
                    label="Age (optional)"
                    placeholder="e.g. 36"
                    value={member.age || ''}
                    onChangeText={(text) => updateHouseholdMember(member.id, { age: text })}
                  />
                  <Input
                    label="Tell us a little about them"
                    placeholder="They love board games and gardening..."
                    value={member.description || ''}
                    onChangeText={(text) => updateHouseholdMember(member.id, { description: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </Card>
          ))}

          <TouchableOpacity
            className="rounded-xl border border-dashed border-foster-carer-300 bg-foster-carer-50 py-3 items-center"
            onPress={() => addHouseholdMember()}
          >
            <Text className="text-sm font-medium text-foster-carer-600">+ Add someone else</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text variant="h2" weight="bold" className="mb-2">
        Step 3: Local area highlights
      </Text>
      <Text variant="body" color="muted" className="mb-6">
        Help the child picture life beyond your home. Share favourite nearby places, after-school
        activities, or weekend spots you love to visit together.
      </Text>

      <Card variant="outlined" className="mb-4">
        <View className="p-4">
          <Text variant="body" weight="semibold">
            <Clock size={20} className="inline mr-2" /> Local overview
          </Text>
          <Text variant="caption" color="muted" className="mt-1">
            Keep it simple and reassuring — e.g. “We live near the park and the cinema is a short
            drive away”.
          </Text>
          <Input
            className="mt-4"
            multiline
            numberOfLines={3}
            label="Describe the local area"
            placeholder="We’re five minutes from school and love walking to Crazy Kingdom on rainy days..."
            value={profileData.localArea.overview}
            onChangeText={(text) => updateLocalArea({ overview: text })}
          />
        </View>
      </Card>

      <Card variant="outlined" className="mb-4">
        <View className="p-4">
          <Text variant="body" weight="semibold">
            Quick ideas
          </Text>
          <Text variant="caption" color="muted" className="mt-1">
            Tap to add a highlight, then personalise it.
          </Text>
          <View className="flex-row flex-wrap gap-2 mt-4">
            {LOCAL_AREA_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => addLocalAreaHighlight(tag)}
                className="rounded-full border border-foster-carer-200 bg-foster-carer-50 px-4 py-2"
              >
                <Text className="text-sm font-medium text-foster-carer-600">{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      {profileData.localArea.highlights.length === 0 ? (
        <Card variant="outlined">
          <View className="p-4 items-center">
            <Text variant="body" weight="medium" className="mb-2">
              No places added yet
            </Text>
            <Text variant="caption" color="muted" className="text-center">
              Add a park, soft play centre, cinema or anything else you enjoy together.
            </Text>
            <TouchableOpacity
              className="mt-4 rounded-full bg-foster-carer-500 px-4 py-2"
              onPress={() => addLocalAreaHighlight()}
            >
              <Text className="text-sm font-semibold text-white">+ Add a highlight</Text>
            </TouchableOpacity>
          </View>
        </Card>
      ) : (
        <View className="space-y-4">
          {profileData.localArea.highlights.map((highlight, index) => (
            <Card key={highlight.id} variant="outlined">
              <View className="p-4">
                <View className="flex-row items-center justify-between mb-4">
                  <Text variant="body" weight="semibold">
                    Place {index + 1}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeLocalAreaHighlight(highlight.id)}
                    className="p-2"
                    accessibilityRole="button"
                    accessibilityLabel="Remove highlight"
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
                <Input
                  label="Place or activity"
                  placeholder="Crazy Kingdom soft play"
                  value={highlight.name}
                  onChangeText={(text) => updateLocalAreaHighlight(highlight.id, { name: text })}
                />
                <Input
                  className="mt-3"
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
            </Card>
          ))}

          <TouchableOpacity
            className="rounded-xl border border-dashed border-foster-carer-300 bg-foster-carer-50 py-3 items-center"
            onPress={() => addLocalAreaHighlight()}
          >
            <Text className="text-sm font-medium text-foster-carer-600">+ Add another place</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text variant="h2" weight="bold" className="mb-2">
        Step 4: House rules & things to do at home
      </Text>
      <Text variant="body" color="muted" className="mb-6">
        Set gentle expectations and share some of the fun things you like doing together at home.
      </Text>

      <Card variant="outlined" className="mb-4">
        <View className="p-4">
          <Text variant="body" weight="semibold">
            House rules that help everyone feel safe
          </Text>
          <Text variant="caption" color="muted" className="mt-1">
            Keep them friendly and reassuring. Tap a suggestion or write your own.
          </Text>

          <View className="flex-row flex-wrap gap-2 mt-4">
            {HOUSE_RULE_SUGGESTIONS.map((rule) => (
              <TouchableOpacity
                key={rule}
                onPress={() => addHouseRule(rule)}
                className="rounded-full border border-foster-carer-200 bg-foster-carer-50 px-4 py-2"
              >
                <Text className="text-sm font-medium text-foster-carer-600">{rule}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="mt-4 space-y-3">
            {profileData.houseRules.length === 0 ? (
              <Text variant="caption" color="muted">
                No rules added yet.
              </Text>
            ) : (
              profileData.houseRules.map((rule, index) => (
                <View
                  key={`${rule}-${index}`}
                  className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <Input
                    className="flex-1"
                    value={rule}
                    onChangeText={(text) => updateHouseRule(index, text)}
                  />
                  <TouchableOpacity onPress={() => removeHouseRule(index)} className="ml-2 p-2">
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>

          <View className="mt-4 flex-row items-end gap-2">
            <View className="flex-1">
              <Input
                label="Add your own"
                placeholder="We keep phones downstairs overnight"
                value={newRuleText}
                onChangeText={setNewRuleText}
              />
            </View>
            <TouchableOpacity
              onPress={handleAddHouseRule}
              className="rounded-lg bg-foster-carer-500 px-5 py-3"
            >
              <Text className="text-white text-sm font-semibold">Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      <Card variant="outlined">
        <View className="p-4">
          <Text variant="body" weight="semibold" className="mb-4">
            <Gamepad2 size={20} className="inline mr-2" />
            Things we enjoy doing
          </Text>

          {(['tvShows', 'games', 'hobbies'] as EntertainmentCategory[]).map((category) => (
            <View key={category} className="mb-6">
              <Text variant="body" weight="medium">
                {ENTERTAINMENT_CONFIG[category].label}
              </Text>
              <Text variant="caption" color="muted" className="mb-2">
                Share favourites so they know what to expect.
              </Text>

              {profileData.entertainment[category].length === 0 ? (
                <Text variant="caption" color="muted">
                  Nothing added yet.
                </Text>
              ) : (
                profileData.entertainment[category].map((item, index) => (
                  <View
                    key={`${item}-${index}`}
                    className="mt-2 flex-row items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <Text className="text-sm text-gray-800 flex-1 mr-2">{item}</Text>
                    <TouchableOpacity onPress={() => removeEntertainmentItem(category, index)}>
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <View className="flex-row flex-wrap gap-2 mt-3">
                {ENTERTAINMENT_SUGGESTIONS[category].map((suggestion) => (
                  <TouchableOpacity
                    key={suggestion}
                    onPress={() => addEntertainmentItem(category, suggestion)}
                    className="rounded-full border border-foster-carer-200 bg-white px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-foster-carer-600">{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="mt-3 flex-row items-end gap-2">
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
                  className="rounded-lg bg-foster-carer-500 px-5 py-3"
                >
                  <Text className="text-white text-sm font-semibold">Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );

  const renderStep5 = () => (
    <View>
      <Text variant="h2" weight="bold" className="mb-2">
        Step 5: Review & Publish
      </Text>
      <Text variant="body" color="muted" className="mb-6">
        Review your house profile before publishing.
      </Text>

      <Card variant="outlined" className="mb-4">
        <View className="p-4">
          <Text variant="body" weight="semibold" className="mb-4">
            <CheckCircle size={20} className="inline mr-2" />
            Profile Summary
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text variant="body" color="muted">
                Photos
              </Text>
              <Text variant="body" weight="medium">
                {profileData.photos.length}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text variant="body" color="muted">
                Household Members
              </Text>
              <Text variant="body" weight="medium">
                {profileData.householdMembers.length}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text variant="body" color="muted">
                Local Area Overview
              </Text>
              <Text variant="body" weight="medium">
                {profileData.localArea.overview ? '✓' : '○'}
              </Text>
            </View>

            <View className="flex-row justify-between">
              <Text variant="body" color="muted">
                House Rules
              </Text>
              <Text variant="body" weight="medium">
                {profileData.houseRules.length}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {!profileData.isPublished ? (
        <TouchableOpacity
          className="w-full bg-foster-carer-500 rounded-xl py-4 items-center"
          onPress={publishProfile}
        >
          <Text className="text-white font-semibold text-base">Publish Profile</Text>
          <Text className="text-white/80 text-sm mt-1">
            Make this visible to children in your care
          </Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Card variant="outlined" className="bg-green-50 border-green-200 mb-4">
            <View className="p-4 items-center">
              <CheckCircle size={48} color="#10B981" />
              <Text variant="h3" weight="semibold" className="mt-3 mb-1 text-green-700">
                Profile Published!
              </Text>
              <Text variant="body" color="muted" className="text-center">
                Your house profile is now visible to children in your care.
              </Text>
            </View>
          </Card>

          <TouchableOpacity
            className="w-full bg-foster-carer-500 rounded-xl py-4 items-center"
            onPress={() => router.push('/(foster_carer)/view-house-profile')}
            accessibilityRole="button"
            accessibilityLabel="View your published house profile"
          >
            <View className="flex-row items-center">
              <Eye size={20} color="white" />
              <Text className="text-white font-semibold text-base ml-2">View Profile</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#34C759" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* Compact progress header */}
        <View className="bg-white border-b border-gray-200 px-4 pt-3 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="mr-3">{getStepIcon()}</View>
              <View className="flex-1">
                <Text variant="caption" color="muted" className="uppercase tracking-[0.16em] mb-1">
                  House profile
                </Text>
                <Text variant="body" weight="semibold" className="text-gray-900" numberOfLines={2}>
                  {getStepTitle()}
                </Text>
              </View>
            </View>
            <Text variant="caption" color="muted" className="ml-3">
              Step {currentStep} of 5
            </Text>
          </View>

          {/* Progress bar */}
          <View className="mt-3 flex-row gap-1.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <View
                key={step}
                className={`h-1.5 flex-1 rounded-full ${
                  step <= currentStep ? 'bg-foster-carer-500' : 'bg-foster-carer-100'
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
          <ScrollView className="flex-1">
            <View className="p-4">
              {/* Preview as child button */}
              <View className="mb-4 flex-row justify-end">
                <TouchableOpacity
                  className="flex-row items-center rounded-full border border-foster-carer-200 bg-white px-3 py-1.5"
                  accessibilityRole="button"
                  accessibilityLabel="Preview house profile as the child will see it"
                  onPress={() => router.push('/(foster_carer)/preview-house-profile')}
                >
                  <Eye size={16} color="#34C759" />
                  <Text className="ml-2 text-xs font-semibold text-foster-carer-600">
                    Preview as child
                  </Text>
                </TouchableOpacity>
              </View>

              {uploading && (
                <Card variant="outlined" className="mb-4 bg-foster-carer-50">
                  <View className="p-4 flex-row items-center">
                    <ActivityIndicator size="small" color="#34C759" />
                    <Text className="ml-3">Uploading photo...</Text>
                  </View>
                </Card>
              )}

              {renderCurrentStep()}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Navigation Footer */}
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <View className="flex-row gap-3">
            {currentStep > 1 && (
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                onPress={goToPreviousStep}
              >
                <View className="flex-row items-center">
                  <ChevronLeft size={20} color="#374151" />
                  <Text className="text-gray-700 font-semibold ml-2">Previous</Text>
                </View>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className={`${
                currentStep > 1 ? 'flex-1' : 'w-full'
              } bg-foster-carer-500 rounded-xl py-4 items-center`}
              onPress={
                currentStep === 5
                  ? profileData.isPublished
                    ? () => router.push('/(foster_carer)/view-house-profile')
                    : publishProfile
                  : goToNextStep
              }
            >
              <View className="flex-row items-center">
                {currentStep === 5 && profileData.isPublished && <Eye size={20} color="white" />}
                <Text
                  className={`text-white font-semibold text-base ${currentStep === 5 && profileData.isPublished ? 'ml-2' : 'mr-2'}`}
                >
                  {currentStep === 5
                    ? profileData.isPublished
                      ? 'View Profile'
                      : 'Publish'
                    : 'Next'}
                </Text>
                {currentStep < 5 && <ChevronRight size={20} color="white" />}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
