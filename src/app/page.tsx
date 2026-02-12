'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import StealthMessagingProvider from '@/components/shared/StealthMessagingProvider';
import ChatLayout from '@/components/messaging/ChatLayout';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasUser, setHasUser] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setHasUser(!!user);
      setChecking(false);
      if (!user) {
        router.replace('/login');
        return;
      }
    });
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!hasUser) {
    return null; // redirecting to /login
  }

  return (
    <StealthMessagingProvider>
      <div className="min-h-screen">
        <ChatLayout />
      </div>
    </StealthMessagingProvider>
  );
}
