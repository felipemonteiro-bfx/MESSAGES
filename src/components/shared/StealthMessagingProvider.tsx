'use client';

import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StealthNews from './StealthNews';
import PinPad from './PinPad';
import ChatLayout from '../messaging/ChatLayout';
import { toast } from 'sonner';
import { X } from 'lucide-react';

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
  const [notifications, setNotifications] = useState<string[]>([]);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Sugestão 7: Atalho de teclado para bloquear
  const [escapePressCount, setEscapePressCount] = useState(0);
  const escapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Sugestão 7: Atalho de teclado para bloquear (Ctrl+Shift+L ou Escape 2x)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+L para bloquear
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        if (!isStealthMode) {
          lockMessaging();
          toast.success('Bom trabalho! Modo notícias ativado.', { duration: 2000 });
        }
        return;
      }

      // Escape duas vezes para bloquear
      if (e.key === 'Escape') {
        if (escapeTimeoutRef.current) {
          clearTimeout(escapeTimeoutRef.current);
        }
        
        setEscapePressCount(prev => {
          const newCount = prev + 1;
          if (newCount === 2 && !isStealthMode) {
            lockMessaging();
            toast.success('Bom trabalho! Modo notícias ativado.', { duration: 2000 });
            return 0;
          }
          
          // Reset contador após 1 segundo
          escapeTimeoutRef.current = setTimeout(() => {
            setEscapePressCount(0);
          }, 1000);
          
          return newCount;
        });
      }
    };

    // Sugestão 6: Proteção contra screenshot/gravação
    const handleVisibilityChange = () => {
      if (document.hidden && !isStealthMode) {
        // Usuário saiu da página - voltar para modo stealth
        lockMessaging();
      }
    };

    // Detectar tentativas de captura de tela (limitado pelo navegador)
    const handleContextMenu = (e: MouseEvent) => {
      // Em alguns casos, desabilitar menu de contexto pode ajudar
      if (!isStealthMode && e.target instanceof HTMLElement) {
        const isSensitiveArea = e.target.closest('[data-stealth-content]');
        if (isSensitiveArea) {
          // Aviso silencioso (não bloquear completamente pois não é possível)
          console.warn('Conteúdo sensível detectado');
        }
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

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      if (escapeTimeoutRef.current) {
        clearTimeout(escapeTimeoutRef.current);
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
    // Gerar notificação mais realista como manchete de notícia
    const newsSources = ['G1', 'BBC Brasil', 'Folha', 'UOL', 'CNN Brasil', 'Globo'];
    const randomSource = newsSources[Math.floor(Math.random() * newsSources.length)];
    const notificationId = `notification-${Date.now()}`;
    
    // Adicionar notificação disfarçada
    setNotifications(prev => [...prev, notificationId]);
    
    // Remover após 8 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(id => id !== notificationId));
    }, 8000);

    // Mostrar toast disfarçado como notícia
    toast.info(fakeNewsTitle, {
      duration: 4000,
      icon: '📰',
      description: `${randomSource} • Agora`,
      action: {
        label: 'Ver',
        onClick: () => handleUnlockRequest(),
      },
    });
  };

  return (
    <StealthMessagingContext.Provider value={{ isStealthMode, unlockMessaging, lockMessaging }}>
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
            <AnimatePresence>
              {showPinPad && (
                <PinPad 
                  onSuccess={handlePinSuccess} 
                  onClose={() => setShowPinPad(false)} 
                />
              )}
            </AnimatePresence>

            {/* Notificações disfarçadas como manchetes */}
            <AnimatePresence>
              {notifications.map((notification, index) => (
                <motion.div
                  key={notification}
                  initial={{ opacity: 0, y: -50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -50, scale: 0.9 }}
                  className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[200] bg-white rounded-xl shadow-2xl border-l-4 border-red-600 p-4"
                  ref={notificationRef}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📰</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded uppercase">
                          BREAKING
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">Agora</span>
                      </div>
                      <p className="text-sm font-bold text-gray-900 leading-tight mb-2">{notification}</p>
                      <button
                        onClick={() => handleUnlockRequest()}
                        className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                      >
                        Ler mais <span>→</span>
                      </button>
                    </div>
                    <button
                      onClick={() => setNotifications(prev => prev.filter(n => n !== notification))}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
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
