'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Lock, Delete, X, RotateCcw } from 'lucide-react';
import { verifyPin, isPinConfigured, setupPin, isLockedOut, getRemainingLockoutMs, recordFailedAttempt, clearFailedAttempts, resetPin } from '@/lib/pin';
import { pinSchema } from '@/lib/validation';
import { toast } from 'sonner';

interface PinPadProps {
  onSuccess: () => void;
  onClose: () => void;
}

type PinStep = 'enter' | 'confirm' | 'forgot';

export default function PinPad({ onSuccess, onClose }: PinPadProps) {
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [step, setStep] = useState<PinStep>('enter');
  const [isVerifying, setIsVerifying] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setIsFirstTime(!isPinConfigured());
  }, []);

  // Atualiza estado de bloqueio
  useEffect(() => {
    const tick = () => {
      const isLocked = isLockedOut();
      setLocked(isLocked);
      if (isLocked) {
        setRemainingSecs(Math.ceil(getRemainingLockoutMs() / 1000));
      } else {
        setRemainingSecs(0);
      }
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, []);

  const handlePinComplete = useCallback(async (enteredPin: string) => {
    // Valida formato
    const validation = pinSchema.safeParse(enteredPin);
    if (!validation.success) {
      setError(true);
      setTimeout(() => { setPin(''); setConfirmPin(''); setError(false); }, 500);
      return;
    }

    setIsVerifying(true);
    try {
      if (isFirstTime) {
        if (step === 'enter') {
          // Primeiro passo: guardar PIN e pedir confirmação
          setConfirmPin(enteredPin);
          setPin('');
          setStep('confirm');
          setIsVerifying(false);
          return;
        }
        
        if (step === 'confirm') {
          // Segundo passo: verificar se os PINs coincidem
          if (enteredPin !== confirmPin) {
            setError(true);
            toast.error('Os PINs não coincidem. Tente novamente.');
            setTimeout(() => {
              setPin('');
              setConfirmPin('');
              setError(false);
              setStep('enter');
            }, 800);
            setIsVerifying(false);
            return;
          }
          
          const success = await setupPin(enteredPin);
          if (success) {
            clearFailedAttempts();
            toast.success('PIN configurado com sucesso!');
            onSuccess();
          } else {
            setError(true);
            recordFailedAttempt();
            setTimeout(() => { setPin(''); setConfirmPin(''); setError(false); setStep('enter'); }, 500);
          }
        }
      } else {
        // Verificação de PIN existente
        if (isLockedOut()) {
          setError(true);
          setTimeout(() => { setPin(''); setError(false); }, 500);
          setIsVerifying(false);
          return;
        }

        const isValid = await verifyPin(enteredPin);
        if (isValid) {
          clearFailedAttempts();
          onSuccess();
        } else {
          setError(true);
          recordFailedAttempt();
          setTimeout(() => { setPin(''); setError(false); }, 500);
        }
      }
    } finally {
      setIsVerifying(false);
    }
  }, [isFirstTime, step, confirmPin, onSuccess]);

  useEffect(() => {
    if (pin.length !== 4 || locked || isVerifying) return;
    handlePinComplete(pin);
  }, [pin, locked, isVerifying, handlePinComplete]);

  const handleDigit = (digit: string) => {
    if (locked || pin.length >= 4 || isVerifying) return;
    setPin(prev => prev + digit);
    setError(false);
    // Haptic feedback em mobile
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleBackspace = () => {
    if (isVerifying) return;
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  const handleForgotPin = () => {
    setStep('forgot');
  };

  const handleResetPin = () => {
    resetPin();
    toast.info('PIN resetado. Você precisará fazer login novamente e configurar um novo PIN.');
    onClose();
  };

  const getStatusText = () => {
    if (locked) {
      return (
        <p className="text-sm text-amber-400 font-medium">
          Muitas tentativas. Tente novamente em <span className="font-bold">{remainingSecs}s</span>.
        </p>
      );
    }
    if (isVerifying) {
      return <p className="text-xs text-gray-400 animate-pulse">Verificando...</p>;
    }
    if (step === 'forgot') {
      return null;
    }
    if (isFirstTime && step === 'confirm') {
      return (
        <>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
            Confirme seu PIN
          </p>
          <p className="text-xs text-gray-400 mt-2">Digite o mesmo PIN novamente para confirmar</p>
        </>
      );
    }
    if (isFirstTime) {
      return (
        <>
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
            Configure seu PIN de Segurança
          </p>
          <p className="text-xs text-gray-400 mt-2">Escolha um PIN de 4 dígitos para proteger suas mensagens</p>
        </>
      );
    }
    return (
      <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">
        Digite seu Código de Acesso
      </p>
    );
  };

  if (step === 'forgot') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Recuperar PIN">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-xs bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800"
        >
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setStep('enter')} className="p-2 rounded-full hover:bg-gray-800 text-gray-400 transition-colors" aria-label="Voltar">
              <RotateCcw className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-white font-medium">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Recuperar Acesso</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800 text-gray-400 transition-colors" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-300">
              Para resetar seu PIN, você precisará fazer login novamente com email e senha.
            </p>
            <p className="text-xs text-gray-500">
              Isso não apaga suas mensagens ou dados.
            </p>
            <button
              onClick={handleResetPin}
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold transition-colors"
            >
              Resetar PIN e Fazer Login
            </button>
            <button
              onClick={() => setStep('enter')}
              className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors"
            >
              Voltar
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Inserir PIN">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xs bg-gray-900 rounded-3xl p-6 shadow-2xl border border-gray-800"
      >
        <div className="flex justify-between items-center mb-8">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-800 text-gray-400 transition-colors" aria-label="Fechar">
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 text-white font-medium">
            <Lock className="w-4 h-4 text-emerald-500" />
            <span>Security Access</span>
          </div>
          <div className="w-10" />
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-4 mb-8" role="status" aria-label={`${pin.length} de 4 dígitos inseridos`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? error ? 'bg-red-500 scale-125' : 'bg-emerald-500 scale-110'
                  : 'bg-gray-700'
              }`}
              aria-hidden="true"
            />
          ))}
        </div>

        {/* Keypad */}
        <div className={`grid grid-cols-3 gap-3 sm:gap-4 mb-6 ${locked || isVerifying ? 'pointer-events-none opacity-50' : ''}`} role="group" aria-label="Teclado numérico">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleDigit(num.toString())}
              disabled={locked || isVerifying}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-800 text-2xl font-semibold text-white hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center mx-auto shadow-md"
              aria-label={`Dígito ${num}`}
            >
              {num}
            </button>
          ))}
          <div className="w-14 h-14 sm:w-16 sm:h-16" />
          <button
            onClick={() => handleDigit('0')}
            disabled={locked || isVerifying}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-800 text-2xl font-semibold text-white hover:bg-gray-700 active:scale-95 transition-all flex items-center justify-center mx-auto shadow-md"
            aria-label="Dígito 0"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            disabled={locked || isVerifying}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-transparent text-gray-400 hover:text-white hover:bg-gray-800 active:scale-95 transition-all flex items-center justify-center mx-auto"
            aria-label="Apagar último dígito"
          >
            <Delete className="w-7 h-7 sm:w-8 sm:h-8" />
          </button>
        </div>

        <div className="text-center space-y-2">
          {getStatusText()}
          {!isFirstTime && !locked && !isVerifying && (
            <button
              onClick={handleForgotPin}
              className="text-xs text-gray-500 hover:text-gray-300 underline transition-colors mt-2"
            >
              Esqueci meu PIN
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
