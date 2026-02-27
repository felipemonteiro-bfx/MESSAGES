'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface ConnectionIndicatorProps {
  state: 'connected' | 'reconnecting' | 'disconnected';
}

export default function ConnectionIndicator({ state }: ConnectionIndicatorProps) {
  if (state === 'connected') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={`flex items-center justify-center gap-2 py-2 px-4 text-xs font-medium ${
          state === 'reconnecting'
            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
        }`}
      >
        {state === 'reconnecting' ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Reconectando...
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            Sem conexão
            <button
              onClick={() => window.location.reload()}
              className="ml-2 underline hover:no-underline"
            >
              Recarregar
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
