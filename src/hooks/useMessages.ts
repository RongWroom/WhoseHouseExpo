import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '../types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Case = Database['public']['Tables']['cases']['Row'];

export interface MessageWithDetails extends Message {
  sender_profile?: Profile | null;
  recipient_profile?: Profile | null;
  case?: Case | null;
  child_initials?: string; // For privacy - children shown as initials only
}

// Helper to get child initials from their case
export function getChildInitials(childName: string | null): string {
  if (!childName) return 'Child';

  return childName
    .split(' ')
    .map((word) => word[0]?.toUpperCase() || '')
    .join('.');
}

/**
 * Main messaging hook with real-time subscriptions
 */
export function useMessages(
  caseId: string,
  userId: string,
  _userRole: 'social_worker' | 'foster_carer' | null,
) {
  const [messages, setMessages] = useState<MessageWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch messages on mount and setup real-time subscription
  useEffect(() => {
    if (!caseId || !userId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadMessages = async () => {
      if (isMounted) {
        await fetchMessages();
      }
    };

    loadMessages();
    subscribeToMessages();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe().then(() => {
          supabase.removeChannel(channelRef.current!);
          channelRef.current = null;
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, userId]);

  // Fetch all messages for a case
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender_profile:profiles!messages_sender_id_fkey(*),
          recipient_profile:profiles!messages_recipient_id_fkey(*),
          case:cases!messages_case_id_fkey(*)
        `,
        )
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      // Process messages to add child initials
      const processedMessages = ((data as any) || []).map((msg: any) => ({
        ...msg,
        child_initials:
          msg.sender_id === null
            ? getChildInitials((msg.case?.metadata?.child_name as string) || null)
            : undefined,
      }));

      setMessages(processedMessages);

      // Mark messages as delivered/read if they're for the current user
      await markMessagesAsRead(data || [], userId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, userId]);

  // Subscribe to real-time message updates
  const subscribeToMessages = useCallback(() => {
    const channel = supabase
      .channel(`case:${caseId}:messages`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `case_id=eq.${caseId}`,
        },
        async (payload) => {
          // Fetch the complete message with related data
          const { data } = await supabase
            .from('messages')
            .select(
              `
              *,
              sender_profile:profiles!messages_sender_id_fkey(*),
              recipient_profile:profiles!messages_recipient_id_fkey(*),
              case:cases!messages_case_id_fkey(*)
            `,
            )
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const msgData = data as any;
            const processedMessage = {
              ...msgData,
              child_initials:
                msgData.sender_id === null
                  ? getChildInitials((msgData.case?.metadata?.child_name as string) || null)
                  : undefined,
            };

            setMessages((prev) => [...prev, processedMessage]);

            // Mark as read if it's for the current user
            if (msgData.recipient_id === userId) {
              await markMessageAsRead(msgData.id);
            }
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          // Update message status in real-time
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? { ...msg, ...payload.new } : msg)),
          );
        },
      )
      .subscribe();

    channelRef.current = channel;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, userId]);

  // Mark unread messages as read
  const markUnreadMessagesAsRead = useCallback(async () => {
    const unreadMessages = messages.filter(
      (msg) => msg.recipient_id === userId && msg.status !== 'read',
    );

    for (const msg of unreadMessages) {
      await markMessageAsRead(msg.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, userId]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string, recipientId: string, isUrgent: boolean = false) => {
      try {
        setSending(true);
        setError(null);

        const messageData: MessageInsert = {
          sender_id: userId,
          recipient_id: recipientId,
          case_id: caseId,
          content,
          is_urgent: isUrgent,
          status: 'sent',
          metadata: {},
        };

        const { data, error: sendError } = await supabase
          .from('messages')
          .insert(messageData as any)
          .select()
          .single();

        if (sendError) throw sendError;

        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        throw err;
      } finally {
        setSending(false);
      }
    },
    [userId, caseId],
  );

  // Mark a single message as read
  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      await supabase.rpc('update_message_status', {
        p_message_id: messageId,
        p_new_status: 'read',
      } as any);
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  }, []);

  // Mark multiple messages as read
  const markMessagesAsRead = useCallback(
    async (messagesToMark: Message[], currentUserId: string) => {
      const unreadMessages = messagesToMark.filter(
        (msg) => msg.recipient_id === currentUserId && msg.status !== 'read',
      );

      for (const msg of unreadMessages) {
        await markMessageAsRead(msg.id);
      }
    },
    [markMessageAsRead],
  );

  return {
    messages,
    loading,
    error,
    sending,
    sendMessage,
    refetch: fetchMessages,
    markMessageAsRead,
    markUnreadMessagesAsRead,
  };
}

/**
 * Hook to get unread message count
 */
export function useUnreadCount(userId: string) {
  const [count, setCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    fetchUnreadCount();

    // Subscribe to message changes
    const channel = supabase
      .channel(`user:${userId}:unread`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          if (isMounted) {
            fetchUnreadCount();
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      isMounted = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe().then(() => {
          supabase.removeChannel(channelRef.current!);
          channelRef.current = null;
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    const { count: unreadCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', userId)
      .neq('status', 'read');

    setCount(unreadCount || 0);
  }, [userId]);

  return count;
}

/**
 * Hook for child messaging (token-based, one-way to social worker)
 */
export function useChildMessaging(token: string) {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socialWorker, setSocialWorker] = useState<Profile | null>(null);
  const [caseInfo, setCaseInfo] = useState<any>(null);

  useEffect(() => {
    fetchCaseInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchCaseInfo = useCallback(async () => {
    try {
      // Validate token and get case info
      const { data, error: tokenError } = await supabase.rpc('use_child_access_token', {
        p_token: token,
        p_device_info: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      } as any);

      if (tokenError) throw tokenError;

      setCaseInfo(data);

      // Fetch social worker profile
      if ((data as any)?.social_worker_id) {
        const { data: swData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', (data as any).social_worker_id)
          .single();

        setSocialWorker(swData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid or expired link');
    }
  }, [token]);

  const sendMessage = useCallback(
    async (content: string) => {
      try {
        setSending(true);
        setError(null);

        const { error: sendError } = await supabase.rpc('send_child_message', {
          p_token: token,
          p_content: content,
        } as any);

        if (sendError) throw sendError;

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        return false;
      } finally {
        setSending(false);
      }
    },
    [token],
  );

  return {
    socialWorker,
    caseInfo,
    sending,
    error,
    sendMessage,
  };
}

/**
 * Offline message queue management
 */
const QUEUE_KEY = '@whose_house_message_queue';

export async function queueOfflineMessage(message: MessageInsert) {
  try {
    const existingQueue = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = existingQueue ? JSON.parse(existingQueue) : [];
    queue.push({ ...message, queuedAt: new Date().toISOString() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to queue message:', err);
  }
}

export async function syncOfflineMessages() {
  try {
    const queueData = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueData) return;

    const queue = JSON.parse(queueData);
    const failedMessages = [];

    for (const msg of queue) {
      try {
        await supabase.from('messages').insert(msg as any);
      } catch {
        failedMessages.push(msg);
      }
    }

    // Keep failed messages in queue
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(failedMessages));
  } catch (err) {
    console.error('Failed to sync offline messages:', err);
  }
}
