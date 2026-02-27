'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ONBOARDING_KEY = 'n24h_onboarded';

export function useStealthOnboarding() {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(ONBOARDING_KEY)) return;
      const timer = setTimeout(() => setShowHint(true), 3000);
      return () => clearTimeout(timer);
    } catch {
      // localStorage not available
    }
  }, []);

  const dismiss = () => {
    setShowHint(false);
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // ignore
    }
  };

  return { showHint, dismiss };
}

interface DateHintProps {
  show: boolean;
  onDismiss: () => void;
}

export function DateHint({ show, onDismiss }: DateHintProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="absolute top-full right-0 mt-2 z-50"
          onClick={onDismiss}
        >
          <div className="relative bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap">
            Toque duas vezes aqui
            <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45" />
          </div>
          <motion.div
            className="absolute -top-1 right-3 w-4 h-4 rounded-full bg-blue-500/30"
            animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
