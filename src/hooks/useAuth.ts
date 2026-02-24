import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

/**
 * Hook para gerenciar autenticação do usuário
 * Corrigido: createClient() memoizado para evitar loop infinito de re-renders
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Verificar sessão inicial (evitar crash se Supabase não configurado)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setUser(null);
      setLoading(false);
    });

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const { data } = supabase.auth.onAuthStateChange(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (_event: any, session: any) => {
          setUser(session?.user ?? null);
          setLoading(false);
          if (session?.user) {
            logger.info('User authenticated', { userId: session.user.id });
          } else {
            logger.info('User signed out');
          }
        }
      );
      subscription = data.subscription;
    } catch {
      setLoading(false);
    }

    return () => subscription?.unsubscribe?.();
  }, [supabase]);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error('Error signing out', error as Error);
      throw error;
    }
    setUser(null);
  }, [supabase]);

  return {
    user,
    loading,
    signOut,
    supabase,
    isAuthenticated: !!user,
  };
}
