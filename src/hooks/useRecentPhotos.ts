import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useActiveCase } from './useCases';

interface RecentPhoto {
  id: string;
  file_name: string;
  file_url: string;
  uploaded_at: string;
}

export function useRecentPhotos(limit: number = 3) {
  const { user } = useAuth();
  const { caseData } = useActiveCase();
  const [photos, setPhotos] = useState<RecentPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecentPhotos = useCallback(async () => {
    if (!caseData || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('case_media')
        .select('*')
        .eq('case_id', caseData.id)
        .eq('uploaded_by', user.id)
        .eq('file_type', 'image')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      const fetchedPhotos = ((data as any[]) || []).map((photo: any) => {
        const { data: urlData } = supabase.storage.from('case-media').getPublicUrl(photo.file_path);

        return {
          id: photo.id,
          file_name: photo.file_name || 'photo',
          file_url: urlData?.publicUrl || '',
          uploaded_at: photo.created_at || new Date().toISOString(),
        };
      });

      setPhotos(fetchedPhotos);
    } catch (err) {
      console.error('Failed to fetch recent photos:', err);
      setError('Failed to load photos');
    } finally {
      setLoading(false);
    }
  }, [caseData, user, limit]);

  useEffect(() => {
    fetchRecentPhotos();
  }, [fetchRecentPhotos]);

  return {
    photos,
    loading,
    error,
    refetch: fetchRecentPhotos,
  };
}
