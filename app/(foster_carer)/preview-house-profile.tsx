import React from 'react';
import { ScrollView, View, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Home, Users, MapPin, Gamepad2, Heart, Tv, Star } from 'lucide-react-native';
import { Text, Card } from '../../src/components/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Demo data that shows what a complete profile looks like
const DEMO_PROFILE = {
  photos: [
    {
      id: '1',
      category: 'exterior',
      label: 'Outside',
      url: 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800&h=600&fit=crop',
    },
    {
      id: '2',
      category: 'living_room',
      label: 'Living Room',
      url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
    },
    {
      id: '3',
      category: 'bedroom',
      label: 'Your Bedroom',
      url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&h=600&fit=crop',
    },
    {
      id: '4',
      category: 'kitchen',
      label: 'Kitchen',
      url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop',
    },
    {
      id: '5',
      category: 'garden',
      label: 'Garden',
      url: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?w=800&h=600&fit=crop',
    },
  ],
  householdMembers: [
    {
      id: '1',
      name: 'Sarah',
      relationshipLabel: 'Foster Mum',
      age: '42',
      description: "I love baking and going for walks. I work from home so I'm usually around!",
    },
    {
      id: '2',
      name: 'David',
      relationshipLabel: 'Foster Dad',
      age: '45',
      description: "I'm really into football and board games. I work as a teacher.",
    },
    {
      id: '3',
      name: 'Emma',
      relationshipLabel: 'Sister',
      age: '14',
      description: 'I like drawing and playing Minecraft. I can show you around!',
    },
    {
      id: '4',
      name: 'Biscuit',
      relationshipLabel: 'Pet Dog',
      description: 'A friendly golden retriever who loves cuddles and playing fetch.',
    },
  ],
  localArea: {
    overview:
      "We live in a quiet neighbourhood with a park just around the corner. The school is a 10-minute walk away, and there's a cinema and bowling alley nearby for weekend fun.",
    highlights: [
      { id: '1', name: 'Riverside Park', description: 'Great for walks and has a big playground' },
      { id: '2', name: 'Crazy Kingdom', description: 'Soft play centre we visit on rainy days' },
      {
        id: '3',
        name: 'Local Library',
        description: 'Has a brilliant kids section and gaming area',
      },
      { id: '4', name: 'Swimming Pool', description: 'We go swimming most Saturday mornings' },
    ],
  },
  houseRules: [
    'Phones and tablets stay downstairs after 8pm',
    'We eat meals together at the table',
    'Shoes off at the door please',
    'Let us know before opening the front door',
    'Quiet time after 9pm on school nights',
  ],
  entertainment: {
    tvShows: ['Bluey', 'Stranger Things', 'Football highlights', 'Bake Off'],
    games: ['Mario Kart', 'Uno', 'Monopoly Deal', 'FIFA', 'Minecraft'],
    hobbies: ['Baking cupcakes', 'Drawing', 'Gardening', 'Swimming', 'Board game nights'],
  },
};

const PreviewHouseProfileScreen = () => {
  const router = useRouter();
  const [activePhotoIndex, setActivePhotoIndex] = React.useState(0);

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePhotoIndex(slideIndex);
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Hero Image Gallery */}
        <View className="relative">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {DEMO_PROFILE.photos.map((photo) => (
              <View key={photo.id} style={{ width: SCREEN_WIDTH }}>
                <Image source={{ uri: photo.url }} className="w-full h-72" resizeMode="cover" />
                <View className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-full">
                  <Text className="text-white text-xs font-medium">{photo.label}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Pagination dots */}
          <View className="absolute bottom-4 right-4 flex-row gap-1.5">
            {DEMO_PROFILE.photos.map((photo, idx) => (
              <View
                key={photo.id}
                className={`w-2 h-2 rounded-full ${
                  idx === activePhotoIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </View>

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
              <View className="bg-amber-500 px-3 py-1.5 rounded-full">
                <Text className="text-white text-xs font-semibold">Demo Preview</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Content */}
        <View className="px-5 pt-5 pb-8">
          {/* Welcome Section */}
          <View className="mb-6">
            <Text className="text-2xl font-bold text-gray-900 mb-2">Welcome to Our Home! 🏠</Text>
            <View className="flex-row items-center">
              <Star size={16} color="#34C759" fill="#34C759" />
              <Text className="text-sm font-medium text-gray-700 ml-1">
                We&apos;re so happy you&apos;re coming to stay
              </Text>
            </View>
          </View>

          {/* Intro message */}
          <View className="mb-6 bg-child-50 border border-child-100 rounded-2xl">
            <View className="p-4">
              <Text className="text-base text-gray-700 leading-relaxed">
                Hi there! We&apos;ve put together this little guide to help you know what to expect.
                You can look at the photos of our house, meet the people (and pets!) who live here,
                and see some of the fun things we like to do together.
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View className="flex-row mb-6 -mx-1.5">
            <View className="flex-1 px-1.5">
              <View className="bg-child-50 rounded-2xl p-4 items-center">
                <Users size={24} color="#4CAF50" />
                <Text className="text-lg font-bold text-gray-900 mt-2">
                  {DEMO_PROFILE.householdMembers.length}
                </Text>
                <Text className="text-xs text-gray-500">People</Text>
              </View>
            </View>
            <View className="flex-1 px-1.5">
              <View className="bg-child-50 rounded-2xl p-4 items-center">
                <Home size={24} color="#4CAF50" />
                <Text className="text-lg font-bold text-gray-900 mt-2">
                  {DEMO_PROFILE.photos.length}
                </Text>
                <Text className="text-xs text-gray-500">Rooms</Text>
              </View>
            </View>
            <View className="flex-1 px-1.5">
              <View className="bg-child-50 rounded-2xl p-4 items-center">
                <Heart size={24} color="#4CAF50" />
                <Text className="text-lg font-bold text-gray-900 mt-2">
                  {DEMO_PROFILE.entertainment.hobbies.length}
                </Text>
                <Text className="text-xs text-gray-500">Activities</Text>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View className="h-px bg-gray-200 mb-6" />

          {/* Who Lives Here */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <Users size={20} color="#374151" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">Who lives here</Text>
            </View>

            {DEMO_PROFILE.householdMembers.map((member) => (
              <Card key={member.id} variant="outlined" className="mb-3">
                <View className="p-4 flex-row items-start">
                  <View className="w-12 h-12 rounded-full bg-child-100 items-center justify-center mr-4">
                    <Text className="text-lg font-bold text-child-600">
                      {member.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-900">{member.name}</Text>
                    <Text className="text-sm text-child-600 font-medium">
                      {member.relationshipLabel}
                      {member.age ? ` • ${member.age}` : ''}
                    </Text>
                    {member.description && (
                      <Text className="text-sm text-gray-600 mt-1">{member.description}</Text>
                    )}
                  </View>
                </View>
              </Card>
            ))}
          </View>

          {/* Local Area */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <MapPin size={20} color="#374151" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">The local area</Text>
            </View>

            <Text className="text-base text-gray-700 mb-4 leading-relaxed">
              {DEMO_PROFILE.localArea.overview}
            </Text>

            <View className="flex-row flex-wrap -mx-1.5">
              {DEMO_PROFILE.localArea.highlights.map((highlight) => (
                <View key={highlight.id} className="w-1/2 px-1.5 mb-3">
                  <View className="bg-gray-50 rounded-xl p-3 h-full">
                    <Text className="text-sm font-semibold text-gray-900 mb-1">
                      {highlight.name}
                    </Text>
                    <Text className="text-xs text-gray-600">{highlight.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* House Rules */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <Home size={20} color="#374151" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">House rules</Text>
            </View>

            <View className="bg-amber-50 rounded-2xl p-4">
              {DEMO_PROFILE.houseRules.map((rule, index) => (
                <View key={index} className="flex-row items-start mb-2">
                  <Text className="text-amber-600 mr-2">•</Text>
                  <Text className="text-sm text-gray-700 flex-1">{rule}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Entertainment */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <Gamepad2 size={20} color="#374151" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">Things we enjoy</Text>
            </View>

            {/* TV Shows */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Tv size={16} color="#6B7280" />
                <Text className="text-sm font-medium text-gray-600 ml-2">TV & YouTube</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {DEMO_PROFILE.entertainment.tvShows.map((show, index) => (
                  <View key={index} className="bg-blue-50 px-3 py-1.5 rounded-full">
                    <Text className="text-sm text-blue-700">{show}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Games */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Gamepad2 size={16} color="#6B7280" />
                <Text className="text-sm font-medium text-gray-600 ml-2">Games we play</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {DEMO_PROFILE.entertainment.games.map((game, index) => (
                  <View key={index} className="bg-purple-50 px-3 py-1.5 rounded-full">
                    <Text className="text-sm text-purple-700">{game}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Hobbies */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Heart size={16} color="#6B7280" />
                <Text className="text-sm font-medium text-gray-600 ml-2">
                  Hobbies & weekend fun
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {DEMO_PROFILE.entertainment.hobbies.map((hobby, index) => (
                  <View key={index} className="bg-pink-50 px-3 py-1.5 rounded-full">
                    <Text className="text-sm text-pink-700">{hobby}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Footer message */}
          <View className="bg-child-50 border border-child-100 rounded-2xl">
            <View className="p-4 items-center">
              <Text className="text-base font-semibold text-child-700 mb-2">
                We can&apos;t wait to meet you! 💚
              </Text>
              <Text className="text-sm text-gray-600 text-center">
                If you have any questions, you can always ask your social worker.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default PreviewHouseProfileScreen;
