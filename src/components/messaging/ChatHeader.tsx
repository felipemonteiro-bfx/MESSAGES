'use client';

import { useState } from 'react';
import { ArrowLeft, Search, Shield, ImagePlus, Bell, BellOff, X as CloseIcon } from 'lucide-react';
import type { ChatWithRecipient, User as UserType } from '@/types/messaging';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';
import { fetchMediaWithCache } from '@/lib/media-cache';
import { createClient } from '@/lib/supabase/client';
import { impactLight } from '@/lib/haptics';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { toast } from 'sonner';

interface ChatHeaderProps {
  selectedChat: ChatWithRecipient;
  currentUser: UserType;
  onlineUsers: Set<string>;
  mutedChats: Set<string>;
  otherUserTyping: string | null;
  messageSearchQuery: string;
  connectionState?: 'connected' | 'reconnecting' | 'disconnected';
  onBack: () => void;
  onSetMessageSearchQuery: (query: string) => void;
  onShowSecurityCode: () => void;
  onShowMediaGallery: () => void;
  onMutedChatsChange: (chatId: string, muted: boolean) => void;
}

export default function ChatHeader({
  selectedChat,
  currentUser,
  onlineUsers,
  mutedChats,
  otherUserTyping,
  messageSearchQuery,
  connectionState = 'connected',
  onBack,
  onSetMessageSearchQuery,
  onShowSecurityCode,
  onShowMediaGallery,
  onMutedChatsChange,
}: ChatHeaderProps) {
  const [muteMenuOpen, setMuteMenuOpen] = useState(false);
  const supabase = createClient();

  const handleMute = async (muted: boolean, muteUntil: string | null) => {
    try {
      const { error } = await supabase
        .from('chat_participants')
        .update({ muted, mute_until: muteUntil })
        .eq('chat_id', selectedChat.id)
        .eq('user_id', currentUser.id);
      if (error) throw error;
      impactLight();
      onMutedChatsChange(selectedChat.id, muted);
      toast.success(muted ? (muteUntil ? 'Silenciado temporariamente' : 'Notificações silenciadas') : 'Notificações ativadas');
    } catch (e) {
      logError(normalizeError(e));
      toast.error(getUserFriendlyMessage(normalizeError(e)) || 'Não foi possível alterar notificações');
    }
    setMuteMenuOpen(false);
  };

  return (
    <header className="shrink-0 relative p-3 border-b border-gray-200 dark:border-[#17212b] flex flex-col gap-2 bg-white dark:bg-[#17212b] z-20">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            className="md:hidden p-2 shrink-0 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative shrink-0">
            <img
              src={selectedChat.recipient?.avatar_url || DEFAULT_AVATAR_URL}
              alt={selectedChat.recipient?.nickname || 'Avatar'}
              className="w-10 h-10 rounded-full object-cover"
              loading="lazy"
              onLoad={async (e) => {
                e.currentTarget.classList.add('loaded');
                const imgSrc = e.currentTarget.src;
                if (imgSrc && imgSrc.startsWith('http')) {
                  try { await fetchMediaWithCache(imgSrc); } catch {}
                }
              }}
            />
            {selectedChat.recipient && onlineUsers.has(selectedChat.recipient.id) && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#0e1621] rounded-full" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm leading-tight text-gray-900 dark:text-white truncate">
              {selectedChat.recipient?.nickname || selectedChat.name || 'Tópico'}
            </h2>
            <div className="text-[11px] text-gray-500 dark:text-[#4c94d5] flex items-center gap-1">
              {selectedChat.recipient && (
                onlineUsers.has(selectedChat.recipient.id) ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-500 font-medium">Online</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span>Offline</span>
                  </span>
                )
              )}
              {otherUserTyping === selectedChat.recipient?.id && (
                <span className="ml-2 text-blue-600 dark:text-blue-400 animate-pulse">digitando...</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {connectionState !== 'connected' && (
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium mr-1 ${
              connectionState === 'reconnecting'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                connectionState === 'reconnecting'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-red-500'
              }`} />
              {connectionState === 'reconnecting' ? 'Reconectando...' : 'Sem conexão'}
            </div>
          )}
          <button
            onClick={onShowSecurityCode}
            className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
            title="Verificar identidade"
            aria-label="Verificar identidade"
          >
            <Shield className="w-4 h-4" />
          </button>
          <button
            onClick={onShowMediaGallery}
            className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
            title="Fotos e vídeos"
            aria-label="Ver fotos e vídeos"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          {selectedChat.recipient && (
            <div className="relative">
              <button
                onClick={() => setMuteMenuOpen(!muteMenuOpen)}
                className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
                title={mutedChats.has(selectedChat.id) ? 'Opções de notificação' : 'Silenciar'}
                aria-label="Notificações"
              >
                {mutedChats.has(selectedChat.id) ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              </button>
              {muteMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMuteMenuOpen(false)} aria-hidden />
                  <div className="absolute right-0 top-full mt-1 py-1 bg-white dark:bg-[#242f3d] rounded-lg shadow-lg border border-gray-200 dark:border-[#0e1621] z-50 min-w-[160px]">
                    {mutedChats.has(selectedChat.id) ? (
                      <button
                        onClick={() => handleMute(false, null)}
                        className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#17212b]"
                      >
                        <Bell className="w-4 h-4" /> Ativar notificações
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleMute(true, new Date(Date.now() + 60 * 60 * 1000).toISOString())}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#17212b]"
                        >
                          Silenciar por 1 hora
                        </button>
                        <button
                          onClick={() => handleMute(true, new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString())}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#17212b]"
                        >
                          Silenciar por 8 horas
                        </button>
                        <button
                          onClick={() => handleMute(true, null)}
                          className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#17212b]"
                        >
                          <BellOff className="w-4 h-4" /> Silenciar sempre
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar nesta conversa..."
          value={messageSearchQuery}
          onChange={(e) => onSetMessageSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-2 text-base rounded-lg bg-gray-100 dark:bg-[#0e1621] border border-gray-200 dark:border-[#17212b] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {messageSearchQuery && (
          <button
            onClick={() => onSetMessageSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            aria-label="Limpar busca"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
