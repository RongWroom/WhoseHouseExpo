import { useState, useEffect, useCallback } from 'react';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceIcon?: string;
  category: 'policy' | 'research' | 'practice' | 'legislation' | 'training';
  publishedAt: Date;
  url?: string;
  isBreaking?: boolean;
  readTime?: number; // minutes
}

interface UseSocialCareNewsResult {
  news: NewsItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

// Mock news data - in production, this would fetch from an RSS feed or API
const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'New Safeguarding Guidelines Published by DfE',
    summary:
      'The Department for Education has released updated statutory guidance for local authorities on safeguarding children in care.',
    source: 'Department for Education',
    category: 'policy',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    readTime: 4,
    isBreaking: true,
  },
  {
    id: '2',
    title: 'Research: Impact of Placement Stability on Educational Outcomes',
    summary:
      'A new study from the Rees Centre highlights the correlation between placement stability and improved GCSE results for looked-after children.',
    source: 'Rees Centre, Oxford',
    category: 'research',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    readTime: 6,
  },
  {
    id: '3',
    title: 'Ofsted Updates Inspection Framework for Fostering Services',
    summary:
      'New inspection criteria focus on quality of matching, support for carers, and outcomes for children.',
    source: 'Ofsted',
    category: 'practice',
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
    readTime: 5,
  },
  {
    id: '4',
    title: 'Children and Families Act Amendment Proposed',
    summary: 'MPs debate proposed changes to strengthen rights of care leavers up to age 25.',
    source: 'UK Parliament',
    category: 'legislation',
    publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    readTime: 3,
  },
  {
    id: '5',
    title: 'Free CPD: Trauma-Informed Practice Webinar Series',
    summary:
      'Social Work England announces free training modules on trauma-informed approaches for child and family social workers.',
    source: 'Social Work England',
    category: 'training',
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    readTime: 2,
  },
  {
    id: '6',
    title: 'BASW Publishes Updated Code of Ethics',
    summary:
      'The British Association of Social Workers releases refreshed ethical guidelines addressing digital practice and AI.',
    source: 'BASW',
    category: 'practice',
    publishedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    readTime: 7,
  },
];

export function useSocialCareNews(): UseSocialCareNewsResult {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // In production, this would be:
      // const response = await fetch('https://api.example.com/social-care-news');
      // const data = await response.json();

      setNews(MOCK_NEWS);
      setLastUpdated(new Date());
    } catch (err) {
      setError('Failed to load news. Pull down to retry.');
      console.error('News fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return {
    news,
    loading,
    error,
    refetch: fetchNews,
    lastUpdated,
  };
}

// Helper to format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }
}

// Category display config
export const NEWS_CATEGORIES = {
  policy: { label: 'Policy', color: 'bg-blue-100 text-blue-700' },
  research: { label: 'Research', color: 'bg-purple-100 text-purple-700' },
  practice: { label: 'Practice', color: 'bg-green-100 text-green-700' },
  legislation: { label: 'Legislation', color: 'bg-amber-100 text-amber-700' },
  training: { label: 'Training', color: 'bg-pink-100 text-pink-700' },
} as const;
