'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, EyeOff, Download, User, Camera } from 'lucide-react';
import { getAutoLockTimeout, setAutoLockTimeout, isIncognitoMode, setIncognitoMode, getAutoLockOnScreenLock, setAutoLockOnScreenLock, type AutoLockTimeout } from '@/lib/settings';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string | null;
  onAvatarUpdate?: (newUrl: string) => void;
}

export default function SettingsModal({ isOpen, onClose, currentAvatarUrl, onAvatarUpdate }: SettingsModalProps) {
  const [autoLockTimeout, setAutoLockTimeoutState] = useState<AutoLockTimeout>(10);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl ?? null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(currentAvatarUrl ?? null);
  }, [currentAvatarUrl, isOpen]);
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

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem (JPG, PNG, WebP ou GIF)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 2MB)');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Faça login para alterar o avatar.');
        return;
      }
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      setAvatarUrl(data.avatar_url);
      onAvatarUpdate?.(data.avatar_url);
      toast.success('Avatar atualizado!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar avatar');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  }, [onAvatarUpdate]);

  const handleExportData = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Faça login para exportar seus dados.');
        return;
      }
      const res = await fetch('/api/export-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao exportar');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      try {
        const path = `${session.user.id}/backup-${new Date().toISOString().slice(0, 10)}.json`;
        const { error: uploadErr } = await supabase.storage.from('backups').upload(path, blob, { upsert: true, contentType: 'application/json' });
        if (!uploadErr) toast.success('Dados exportados e backup salvo na nuvem');
        else toast.success('Dados exportados (LGPD)');
      } catch {
        toast.success('Dados exportados (LGPD)');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao exportar dados');
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
                {/* Avatar */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <label className="font-semibold text-sm text-gray-900 dark:text-white">
                      Foto do perfil
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="relative group"
                      aria-label="Alterar avatar"
                    >
                      <img
                        src={avatarUrl || 'https://i.pravatar.cc/150'}
                        alt="Seu avatar"
                        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-slate-600"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                      </span>
                      {isUploadingAvatar && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full">
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </span>
                      )}
                    </button>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Clique na foto para alterar</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">JPG, PNG, WebP ou GIF • máx. 2MB</p>
                    </div>
                  </div>
                </div>

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
                      aria-label={incognitoMode ? 'Desativar modo incógnito' : 'Ativar modo incógnito'}
                      role="switch"
                      aria-checked={incognitoMode}
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
                      aria-label={autoLockOnScreenLock ? 'Desativar bloqueio ao minimizar' : 'Ativar bloqueio ao minimizar'}
                      role="switch"
                      aria-checked={autoLockOnScreenLock}
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

                {/* LGPD: Exportação de dados */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" aria-hidden />
                    <label className="font-semibold text-sm text-gray-900 dark:text-white">
                      Exportar meus dados (LGPD)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Baixe uma cópia dos seus dados pessoais e mensagens em formato JSON.
                  </p>
                  <button
                    onClick={handleExportData}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                  >
                    <Download className="w-4 h-4" />
                    Baixar meus dados
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Também salva cópia na nuvem automaticamente.
                  </p>
                </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
