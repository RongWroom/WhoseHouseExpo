import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TypingUser {
  user_id: string;
  full_name?: string;
  is_typing: boolean;
}

export function useTypingIndicator(caseId: string | undefined) {
  const { user } = useAuth();
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingUpdateRef = useRef<number>(0);

  // Subscribe to typing indicators for this case
  useEffect(() => {
    if (!caseId || !user) return;

    const channel = supabase
      .channel(`typing:${caseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `case_id=eq.${caseId}`,
        },
        async (payload: any) => {
          // Get user info for the typing indicator
          if (payload.new && payload.new.user_id !== user.id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', payload.new.user_id)
              .single();

            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              setTypingUsers((prev) => {
                const filtered = prev.filter((u) => u.user_id !== payload.new.user_id);
                if (payload.new.is_typing) {
                  return [
                    ...filtered,
                    {
                      user_id: payload.new.user_id,
                      full_name: (profile as any)?.full_name,
                      is_typing: true,
                    },
                  ];
                }
                return filtered;
              });

              // Auto-remove after 10 seconds if no update
              setTimeout(() => {
                setTypingUsers((prev) => prev.filter((u) => u.user_id !== payload.new.user_id));
              }, 10000);
            } else if (payload.eventType === 'DELETE') {
              setTypingUsers((prev) => prev.filter((u) => u.user_id !== payload.new.user_id));
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [caseId, user]);

  // Function to set typing status
  const setTyping = async (isTyping: boolean) => {
    if (!caseId || !user) return;

    // Throttle typing updates to once per second
    const now = Date.now();
    if (isTyping && now - lastTypingUpdateRef.current < 1000) {
      return;
    }
    lastTypingUpdateRef.current = now;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await (supabase.rpc as any)('set_typing_status', {
        p_case_id: caseId,
        p_is_typing: isTyping,
      });

      // If typing, set a timeout to automatically stop typing after 5 seconds
      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 5000);
      }
    } catch (error) {
      console.error('Failed to update typing status:', error);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Stop typing when component unmounts
      if (caseId && user) {
        (supabase.rpc as any)('set_typing_status', {
          p_case_id: caseId,
          p_is_typing: false,
        });
      }
    };
  }, [caseId, user]);

  return {
    typingUsers,
    setTyping,
    isAnyoneTyping: typingUsers.length > 0,
    typingText:
      typingUsers.length > 0
        ? `${typingUsers.map((u) => u.full_name?.split(' ')[0] || 'Someone').join(', ')} ${
            typingUsers.length === 1 ? 'is' : 'are'
          } typing...`
        : '',
  };
}
