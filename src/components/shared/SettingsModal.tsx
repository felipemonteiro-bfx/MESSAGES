'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, EyeOff, Bell, BellOff } from 'lucide-react';
import { getAutoLockTimeout, setAutoLockTimeout, isIncognitoMode, setIncognitoMode, getAutoLockOnScreenLock, setAutoLockOnScreenLock, type AutoLockTimeout } from '@/lib/settings';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [autoLockTimeout, setAutoLockTimeoutState] = useState<AutoLockTimeout>(10);
  const [incognitoMode, setIncognitoModeState] = useState(false);
  const [autoLockOnScreenLock, setAutoLockOnScreenLockState] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setAutoLockTimeoutState(getAutoLockTimeout());
      setIncognitoModeState(isIncognitoMode());
      setAutoLockOnScreenLockState(getAutoLockOnScreenLock());
    }
  }, [isOpen]);

  const handleAutoLockChange = (timeout: AutoLockTimeout) => {
    setAutoLockTimeout(timeout);
    setAutoLockTimeoutState(timeout);
  };

  const handleIncognitoToggle = () => {
    const newValue = !incognitoMode;
    setIncognitoMode(newValue);
    setIncognitoModeState(newValue);
  };

  const handleAutoLockOnScreenLockToggle = () => {
    const newValue = !autoLockOnScreenLock;
    setAutoLockOnScreenLock(newValue);
    setAutoLockOnScreenLockState(newValue);
  };

  const timeoutOptions: { value: AutoLockTimeout; label: string }[] = [
    { value: 10, label: '10 segundos' },
    { value: 30, label: '30 segundos' },
    { value: 60, label: '1 minuto' },
    { value: 300, label: '5 minutos' },
    { value: 0, label: 'Nunca' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Configurações</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-6">
                {/* Sugestão 5: Auto-lock configurável */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <label className="font-semibold text-sm text-gray-900 dark:text-white">
                      Bloquear automaticamente após
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {timeoutOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleAutoLockChange(option.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          autoLockTimeout === option.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sugestão 3: Modo Incógnito */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <label className="font-semibold text-sm text-gray-900 dark:text-white">
                        Modo Incógnito
                      </label>
                    </div>
                    <button
                      onClick={handleIncognitoToggle}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        incognitoMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          incognitoMode ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Apaga mensagens locais ao fechar o chat. Não salva histórico no navegador.
                  </p>
                  {incognitoMode && (
                    <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ Modo Incógnito ativo. Mensagens serão apagadas ao fechar o chat.
                      </p>
                    </div>
                  )}
                </div>

                {/* Sugestão 1: Auto-lock ao bloquear tela */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <label className="font-semibold text-sm text-gray-900 dark:text-white">
                        Bloquear ao minimizar/bloquear tela
                      </label>
                    </div>
                    <button
                      onClick={handleAutoLockOnScreenLockToggle}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        autoLockOnScreenLock ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          autoLockOnScreenLock ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Bloqueia automaticamente quando o app vai para segundo plano ou a tela é bloqueada.
                  </p>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
