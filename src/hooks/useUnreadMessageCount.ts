import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook to track unread message count for the current user
 * Includes real-time subscription for instant updates
 */
export function useUnreadMessageCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function fetchUnreadCount() {
    if (!user?.id) return;

    try {
      setLoading(true);

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', user.id)
        .eq('status', 'sent');

      if (error) throw error;

      setUnreadCount(count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  return {
    unreadCount,
    loading,
    refetch: fetchUnreadCount,
  };
}
