'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, User } from 'lucide-react';
import { validateAndSanitizeNickname } from '@/lib/validation';
import { toast } from 'sonner';

interface EditNicknameModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNickname: string;
  userId: string;
  isOwnProfile: boolean;
  onSuccess: () => void;
}

export default function EditNicknameModal({
  isOpen,
  onClose,
  currentNickname,
  userId,
  isOwnProfile,
  onSuccess
}: EditNicknameModalProps) {
  const [nickname, setNickname] = useState(currentNickname);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNickname(currentNickname);
    }
  }, [isOpen, currentNickname]);

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast.error('Nickname não pode estar vazio');
      return;
    }

    // Validar nickname
    const validation = validateAndSanitizeNickname(nickname.trim());
    if (!validation.success) {
      toast.error(validation.error || 'Nickname inválido');
      return;
    }

    setIsSaving(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Se for próprio perfil, usar update normal
      if (isOwnProfile) {
        const { error, data } = await supabase
          .from('profiles')
          .update({ nickname: validation.data })
          .eq('id', userId)
          .select()
          .single();

        if (error) {
          console.error('Erro ao atualizar nickname:', error);
          throw error;
        }
        
        // Verificar se atualizou corretamente
        if (!data) {
          throw new Error('Nickname não foi atualizado. Tente novamente.');
        }
      } else {
        // Para editar nickname de outros, usar função RPC (precisa ser criada no Supabase)
        const { error } = await supabase.rpc('update_user_nickname', {
          target_user_id: userId,
          new_nickname: validation.data
        });

        if (error) {
          // Se RPC não existir, tentar update direto (pode falhar por RLS)
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ nickname: validation.data })
            .eq('id', userId);

          if (updateError) throw updateError;
        }
      }

      toast.success('Nickname atualizado com sucesso!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar nickname:', error);
      toast.error(error.message || 'Erro ao atualizar nickname');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg">
                <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {isOwnProfile ? 'Editar Meu Nickname' : 'Editar Nickname'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nickname
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Digite o nickname..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 dark:text-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isSaving) {
                    handleSave();
                  }
                }}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                3-20 caracteres, apenas letras minúsculas, números e underscore
              </p>
            </div>

            {!isOwnProfile && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ Você está editando o nickname de outro usuário
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 transition-colors"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !nickname.trim() || nickname === currentNickname}
                className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
