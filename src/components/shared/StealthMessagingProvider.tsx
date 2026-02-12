'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StealthNews from './StealthNews';
import PinPad from './PinPad';
import ChatLayout from '../messaging/ChatLayout';
import WelcomeScreen from './WelcomeScreen';
import { toast } from 'sonner';

const StealthMessagingContext = createContext({
  isStealthMode: true,
  unlockMessaging: () => {},
  lockMessaging: () => {},
});

export const useStealthMessaging = () => useContext(StealthMessagingContext);

interface StealthMessagingProviderProps {
  children: React.ReactNode;
}

export default function StealthMessagingProvider({ children }: StealthMessagingProviderProps) {
  const [isStealthMode, setIsStealthMode] = useState(true);
  const [showPinPad, setShowPinPad] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [notifications, setNotifications] = useState<string[]>([]);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificar estado salvo
    const saved = localStorage.getItem('stealth_messaging_mode');
    if (saved === 'false') {
      setIsStealthMode(false);
      setShowMessaging(true);
    } else {
      setIsStealthMode(true);
      document.title = 'Notícias em Tempo Real';
    }

    // Auto-lock quando a página perde foco ou usuário sai
    const handleVisibilityChange = () => {
      if (document.hidden && !isStealthMode) {
        // Usuário saiu da página - voltar para modo stealth
        lockMessaging();
      }
    };

    const handleBeforeUnload = () => {
      // Salvar estado antes de sair
      localStorage.setItem('stealth_messaging_mode', 'true');
    };

    const handleBlur = () => {
      // Se sair do foco por mais de 10 segundos, bloquear
      visibilityTimeoutRef.current = setTimeout(() => {
        if (!document.hasFocus() && !isStealthMode) {
          lockMessaging();
          toast.success('Sistema bloqueado automaticamente', { duration: 2000 });
        }
      }, 10000); // 10 segundos
    };

    const handleFocus = () => {
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [isStealthMode]);

  const unlockMessaging = () => {
    setIsStealthMode(false);
    setShowPinPad(false);
    setShowMessaging(true);
    localStorage.setItem('stealth_messaging_mode', 'false');
    document.title = 'Mensagens';
    toast.success('Bom trabalho! Acesso concedido.', { duration: 2000 });
  };

  const lockMessaging = () => {
    setIsStealthMode(true);
    setShowMessaging(false);
    setShowPinPad(false);
    localStorage.setItem('stealth_messaging_mode', 'true');
    document.title = 'Notícias em Tempo Real';
    toast.success('Bom trabalho! Modo notícias ativado automaticamente.', { duration: 2000 });
  };

  const handleUnlockRequest = () => {
    setShowPinPad(true);
  };

  const handlePinSuccess = () => {
    unlockMessaging();
  };

  const handleMessageNotification = (fakeNewsTitle: string) => {
    // Adicionar notificação disfarçada
    setNotifications(prev => [...prev, fakeNewsTitle]);
    
    // Remover após 5 segundos
    setTimeout(() => {
      setNotifications(prev => prev.slice(1));
    }, 5000);

    // Mostrar toast disfarçado
    toast.info(fakeNewsTitle, {
      duration: 3000,
      icon: '📰',
    });
  };

  return (
    <StealthMessagingContext.Provider value={{ isStealthMode, unlockMessaging, lockMessaging }}>
      <AnimatePresence mode="wait">
        {showWelcome ? (
          <WelcomeScreen onComplete={() => setShowWelcome(false)} />
        ) : isStealthMode ? (
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
            <AnimatePresence>
              {showPinPad && (
                <PinPad 
                  onSuccess={handlePinSuccess} 
                  onClose={() => setShowPinPad(false)} 
                />
              )}
            </AnimatePresence>

            {/* Notificações disfarçadas */}
            <AnimatePresence>
              {notifications.map((notification, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: -50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -50 }}
                  className="fixed top-4 right-4 z-[200] bg-white rounded-xl shadow-lg border border-gray-200 p-4 max-w-sm"
                  ref={notificationRef}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">📰</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 mb-1">Nova Notícia Recebida</p>
                      <p className="text-xs text-gray-600">{notification}</p>
                      <button
                        onClick={() => handleUnlockRequest()}
                        className="text-xs text-blue-600 mt-2 font-medium hover:underline"
                      >
                        Ver mais detalhes →
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : showMessaging ? (
          <motion.div 
            key="messaging"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative min-h-screen"
          >
            {/* Botão secreto para voltar ao modo notícias */}
            <button
              onClick={lockMessaging}
              className="fixed bottom-4 right-4 z-[200] w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all opacity-0 hover:opacity-100 group"
              title="Voltar para Notícias"
              aria-label="Lock messaging"
            >
              <span className="text-gray-400 group-hover:text-gray-600 text-xs">📰</span>
            </button>
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
