'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { LogOut, User, Bell, X, Check, Shield, EyeOff, Eye, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { ThemeToggle } from './ThemeToggle';
import { usePanic } from './PanicProvider';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
}

export const Navbar = () => {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { togglePanic } = usePanic();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('privacy_mode') === 'true';
      setIsPrivate(saved);
      if (saved) document.documentElement.classList.add('privacy-active');
    } catch {
      // localStorage não disponível
    }

    fetchNotifications();
  }, []);

  const fetchNotifications = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('read', false)
        .limit(5);
      if (data) setNotifications(data as Notification[]);
    }
  }, [supabase]);

  const togglePrivacy = useCallback(() => {
    const newState = !isPrivate;
    setIsPrivate(newState);
    try {
      localStorage.setItem('privacy_mode', newState.toString());
    } catch {
      /* ignore */
    }
    if (newState) {
      document.documentElement.classList.add('privacy-active');
      toast.info('Modo Privacidade Ativado: Valores ocultos.');
    } else {
      document.documentElement.classList.remove('privacy-active');
      toast.success('Modo Privacidade Desativado.');
    }
  }, [isPrivate]);

  const markAsRead = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        toast.success('Alerta arquivado.');
      }
    },
    [supabase]
  );

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [supabase, router]);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowNotifications(false);
    };

    if (showNotifications) {
      const timeout = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, { once: true });
      }, 100);
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showNotifications]);

  return (
    <nav className="sticky top-4 z-50 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl shadow-emerald-500/10 dark:shadow-emerald-900/20 transition-all duration-500">
        <div className="flex items-center gap-2 group shrink-0">
          <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white transition-all">
            Noticias24h
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={togglePrivacy}
            className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-emerald-600"
            title="Alternar Modo Privacidade"
            aria-label={isPrivate ? 'Desativar modo privacidade' : 'Ativar modo privacidade'}
          >
            {isPrivate ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={togglePanic}
            className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-emerald-600"
            title="Modo Pânico"
            aria-label="Ativar modo pânico"
          >
            <Zap className="h-5 w-5" />
          </Button>

          <ThemeToggle />

          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative h-10 w-10 p-0 rounded-xl"
              aria-label={`Notificações${notifications.length > 0 ? ` (${notifications.length} não lidas)` : ''}`}
            >
              <Bell
                className={`h-5 w-5 ${notifications.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}
              />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </Button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 mt-4 w-80 glass rounded-3xl shadow-2xl border border-teal-50 dark:border-white/5 overflow-hidden z-50"
                  role="dialog"
                  aria-label="Notificações"
                >
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                      Alertas
                    </span>
                    <button
                      onClick={() => setShowNotifications(false)}
                      aria-label="Fechar notificações"
                    >
                      <X className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2 space-y-2 no-scrollbar bg-slate-50/50 dark:bg-slate-900/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-bold uppercase text-[10px]">
                        Tudo em dia!
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-teal-50 dark:border-white/5 flex items-start justify-between gap-3 group"
                        >
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-emerald-600 uppercase">
                              {n.title}
                            </p>
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-tight">
                              {n.message}
                            </p>
                          </div>
                          <button
                            onClick={() => markAsRead(n.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 opacity-0 group-hover:opacity-100 transition-all"
                            aria-label={`Marcar "${n.title}" como lido`}
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 rounded-xl"
            aria-label="Perfil"
          >
            <User className="h-5 w-5 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="h-10 w-10 p-0 rounded-xl text-red-500"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};
