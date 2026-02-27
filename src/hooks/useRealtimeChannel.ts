'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message, ChatWithRecipient, User as UserType } from '@/types/messaging';
import { logger } from '@/lib/logger';

interface RealtimeCallbacks {
  onNewMessage: (message: Message) => void;
  onTyping: (userId: string) => void;
  onPresenceSync: (onlineUserIds: Set<string>) => void;
  onPresenceJoin: (userId: string) => void;
  onPresenceLeave: (userId: string) => void;
  onScreenshotAlert?: (senderId: string, senderName: string) => void;
  onFSKeyExchange?: (userId: string, publicKey: string) => void;
  onConnectionChange: (state: 'connected' | 'reconnecting' | 'disconnected') => void;
  onSubscribed?: () => void;
}

interface UseRealtimeChannelOptions {
  chatId: string | null;
  currentUserId: string | null;
  callbacks: RealtimeCallbacks;
  enabled?: boolean;
}

export function useRealtimeChannel({
  chatId,
  currentUserId,
  callbacks,
  enabled = true,
}: UseRealtimeChannelOptions) {
  const supabase = useRef(createClient()).current;
  const activeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');

  const sendTyping = useCallback(() => {
    const ch = activeChannelRef.current;
    if (ch && currentUserId) {
      ch.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId } });
    }
  }, [currentUserId]);

  const sendFSKeyExchange = useCallback(
    (publicKey: string) => {
      const ch = activeChannelRef.current;
      if (ch && currentUserId) {
        ch.send({
          type: 'broadcast',
          event: 'fs_key_exchange',
          payload: { userId: currentUserId, publicKey },
        });
      }
    },
    [currentUserId]
  );

  const trackPresence = useCallback(() => {
    const ch = activeChannelRef.current;
    if (ch && ch.state === 'joined' && currentUserId) {
      ch.track({ userId: currentUserId, online: true, lastSeen: new Date().toISOString() });
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!chatId || !currentUserId || !enabled) return;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const handleManualReconnect = () => {
      clearReconnectTimeout();
      if (reconnectAttempts >= maxReconnectAttempts) {
        setConnectionState('disconnected');
        callbacksRef.current.onConnectionChange('disconnected');
        return;
      }
      reconnectAttempts++;
      const base = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      const delay = base + Math.random() * base * 0.3;
      logger.info('Scheduling reconnect...', { attempt: reconnectAttempts, delayMs: Math.round(delay) });
      reconnectTimeoutRef.current = setTimeout(() => {
        const ch = activeChannelRef.current;
        if (ch) supabase.removeChannel(ch);
        const newCh = setupChannel();
        activeChannelRef.current = newCh;
      }, delay);
    };

    const setupChannel = () => {
      const channel = supabase
        .channel(`chat:${chatId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            callbacksRef.current.onNewMessage(payload.new as Message);
          }
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('broadcast', { event: 'typing' }, (payload: any) => {
          if (payload.payload.userId !== currentUserId) {
            callbacksRef.current.onTyping(payload.payload.userId);
          }
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('broadcast', { event: 'fs_key_exchange' }, (payload: any) => {
          if (payload.payload.userId !== currentUserId && payload.payload.publicKey) {
            callbacksRef.current.onFSKeyExchange?.(payload.payload.userId, payload.payload.publicKey);
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const online = new Set<string>();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (Object.values(presenceState) as any[][]).forEach((presences) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            presences.forEach((p: any) => {
              if (p.userId && p.online !== false) online.add(p.userId);
            });
          });
          callbacksRef.current.onPresenceSync(online);
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('presence', { event: 'join' }, ({ newPresences }: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          newPresences.forEach((p: any) => {
            if (p.userId) callbacksRef.current.onPresenceJoin(p.userId);
          });
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leftPresences.forEach((p: any) => {
            if (p.userId) callbacksRef.current.onPresenceLeave(p.userId);
          });
        })
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttempts = 0;
            clearReconnectTimeout();
            setConnectionState('connected');
            callbacksRef.current.onConnectionChange('connected');
            channel.track({ userId: currentUserId, online: true, lastSeen: new Date().toISOString() });
            callbacksRef.current.onSubscribed?.();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionState('reconnecting');
            callbacksRef.current.onConnectionChange('reconnecting');
            clearReconnectTimeout();
            reconnectTimeoutRef.current = setTimeout(() => {
              const ch = activeChannelRef.current;
              if (ch && ch.state !== 'joined') handleManualReconnect();
            }, 60000);
          } else if (status === 'CLOSED') {
            setConnectionState('reconnecting');
            callbacksRef.current.onConnectionChange('reconnecting');
            handleManualReconnect();
          }
        });

      return channel;
    };

    const channel = setupChannel();
    activeChannelRef.current = channel;

    const presenceInterval = setInterval(() => {
      const ch = activeChannelRef.current;
      if (ch && ch.state === 'joined') {
        ch.track({ userId: currentUserId, online: true, lastSeen: new Date().toISOString() });
      }
    }, 30000);

    return () => {
      clearInterval(presenceInterval);
      clearReconnectTimeout();
      activeChannelRef.current = null;
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId, supabase, enabled]);

  return { connectionState, sendTyping, sendFSKeyExchange, trackPresence };
}
