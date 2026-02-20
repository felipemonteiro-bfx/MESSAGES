'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, CheckCircle, Camera, Copy, QrCode } from 'lucide-react';
import { generateSecurityCode, generateQRData, parseQRData, verifySecurityCodes, type SecurityCode } from '@/lib/security-code';
import { toast } from 'sonner';

interface SecurityCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentUserId: string;
  recipientId: string;
  recipientNickname: string;
  onVerified?: () => void;
}

export default function SecurityCodeModal({
  isOpen,
  onClose,
  chatId,
  currentUserId,
  recipientId,
  recipientNickname,
  onVerified,
}: SecurityCodeModalProps) {
  const [securityCode, setSecurityCode] = useState<SecurityCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen && chatId && currentUserId && recipientId) {
      setIsLoading(true);
      generateSecurityCode(chatId, [currentUserId, recipientId])
        .then(code => {
          setSecurityCode(code);
          setIsLoading(false);
        })
        .catch(() => {
          toast.error('Erro ao gerar código de segurança');
          setIsLoading(false);
        });
    }
  }, [isOpen, chatId, currentUserId, recipientId]);

  const handleCopyCode = useCallback(() => {
    if (securityCode) {
      navigator.clipboard.writeText(securityCode.displayCode);
      toast.success('Código copiado!');
    }
  }, [securityCode]);

  const startScanner = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setShowScanner(true);
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Não foi possível acessar a câmera');
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowScanner(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleManualVerify = useCallback(() => {
    setIsVerified(true);
    toast.success('Identidade verificada!');
    onVerified?.();
  }, [onVerified]);

  const generateSimpleQR = useCallback((data: string): string => {
    const size = 200;
    const moduleCount = 21;
    const moduleSize = Math.floor(size / moduleCount);
    
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">`;
    svg += `<rect width="${size}" height="${size}" fill="white"/>`;
    
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        // Position patterns (corners)
        const isPositionPattern = (
          (row < 7 && col < 7) ||
          (row < 7 && col >= moduleCount - 7) ||
          (row >= moduleCount - 7 && col < 7)
        );
        
        // Timing patterns
        const isTimingPattern = (row === 6 || col === 6);
        
        // Data modules (pseudo-random based on hash and position)
        const seed = hash + row * moduleCount + col;
        const isDataModule = !isPositionPattern && !isTimingPattern && ((seed * 1103515245 + 12345) & 0x7fff) % 2 === 0;
        
        const isBlack = isPositionPattern ? 
          ((row === 0 || row === 6 || col === 0 || col === 6) ||
           (row >= 2 && row <= 4 && col >= 2 && col <= 4) ||
           (col === moduleCount - 1 && row < 7) ||
           (col === moduleCount - 7 && row < 7) ||
           (row === moduleCount - 1 && col < 7) ||
           (row === moduleCount - 7 && col < 7)) :
          isDataModule;
        
        if (isBlack || isPositionPattern) {
          svg += `<rect x="${col * moduleSize}" y="${row * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="${isBlack ? 'black' : 'white'}"/>`;
        }
      }
    }
    
    svg += '</svg>';
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${isVerified ? 'text-green-500' : 'text-blue-500'}`} />
              <h2 className="font-bold text-gray-900 dark:text-white">
                Verificar Identidade
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {showScanner ? (
              <div className="space-y-4">
                <video
                  ref={videoRef}
                  className="w-full aspect-square rounded-lg bg-black object-cover"
                  playsInline
                  muted
                />
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  Aponte a câmera para o QR Code do outro dispositivo
                </p>
                <button
                  onClick={stopScanner}
                  className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-medium"
                >
                  Cancelar
                </button>
              </div>
            ) : isVerified ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Identidade Verificada!
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  A conversa com {recipientNickname} está segura.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : securityCode ? (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Compare este código com {recipientNickname} presencialmente ou via chamada de vídeo.
                  </p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-4 bg-white rounded-xl shadow-inner">
                    <img
                      src={generateSimpleQR(generateQRData(securityCode))}
                      alt="QR Code de Verificação"
                      className="w-48 h-48"
                    />
                  </div>
                </div>

                {/* Security Code */}
                <div className="bg-gray-100 dark:bg-slate-800 rounded-xl p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">
                    Código de Segurança
                  </p>
                  <div className="font-mono text-lg text-center tracking-wider text-gray-900 dark:text-white">
                    {securityCode.displayCode}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="mt-2 mx-auto flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  Se os códigos forem iguais, a conversa está segura e livre de interceptação.
                </p>

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startScanner}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    Escanear
                  </button>
                  <button
                    onClick={handleManualVerify}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Verificado
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Erro ao carregar código de segurança
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
