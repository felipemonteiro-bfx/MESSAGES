'use client';

import { motion } from 'framer-motion';
import { MessageSquare, UserPlus, Shield, Lock } from 'lucide-react';

interface ChatEmptyStateProps {
  type: 'no-chats' | 'no-selection' | 'no-messages';
  onAddContact?: () => void;
}

export default function ChatEmptyState({ type, onAddContact }: ChatEmptyStateProps) {
  if (type === 'no-chats') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-full px-6 py-12 text-center"
      >
        <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
          <MessageSquare className="w-10 h-10 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Nenhuma conversa ainda
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-xs">
          Adicione um contato para começar a trocar mensagens criptografadas de ponta a ponta.
        </p>
        {onAddContact && (
          <button
            onClick={onAddContact}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Adicionar contato
          </button>
        )}
        <div className="mt-8 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <Lock className="w-3.5 h-3.5" />
          <span>Mensagens protegidas com criptografia E2E</span>
        </div>
      </motion.div>
    );
  }

  if (type === 'no-selection') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden md:flex flex-col items-center justify-center h-full text-center px-6"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 flex items-center justify-center mb-6">
          <Shield className="w-12 h-12 text-blue-500/60 dark:text-blue-400/60" />
        </div>
        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          Selecione uma conversa
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Escolha uma conversa na barra lateral ou adicione um novo contato para começar.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3" />
            Criptografia E2E
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3" />
            Modo Stealth
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full text-center px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-4">
        <Lock className="w-8 h-8 text-green-500 dark:text-green-400" />
      </div>
      <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
        Conversa protegida
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        As mensagens são criptografadas de ponta a ponta. Envie a primeira mensagem!
      </p>
    </motion.div>
  );
}
