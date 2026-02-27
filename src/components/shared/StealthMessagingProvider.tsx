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
import { type AccessMode, clearAccessMode, getCurrentAccessMode } from '@/lib/pin';
import { envValid } from '@/lib/env';

interface StealthMessagingContextType {
  isStealthMode: boolean;
  accessMode: AccessMode;
  e2ePin: string | null;
  unlockMessaging: (mode?: AccessMode) => void;
  lockMessaging: () => void;
  setFilePickerActive: (active: boolean) => void;
}

const StealthMessagingContext = createContext<StealthMessagingContextType>({
  isStealthMode: true,
  accessMode: 'main',
  e2ePin: null,
  unlockMessaging: () => {},
  lockMessaging: () => {},
  setFilePickerActive: () => {},
});

export const useStealthMessaging = () => useContext(StealthMessagingContext);

interface StealthMessagingProviderProps {
  children: React.ReactNode;
}

export default function StealthMessagingProvider({ children }: StealthMessagingProviderProps) {
  const { user, supabase } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(true);
  const [accessMode, setAccessMode] = useState<AccessMode>('main');
  const [showPinPad, setShowPinPad] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signup' | 'login'>('signup');
  const [showMessaging, setShowMessaging] = useState(false);
  const e2ePinRef = useRef<string | null>(null);
  const [e2ePin, setE2ePin] = useState<string | null>(null);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const escapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const escapePressCountRef = useRef(0);
  const filePickerActiveRef = useRef(false);
  const [autoLockWarning, setAutoLockWarning] = useState(false);
  const autoLockWarningRef = useRef<NodeJS.Timeout | null>(null);

  const setFilePickerActive = useCallback((active: boolean) => {
    filePickerActiveRef.current = active;
  }, []);

  // Marcar como montado no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Inicializar estado apenas uma vez na montagem
  useEffect(() => {
    const checkInitialState = async () => {
      try {
        const storedMode = localStorage.getItem('n24h_mode');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (storedMode === 'false' && session?.user) {
          setShowPinPad(true);
          document.title = 'Noticias24h - Brasil e Mundo';
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
    setAccessMode('main');
    e2ePinRef.current = null;
    setE2ePin(null);
    clearAccessMode();
    localStorage.setItem('n24h_mode', 'true');
    document.title = 'Noticias24h - Brasil e Mundo';
  }, []);

  const unlockMessaging = useCallback((mode: AccessMode = 'main') => {
    setIsStealthMode(false);
    setShowPinPad(false);
    setShowMessaging(true);
    setAccessMode(mode);
    localStorage.setItem('n24h_mode', 'false');
    document.title = 'Mensagens';
    toast.success('Acesso concedido.', { id: 'access-granted', duration: 2000 });
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
        if (filePickerActiveRef.current) return;
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
      if (filePickerActiveRef.current) return;
      const timeoutSeconds = getAutoLockTimeout();
      if (timeoutSeconds === 0) return;

      const warningTime = Math.max(0, (timeoutSeconds - 5)) * 1000;
      const lockTime = timeoutSeconds * 1000;

      if (timeoutSeconds > 5) {
        visibilityTimeoutRef.current = setTimeout(() => {
          if (filePickerActiveRef.current || document.hasFocus() || isStealthMode) return;
          setAutoLockWarning(true);
          autoLockWarningRef.current = setTimeout(() => {
            if (filePickerActiveRef.current || document.hasFocus()) {
              setAutoLockWarning(false);
              return;
            }
            setAutoLockWarning(false);
            if (!isStealthMode) {
              lockMessaging();
              toast.info('Sistema bloqueado automaticamente', { duration: 2000 });
            }
          }, 5000);
        }, warningTime);
      } else {
        visibilityTimeoutRef.current = setTimeout(() => {
          if (filePickerActiveRef.current) return;
          if (!document.hasFocus() && !isStealthMode) {
            lockMessaging();
            toast.info('Sistema bloqueado automaticamente', { duration: 2000 });
          }
        }, lockTime);
      }
    };

    const handleFocus = () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      if (autoLockWarningRef.current) {
        clearTimeout(autoLockWarningRef.current);
      }
      setAutoLockWarning(false);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase.auth.getSession().then(({ data: { session } }: any) => {
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
    
    // Escutar evento de auth ao invés de delay fixo
    const waitForSession = (): Promise<boolean> => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          subscription.unsubscribe();
          resolve(false);
        }, 5000);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
          if (event === 'SIGNED_IN' && session?.user) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve(true);
          }
        });
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase.auth.getSession().then(({ data: { session } }: any) => {
          if (session?.user) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            resolve(true);
          }
        });
      });
    };
    
    const hasSession = await waitForSession();
    if (hasSession) {
      setShowPinPad(true);
    } else {
      toast.error('Erro ao autenticar. Tente novamente.');
      setShowAuthModal(true);
    }
  }, [supabase]);

  const handlePinSuccess = useCallback((mode: AccessMode, pin?: string) => {
    if (pin) {
      e2ePinRef.current = pin;
      setE2ePin(pin);
    }
    unlockMessaging(mode);
  }, [unlockMessaging]);

  const contextValue = useMemo(() => ({
    isStealthMode,
    accessMode,
    e2ePin,
    unlockMessaging,
    lockMessaging,
    setFilePickerActive,
  }), [isStealthMode, accessMode, e2ePin, unlockMessaging, lockMessaging, setFilePickerActive]);

  if (!isMounted) {
    return null;
  }

  if (!envValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0e1621] p-6 text-center">
        <div className="max-w-md space-y-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Configuração necessária</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure as variáveis de ambiente no arquivo <code className="bg-gray-200 dark:bg-[#17212b] px-1.5 py-0.5 rounded">.env.local</code>:
          </p>
          <ul className="text-left text-sm text-gray-700 dark:text-gray-300 list-disc list-inside space-y-1">
            <li><code>NEXT_PUBLIC_SUPABASE_URL</code></li>
            <li><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Depois reinicie o servidor (<code>yarn dev</code>).
          </p>
        </div>
      </div>
    );
  }

  return (
    <StealthMessagingContext.Provider value={contextValue}>
      {/* Auto-lock warning */}
      <AnimatePresence>
        {autoLockWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] bg-amber-500 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Bloqueio automático em 5s...
            <button
              onClick={() => {
                setAutoLockWarning(false);
                if (autoLockWarningRef.current) clearTimeout(autoLockWarningRef.current);
              }}
              className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs hover:bg-white/30 transition-colors"
            >
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isStealthMode ? (
          <motion.div 
            key="stealth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="fixed inset-0 z-[100] bg-white dark:bg-[#0e1621] overflow-y-auto"
          >
            <StealthNews 
              onUnlockRequest={handleUnlockRequest}
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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative h-dvh overflow-hidden"
          >
            <ChatLayout accessMode={accessMode} />
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </StealthMessagingContext.Provider>
  );
}
