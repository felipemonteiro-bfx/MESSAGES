'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, AlertTriangle, X, Shield } from 'lucide-react';

interface ScreenshotAlertProps {
  isVisible: boolean;
  onClose: () => void;
  message?: string;
  variant?: 'detected' | 'received';
}

export default function ScreenshotAlert({ 
  isVisible, 
  onClose, 
  message,
  variant = 'detected'
}: ScreenshotAlertProps) {
  const isDetected = variant === 'detected';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)] mx-auto 
            ${isDetected 
              ? 'bg-orange-500 text-white' 
              : 'bg-yellow-500 text-yellow-900'
            } 
            rounded-xl shadow-2xl overflow-hidden`}
        >
          <div className="p-4 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${isDetected ? 'bg-orange-600' : 'bg-yellow-600/20'}`}>
              {isDetected ? (
                <Camera className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-sm mb-1">
                {isDetected 
                  ? 'Captura de tela detectada!' 
                  : 'Alerta de captura de tela'}
              </h4>
              <p className="text-sm opacity-90">
                {message || (isDetected
                  ? 'Um possível screenshot foi detectado. O outro participante será notificado.'
                  : 'Alguém pode ter tirado uma captura de tela desta conversa.'
                )}
              </p>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors
                ${isDetected 
                  ? 'hover:bg-orange-600' 
                  : 'hover:bg-yellow-600/20'
                }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Barra de progresso para auto-dismiss */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: 'linear' }}
            onAnimationComplete={onClose}
            className={`h-1 ${isDetected ? 'bg-orange-300' : 'bg-yellow-300'}`}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ScreenshotProtectionOverlayProps {
  isActive: boolean;
  message?: string;
}

export function ScreenshotProtectionOverlay({ 
  isActive, 
  message = 'Conteúdo protegido' 
}: ScreenshotProtectionOverlayProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center"
        >
          <div className="text-center text-white">
            <Shield className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h3 className="text-xl font-bold mb-2">Conteúdo Protegido</h3>
            <p className="text-gray-400 text-sm max-w-xs">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
