'use client';

import StealthMessagingProvider from '@/components/shared/StealthMessagingProvider';
import ChatLayout from '@/components/messaging/ChatLayout';

export default function MessagesPage() {
  return (
    <StealthMessagingProvider>
      <div className="min-h-screen">
        <ChatLayout />
      </div>
    </StealthMessagingProvider>
  );
}
