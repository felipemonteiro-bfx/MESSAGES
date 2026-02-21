import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

let clientInstance: ReturnType<typeof createBrowserClient> | null = null;

export const createClient = () => {
  if (clientInstance) return clientInstance;
  
  clientInstance = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      realtime: {
        params: {
          eventsPerSecond: 25,
        },
        heartbeatIntervalMs: 15000,
        reconnectAfterMs: (tries: number) => {
          const base = Math.min(1000 * Math.pow(2, tries), 30000);
          return base + Math.random() * base * 0.3;
        },
      },
    }
  );
  
  return clientInstance;
};