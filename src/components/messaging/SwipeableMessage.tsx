'use client';

import { useState, useRef, ReactNode } from 'react';
import { Reply } from 'lucide-react';
import { impactLight } from '@/lib/haptics';

interface SwipeableMessageProps {
  children: ReactNode;
  onSwipeReply: () => void;
  isOwnMessage?: boolean;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 60;
const MAX_SWIPE = 100;

export default function SwipeableMessage({ 
  children, 
  onSwipeReply, 
  isOwnMessage = false,
  disabled = false 
}: SwipeableMessageProps) {
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef(false);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    hasTriggeredRef.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startXRef.current || !startYRef.current || disabled) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - startXRef.current;
    const deltaY = currentY - startYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (!isHorizontalSwipeRef.current) {
      return;
    }

    const swipeDirection = isOwnMessage ? -1 : 1;
    const adjustedDelta = deltaX * swipeDirection;

    if (adjustedDelta > 0) {
      const limitedSwipe = Math.min(adjustedDelta, MAX_SWIPE);
      setSwipeX(limitedSwipe * swipeDirection);

      if (adjustedDelta >= SWIPE_THRESHOLD && !hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        impactLight();
      }
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(swipeX) >= SWIPE_THRESHOLD && !disabled) {
      onSwipeReply();
    }
    
    setSwipeX(0);
    setIsSwiping(false);
    startXRef.current = null;
    startYRef.current = null;
    isHorizontalSwipeRef.current = null;
  };

  const showReplyIcon = Math.abs(swipeX) > 20;
  const replyIconOpacity = Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1);
  const replyIconScale = 0.5 + (replyIconOpacity * 0.5);

  return (
    <div 
      className="relative overflow-visible"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {showReplyIcon && (
        <div 
          className={`absolute top-1/2 -translate-y-1/2 z-10 pointer-events-none ${
            isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'
          }`}
          style={{
            opacity: replyIconOpacity,
            transform: `translateY(-50%) scale(${replyIconScale})`,
          }}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            Math.abs(swipeX) >= SWIPE_THRESHOLD 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
          }`}>
            <Reply className="w-4 h-4" />
          </div>
        </div>
      )}
      
      <div 
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
