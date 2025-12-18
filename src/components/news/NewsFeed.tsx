import React from 'react';
import { View, TouchableOpacity, Linking } from 'react-native';
import {
  Newspaper,
  Clock,
  ExternalLink,
  Zap,
  BookOpen,
  Scale,
  GraduationCap,
  FileText,
} from 'lucide-react-native';
import { Text, Card, CardContent } from '../ui';
import { NewsItem, formatRelativeTime, NEWS_CATEGORIES } from '../../hooks/useSocialCareNews';
import { THEME } from '../../lib/theme';

interface NewsFeedProps {
  news: NewsItem[];
  loading?: boolean;
  maxItems?: number;
  showHeader?: boolean;
}

const CategoryIcon = ({ category }: { category: NewsItem['category'] }) => {
  const iconProps = { size: 12, color: '#6b7280' };

  switch (category) {
    case 'policy':
      return <FileText {...iconProps} />;
    case 'research':
      return <BookOpen {...iconProps} />;
    case 'legislation':
      return <Scale {...iconProps} />;
    case 'training':
      return <GraduationCap {...iconProps} />;
    default:
      return <Newspaper {...iconProps} />;
  }
};

interface NewsCardProps {
  item: NewsItem;
  isFirst?: boolean;
}

function NewsCard({ item, isFirst }: NewsCardProps) {
  const categoryConfig = NEWS_CATEGORIES[item.category];

  const handlePress = () => {
    if (item.url) {
      Linking.openURL(item.url);
    }
  };

  // Featured card for breaking/first news
  if (item.isBreaking || isFirst) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Read article: ${item.title}`}
      >
        <Card variant="elevated" className="mb-3 overflow-hidden">
          {/* Accent bar */}
          <View className="h-1" style={{ backgroundColor: THEME.roles.socialWorker.primary }} />
          <CardContent className="pt-3">
            <View className="flex-row items-center gap-2 mb-2">
              {item.isBreaking && (
                <View className="flex-row items-center bg-red-100 px-2 py-0.5 rounded-full">
                  <Zap size={10} color="#dc2626" />
                  <Text className="text-red-600 text-xs font-semibold ml-1">Breaking</Text>
                </View>
              )}
              <View
                className={`flex-row items-center px-2 py-0.5 rounded-full ${categoryConfig.color}`}
              >
                <CategoryIcon category={item.category} />
                <Text className={`text-xs font-medium ml-1`}>{categoryConfig.label}</Text>
              </View>
            </View>

            <Text variant="h3" weight="semibold" className="mb-2 leading-tight">
              {item.title}
            </Text>

            <Text variant="body" color="muted" className="mb-3 leading-relaxed">
              {item.summary}
            </Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <Text variant="caption" color="muted">
                  {item.source}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Clock size={12} color="#9ca3af" />
                  <Text variant="caption" color="muted">
                    {formatRelativeTime(item.publishedAt)}
                  </Text>
                </View>
              </View>
              {item.readTime && (
                <Text variant="caption" color="muted">
                  {item.readTime} min read
                </Text>
              )}
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>
    );
  }

  // Compact card for regular news
  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Read article: ${item.title}`}
    >
      <Card variant="outlined" className="mb-2">
        <CardContent className="py-3">
          <View className="flex-row items-start gap-3">
            <View className={`p-2 rounded-lg ${categoryConfig.color.split(' ')[0]}`}>
              <CategoryIcon category={item.category} />
            </View>

            <View className="flex-1">
              <Text variant="body" weight="medium" numberOfLines={2} className="mb-1">
                {item.title}
              </Text>

              <View className="flex-row items-center gap-2">
                <Text variant="caption" color="muted">
                  {item.source}
                </Text>
                <Text variant="caption" color="muted">
                  •
                </Text>
                <Text variant="caption" color="muted">
                  {formatRelativeTime(item.publishedAt)}
                </Text>
              </View>
            </View>

            <ExternalLink size={16} color="#9ca3af" />
          </View>
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
}

export function NewsFeed({ news, loading, maxItems = 5, showHeader = true }: NewsFeedProps) {
  const displayNews = news.slice(0, maxItems);

  if (loading && news.length === 0) {
    return (
      <View className="py-4">
        {/* Skeleton loaders */}
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="outlined" className="mb-2">
            <CardContent className="py-3">
              <View className="flex-row items-start gap-3">
                <View className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse" />
                <View className="flex-1">
                  <View className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse" />
                  <View className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
                </View>
              </View>
            </CardContent>
          </Card>
        ))}
      </View>
    );
  }

  if (news.length === 0) {
    return (
      <Card variant="outlined">
        <CardContent>
          <View className="items-center py-4">
            <Newspaper size={32} color="#9ca3af" />
            <Text color="muted" className="mt-2 text-center">
              No news available
            </Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  return (
    <View>
      {showHeader && (
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Newspaper size={18} color={THEME.roles.socialWorker.primary} />
            <Text variant="h3" weight="semibold">
              Social Care Updates
            </Text>
          </View>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="View all news">
            <Text variant="caption" style={{ color: THEME.roles.socialWorker.primary }}>
              View all
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {displayNews.map((item, index) => (
        <NewsCard key={item.id} item={item} isFirst={index === 0} />
      ))}
    </View>
  );
}

export default NewsFeed;
