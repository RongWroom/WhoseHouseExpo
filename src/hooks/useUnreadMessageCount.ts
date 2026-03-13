import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to track unread message count for the current user
 * Includes real-time subscription for instant updates
 */
export function useUnreadMessageCount() {
  const { user, profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchVisibleCaseIds = useCallback(async () => {
    if (!user?.id || !profile?.role) return [];

    if (profile.role === 'social_worker') {
      const { data, error } = await supabase
        .from('cases')
        .select('id')
        .eq('social_worker_id', user.id);

      if (error) throw error;
      return ((data || []) as Array<{ id: string }>).map((row) => row.id);
    }

    if (profile.role === 'foster_carer') {
      const { data, error } = await supabase
        .from('cases')
        .select('id')
        .eq('foster_carer_id', user.id)
        .eq('status', 'active');

      if (error) throw error;
      return ((data || []) as Array<{ id: string }>).map((row) => row.id);
    }

    return [];
  }, [profile?.role, user?.id]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const visibleCaseIds = await fetchVisibleCaseIds();
      if (visibleCaseIds.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Count only unread messages from conversations available in the current UI.
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .neq('status', 'read')
        .in('case_id', visibleCaseIds);

      if (error) throw error;

      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [fetchVisibleCaseIds, user?.id]);

  useEffect(() => {
    if (!user?.id || !profile?.role) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Fetch initial unread count
    fetchUnreadCount();

    // Set up real-time subscription for message updates
    const channel = supabase
      .channel('unread-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          // Refetch count when messages change
          fetchUnreadCount();
        },
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUnreadCount, profile?.role, user?.id]);

  return {
    unreadCount,
    loading,
    refetch: fetchUnreadCount,
  };
}
