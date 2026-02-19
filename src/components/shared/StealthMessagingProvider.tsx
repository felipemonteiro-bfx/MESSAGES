'use client';

import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StealthNews from './StealthNews';
import PinPad from './PinPad';
import ChatLayout from '../messaging/ChatLayout';
import { AuthForm } from './AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { getAutoLockTimeout, getAutoLockOnScreenLock } from '@/lib/settings';

interface StealthMessagingContextType {
  isStealthMode: boolean;
  unlockMessaging: () => void;
  lockMessaging: () => void;
}

const StealthMessagingContext = createContext<StealthMessagingContextType>({
  isStealthMode: true,
  unlockMessaging: () => {},
  lockMessaging: () => {},
});

export const useStealthMessaging = () => useContext(StealthMessagingContext);

interface StealthMessagingProviderProps {
  children: React.ReactNode;
}

export default function StealthMessagingProvider({ children }: StealthMessagingProviderProps) {
  const { user, supabase } = useAuth();
  const [isStealthMode, setIsStealthMode] = useState(true);
  const [showPinPad, setShowPinPad] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'login'>('signup');
  const [showMessaging, setShowMessaging] = useState(false);
  // Notifications are now shown inline in the news feed (StealthNews messageAlerts)
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const escapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const escapePressCountRef = useRef(0);

  // Inicializar estado apenas uma vez na montagem
  useEffect(() => {
    const checkInitialState = async () => {
      try {
        const storedMode = localStorage.getItem('n24h_mode');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (storedMode === 'false' && session?.user) {
          setIsStealthMode(false);
          setShowMessaging(true);
          document.title = 'Mensagens';
        } else {
          setIsStealthMode(true);
          setShowMessaging(false);
          document.title = 'Noticias24h - Brasil e Mundo';
        }
      } catch {
        // Se localStorage não disponível, manter modo stealth
      }
    };
    
    checkInitialState();
  }, [supabase]);

  const lockMessaging = useCallback(() => {
    setIsStealthMode(true);
    setShowMessaging(false);
    setShowPinPad(false);
    localStorage.setItem('n24h_mode', 'true');
    document.title = 'Noticias24h - Brasil e Mundo';
    // Toast único — não duplicar
  }, []);

  const unlockMessaging = useCallback(() => {
    setIsStealthMode(false);
    setShowPinPad(false);
    setShowMessaging(true);
    localStorage.setItem('n24h_mode', 'false');
    document.title = 'Mensagens';
    toast.success('Acesso concedido.', { duration: 2000 });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+L para bloquear
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        if (!isStealthMode) {
          lockMessaging();
          toast.success('Modo notícias ativado.', { duration: 2000 });
        }
        return;
      }

      // Escape duas vezes para bloquear
      if (e.key === 'Escape') {
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current);
        }
        
        escapePressCountRef.current += 1;
        if (escapePressCountRef.current === 2 && !isStealthMode) {
          lockMessaging();
          toast.success('Modo notícias ativado.', { duration: 2000 });
          escapePressCountRef.current = 0;
          return;
        }
        
        escapeTimeoutRef.current = setTimeout(() => {
          escapePressCountRef.current = 0;
        }, 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !isStealthMode) {
        if (getAutoLockOnScreenLock()) {
          lockMessaging();
          toast.info('Sistema bloqueado automaticamente', { duration: 2000 });
        }
      }
    };

    const handleBeforeUnload = () => {
      localStorage.setItem('n24h_mode', 'true');
    };

    const handleBlur = () => {
      const timeoutSeconds = getAutoLockTimeout();
      if (timeoutSeconds === 0) return;
      
      visibilityTimeoutRef.current = setTimeout(() => {
        if (!document.hasFocus() && !isStealthMode) {
          lockMessaging();
          toast.info('Sistema bloqueado automaticamente', { duration: 2000 });
        }
      }, timeoutSeconds * 1000);
    };

    const handleFocus = () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (visibilityTimeoutRef.current) clearTimeout(visibilityTimeoutRef.current);
      if (escapeTimeoutRef.current) clearTimeout(escapeTimeoutRef.current);
    };
  }, [isStealthMode, lockMessaging]);

  const handleUnlockRequest = useCallback(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        setShowAuthModal(true);
        setAuthModalMode('signup');
      } else {
        setShowPinPad(true);
      }
    });
  }, [supabase]);

  const handleAuthSuccess = useCallback(async () => {
    setShowAuthModal(false);
    // Aguardar sessão ser estabelecida
    await new Promise(resolve => setTimeout(resolve, 300));
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setShowPinPad(true);
    } else {
      toast.error('Erro ao autenticar. Tente novamente.');
      setShowAuthModal(true);
    }
  }, [supabase]);

  const handlePinSuccess = useCallback(() => {
    unlockMessaging();
  }, [unlockMessaging]);

  const handleMessageNotification = useCallback((fakeNewsTitle: string) => {
    // Toast discreto que parece uma notificação de notícia comum
    // O ícone 📰 e o estilo são idênticos às notificações de notícias reais
    toast('📰 Última Hora', {
      duration: 5000,
      description: fakeNewsTitle,
      action: {
        label: 'Ler mais',
        onClick: () => handleUnlockRequest(),
      },
      style: {
        background: '#FEF3C7',
        border: '1px solid #F59E0B',
        color: '#92400E',
      },
    });
  }, [handleUnlockRequest]);

  const contextValue = useMemo(() => ({
    isStealthMode,
    unlockMessaging,
    lockMessaging,
  }), [isStealthMode, unlockMessaging, lockMessaging]);

  return (
    <StealthMessagingContext.Provider value={contextValue}>
      <AnimatePresence mode="wait">
        {isStealthMode ? (
          <motion.div 
            key="stealth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white overflow-y-auto"
          >
            <StealthNews 
              onUnlockRequest={handleUnlockRequest}
              onMessageNotification={handleMessageNotification}
            />
            {/* Modal de registro/login */}
            <AnimatePresence>
              {showAuthModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Autenticação"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="relative w-full max-w-md"
                  >
                    <button
                      onClick={() => setShowAuthModal(false)}
                      className="absolute -top-2 -right-2 z-10 p-2 rounded-full bg-white/90 shadow-lg text-gray-500 hover:text-gray-700"
                      aria-label="Fechar"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <AuthForm
                      type={authModalMode}
                      onSuccess={handleAuthSuccess}
                      onSwitchMode={() => setAuthModalMode((m) => (m === 'signup' ? 'login' : 'signup'))}
                    />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showPinPad && (
                <PinPad 
                  onSuccess={handlePinSuccess} 
                  onClose={() => setShowPinPad(false)} 
                />
              )}
            </AnimatePresence>

            {/* Notificações de mensagens agora aparecem inline no feed de notícias (StealthNews) */}
          </motion.div>
        ) : showMessaging ? (
          <motion.div 
            key="messaging"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative min-h-screen"
          >
            <ChatLayout />
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </StealthMessagingContext.Provider>
  );
}
