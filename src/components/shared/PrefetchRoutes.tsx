'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PrefetchRoutes() {
  const router = useRouter();
  useEffect(() => {
    router.prefetch('/login');
    router.prefetch('/signup');
  }, [router]);
  return null;
}
