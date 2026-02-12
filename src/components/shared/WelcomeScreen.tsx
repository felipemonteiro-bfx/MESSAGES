'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock } from 'lucide-react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export default function WelcomeScreen({ onComplete }: WelcomeScreenProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center"
        onAnimationComplete={() => {
          setTimeout(onComplete, 2000);
        }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-6 px-8"
        >
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
              <div className="relative bg-slate-800 p-6 rounded-3xl border border-emerald-500/30 shadow-2xl">
                <Shield className="w-16 h-16 text-emerald-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-black text-white tracking-tight">
              Bem-vindo, Senhor
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Sistema de comunicação seguro inicializado
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-widest"
          >
            <Lock className="w-3 h-3" />
            <span>Modo Stealth Ativo</span>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
