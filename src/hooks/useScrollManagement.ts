'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Virtualizer } from '@tanstack/react-virtual';

interface UseScrollManagementOptions {
  messagesCount: number;
  virtualizerRef: React.MutableRefObject<Virtualizer<HTMLDivElement, Element> | null>;
}

export function useScrollManagement({ messagesCount, virtualizerRef }: UseScrollManagementOptions) {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef(0);

  const isUserNearBottom = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return true;
    const threshold = 200;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback(
    (behavior: 'smooth' | 'auto' = 'smooth') => {
      const v = virtualizerRef.current;
      if (v && messagesCount > 0) {
        v.scrollToIndex(messagesCount - 1, { align: 'end', behavior });
      }
      setShowScrollToBottom(false);
      setNewMessagesWhileScrolled(0);
    },
    [messagesCount, virtualizerRef]
  );

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const nearBottom = isUserNearBottom();
      setShowScrollToBottom(!nearBottom);
      if (nearBottom) setNewMessagesWhileScrolled(0);
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isUserNearBottom]);

  useEffect(() => {
    if (messagesCount > prevMessagesLengthRef.current) {
      if (isUserNearBottom()) {
        scrollToBottom('smooth');
      } else {
        setNewMessagesWhileScrolled((prev) => prev + (messagesCount - prevMessagesLengthRef.current));
      }
    }
    prevMessagesLengthRef.current = messagesCount;
  }, [messagesCount, isUserNearBottom, scrollToBottom]);

  return {
    messagesScrollRef,
    showScrollToBottom,
    newMessagesWhileScrolled,
    scrollToBottom,
    isUserNearBottom,
  };
}
