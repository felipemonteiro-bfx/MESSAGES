'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, EyeOff, Download, User, Camera, Shield, AlertTriangle, Eye, EyeOff as EyeOffIcon, Image as ImageIcon, Smile } from 'lucide-react';
import { getAutoLockTimeout, setAutoLockTimeout, isIncognitoMode, setIncognitoMode, getAutoLockOnScreenLock, setAutoLockOnScreenLock, isGhostModeEnabled, setGhostMode, areReadReceiptsEnabled, setReadReceipts, type AutoLockTimeout } from '@/lib/settings';
import { isDecoyPinEnabled, isDecoyPinConfigured, setupDecoyPin, removeDecoyPin, setDecoyPinEnabled } from '@/lib/pin';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const AVATAR_SYMBOLS = [
  { emoji: '👤', label: 'Pessoa' },
  { emoji: '🦊', label: 'Raposa' },
  { emoji: '🐺', label: 'Lobo' },
  { emoji: '🦁', label: 'Leão' },
  { emoji: '🐯', label: 'Tigre' },
  { emoji: '🦅', label: 'Águia' },
  { emoji: '🦉', label: 'Coruja' },
  { emoji: '🐉', label: 'Dragão' },
  { emoji: '🦄', label: 'Unicórnio' },
  { emoji: '🐬', label: 'Golfinho' },
  { emoji: '🦋', label: 'Borboleta' },
  { emoji: '🌸', label: 'Flor' },
  { emoji: '⭐', label: 'Estrela' },
  { emoji: '🌙', label: 'Lua' },
  { emoji: '☀️', label: 'Sol' },
  { emoji: '🔥', label: 'Fogo' },
  { emoji: '💎', label: 'Diamante' },
  { emoji: '🎭', label: 'Máscaras' },
  { emoji: '👻', label: 'Fantasma' },
  { emoji: '🤖', label: 'Robô' },
  { emoji: '👽', label: 'Alien' },
  { emoji: '🥷', label: 'Ninja' },
  { emoji: '🧙', label: 'Mago' },
  { emoji: '🦸', label: 'Herói' },
];

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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarPickerTab, setAvatarPickerTab] = useState<'symbols' | 'upload'>('symbols');
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAvatarUrl(currentAvatarUrl ?? null);
  }, [currentAvatarUrl, isOpen]);
  const [incognitoMode, setIncognitoModeState] = useState(false);
  const [autoLockOnScreenLock, setAutoLockOnScreenLockState] = useState(true);
  
  // Dual PIN / Modo Pânico
  const [decoyPinEnabled, setDecoyPinEnabledState] = useState(false);
  const [decoyPinConfigured, setDecoyPinConfiguredState] = useState(false);
  const [showDecoyPinSetup, setShowDecoyPinSetup] = useState(false);
  const [decoyPin, setDecoyPin] = useState('');
  const [decoyPinConfirm, setDecoyPinConfirm] = useState('');
  const [isSettingUpDecoyPin, setIsSettingUpDecoyPin] = useState(false);
  
  // Modo Fantasma
  const [ghostMode, setGhostModeState] = useState(false);
  const [readReceipts, setReadReceiptsState] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setAutoLockTimeoutState(getAutoLockTimeout());
      setIncognitoModeState(isIncognitoMode());
      setAutoLockOnScreenLockState(getAutoLockOnScreenLock());
      setDecoyPinEnabledState(isDecoyPinEnabled());
      setDecoyPinConfiguredState(isDecoyPinConfigured());
      setGhostModeState(isGhostModeEnabled());
      setReadReceiptsState(areReadReceiptsEnabled());
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

  const handleDecoyPinToggle = () => {
    if (decoyPinEnabled) {
      // Desativar
      setDecoyPinEnabled(false);
      setDecoyPinEnabledState(false);
      toast.success('PIN de pânico desativado');
    } else {
      if (decoyPinConfigured) {
        // Já configurado, apenas ativar
        setDecoyPinEnabled(true);
        setDecoyPinEnabledState(true);
        toast.success('PIN de pânico ativado');
      } else {
        // Precisa configurar primeiro
        setShowDecoyPinSetup(true);
      }
    }
  };

  const handleSetupDecoyPin = async () => {
    if (decoyPin.length !== 4 || !/^\d{4}$/.test(decoyPin)) {
      toast.error('PIN deve ter exatamente 4 dígitos');
      return;
    }
    if (decoyPin !== decoyPinConfirm) {
      toast.error('Os PINs não coincidem');
      return;
    }
    
    setIsSettingUpDecoyPin(true);
    try {
      const success = await setupDecoyPin(decoyPin);
      if (success) {
        setDecoyPinConfiguredState(true);
        setDecoyPinEnabledState(true);
        setShowDecoyPinSetup(false);
        setDecoyPin('');
        setDecoyPinConfirm('');
        toast.success('PIN de pânico configurado com sucesso!');
      } else {
        toast.error('Erro ao configurar PIN. O PIN de pânico não pode ser igual ao PIN principal.');
      }
    } finally {
      setIsSettingUpDecoyPin(false);
    }
  };

  const handleRemoveDecoyPin = () => {
    removeDecoyPin();
    setDecoyPinConfiguredState(false);
    setDecoyPinEnabledState(false);
    toast.success('PIN de pânico removido');
  };

  const handleGhostModeToggle = () => {
    const newValue = !ghostMode;
    setGhostMode(newValue);
    setGhostModeState(newValue);
    if (newValue) {
      // Quando ativa modo fantasma, também desativa confirmações de leitura
      setReadReceipts(false);
      setReadReceiptsState(false);
    }
  };

  const handleReadReceiptsToggle = () => {
    const newValue = !readReceipts;
    setReadReceipts(newValue);
    setReadReceiptsState(newValue);
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
      setShowAvatarPicker(false);
      toast.success('Avatar atualizado!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao alterar avatar');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  }, [onAvatarUpdate]);

  const handleSymbolAvatarSelect = useCallback(async (emoji: string) => {
    setIsUploadingAvatar(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Faça login para alterar o avatar.');
        return;
      }
      
      // Criar uma imagem SVG com o emoji
      const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
          <rect width="200" height="200" fill="#1e293b"/>
          <text x="100" y="130" font-size="100" text-anchor="middle" dominant-baseline="middle">${emoji}</text>
        </svg>
      `;
      
      // Converter SVG para data URL
      const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      // Criar canvas para converter para PNG
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          toast.error('Erro ao processar imagem');
          setIsUploadingAvatar(false);
          return;
        }
        
        // Fundo escuro
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 200, 200);
        
        // Desenhar emoji
        ctx.font = '100px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, 100, 100);
        
        // Converter para blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            toast.error('Erro ao criar imagem');
            setIsUploadingAvatar(false);
            return;
          }
          
          try {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession?.access_token) {
              toast.error('Sessão expirada. Faça login novamente.');
              setIsUploadingAvatar(false);
              return;
            }
            
            const form = new FormData();
            form.append('file', blob, 'avatar.png');
            const res = await fetch('/api/profile/avatar', {
              method: 'POST',
              headers: { Authorization: `Bearer ${currentSession.access_token}` },
              body: form,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
            setAvatarUrl(data.avatar_url);
            onAvatarUpdate?.(data.avatar_url);
            setShowAvatarPicker(false);
            toast.success('Avatar atualizado!');
          } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Erro ao alterar avatar');
          } finally {
            setIsUploadingAvatar(false);
          }
        }, 'image/png');
        
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar avatar');
      setIsUploadingAvatar(false);
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
                      Avatar do perfil
                    </label>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(true)}
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
                      <p className="text-sm text-gray-600 dark:text-gray-400">Clique para escolher</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Foto ou símbolo</p>
                    </div>
                  </div>
                </div>

                {/* Modal de seleção de Avatar */}
                <AnimatePresence>
                  {showAvatarPicker && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                      onClick={() => setShowAvatarPicker(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6 max-h-[80vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Escolher Avatar</h3>
                          <button
                            onClick={() => setShowAvatarPicker(false)}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800"
                            aria-label="Fechar"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={() => setAvatarPickerTab('symbols')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                              avatarPickerTab === 'symbols'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <Smile className="w-4 h-4" />
                            Símbolos
                          </button>
                          <button
                            onClick={() => setAvatarPickerTab('upload')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                              avatarPickerTab === 'upload'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                            }`}
                          >
                            <ImageIcon className="w-4 h-4" />
                            Foto
                          </button>
                        </div>

                        {/* Conteúdo das tabs */}
                        {avatarPickerTab === 'symbols' ? (
                          <div className="flex-1 overflow-y-auto">
                            <div className="grid grid-cols-6 gap-2">
                              {AVATAR_SYMBOLS.map((symbol) => (
                                <button
                                  key={symbol.emoji}
                                  onClick={() => handleSymbolAvatarSelect(symbol.emoji)}
                                  disabled={isUploadingAvatar}
                                  className="w-12 h-12 flex items-center justify-center text-2xl bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={symbol.label}
                                  aria-label={symbol.label}
                                >
                                  {symbol.emoji}
                                </button>
                              ))}
                            </div>
                            {isUploadingAvatar && (
                              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                                <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                Salvando...
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center py-8">
                            <div
                              onClick={() => avatarInputRef.current?.click()}
                              className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              {isUploadingAvatar ? (
                                <span className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                  <span className="text-xs text-gray-500 text-center px-2">Clique para escolher uma foto</span>
                                </>
                              )}
                            </div>
                            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                              JPG, PNG, WebP ou GIF<br />Máximo 2MB
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

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

                {/* PIN de Pânico / Dual PIN */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-orange-500" />
                      <label className="font-semibold text-sm text-gray-900 dark:text-white">
                        PIN de Pânico
                      </label>
                    </div>
                    <button
                      onClick={handleDecoyPinToggle}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        decoyPinEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-slate-700'
                      }`}
                      aria-label={decoyPinEnabled ? 'Desativar PIN de pânico' : 'Ativar PIN de pânico'}
                      role="switch"
                      aria-checked={decoyPinEnabled}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          decoyPinEnabled ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Configure um segundo PIN que abre um ambiente falso com conversas inofensivas.
                  </p>
                  {decoyPinEnabled && (
                    <div className="px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                      <p className="text-xs text-orange-800 dark:text-orange-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        PIN de pânico ativo. Use-o em situações de emergência.
                      </p>
                    </div>
                  )}
                  {decoyPinConfigured && (
                    <button
                      onClick={handleRemoveDecoyPin}
                      className="text-xs text-red-500 hover:text-red-600 underline"
                    >
                      Remover PIN de pânico
                    </button>
                  )}
                </div>

                {/* Modal de configuração do PIN de pânico */}
                <AnimatePresence>
                  {showDecoyPinSetup && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                      onClick={() => setShowDecoyPinSetup(false)}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="w-6 h-6 text-orange-500" />
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Configurar PIN de Pânico</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Este PIN abrirá um ambiente falso com conversas inofensivas. Use em emergências.
                        </p>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Novo PIN de Pânico (4 dígitos)</label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={decoyPin}
                              onChange={(e) => setDecoyPin(e.target.value.replace(/\D/g, ''))}
                              className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-center text-2xl tracking-widest"
                              placeholder="••••"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Confirmar PIN</label>
                            <input
                              type="password"
                              inputMode="numeric"
                              maxLength={4}
                              value={decoyPinConfirm}
                              onChange={(e) => setDecoyPinConfirm(e.target.value.replace(/\D/g, ''))}
                              className="w-full mt-1 px-3 py-2 bg-gray-100 dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg text-center text-2xl tracking-widest"
                              placeholder="••••"
                            />
                          </div>
                          <button
                            onClick={handleSetupDecoyPin}
                            disabled={isSettingUpDecoyPin || decoyPin.length !== 4 || decoyPinConfirm.length !== 4}
                            className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors"
                          >
                            {isSettingUpDecoyPin ? 'Configurando...' : 'Confirmar'}
                          </button>
                          <button
                            onClick={() => {
                              setShowDecoyPinSetup(false);
                              setDecoyPin('');
                              setDecoyPinConfirm('');
                            }}
                            className="w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Modo Fantasma */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <EyeOffIcon className="w-5 h-5 text-purple-500" />
                      <label className="font-semibold text-sm text-gray-900 dark:text-white">
                        Modo Fantasma
                      </label>
                    </div>
                    <button
                      onClick={handleGhostModeToggle}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        ghostMode ? 'bg-purple-500' : 'bg-gray-300 dark:bg-slate-700'
                      }`}
                      aria-label={ghostMode ? 'Desativar modo fantasma' : 'Ativar modo fantasma'}
                      role="switch"
                      aria-checked={ghostMode}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          ghostMode ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Esconde seu status online e desativa confirmações de leitura.
                  </p>
                </div>

                {/* Confirmações de Leitura */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <label className="font-semibold text-sm text-gray-900 dark:text-white">
                        Confirmações de leitura
                      </label>
                    </div>
                    <button
                      onClick={handleReadReceiptsToggle}
                      disabled={ghostMode}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        readReceipts && !ghostMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-slate-700'
                      } ${ghostMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={readReceipts ? 'Desativar confirmações de leitura' : 'Ativar confirmações de leitura'}
                      role="switch"
                      aria-checked={readReceipts && !ghostMode}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          readReceipts && !ghostMode ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Mostrar quando você leu as mensagens (✓✓).
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
