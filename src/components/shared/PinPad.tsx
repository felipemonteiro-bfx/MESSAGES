'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Delete, X } from 'lucide-react';
import { verifyPin, isPinConfigured, setupPin, isLockedOut, getRemainingLockoutMs, recordFailedAttempt, clearFailedAttempts } from '@/lib/pin';
import { pinSchema } from '@/lib/validation';

interface PinPadProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function PinPad({ onSuccess, onClose }: PinPadProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState(0);

  useEffect(() => {
    setIsFirstTime(!isPinConfigured());
  }, []);

  // Atualiza segundos restantes quando bloqueado
  useEffect(() => {
    if (!isLockedOut()) {
      setRemainingSecs(0);
      return;
    }
    const tick = () => setRemainingSecs(Math.ceil(getRemainingLockoutMs() / 1000));
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [locked]);

  const locked = isLockedOut();

  useEffect(() => {
    if (pin.length !== 4 || locked) return;

    // Valida formato antes de verificar
    const validation = pinSchema.safeParse(pin);
    if (!validation.success) {
      setError(true);
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
      return;
    }

    // Se é a primeira vez, configura o PIN
    if (isFirstTime) {
      if (setupPin(pin)) {
        clearFailedAttempts();
        onSuccess();
      } else {
        setError(true);
        recordFailedAttempt();
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
      }
      return;
    }

    // Verifica PIN existente
    if (verifyPin(pin)) {
      clearFailedAttempts();
      onSuccess();
    } else {
      setError(true);
      recordFailedAttempt();
      setTimeout(() => {
        setPin('');
        setError(false);
      }, 500);
    }
  }, [pin, onSuccess, isFirstTime, locked]);

  const handleDigit = (digit: string) => {
    if (locked || pin.length >= 4) return;
    setPin(prev => prev + digit);
    setError(false);
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xs bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800"
      >
        <div className="flex justify-between items-center mb-8">
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800 text-gray-400 transition-colors">
                <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 text-white font-medium">
                <Lock className="w-4 h-4 text-emerald-500" />
                <span>Security Access</span>
            </div>
            <div className="w-10" /> {/* Spacer */}
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < pin.length 
                  ? error ? 'bg-red-500 scale-125' : 'bg-emerald-500 scale-110'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className={`grid grid-cols-3 gap-4 mb-6 ${locked ? 'pointer-events-none opacity-50' : ''}`}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num.toString())}
              disabled={locked}
              className="w-16 h-16 rounded-full bg-gray-800 text-2xl font-semibold text-white hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center mx-auto shadow-md"
            >
              {num}
            </button>
          ))}
          <div className="w-16 h-16" /> {/* Spacer */}
          <button
            onClick={() => handleDigit('0')}
            disabled={locked}
            className="w-16 h-16 rounded-full bg-gray-800 text-2xl font-semibold text-white hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center mx-auto shadow-md"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={locked}
            className="w-16 h-16 rounded-full bg-transparent text-gray-400 hover:text-white hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center mx-auto"
          >
            <Delete className="w-8 h-8" />
          </button>
        </div>
        
        <div className="text-center">
            {locked ? (
              <p className="text-sm text-amber-400 font-medium">
                Muitas tentativas. Tente novamente em <span className="font-bold">{remainingSecs}s</span>.
              </p>
            ) : (
              <>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
                  {isFirstTime ? 'Configure seu PIN de Segurança' : 'Digite seu Código de Acesso'}
                </p>
                {isFirstTime && (
                  <p className="text-xs text-gray-400 mt-2">Escolha um PIN de 4 dígitos para proteger suas mensagens</p>
                )}
              </>
            )}
        </div>
      </motion.div>
    </div>
  );
}
