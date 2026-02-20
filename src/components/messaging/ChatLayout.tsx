'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, MoreVertical, Phone, Video, Send, Paperclip, Smile, Check, CheckCheck, Menu, User, Settings, LogOut, ArrowLeft, Image as ImageIcon, Mic, UserPlus, X as CloseIcon, MessageSquare, Camera, FileVideo, FileAudio, Edit2, Clock, Newspaper, Bell, BellOff, Home, AlertCircle, ImagePlus, Copy, Reply, Forward, Trash2, Pencil, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Message, ChatWithRecipient, User as UserType } from '@/types/messaging';
import { validateAndSanitizeNickname, validateAndSanitizeMessage } from '@/lib/validation';
import { ChatItemSkeleton } from '@/components/ui/Skeleton';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { optimizeImage } from '@/lib/image-optimization';
import { cacheMedia, fetchMediaWithCache } from '@/lib/media-cache';
import { queueMessage, syncPendingMessages } from '@/lib/background-sync';
import EditNicknameModal from '@/components/shared/EditNicknameModal';
import SettingsModal from '@/components/shared/SettingsModal';
import AudioMessagePlayer from '@/components/messaging/AudioMessagePlayer';
import SecurityCodeModal from '@/components/shared/SecurityCodeModal';
import ScreenshotAlert, { ScreenshotProtectionOverlay } from '@/components/messaging/ScreenshotAlert';
import AdvancedSearchModal from '@/components/messaging/AdvancedSearchModal';
import { useScreenshotDetection, blurSensitiveElements } from '@/hooks/useScreenshotDetection';
import { useStealthMessaging } from '@/components/shared/StealthMessagingProvider';
import { isIncognitoMode, clearIncognitoData } from '@/lib/settings';
import { type AccessMode } from '@/lib/pin';
import { impactLight, impactMedium, notificationSuccess, panicVibrate } from '@/lib/haptics';
import SwipeableMessage from '@/components/messaging/SwipeableMessage';

interface ChatLayoutProps {
  accessMode?: AccessMode;
}

function SwipeableChatItem({
  chat,
  selectedChat,
  onlineUsers,
  mutedChats,
  formatTime,
  style,
  onSelect,
  onMuteToggle,
  fetchMediaWithCache,
}: {
  chat: ChatWithRecipient;
  selectedChat: ChatWithRecipient | null;
  onlineUsers: Set<string>;
  mutedChats: Set<string>;
  formatTime: (t: string) => string;
  style: React.CSSProperties;
  onSelect: () => void;
  onMuteToggle: () => Promise<void>;
  fetchMediaWithCache: (url: string) => Promise<Blob>;
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const justSwipedRef = useRef(false);
  const minSwipe = 60;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (touchStartX == null || touchEndX == null) return;
    const d = touchStartX - touchEndX;
    if (d > minSwipe) {
      justSwipedRef.current = true;
      onMuteToggle();
    }
    setTouchStartX(null);
    setTouchEndX(null);
  };

  const handleSelect = () => {
    if (justSwipedRef.current) {
      justSwipedRef.current = false;
      return;
    }
    onSelect();
  };

  return (
    <div
      style={style}
      data-chat="true"
      data-chat-id={chat.id}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="touch-manipulation"
    >
      <div
        onClick={handleSelect}
        className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#202b36] transition-colors ${selectedChat?.id === chat.id ? 'bg-blue-50 dark:bg-[#2b5278]' : ''}`}
      >
        <div className="relative">
          <img
            src={chat.recipient?.avatar_url || 'https://i.pravatar.cc/150'}
            alt={chat.recipient?.nickname || 'Avatar'}
            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            loading="lazy"
            onLoad={async (e) => {
              const imgSrc = e.currentTarget.src;
              if (imgSrc?.startsWith('http')) {
                try {
                  await fetchMediaWithCache(imgSrc);
                } catch {
                  // ignorar
                }
              }
            }}
          />
          {chat.recipient && onlineUsers.has(chat.recipient.id) && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#17212b] rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-bold truncate text-sm text-gray-900 dark:text-white">
              {chat.recipient?.nickname || chat.name || 'Grupo'}
            </h3>
            {chat.time && (
              <span className="text-[10px] text-gray-500 dark:text-[#708499] flex-shrink-0">
                {formatTime(chat.time)}
              </span>
            )}
          </div>
          {chat.lastMessage && (
            <p className="text-xs text-gray-600 dark:text-[#708499] truncate">
              {chat.lastMessage.length > 40 ? `${chat.lastMessage.substring(0, 40)}...` : chat.lastMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatLayout({ accessMode = 'main' }: ChatLayoutProps) {
  const { lockMessaging } = useStealthMessaging();
  const [chats, setChats] = useState<ChatWithRecipient[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatWithRecipient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [nicknameSearch, setNicknameSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showEditNicknameModal, setShowEditNicknameModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<{ nickname: string; avatar_url?: string | null } | null>(null);
  const [mutedChats, setMutedChats] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showEphemeralOption, setShowEphemeralOption] = useState(false);
  const [ephemeralSeconds, setEphemeralSeconds] = useState(30);
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const MESSAGES_PER_PAGE = 50;
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ files: File[]; count: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState<string | null>(null);
  const [muteMenuOpen, setMuteMenuOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, { count: number; userReacted: boolean }>>>({});
  const [isViewOnceMode, setIsViewOnceMode] = useState(false);
  const [viewOnceMessageId, setViewOnceMessageId] = useState<string | null>(null);
  const [showSecurityCode, setShowSecurityCode] = useState(false);
  const [screenshotAlertVisible, setScreenshotAlertVisible] = useState(false);
  const [screenshotAlertMessage, setScreenshotAlertMessage] = useState<string | undefined>();
  const [screenshotAlertVariant, setScreenshotAlertVariant] = useState<'detected' | 'received'>('detected');
  const [screenshotProtectionActive, setScreenshotProtectionActive] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ type: string; progress: number } | null>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chatListScrollRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  // Memoizar cliente Supabase para evitar re-criação a cada render
  const supabase = useMemo(() => createClient(), []);

  const fetchChats = useCallback(async (_userId: string) => {
    try {
      setIsLoading(true);
      
      // Usar API server-side para evitar problemas de RLS recursivo
      // Passar o modo de acesso para filtrar chats reais vs decoy
      const response = await fetch(`/api/chats?mode=${accessMode}`, { credentials: 'include' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const { chats: fetchedChats } = await response.json();
      
      if (fetchedChats && fetchedChats.length > 0) {
        // Atualizar muted chats
        const newMuted = new Set<string>();
        for (const chat of fetchedChats) {
          if (chat.muted) {
            newMuted.add(chat.id);
          }
        }
        setMutedChats(newMuted);
        
        setChats(fetchedChats as (ChatWithRecipient & { muted?: boolean })[]);
      } else {
        setChats([]);
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error in fetchChats', err, { userId: _userId });
      const appError = normalizeError(error);
      logError(appError, { userId: _userId });
      
      // Mensagem mais específica baseada no tipo de erro
      let errorMessage = getUserFriendlyMessage(appError);
      if (appError.type === 'UNKNOWN' && appError.message === 'Erro desconhecido') {
        errorMessage = 'Erro ao carregar conversas. Verifique sua conexão e tente novamente.';
      }
      if (appError.message?.toLowerCase().includes('failed to fetch') || appError.message?.toLowerCase().includes('fetch chats')) {
        errorMessage = 'Erro ao carregar conversas. Verifique sua conexão e tente novamente.';
      }
      
      toast.error(errorMessage, {
        action: { label: 'Tentar novamente', onClick: () => fetchChats(_userId) },
      });
    }
  }, [accessMode]);

  // Função para notificar sobre screenshot detectado
  const notifyScreenshotDetected = useCallback(async (method: string) => {
    if (!selectedChat || !currentUser) return;

    // Mostrar alerta local
    setScreenshotAlertVariant('detected');
    setScreenshotAlertMessage('Um possível screenshot foi detectado. O outro participante será notificado.');
    setScreenshotAlertVisible(true);

    // Aplicar blur temporário em elementos sensíveis
    blurSensitiveElements(true);
    setScreenshotProtectionActive(true);
    setTimeout(() => {
      blurSensitiveElements(false);
      setScreenshotProtectionActive(false);
    }, 500);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) return;

      await fetch('/api/messages/screenshot-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          chatId: selectedChat.id,
          method,
        }),
      });
    } catch (error) {
      console.error('Failed to send screenshot alert:', error);
    }
  }, [selectedChat, currentUser, supabase]);

  // Hook para detecção de screenshot
  useScreenshotDetection({
    onScreenshotDetected: notifyScreenshotDetected,
    onBlur: () => {
      // Quando a página perde foco, podemos aplicar proteção
      if (selectedChat && currentUser) {
        blurSensitiveElements(true);
        setTimeout(() => blurSensitiveElements(false), 300);
      }
    },
    enabled: !!selectedChat && !!currentUser,
  });

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        // Verificar se o perfil existe e tem nickname
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', user.id)
          .single();
        
        if (profileError || !profile) {
          logger.warn('Profile not found or missing nickname', { userId: user.id, error: profileError });
          toast.warning('Seu perfil precisa de um nickname. Configure no cadastro.');
        } else if (!profile.nickname) {
          logger.warn('Profile missing nickname', { userId: user.id });
          toast.warning('Seu perfil precisa de um nickname para usar mensagens.');
        } else {
          setCurrentUserProfile(profile);
          logger.info('User profile loaded', { userId: user.id, nickname: profile.nickname });
        }
        
        await fetchChats(user.id);
        
        // Sugestão 15: Sincronizar mensagens pendentes ao inicializar (via API)
        try {
          await syncPendingMessages(async (pendingMsg) => {
            const response = await fetch('/api/messages', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chatId: pendingMsg.chatId,
                content: pendingMsg.content,
                mediaUrl: pendingMsg.mediaUrl,
                mediaType: pendingMsg.type !== 'text' ? pendingMsg.type : undefined,
              }),
            });
            return response.ok;
          });
        } catch (error) {
          logger.warn('Erro ao sincronizar mensagens pendentes', { error });
        }
        // Perfil já foi buscado e definido acima (linha 205-220)
      }
    };
    init();
  }, [supabase, fetchChats]);

  // Atualizar lista de chats quando uma nova mensagem chegar
  // Debounced: evita refetch a cada mensagem individual em sequência rápida
  const lastMessageCountRef = useRef(0);
  useEffect(() => {
    if (!currentUser || messages.length === 0) return;
    // Só refetch se o número de mensagens realmente mudou (nova mensagem)
    if (messages.length === lastMessageCountRef.current) return;
    lastMessageCountRef.current = messages.length;
    
    const timeout = setTimeout(() => {
      fetchChats(currentUser.id);
    }, 1000); // Debounce de 1s para evitar N+1 em rajadas
    
    return () => clearTimeout(timeout);
  }, [messages.length, currentUser, fetchChats]);

  // Lazy loading de mensagens (via API server-side)
  const fetchMessages = useCallback(async (chatId: string, page: number = 1, append: boolean = false, silent = false) => {
    try {
      const response = await fetch(`/api/messages?chatId=${chatId}&page=${page}&limit=${MESSAGES_PER_PAGE}`, { credentials: 'include' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.warn('Erro ao buscar mensagens', { status: response.status, error: errorData });
        if (!silent) {
          const msg = response.status === 401 ? 'Sessão expirada. Faça login novamente.' : 'Erro ao carregar mensagens. Tente novamente.';
          toast.error(msg, {
            action: page === 1 ? { label: 'Tentar novamente', onClick: () => fetchMessages(chatId, 1, false) } : undefined,
          });
        }
        return;
      }
      
      const { messages: data, hasMore } = await response.json();
      
      if (data) {
        const sortedData = [...data].reverse();
        if (append) {
          setMessages(prev => [...sortedData, ...prev]);
        } else {
          setMessages(sortedData);
        }
        setHasMoreMessages(hasMore);
      }
    } catch (err) {
      logger.warn('Erro ao buscar mensagens', { error: err });
      if (!silent) {
        toast.error('Erro ao carregar mensagens. Verifique sua conexão.', {
          action: page === 1 ? { label: 'Tentar novamente', onClick: () => fetchMessages(chatId, 1, false) } : undefined,
        });
      }
    }
  }, []);

  useEffect(() => {
    const closeMessageMenu = () => setMessageMenuId(null);
    if (messageMenuId) {
      document.addEventListener('click', closeMessageMenu);
      return () => document.removeEventListener('click', closeMessageMenu);
    }
  }, [messageMenuId]);

  useEffect(() => {
    if (selectedChat && currentUser) {
      // Sugestão 15: Reset paginação ao mudar de chat
      setMessagesPage(1);
      setHasMoreMessages(true);
      fetchMessages(selectedChat.id, 1, false);
      
      // Sugestão 3: Limpar mensagens se modo incógnito estiver ativo ao fechar chat anterior
      return () => {
        if (isIncognitoMode()) {
          setMessages([]);
          clearIncognitoData();
        }
      };
    }
  }, [selectedChat?.id, currentUser?.id, fetchMessages]);

  useEffect(() => {
    if (selectedChat && currentUser) {
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 5;
      let reconnectTimeout: NodeJS.Timeout | null = null;
      
      const setupChannel = () => {
        const channel = supabase
          .channel(`chat:${selectedChat.id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `chat_id=eq.${selectedChat.id}` 
          }, payload => {
            const newMessage = payload.new as Message & { type?: string; metadata?: { type?: string } };
            
            if (newMessage.type === 'system' && newMessage.metadata?.type === 'screenshot_alert') {
              if (newMessage.sender_id !== currentUser?.id) {
                const senderName = selectedChat?.recipient?.nickname || 'Alguém';
                setScreenshotAlertVariant('received');
                setScreenshotAlertMessage(`${senderName} pode ter tirado uma captura de tela desta conversa.`);
                setScreenshotAlertVisible(true);
              }
              return;
            }
            
            if (newMessage.sender_id !== currentUser?.id && !mutedChats.has(selectedChat.id)) {
              const senderName = selectedChat?.recipient?.nickname || 'Alguém';
              const preview = typeof newMessage.content === 'string'
                ? (newMessage.content.length > 50 ? newMessage.content.slice(0, 50) + '…' : newMessage.content)
                : (newMessage.media_type === 'image' ? '📷 Imagem' : newMessage.media_type === 'video' ? '🎥 Vídeo' : '🎤 Áudio');
              toast.info(`Nova mensagem de ${senderName}`, {
                description: preview,
                duration: 4000,
                icon: '💬',
              });
            }
            setMessages(prev => [...prev, newMessage]);
            
            if (newMessage.expires_at) {
              const expiresAt = new Date(newMessage.expires_at);
              const now = new Date();
              if (expiresAt <= now) return;
              const timeout = expiresAt.getTime() - now.getTime();
              setTimeout(() => {
                setMessages(prev => prev.filter(m => m.id !== newMessage.id));
              }, timeout);
            }
          })
          .on('broadcast', { event: 'typing' }, (payload) => {
            if (payload.payload.userId !== currentUser.id) {
              setOtherUserTyping(payload.payload.userId);
              setTimeout(() => setOtherUserTyping(null), 3000);
            }
          })
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const online = new Set<string>();
            Object.values(presenceState).forEach((presences: any[]) => {
              presences.forEach((presence: any) => {
                if (presence.userId && presence.online !== false) {
                  online.add(presence.userId);
                }
              });
            });
            setOnlineUsers(online);
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            newPresences.forEach((presence: any) => {
              if (presence.userId) {
                setOnlineUsers(prev => new Set(prev).add(presence.userId));
              }
            });
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            leftPresences.forEach((presence: any) => {
              if (presence.userId) {
                setOnlineUsers(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(presence.userId);
                  return newSet;
                });
              }
            });
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              reconnectAttempts = 0;
              channel.track({
                userId: currentUser.id,
                online: true,
                lastSeen: new Date().toISOString()
              });
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              logger.warn('Canal realtime desconectado', { status, chatId: selectedChat.id });
              if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
                reconnectTimeout = setTimeout(() => {
                  logger.info('Tentando reconectar canal...', { attempt: reconnectAttempts });
                  supabase.removeChannel(channel);
                  setupChannel();
                }, delay);
              } else {
                toast.error('Conexão perdida. Atualize a página para reconectar.', {
                  duration: 10000,
                  action: { label: 'Atualizar', onClick: () => window.location.reload() }
                });
              }
            }
          });

        return channel;
      };

      const channel = setupChannel();
      
      const presenceIntervalId = setInterval(() => {
        channel.track({
          userId: currentUser.id,
          online: true,
          lastSeen: new Date().toISOString()
        });
      }, 30000);
      
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchMessages(selectedChat.id, 1, false, true);
          channel.track({
            userId: currentUser.id,
            online: true,
            lastSeen: new Date().toISOString()
          });
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        if (presenceIntervalId) clearInterval(presenceIntervalId);
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        channel.untrack();
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat, supabase, currentUser, mutedChats, fetchMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMediaUpload = useCallback(async (file: File, type: 'image' | 'video' | 'audio') => {
    // Limites de tamanho por tipo
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
    const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
    
    // Validar tamanho do arquivo
    const maxSize = type === 'video' ? MAX_VIDEO_SIZE : type === 'audio' ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
    const maxSizeMB = maxSize / (1024 * 1024);
    
    if (file.size > maxSize) {
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const typeNames = { image: 'Imagens', video: 'Vídeos', audio: 'Áudios' };
      toast.error(`Arquivo muito grande (${fileSizeMB}MB). ${typeNames[type]} devem ter no máximo ${maxSizeMB}MB.`, {
        duration: 5000,
      });
      return;
    }
    
    // Sugestão 14: Otimizar imagem antes de upload
    let fileToUpload = file;
    if (type === 'image') {
      try {
        fileToUpload = await optimizeImage(file, {
          maxWidth: 1920,
          maxHeight: 1920,
          quality: 0.8,
          maxSizeMB: 5,
        });
      } catch (error) {
        logger.warn('Erro ao otimizar imagem, usando original', { error });
      }
    }
    if (!selectedChat || !currentUser) return;

    // Sugestão 29: Monitorar performance de upload
    const startTime = performance.now();

    try {
      setIsSending(true);
      setUploadProgress({ type, progress: 0 });
      
      // Sugestão 29: Log de início de upload
      if (typeof window !== 'undefined') {
        try {
          const { monitoring } = await import('@/lib/monitoring');
          monitoring?.info('Media upload started', { 
            type, 
            fileName: file.name, 
            fileSize: file.size 
          });
        } catch {
          // Ignorar se monitoring não disponível
        }
      }
      
      // Simular progresso durante upload (Supabase não suporta progresso nativo)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (!prev) return null;
          const newProgress = Math.min(prev.progress + 10, 90);
          return { ...prev, progress: newProgress };
        });
      }, 200);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${selectedChat.id}/${fileName}`;

      // Upload para Supabase Storage (usar arquivo otimizado se for imagem)
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: false
        });

      clearInterval(progressInterval);
      
      if (uploadError) {
        const msg = String(uploadError.message || '').toLowerCase();
        if (msg.includes('bucket') && msg.includes('not found')) {
          throw new Error('Bucket "chat-media" não existe. Execute no Supabase → SQL Editor: docs/migrations/setup_chat_media_bucket.sql');
        }
        if (msg.includes('payload too large') || msg.includes('entity too large') || msg.includes('size')) {
          const typeNames = { image: 'A imagem', video: 'O vídeo', audio: 'O áudio' };
          throw new Error(`${typeNames[type]} é muito grande para enviar. Tente um arquivo menor.`);
        }
        if (msg.includes('timeout') || msg.includes('aborted')) {
          throw new Error(`Upload do ${type === 'video' ? 'vídeo' : type === 'audio' ? 'áudio' : 'arquivo'} falhou. Verifique sua conexão e tente novamente.`);
        }
        throw uploadError;
      }
      
      setUploadProgress({ type, progress: 95 });

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      // Sugestão 13: Cachear mídia após upload bem-sucedido
      if (publicUrl && (type === 'image' || type === 'video')) {
        try {
          const response = await fetch(publicUrl);
          const blob = await response.blob();
          await cacheMedia(publicUrl, blob);
        } catch (error) {
          logger.warn('Erro ao cachear mídia', { error });
        }
      }

      // Enviar mensagem com mídia via API
      const msgResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat.id,
          content: type === 'image' ? '📷 Imagem' : type === 'video' ? '🎥 Vídeo' : '🎤 Áudio',
          mediaUrl: publicUrl,
          mediaType: type,
        }),
      });

      if (!msgResponse.ok) {
        const errorData = await msgResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao enviar mensagem com mídia');
      }
      
      setUploadProgress({ type, progress: 100 });

      // Enviar notificação push para o destinatário (marcar como mensagem real)
      const mediaContent = type === 'image' ? '📷 Imagem' : type === 'video' ? '🎥 Vídeo' : '🎤 Áudio';
      const recipientId = selectedChat.recipient?.id;
      if (recipientId) {
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            recipientId, 
            content: mediaContent,
            isMessage: true
          }),
        }).catch((err) => {
          console.warn('Push notification failed:', err);
        });
      }

      await fetchChats(currentUser.id);
      toast.success(type === 'video' ? 'Vídeo enviado com sucesso!' : 'Mídia enviada com sucesso!', { duration: 2000 });
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError);
      const errorMsg = error instanceof Error ? error.message : getUserFriendlyMessage(appError);
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setIsSending(false);
      setShowMediaMenu(false);
      setUploadProgress(null);
    }
  }, [selectedChat, currentUser, supabase, fetchChats]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    list.forEach((file) => handleMediaUpload(file, type));
    if (e.target) e.target.value = '';
  }, [handleMediaUpload]);

  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Safari/iOS usa audio/mp4; Chrome/Firefox usam audio/webm
      const mimeTypes = ['audio/webm', 'audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg'];
      const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'audio/webm';
      const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: mimeType });
        const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: mimeType });
        await handleMediaUpload(file, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(100);
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast.error('Erro ao acessar microfone');
    }
  }, [handleMediaUpload]);

  const stopAudioRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  }, [mediaRecorder, isRecording]);

  // Sugestão 8: Detectar quando usuário está digitando
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    if (!selectedChat || !currentUser) return;
    
    // Enviar evento de digitação
    if (!isTyping) {
      setIsTyping(true);
      const channel = supabase.channel(`chat:${selectedChat.id}`);
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id }
      });
    }
    
    // Reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  }, [selectedChat, currentUser, supabase, isTyping]);

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !selectedChat || !currentUser || isSending) return;
    
    // Parar indicador de digitação
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Rate limiting no cliente (verificação adicional no servidor)
    if (typeof window !== 'undefined') {
      const identifier = `user:${currentUser.id}`;
      const rateLimit = checkRateLimit(identifier, RATE_LIMITS.sendMessage);
      
      if (!rateLimit.allowed) {
        toast.error(`Limite de mensagens excedido. Tente novamente em ${Math.ceil((rateLimit.resetAt - Date.now()) / 1000)} segundos.`);
        return;
      }
    }
    
    // Validar e sanitizar mensagem
    const validation = validateAndSanitizeMessage(inputText);
    if (!validation.success) {
      toast.error(validation.error || 'Mensagem inválida');
      return;
    }
    
    setIsSending(true);
    const userTypedContent = validation.data!;
    let messageContent = userTypedContent;
    if (replyingTo) {
      const quoted = (replyingTo.content || '').slice(0, 80);
      const suffix = replyingTo.content && replyingTo.content.length > 80 ? '...' : '';
      const replyAuthor = replyingTo.sender_id === currentUser.id ? 'você' : (selectedChat.recipient?.nickname || '');
      messageContent = `> ${replyAuthor}: ${quoted}${suffix}\n\n${userTypedContent}`;
    }
    setInputText(''); // Limpar input imediatamente para melhor UX
    
    // Sugestão 4: Calcular expires_at se for mensagem efêmera
    const expiresAt = showEphemeralOption && ephemeralSeconds > 0
      ? new Date(Date.now() + ephemeralSeconds * 1000).toISOString()
      : null;
    
    // Sugestão 15: Tentar enviar mensagem via API, se falhar adicionar à fila de sync
    let messageSent = false;
    try {
      const msgBody: Record<string, unknown> = {
        chatId: selectedChat.id,
        content: messageContent,
      };
      if (expiresAt) msgBody.expiresAt = expiresAt;
      if (showEphemeralOption && ephemeralSeconds > 0) msgBody.isEphemeral = true;
      if (replyingTo?.id) msgBody.replyToId = replyingTo.id;
      if (isViewOnceMode) msgBody.isViewOnce = true;
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msgBody),
      });

      const responseData = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        throw new Error(responseData.error || `HTTP ${response.status}`);
      }
      
      // Atualização otimista: adicionar mensagem à lista imediatamente
      if (responseData.message) {
        setMessages(prev => [...prev, responseData.message]);
        setReplyingTo(null);
      }
      messageSent = true;
    } catch (error) {
      // Se falhar (ex: offline), adicionar à fila de sincronização
      const networkError = error instanceof Error && (
        error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('Failed to fetch')
      );
      
      if (networkError) {
        // Adicionar à fila para sincronização quando conexão voltar
        await queueMessage({
          chatId: selectedChat.id,
          content: messageContent,
          type: 'text',
        });
        
        toast.info('Mensagem será enviada quando conexão voltar', { duration: 3000 });
        setIsSending(false);
        return; // Não continuar com o código abaixo
      } else {
        // Erro não relacionado a rede, propagar
        throw error;
      }
    }
    
    // Continuar apenas se mensagem foi enviada com sucesso
    if (!messageSent) return;

    try {
      // Enviar notificação push para o destinatário (marcar como mensagem real)
      const recipientId = selectedChat.recipient?.id;
      if (recipientId) {
        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            recipientId, 
            content: messageContent,
            isMessage: true // Flag para notificação de mensagem real
          }),
        }).catch((err) => {
          // Log silencioso - push é opcional
          console.warn('Push notification failed:', err);
        });
      }
      
      logger.info('Message sent', {
        chatId: selectedChat.id,
        userId: currentUser.id,
        messageLength: messageContent.length,
      });
      
      notificationSuccess();
      toast.success(isViewOnceMode ? 'Mensagem enviada (ver uma vez)!' : 'Mensagem enviada!', { duration: 1500 });
      
      // Reset estados especiais
      setIsViewOnceMode(false);
      setReplyingTo(null);
      
      // Atualizar mensagens do chat atual e lista de chats
      await fetchMessages(selectedChat.id, 1, false);
      await fetchChats(currentUser.id);
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
      setInputText(userTypedContent); // Restaurar mensagem em caso de erro
    } finally {
      setIsSending(false);
    }
  }, [inputText, selectedChat, currentUser, supabase, isSending, replyingTo, isViewOnceMode, fetchChats, fetchMessages]);

  const canEditMessage = useCallback((msg: Message) => {
    if (!currentUser || msg.sender_id !== currentUser.id) return false;
    if (msg.deleted_at) return false;
    const createdAt = new Date(msg.created_at);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return createdAt > fifteenMinutesAgo;
  }, [currentUser]);

  const canDeleteForEveryone = useCallback((msg: Message) => {
    if (!currentUser || msg.sender_id !== currentUser.id) return false;
    if (msg.deleted_at) return false;
    const createdAt = new Date(msg.created_at);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return createdAt > oneHourAgo;
  }, [currentUser]);

  const handleEditMessage = useCallback(async () => {
    if (!editingMessage || !editContent.trim() || isEditing) return;

    const validation = validateAndSanitizeMessage(editContent);
    if (!validation.success) {
      toast.error(validation.error || 'Mensagem inválida');
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: editingMessage.id,
          content: validation.data,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao editar mensagem');
      }

      setMessages(prev => prev.map(m => 
        m.id === editingMessage.id 
          ? { ...m, content: validation.data!, edited_at: new Date().toISOString() }
          : m
      ));
      toast.success('Mensagem editada');
      setEditingMessage(null);
      setEditContent('');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      toast.error(err.message);
    } finally {
      setIsEditing(false);
    }
  }, [editingMessage, editContent, isEditing]);

  const handleDeleteMessage = useCallback(async (messageId: string, forEveryone: boolean) => {
    try {
      const response = await fetch(`/api/messages?messageId=${messageId}&forEveryone=${forEveryone}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao apagar mensagem');
      }

      if (forEveryone) {
        setMessages(prev => prev.map(m => 
          m.id === messageId 
            ? { ...m, deleted_at: new Date().toISOString(), deleted_for_everyone: true, content: '' }
            : m
        ));
        toast.success('Mensagem apagada para todos');
      } else {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        toast.success('Mensagem apagada');
      }
      setDeleteConfirmId(null);
      setMessageMenuId(null);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      toast.error(err.message);
    }
  }, []);

  const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    const currentReactions = messageReactions[messageId] || {};
    const currentReaction = currentReactions[emoji];
    const isRemoving = currentReaction?.userReacted;

    // Optimistic update
    setMessageReactions(prev => {
      const updated = { ...prev };
      if (!updated[messageId]) updated[messageId] = {};
      
      if (isRemoving) {
        if (updated[messageId][emoji]) {
          updated[messageId][emoji] = {
            ...updated[messageId][emoji],
            count: Math.max(0, updated[messageId][emoji].count - 1),
            userReacted: false,
          };
          if (updated[messageId][emoji].count === 0) {
            delete updated[messageId][emoji];
          }
        }
      } else {
        updated[messageId][emoji] = {
          count: (updated[messageId][emoji]?.count || 0) + 1,
          userReacted: true,
        };
      }
      return updated;
    });

    setShowReactionPicker(null);

    try {
      if (isRemoving) {
        await fetch(`/api/messages/reactions?messageId=${messageId}&emoji=${encodeURIComponent(emoji)}`, {
          method: 'DELETE',
        });
      } else {
        await fetch('/api/messages/reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, emoji }),
        });
      }
    } catch (error) {
      // Revert on error
      setMessageReactions(prev => {
        const updated = { ...prev };
        if (!updated[messageId]) updated[messageId] = {};
        
        if (isRemoving) {
          updated[messageId][emoji] = {
            count: (updated[messageId][emoji]?.count || 0) + 1,
            userReacted: true,
          };
        } else {
          if (updated[messageId][emoji]) {
            updated[messageId][emoji] = {
              ...updated[messageId][emoji],
              count: Math.max(0, updated[messageId][emoji].count - 1),
              userReacted: false,
            };
          }
        }
        return updated;
      });
      toast.error('Erro ao reagir');
    }
  }, [messageReactions]);

  const handleViewOnceMessage = useCallback(async (msg: Message) => {
    if (!msg.is_view_once || msg.viewed_at || msg.sender_id === currentUser?.id) return;
    
    setViewOnceMessageId(msg.id);
    
    try {
      const response = await fetch('/api/messages/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: msg.id }),
      });

      if (response.ok) {
        setMessages(prev => prev.map(m => 
          m.id === msg.id ? { ...m, viewed_at: new Date().toISOString() } : m
        ));
      }
    } catch (error) {
      console.error('Error marking view-once as viewed:', error);
    }
  }, [currentUser]);

  const handleAddContact = useCallback(async () => {
    if (!nicknameSearch.trim() || !currentUser || isAddingContact) return;
    
    setIsAddingContact(true);
    
    const searchTerm = nicknameSearch.trim();
    const isEmail = searchTerm.toLowerCase().includes('@');
    
    try {
      if (!isEmail) {
        const validation = validateAndSanitizeNickname(searchTerm.toLowerCase());
        if (!validation.success) {
          toast.error(validation.error || 'Nickname inválido');
          setIsAddingContact(false);
          return;
        }
      }

      const param = isEmail ? 'email' : 'nickname';
      const value = isEmail ? searchTerm : searchTerm.toLowerCase();
      const findRes = await fetch(`/api/users/find?${param}=${encodeURIComponent(value)}`);
      const findData = await findRes.json();

      if (!findRes.ok) {
        const msg = findData.error || (findRes.status === 404 ? 'Usuário não encontrado' : 'Erro ao buscar usuário');
        if (findRes.status === 404 && isEmail) {
          toast.error(`Usuário não encontrado com o email informado. Verifique se o email está correto e se o usuário tem perfil em public.profiles.`);
        } else if (findRes.status === 404) {
          toast.error('Usuário não encontrado com este nickname. Verifique se está correto.');
        } else if (findRes.status === 500 && isEmail) {
          toast.error('Erro ao buscar por email. Verifique se a função get_user_by_email está criada no Supabase (docs/buscar_por_email.sql).');
        } else {
          toast.error(msg);
        }
        logger.warn('User find failed', { searchTerm, isEmail, status: findRes.status, error: findData.error });
        setIsAddingContact(false);
        return;
      }

      const targetUser = findData as { id: string; nickname: string; avatar_url: string | null };
      if (!targetUser?.id || !targetUser?.nickname) {
        toast.error('Resposta inválida do servidor');
        setIsAddingContact(false);
        return;
      }

      if (targetUser.id === currentUser.id) {
        toast.error('Você não pode adicionar a si mesmo');
        setIsAddingContact(false);
        return;
      }

      logger.info('User found via API', { id: targetUser.id, nickname: targetUser.nickname, isEmail });

      const createResponse = await fetch('/api/chats/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: targetUser.id }),
      });

      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createResult.error || 'Erro ao criar chat');
      }

      if (createResult.existing) {
        toast.info('Chat já existe com este usuário');
      } else {
        toast.success('Bom trabalho! Chat criado com sucesso.', { duration: 2000 });
      }

      logger.info('Chat created/found via API', { 
        chatId: createResult.chatId, 
        existing: createResult.existing,
        userId: currentUser.id, 
        targetUserId: targetUser.id 
      });

      await fetchChats(currentUser.id);
      setSelectedChat({
        id: createResult.chatId,
        type: 'private',
        recipient: {
          id: targetUser.id,
          nickname: targetUser.nickname,
          avatar_url: targetUser.avatar_url || ''
        }
      } as ChatWithRecipient);
      setIsAddContactOpen(false);
      setNicknameSearch('');
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
    } finally {
      setIsAddingContact(false);
    }
  }, [nicknameSearch, currentUser, fetchChats, isAddingContact]);

  // Filtrar chats baseado na busca
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => 
      ((chat.recipient?.nickname ?? '').toLowerCase().includes(query)) ||
      ((chat.name ?? '').toLowerCase().includes(query)) ||
      ((chat.lastMessage ?? '').toLowerCase().includes(query))
    );
  }, [chats, searchQuery]);

  // Formatar hora da última mensagem
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (msg.expires_at) {
        const expiresAt = new Date(msg.expires_at);
        if (expiresAt <= new Date()) return false;
      }
      if (messageSearchQuery.trim()) {
        const q = messageSearchQuery.toLowerCase();
        return (msg.content?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [messages, messageSearchQuery]);

  const chatListVirtualizer = useVirtualizer({
    count: filteredChats.length,
    getScrollElement: () => chatListScrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const messagesWithLoadMore = hasMoreMessages && filteredMessages.length > 0;
  const messagesVirtualizerCount = (messagesWithLoadMore ? 1 : 0) + filteredMessages.length;
  const messagesVirtualizer = useVirtualizer({
    count: messagesVirtualizerCount,
    getScrollElement: () => messagesScrollRef.current,
    estimateSize: (index) => {
      if (index === 0 && messagesWithLoadMore) return 48;
      const msgIndex = messagesWithLoadMore ? index - 1 : index;
      const msg = filteredMessages[msgIndex];
      if (msg?.media_url) {
        if (msg.media_type === 'video') return 280;
        if (msg.media_type === 'image') return 250;
        if (msg.media_type === 'audio') return 120;
      }
      return 96;
    },
    overscan: 10,
  });
  
  const handleMediaLoad = useCallback(() => {
    messagesVirtualizer.measure();
  }, [messagesVirtualizer]);

  // Swipe para mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && isSidebarOpen && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
    if (isRightSwipe && !isSidebarOpen && window.innerWidth < 768) {
      setIsSidebarOpen(true);
    }
  };

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Handler para voltar ao portal de notícias
  const handleGoToNews = () => {
    setIsMenuOpen(false);
    lockMessaging(); // Volta para o modo stealth (portal de notícias)
  };

  // Handler para logout (com confirmação)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const handleLogout = async () => {
    try {
      setShowLogoutConfirm(false);
      setIsMenuOpen(false);
      impactMedium();
      await supabase.auth.signOut();
      lockMessaging();
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
    }
  };

  return (
    <div 
      className="flex h-screen bg-gray-50 dark:bg-[#0e1621] text-gray-900 dark:text-white overflow-hidden font-sans"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <aside className={`${isSidebarOpen ? 'w-full md:w-[350px]' : 'w-0'} border-r border-gray-200 dark:border-[#17212b] flex flex-col transition-all duration-300 md:relative absolute inset-0 z-20 bg-white dark:bg-[#17212b]`}>
        <div className="p-2 sm:p-4 flex items-center gap-2 sm:gap-3 border-b border-[#0e1621] relative z-30">
          {/* Botão pânico — volta ao portal de notícias; na barra superior, longe do envio */}
          <button
            onClick={() => {
              panicVibrate();
              if (isIncognitoMode()) {
                setMessages([]);
                clearIncognitoData();
              }
              lockMessaging();
              toast.success('Modo notícias ativado.', { duration: 2000 });
            }}
            className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-gray-600 dark:text-[#708499] hover:text-gray-900 dark:hover:text-white transition-colors touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center flex-shrink-0"
            title="Voltar para Noticias24h (Ctrl+Shift+L)"
            aria-label="Esconder e voltar ao portal de notícias"
          >
            <Newspaper className="w-5 h-5" />
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242f3d] text-[#708499] hover:text-white transition-colors touch-manipulation"
              aria-label="Menu"
              aria-expanded={isMenuOpen}
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            {/* Menu Dropdown */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#242f3d] rounded-lg shadow-lg border border-gray-200 dark:border-[#17212b] overflow-hidden z-50"
                >
                  <button
                    onClick={handleGoToNews}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2b5278] transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    <span>Voltar para Noticias24h</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setShowSettingsModal(true);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2b5278] transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configurações</span>
                  </button>
                  
                  {currentUser && (
                    <button
                      onClick={async () => {
                        setIsMenuOpen(false);
                        try {
                          const { data: profile, error: profileError } = await supabase
                            .from('profiles')
                            .select('nickname, avatar_url')
                            .eq('id', currentUser.id)
                            .single();
                          
                          if (profileError) {
                            toast.error('Erro ao carregar perfil. Tente novamente.');
                            return;
                          }
                          
                          if (profile) {
                            setCurrentUserProfile(profile);
                            setEditingUserId(currentUser.id);
                            setEditingNickname(profile.nickname || '');
                            setShowEditNicknameModal(true);
                          }
                        } catch {
                          toast.error('Erro ao abrir editor de nickname. Tente novamente.');
                        }
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2b5278] transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Editar meu nickname</span>
                    </button>
                  )}
                  
                  <div className="border-t border-gray-200 dark:border-[#17212b]" />
                  
                  <button
                    onClick={() => { setIsMenuOpen(false); setShowLogoutConfirm(true); }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 min-w-0 bg-gray-100 dark:bg-[#242f3d] rounded-xl flex items-center px-2 sm:px-3 py-1.5 sm:py-2">
            <Search className="w-4 h-4 text-gray-400 dark:text-[#708499] mr-2 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-base w-full min-w-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#708499]" 
            />
            <button 
              onClick={() => setShowAdvancedSearch(true)}
              className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-[#17212b] text-gray-500 dark:text-[#708499] transition-colors flex-shrink-0"
              title="Busca avançada"
              aria-label="Busca avançada"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
          {/* Botão Settings - apenas em telas maiores */}
          <button 
            onClick={() => setShowSettingsModal(true)} 
            className="hidden sm:flex p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-gray-600 dark:text-[#708499] transition-colors touch-manipulation min-w-[44px] min-h-[44px] items-center justify-center" 
            title="Configurações" 
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
          {/* Botão Adicionar contato - sempre visível mas menor em mobile */}
          <button 
            onClick={() => setIsAddContactOpen(true)} 
            className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-blue-600 dark:text-[#4c94d5] transition-colors touch-manipulation min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px] flex items-center justify-center flex-shrink-0" 
            title="Adicionar contato" 
            data-testid="add-contact-button" 
            aria-label="Adicionar contato"
          >
            <UserPlus className="w-5 h-5" />
          </button>
          {/* Botão Editar nickname - apenas em telas maiores */}
          {currentUser && (
            <button 
              onClick={async () => {
                try {
                  const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('nickname, avatar_url')
                    .eq('id', currentUser.id)
                    .single();
                  
                  if (profileError) {
                    console.error('Erro ao buscar perfil:', profileError);
                    toast.error('Erro ao carregar perfil. Tente novamente.');
                    return;
                  }
                  
                  if (profile) {
                    setCurrentUserProfile(profile);
                    setEditingUserId(currentUser.id);
                    setEditingNickname(profile.nickname || '');
                    setShowEditNicknameModal(true);
                  } else {
                    toast.error('Perfil não encontrado. Por favor, faça login novamente.');
                  }
                } catch (error: any) {
                  console.error('Erro ao abrir modal de edição:', error);
                  toast.error('Erro ao abrir editor de nickname. Tente novamente.');
                }
              }}
              className="hidden sm:flex p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-blue-600 dark:text-[#4c94d5] transition-colors touch-manipulation min-w-[44px] min-h-[44px] items-center justify-center" 
              title="Editar meu nickname"
              aria-label="Editar meu nickname"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </div>
        <div ref={chatListScrollRef} className="flex-1 overflow-y-auto smooth-scroll">
          {isLoading ? (
            <div className="flex flex-col">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <ChatItemSkeleton key={i} />
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 dark:text-[#708499] mb-2" />
              <p className="text-gray-600 dark:text-[#708499] text-sm">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => setIsAddContactOpen(true)}
                  className="mt-4 text-[#4c94d5] text-sm hover:underline"
                >
                  Adicionar primeiro contato
                </button>
              )}
            </div>
          ) : (
            <div
              style={{ height: `${chatListVirtualizer.getTotalSize()}px`, position: 'relative' }}
              className="w-full"
            >
              {chatListVirtualizer.getVirtualItems().map((virtualRow) => {
                const chat = filteredChats[virtualRow.index];
                return (
                  <SwipeableChatItem
                    key={chat.id}
                    chat={chat}
                    selectedChat={selectedChat}
                    onlineUsers={onlineUsers}
                    mutedChats={mutedChats}
                    formatTime={formatTime}
                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualRow.start}px)` }}
                    onSelect={() => {
                      setSelectedChat(chat);
                      setMessageSearchQuery('');
                      setReplyingTo(null);
                      if (window.innerWidth < 768) setIsSidebarOpen(false);
                    }}
                    onMuteToggle={async () => {
                      if (!currentUser || !chat) return;
                      const newMutedState = !mutedChats.has(chat.id);
                      try {
                        const { error } = await supabase
                          .from('chat_participants')
                          .update({ muted: newMutedState })
                          .eq('chat_id', chat.id)
                          .eq('user_id', currentUser.id);
                        if (error) throw error;
                        impactLight();
                        if (newMutedState) {
                          setMutedChats(prev => new Set(prev).add(chat.id));
                          toast.success('Notificações silenciadas', { duration: 2000 });
                        } else {
                          setMutedChats(prev => {
                            const next = new Set(prev);
                            next.delete(chat.id);
                            return next;
                          });
                          toast.success('Notificações ativadas', { duration: 2000 });
                        }
                      } catch (e) {
                        logError(normalizeError(e));
                        toast.error(getUserFriendlyMessage(normalizeError(e)) || 'Erro ao alterar notificações');
                      }
                    }}
                    fetchMediaWithCache={fetchMediaWithCache}
                  />
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <main 
        className="flex-1 flex flex-col relative bg-gray-50 dark:bg-[#0e1621] min-w-0"
        data-stealth-content="true"
        onContextMenu={(e) => {
          // Sugestão 6: Dificultar screenshot - aviso silencioso
          e.preventDefault();
        }}
      >
        {selectedChat ? (
          <>
            <header className="p-3 border-b border-gray-200 dark:border-[#17212b] flex flex-col gap-2 bg-white dark:bg-[#17212b] z-10">
              <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="md:hidden p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors" onClick={() => setIsSidebarOpen(true)}><ArrowLeft className="w-5 h-5" /></button>
                <div className="relative">
                  <img 
                    src={selectedChat.recipient?.avatar_url || 'https://i.pravatar.cc/150'} 
                    alt={selectedChat.recipient?.nickname || 'Avatar'} 
                    className="w-10 h-10 rounded-full object-cover"
                    loading="lazy"
                    onLoad={async (e) => {
                      e.currentTarget.classList.add('loaded');
                      // Sugestão 13: Cachear avatar
                      const imgSrc = e.currentTarget.src;
                      if (imgSrc && imgSrc.startsWith('http')) {
                        try {
                          await fetchMediaWithCache(imgSrc);
                        } catch (error) {
                          // Ignorar erros de cache
                        }
                      }
                    }}
                  />
                  {/* Sugestão 7: Indicador de status online no header */}
                  {selectedChat.recipient && onlineUsers.has(selectedChat.recipient.id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#0e1621] rounded-full"></span>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-sm leading-tight text-gray-900 dark:text-white">
                    Discussão • {selectedChat.recipient?.nickname || selectedChat.name || 'Tópico'}
                  </h2>
                  <div className="text-[11px] text-gray-500 dark:text-[#4c94d5] flex items-center gap-1">
                    {/* Sugestão 7: Status Online/Offline melhorado */}
                    {selectedChat.recipient && (
                      onlineUsers.has(selectedChat.recipient.id) ? (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          <span className="text-green-500 font-medium">Online</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
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
              <div className="flex items-center gap-2">
                {/* Verificar identidade */}
                <button
                  onClick={() => setShowSecurityCode(true)}
                  className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
                  title="Verificar identidade"
                  aria-label="Verificar identidade"
                >
                  <Shield className="w-4 h-4" />
                </button>
                {/* Histórico de mídia */}
                <button
                  onClick={() => setShowMediaGallery(true)}
                  className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
                  title="Fotos e vídeos"
                  aria-label="Ver fotos e vídeos"
                >
                  <ImagePlus className="w-4 h-4" />
                </button>
                {/* Notificações: opções granulares */}
                {selectedChat.recipient && (
                  <div className="relative">
                    <button
                      onClick={() => setMuteMenuOpen(!muteMenuOpen)}
                      className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
                      title={mutedChats.has(selectedChat.id) ? 'Opções de notificação' : 'Silenciar'}
                      aria-label="Notificações"
                    >
                      {mutedChats.has(selectedChat.id) ? (
                        <BellOff className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </button>
                    {muteMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMuteMenuOpen(false)} aria-hidden />
                        <div className="absolute right-0 top-full mt-1 py-1 bg-white dark:bg-[#242f3d] rounded-lg shadow-lg border border-gray-200 dark:border-[#0e1621] z-50 min-w-[160px]">
                          {mutedChats.has(selectedChat.id) ? (
                            <button
                              onClick={async () => {
                                if (!currentUser || !selectedChat) return;
                                try {
                                  const { error } = await supabase.from('chat_participants').update({ muted: false, mute_until: null }).eq('chat_id', selectedChat.id).eq('user_id', currentUser.id);
                                  if (error) throw error;
                                  impactLight();
                                  setMutedChats(prev => { const s = new Set(prev); s.delete(selectedChat.id); return s; });
                                  toast.success('Notificações ativadas');
                                } catch (e) {
                                  logError(normalizeError(e));
                                  toast.error(getUserFriendlyMessage(normalizeError(e)) || 'Não foi possível alterar notificações');
                                }
                                setMuteMenuOpen(false);
                              }}
                              className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#17212b]"
                            >
                              <Bell className="w-4 h-4" /> Ativar notificações
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={async () => {
                                  if (!currentUser || !selectedChat) return;
                                  const until = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                                  try {
                                    const { error } = await supabase.from('chat_participants').update({ muted: true, mute_until: until }).eq('chat_id', selectedChat.id).eq('user_id', currentUser.id);
                                    if (error) throw error;
                                    impactLight();
                                    setMutedChats(prev => new Set(prev).add(selectedChat.id));
                                    toast.success('Silenciado por 1 hora');
                                  } catch (e) {
                                    logError(normalizeError(e));
                                    toast.error(getUserFriendlyMessage(normalizeError(e)) || 'Não foi possível alterar notificações');
                                  }
                                  setMuteMenuOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#17212b]"
                              >
                                Silenciar por 1 hora
                              </button>
                              <button
                                onClick={async () => {
                                  if (!currentUser || !selectedChat) return;
                                  const until = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
                                  try {
                                    const { error } = await supabase.from('chat_participants').update({ muted: true, mute_until: until }).eq('chat_id', selectedChat.id).eq('user_id', currentUser.id);
                                    if (error) throw error;
                                    impactLight();
                                    setMutedChats(prev => new Set(prev).add(selectedChat.id));
                                    toast.success('Silenciado por 8 horas');
                                  } catch (e) {
                                    logError(normalizeError(e));
                                    toast.error(getUserFriendlyMessage(normalizeError(e)) || 'Não foi possível alterar notificações');
                                  }
                                  setMuteMenuOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-[#17212b]"
                              >
                                Silenciar por 8 horas
                              </button>
                              <button
                                onClick={async () => {
                                  if (!currentUser || !selectedChat) return;
                                  try {
                                    const { error } = await supabase.from('chat_participants').update({ muted: true, mute_until: null }).eq('chat_id', selectedChat.id).eq('user_id', currentUser.id);
                                    if (error) throw error;
                                    impactLight();
                                    setMutedChats(prev => new Set(prev).add(selectedChat.id));
                                    toast.success('Notificações silenciadas');
                                  } catch (e) {
                                    logError(normalizeError(e));
                                    toast.error(getUserFriendlyMessage(normalizeError(e)) || 'Não foi possível alterar notificações');
                                  }
                                  setMuteMenuOpen(false);
                                }}
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
                {selectedChat.recipient && (
                  <button
                    onClick={() => {
                      setEditingUserId(selectedChat.recipient!.id);
                      setEditingNickname(selectedChat.recipient!.nickname);
                      setShowEditNicknameModal(true);
                    }}
                    className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
                    title="Editar nickname"
                    aria-label="Editar nickname"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              </div>
              {/* Sugestão 9: Busca em mensagens */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar nesta conversa..."
                  value={messageSearchQuery}
                  onChange={(e) => setMessageSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-base rounded-lg bg-gray-100 dark:bg-[#0e1621] border border-gray-200 dark:border-[#17212b] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {messageSearchQuery && (
                  <button
                    onClick={() => setMessageSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                    aria-label="Limpar busca"
                  >
                    <CloseIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </header>
            <div
              ref={messagesScrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-[#0e1621] relative smooth-scroll"
              data-stealth-content="true"
              data-sensitive="true"
              // Sugestão 23: Drag & drop de arquivos
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.types.includes('Files')) {
                  setIsDragging(true);
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Só desativar se realmente saiu da área (não apenas de um filho)
                if (e.currentTarget === e.target) {
                  setIsDragging(false);
                  setDragPreview(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                
                const files = Array.from(e.dataTransfer.files);
                if (files.length === 0 || !selectedChat || !currentUser) return;
                
                // Sugestão 23: Preview antes de enviar
                const imageFiles = files.filter(f => f.type.startsWith('image/'));
                const videoFiles = files.filter(f => f.type.startsWith('video/'));
                const audioFiles = files.filter(f => f.type.startsWith('audio/'));
                const otherFiles = files.filter(f => 
                  !f.type.startsWith('image/') && 
                  !f.type.startsWith('video/') && 
                  !f.type.startsWith('audio/')
                );
                
                // Limite de tamanho: 50MB por arquivo
                const maxSize = 50 * 1024 * 1024; // 50MB
                const validFiles = files.filter(f => {
                  if (f.size > maxSize) {
                    toast.error(`Arquivo ${f.name} excede 50MB`);
                    return false;
                  }
                  return true;
                });
                
                if (validFiles.length === 0) return;
                
                // Filtrar apenas arquivos válidos por tipo
                const validImageFiles = validFiles.filter(f => f.type.startsWith('image/'));
                const validVideoFiles = validFiles.filter(f => f.type.startsWith('video/'));
                const validAudioFiles = validFiles.filter(f => f.type.startsWith('audio/'));
                const validOtherFiles = validFiles.filter(f => 
                  !f.type.startsWith('image/') && 
                  !f.type.startsWith('video/') && 
                  !f.type.startsWith('audio/')
                );
                
                // Mostrar preview e enviar
                if (validImageFiles.length > 0) {
                  setDragPreview({ files: validImageFiles, count: validFiles.length });
                  // Enviar após pequeno delay para mostrar preview
                  setTimeout(() => {
                    validImageFiles.forEach(file => handleMediaUpload(file, 'image'));
                    setDragPreview(null);
                  }, 300);
                } else if (validVideoFiles.length > 0) {
                  validVideoFiles.forEach(file => handleMediaUpload(file, 'video'));
                } else if (validAudioFiles.length > 0) {
                  validAudioFiles.forEach(file => handleMediaUpload(file, 'audio'));
                } else if (validOtherFiles.length > 0) {
                  toast.info('Arquivos não suportados. Use imagens, vídeos ou áudios.');
                }
              }}
            >
               {/* Sugestão 23: Overlay de drag & drop */}
               {isDragging && (
                 <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg z-50 flex items-center justify-center backdrop-blur-sm">
                   <div className="text-center">
                     <Paperclip className="w-12 h-12 text-blue-500 mx-auto mb-2" />
                     <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">Solte os arquivos aqui</p>
                     <p className="text-sm text-gray-600 dark:text-gray-400">Máx 50MB por arquivo</p>
                   </div>
                 </div>
               )}
               
               {/* Sugestão 23: Preview de arquivos sendo enviados */}
               {dragPreview && dragPreview.files.length > 0 && (
                 <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                   <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                     Enviando {dragPreview.count} arquivo(s)...
                   </p>
                   <div className="flex gap-2 flex-wrap">
                     {dragPreview.files.slice(0, 3).map((file, idx) => (
                       <div key={idx} className="relative">
                         {file.type.startsWith('image/') && (
                           <img 
                             src={URL.createObjectURL(file)} 
                             alt={file.name}
                             className="w-16 h-16 object-cover rounded"
                           />
                         )}
                         <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[64px]">{file.name}</p>
                       </div>
                     ))}
                     {dragPreview.count > 3 && (
                       <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                         <span className="text-xs font-medium">+{dragPreview.count - 3}</span>
                       </div>
                     )}
                   </div>
                 </div>
               )}
               
               <div className="flex flex-col gap-3 max-w-3xl mx-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <MessageSquare className="w-16 h-16 text-gray-400 dark:text-[#708499] mb-4 opacity-50" />
                    <p className="text-gray-600 dark:text-[#708499] text-sm">Nenhum comentário ainda</p>
                    <p className="text-gray-500 dark:text-[#708499] text-xs mt-2">Seja o primeiro a comentar!</p>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Search className="w-12 h-12 text-gray-400 dark:text-[#708499] mb-3 opacity-50" />
                    <p className="text-gray-600 dark:text-[#708499] text-sm">Nenhuma mensagem encontrada</p>
                    <p className="text-gray-500 dark:text-[#708499] text-xs mt-2">Tente outro termo na busca</p>
                  </div>
                ) : (
                  <div
                    style={{ height: `${messagesVirtualizer.getTotalSize()}px`, position: 'relative' }}
                    className="w-full"
                  >
                    {messagesVirtualizer.getVirtualItems().map((virtualRow) => {
                      if (virtualRow.index === 0 && messagesWithLoadMore) {
                        return (
                          <div
                            key="load-more"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="flex justify-center py-2"
                          >
                            <button
                              onClick={() => {
                                const nextPage = messagesPage + 1;
                                setMessagesPage(nextPage);
                                fetchMessages(selectedChat.id, nextPage, true);
                              }}
                              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                              Carregar mensagens anteriores
                            </button>
                          </div>
                        );
                      }
                      const msgIdx = messagesWithLoadMore ? virtualRow.index - 1 : virtualRow.index;
                      const msg = filteredMessages[msgIdx];
                      if (!msg) return null;
                      return (
                    <div
                      key={msg.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      data-stealth-content="true"
                      data-message="true"
                      data-message-id={msg.id}
                    >
                    <SwipeableMessage
                      onSwipeReply={() => setReplyingTo(msg)}
                      isOwnMessage={msg.sender_id === currentUser?.id}
                      disabled={msg.deleted_at !== null}
                    >
                    <div
                      className={`flex gap-3 ${msg.sender_id === currentUser?.id ? 'flex-row-reverse' : 'flex-row'}`}
                      onContextMenu={(e) => { e.preventDefault(); setMessageMenuId(msg.id); }}
                      onTouchStart={() => { longPressRef.current = setTimeout(() => { setMessageMenuId(msg.id); impactMedium(); }, 500); }}
                      onTouchEnd={() => { if (longPressRef.current) clearTimeout(longPressRef.current); longPressRef.current = null; }}
                      onTouchMove={() => { if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; } }}
                    >
                      <img 
                        src={msg.sender_id === currentUser?.id 
                          ? (currentUserProfile?.avatar_url || 'https://i.pravatar.cc/150')
                          : (selectedChat.recipient?.avatar_url || 'https://i.pravatar.cc/150')
                        }
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
                        loading="lazy"
                        onLoad={async (e) => {
                          e.currentTarget.classList.add('loaded');
                          // Sugestão 13: Cachear avatar após carregar
                          const imgSrc = e.currentTarget.src;
                          if (imgSrc && imgSrc.startsWith('http')) {
                            try {
                              const cached = await fetchMediaWithCache(imgSrc);
                              // Se cache funcionou, pode usar URL do blob para melhor performance
                            } catch (error) {
                              // Ignorar erros de cache silenciosamente
                            }
                          }
                        }}
                      />
                      <div className={`flex-1 max-w-[75%] ${msg.sender_id === currentUser?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`rounded-lg px-4 py-2.5 ${msg.sender_id === currentUser?.id 
                          ? 'bg-blue-50 dark:bg-[#2b5278] text-gray-900 dark:text-white rounded-br-sm' 
                          : 'bg-gray-100 dark:bg-[#182533] text-gray-900 dark:text-white rounded-bl-sm border border-gray-200 dark:border-[#242f3d]'
                        }`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {msg.sender_id === currentUser?.id ? 'Você' : (selectedChat.recipient?.nickname || 'Leitor')}
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">
                              {formatTime(msg.created_at)}
                            </span>
                            {msg.sender_id === currentUser?.id && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400" title={msg.read_at ? 'Lida' : 'Enviada'}>
                                {msg.read_at ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3" />}
                              </span>
                            )}
                          </div>
                          {msg.reply_to_id && (() => {
                            const repliedMsg = messages.find(m => m.id === msg.reply_to_id);
                            return repliedMsg ? (
                              <div className="mb-2 pl-2 border-l-2 border-blue-400 dark:border-blue-500 rounded-r text-xs text-gray-600 dark:text-gray-400">
                                <span className="font-medium">{repliedMsg.sender_id === currentUser?.id ? 'Você' : (selectedChat.recipient?.nickname || '')}: </span>
                                <span className="truncate block">{(repliedMsg.content || '').slice(0, 80)}{(repliedMsg.content?.length || 0) > 80 ? '...' : ''}</span>
                              </div>
                            ) : null;
                          })()}
                          {msg.deleted_at && msg.deleted_for_everyone ? (
                            <div className="text-sm italic text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Trash2 className="w-3 h-3" />
                              Esta mensagem foi apagada
                            </div>
                          ) : msg.is_view_once && msg.sender_id !== currentUser?.id && !msg.viewed_at ? (
                            <button
                              onClick={() => handleViewOnceMessage(msg)}
                              className="flex items-center gap-2 px-4 py-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                            >
                              <span className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                                <span className="text-white text-lg">1</span>
                              </span>
                              <div className="text-left">
                                <span className="block text-sm font-medium">Mensagem para ver uma vez</span>
                                <span className="block text-xs opacity-75">Toque para visualizar</span>
                              </div>
                            </button>
                          ) : msg.is_view_once && msg.viewed_at && msg.sender_id !== currentUser?.id ? (
                            <div className="text-sm italic text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <span className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-white text-[10px]">1</span>
                              Mensagem visualizada
                            </div>
                          ) : msg.content && (
                            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-800 dark:text-white">
                              {msg.is_view_once && (
                                <span className="inline-flex items-center gap-1 text-orange-500 text-xs mr-1">
                                  <span className="w-3 h-3 rounded-full bg-orange-500 flex items-center justify-center text-white text-[8px]">1</span>
                                </span>
                              )}
                              {msg.content}
                              {msg.edited_at && (
                                <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500 italic">
                                  (editado)
                                </span>
                              )}
                            </div>
                          )}
                          {msg.media_url && (
                          <div className="mt-2">
                            {msg.media_type === 'image' && (
                              <img 
                                src={msg.media_url} 
                                alt="Imagem enviada" 
                                className="max-w-full max-h-[200px] object-contain rounded-lg cursor-pointer"
                                onClick={() => window.open(msg.media_url!, '_blank')}
                                onLoad={handleMediaLoad}
                                loading="lazy"
                              />
                            )}
                            {msg.media_type === 'video' && (
                              <video 
                                src={msg.media_url} 
                                controls 
                                className="max-w-full max-h-[220px] rounded-lg"
                                onLoadedMetadata={handleMediaLoad}
                                preload="metadata"
                              />
                            )}
                            {msg.media_type === 'audio' && (
                              <AudioMessagePlayer src={msg.media_url!} className="mt-1" />
                            )}
                          </div>
                          )}
                          {/* Reactions Display */}
                          {messageReactions[msg.id] && Object.keys(messageReactions[msg.id]).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {Object.entries(messageReactions[msg.id]).map(([emoji, data]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(msg.id, emoji)}
                                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors ${
                                    data.userReacted
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                  }`}
                                >
                                  <span>{emoji}</span>
                                  <span className="font-medium">{data.count}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <button
                            onClick={() => { setReplyingTo(msg); setMessageMenuId(null); }}
                            className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Responder
                          </button>
                          {messageMenuId === msg.id && (
                            <div className="absolute bottom-full left-0 mb-1 bg-white dark:bg-[#242f3d] rounded-lg shadow-lg border border-gray-200 dark:border-[#0e1621] z-50 min-w-[160px]">
                              {/* Reaction Picker */}
                              {!msg.deleted_at && (
                                <div className="flex gap-1 p-2 border-b border-gray-200 dark:border-[#0e1621]">
                                  {REACTION_EMOJIS.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(msg.id, emoji)}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg hover:bg-gray-100 dark:hover:bg-[#17212b] transition-colors ${
                                        messageReactions[msg.id]?.[emoji]?.userReacted ? 'bg-blue-100 dark:bg-blue-900/30' : ''
                                      }`}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div className="py-1">
                                {!msg.deleted_at && (
                                  <>
                                    <button
                                      onClick={() => {
                                        const t = (msg.content || '').trim() || (msg.media_type ? `[${msg.media_type}]` : '');
                                        navigator.clipboard?.writeText(t).then(() => { toast.success('Copiado'); setMessageMenuId(null); });
                                      }}
                                      className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#17212b]"
                                    >
                                      <Copy className="w-4 h-4" /> Copiar
                                    </button>
                                    <button
                                      onClick={() => { setReplyingTo(msg); setMessageMenuId(null); }}
                                      className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#17212b]"
                                    >
                                      <Reply className="w-4 h-4" /> Responder
                                    </button>
                                    <button
                                      onClick={() => { toast.info('Encaminhar em breve'); setMessageMenuId(null); }}
                                      className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#17212b]"
                                    >
                                      <Forward className="w-4 h-4" /> Encaminhar
                                    </button>
                                  </>
                                )}
                                {canEditMessage(msg) && !msg.deleted_at && (
                                  <button
                                    onClick={() => {
                                      setEditingMessage(msg);
                                      setEditContent(msg.content);
                                      setMessageMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#17212b]"
                                  >
                                    <Pencil className="w-4 h-4" /> Editar
                                  </button>
                                )}
                                {msg.sender_id === currentUser?.id && !msg.deleted_at && (
                                  <button
                                    onClick={() => {
                                      setDeleteConfirmId(msg.id);
                                      setMessageMenuId(null);
                                    }}
                                    className="w-full px-3 py-2 flex items-center gap-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="w-4 h-4" /> Apagar
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    </SwipeableMessage>
                    </div>
                      );
                    })}
                  </div>
                )}
                <div ref={messagesEndRef} className="h-1" aria-hidden="true" />
              </div>
            </div>
            <footer className="sticky bottom-0 p-3 bg-white dark:bg-[#17212b] border-t border-gray-200 dark:border-[#0e1621] safe-area-inset-bottom">
              <div className="max-w-3xl mx-auto">
                {/* Menu de Mídia */}
                <AnimatePresence>
                  {showMediaMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mb-2 flex gap-2 p-2 bg-[#242f3d] rounded-xl"
                    >
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center gap-2 p-3 bg-[#17212b] rounded-lg hover:bg-[#2b5278] transition-colors"
                      >
                        <Camera className="w-5 h-5 text-[#4c94d5]" />
                        <span className="text-xs text-white">Foto</span>
                      </button>
                      <button
                        onClick={() => videoInputRef.current?.click()}
                        className="flex-1 flex flex-col items-center gap-2 p-3 bg-[#17212b] rounded-lg hover:bg-[#2b5278] transition-colors"
                      >
                        <FileVideo className="w-5 h-5 text-[#4c94d5]" />
                        <span className="text-xs text-white">Vídeo</span>
                      </button>
                      <button
                        onClick={isRecording ? stopAudioRecording : startAudioRecording}
                        className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                          isRecording 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-[#17212b] hover:bg-[#2b5278]'
                        }`}
                      >
                        <Mic className={`w-5 h-5 ${isRecording ? 'text-white animate-pulse' : 'text-[#4c94d5]'}`} />
                        <span className="text-xs text-white">{isRecording ? 'Gravando...' : 'Áudio'}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Indicador de progresso de upload */}
                {uploadProgress && (
                  <div className="mb-2 p-3 bg-[#242f3d] rounded-xl">
                    <div className="flex items-center gap-3 mb-2">
                      {uploadProgress.type === 'video' && <FileVideo className="w-5 h-5 text-[#4c94d5]" />}
                      {uploadProgress.type === 'image' && <Camera className="w-5 h-5 text-[#4c94d5]" />}
                      {uploadProgress.type === 'audio' && <Mic className="w-5 h-5 text-[#4c94d5]" />}
                      <span className="text-sm text-white flex-1">
                        Enviando {uploadProgress.type === 'video' ? 'vídeo' : uploadProgress.type === 'audio' ? 'áudio' : 'imagem'}...
                      </span>
                      <span className="text-sm text-[#708499]">{uploadProgress.progress}%</span>
                    </div>
                    <div className="w-full h-2 bg-[#17212b] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#4c94d5] rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Inputs ocultos para mídia */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'image')}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'video')}
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e, 'audio')}
                />

                {/* Sugestão 10: Preview de resposta */}
                {replyingTo && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-gray-100 dark:bg-[#242f3d] rounded-lg border-l-2 border-blue-500">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Respondendo a {replyingTo.sender_id === currentUser?.id ? 'você' : (selectedChat?.recipient?.nickname || '')}</p>
                      <p className="text-sm text-gray-800 dark:text-white truncate">{(replyingTo.content || '').slice(0, 60)}{(replyingTo.content?.length || 0) > 60 ? '...' : ''}</p>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-white"
                      aria-label="Cancelar resposta"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {/* Indicador de modo View Once */}
                {isViewOnceMode && (
                  <div className="mb-2 flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg border border-orange-300 dark:border-orange-700">
                    <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">1</span>
                    <span className="flex-1 text-sm text-orange-700 dark:text-orange-300">
                      Mensagem para ver uma vez
                    </span>
                    <button
                      onClick={() => setIsViewOnceMode(false)}
                      className="p-1 text-orange-500 hover:text-orange-700"
                      aria-label="Desativar modo ver uma vez"
                    >
                      <CloseIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 safe-area-bottom">
                  <button
                    onClick={() => setShowMediaMenu(!showMediaMenu)}
                    className="w-10 h-10 bg-[#242f3d] rounded-full flex items-center justify-center text-[#4c94d5] hover:bg-[#2b5278] transition-colors flex-shrink-0"
                    aria-label="Anexar arquivo"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsViewOnceMode(!isViewOnceMode)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
                      isViewOnceMode 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-[#242f3d] text-[#4c94d5] hover:bg-[#2b5278]'
                    }`}
                    aria-label={isViewOnceMode ? 'Desativar ver uma vez' : 'Ativar ver uma vez'}
                    title="Mensagem para ver uma vez"
                  >
                    <span className="text-lg font-bold">1</span>
                  </button>
                  <div className="flex-1 bg-gray-100 dark:bg-[#17212b] rounded-2xl flex items-end p-2 px-4 gap-3 min-h-[44px] border border-gray-200 dark:border-[#242f3d]">
                    <textarea 
                      rows={1} 
                      value={inputText} 
                      onChange={(e) => {
                        handleInputChange(e);
                        // Auto-resize textarea
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) { 
                          e.preventDefault(); 
                          handleSendMessage(); 
                        } 
                      }} 
                      placeholder="Mensagem..." 
                      className="flex-1 bg-transparent border-none focus:ring-0 text-base resize-none py-1 placeholder-gray-400 dark:placeholder-[#708499] text-gray-900 dark:text-white"
                      disabled={isSending}
                      data-testid="message-input"
                      data-stealth-content="true"
                    />
                  </div>
                  {/* Botão de Áudio - sempre visível ao lado do enviar */}
                  <button
                    onClick={isRecording ? stopAudioRecording : startAudioRecording}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all touch-manipulation flex-shrink-0 ${
                      isRecording 
                        ? 'bg-red-500 text-white animate-pulse hover:bg-red-600' 
                        : 'bg-[#242f3d] text-[#4c94d5] hover:bg-[#2b5278]'
                    }`}
                    aria-label={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                    title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  {/* Botão de Enviar */}
                  <button 
                    onClick={() => {
                      impactLight();
                      handleSendMessage();
                    }}
                    disabled={!inputText.trim() || isSending}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] bg-blue-600 dark:bg-[#2b5278] rounded-full flex items-center justify-center text-white transition-opacity touch-manipulation flex-shrink-0 ${
                      !inputText.trim() || isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 dark:hover:bg-[#346290] active:scale-95'
                    }`}
                    data-testid="send-button"
                    aria-label="Enviar mensagem"
                  >
                    {isSending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#708499] p-8">
            <MessageSquare className="w-20 h-20 mb-4 opacity-30" />
            <p className="bg-black/20 px-4 py-2 rounded-full text-sm mb-2">Selecione uma conversa</p>
            <p className="text-xs opacity-70">ou adicione um novo contato para começar</p>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isAddContactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-sm bg-[#17212b] rounded-2xl p-6 shadow-2xl border border-[#242f3d]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Novo Contato</h3>
                <button onClick={() => setIsAddContactOpen(false)} className="text-[#708499] hover:text-white transition-colors"><CloseIcon className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#708499] mb-2">Nickname ou Email do usuário</label>
                  <div className="bg-[#242f3d] rounded-xl flex items-center px-4 py-3 border border-[#17212b]">
                    <input 
                      type="text" 
                      value={nicknameSearch} 
                      onChange={(e) => setNicknameSearch(e.target.value)} 
                      placeholder="Digite o nickname ou email..." 
                      className="bg-transparent border-none focus:ring-0 text-base w-full text-white placeholder-[#708499]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddContact();
                        }
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#708499] mt-2">
                    {nicknameSearch.includes('@') 
                      ? 'Buscando por email...' 
                      : 'Digite o nickname (3-20 caracteres) ou email do usuário'}
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddContact();
                  }}
                  disabled={!nicknameSearch.trim() || isAddingContact}
                  className={`w-full bg-[#2b5278] hover:bg-[#346290] disabled:hover:bg-[#2b5278] py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 ${
                    !nicknameSearch.trim() || isAddingContact ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isAddingContact ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Adicionando...
                    </>
                  ) : (
                    'Adicionar'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Edição de Nickname */}
      {showEditNicknameModal && editingUserId && (
        <EditNicknameModal
          isOpen={showEditNicknameModal}
          onClose={() => {
            setShowEditNicknameModal(false);
            setEditingUserId(null);
            setEditingNickname('');
          }}
          currentNickname={editingNickname}
          userId={editingUserId}
          isOwnProfile={editingUserId === currentUser?.id}
          onSuccess={async () => {
            // Recarregar chats e perfil
            if (currentUser) {
              await fetchChats(currentUser.id);
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('nickname, avatar_url')
                  .eq('id', currentUser.id)
                  .single();
                if (profile) {
                  setCurrentUserProfile(profile);
                }
            }
          }}
        />
      )}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          currentAvatarUrl={currentUserProfile?.avatar_url}
          onAvatarUpdate={(url) => setCurrentUserProfile(prev => prev ? { ...prev, avatar_url: url } : null)}
        />
      )}
      <AnimatePresence>
        {showMediaGallery && selectedChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex flex-col bg-white dark:bg-[#17212b]"
          >
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-[#242f3d]">
              <h3 className="font-bold text-gray-900 dark:text-white">Fotos e vídeos</h3>
              <button
                onClick={() => setShowMediaGallery(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] transition-colors"
                aria-label="Fechar"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                const mediaItems = messages.filter(m => m.media_url && (m.media_type === 'image' || m.media_type === 'video'));
                if (mediaItems.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                      <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma foto ou vídeo nesta conversa</p>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaItems.map((m) => (
                      <a
                        key={m.id}
                        href={m.media_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-[#242f3d] block"
                      >
                        {m.media_type === 'image' ? (
                          <img src={m.media_url!} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <video src={m.media_url!} className="w-full h-full object-cover" muted />
                        )}
                      </a>
                    ))}
                  </div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#17212b] rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sair da conta?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Você precisará entrar novamente para acessar suas conversas.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242f3d] hover:bg-gray-200 dark:hover:bg-[#2b5278] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  Sair
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Modal de Edição de Mensagem */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
            onClick={() => { setEditingMessage(null); setEditContent(''); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#17212b] rounded-2xl p-6 max-w-md w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Editar mensagem
              </h3>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-100 dark:bg-[#242f3d] text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                maxLength={10000}
                autoFocus
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
                {editContent.length}/10000 caracteres
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setEditingMessage(null); setEditContent(''); }}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242f3d] hover:bg-gray-200 dark:hover:bg-[#2b5278] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditMessage}
                  disabled={!editContent.trim() || editContent === editingMessage.content || isEditing}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isEditing ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#17212b] rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Apagar mensagem?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Escolha como deseja apagar esta mensagem.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => handleDeleteMessage(deleteConfirmId, false)}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242f3d] hover:bg-gray-200 dark:hover:bg-[#2b5278] transition-colors text-left"
                >
                  Apagar para mim
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Outros participantes ainda poderão ver a mensagem
                  </span>
                </button>
                {(() => {
                  const msg = messages.find(m => m.id === deleteConfirmId);
                  return msg && canDeleteForEveryone(msg) && (
                    <button
                      onClick={() => handleDeleteMessage(deleteConfirmId, true)}
                      className="w-full py-2.5 px-4 rounded-xl font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left"
                    >
                      Apagar para todos
                      <span className="block text-xs text-red-500 dark:text-red-400 mt-0.5">
                        A mensagem será apagada para todos os participantes
                      </span>
                    </button>
                  );
                })()}
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full py-2.5 px-4 rounded-xl font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Verificação de Identidade */}
      {showSecurityCode && selectedChat && currentUser && selectedChat.recipient && (
        <SecurityCodeModal
          isOpen={showSecurityCode}
          onClose={() => setShowSecurityCode(false)}
          chatId={selectedChat.id}
          currentUserId={currentUser.id}
          recipientId={selectedChat.recipient.id}
          recipientNickname={selectedChat.recipient.nickname || 'Usuário'}
          onVerified={() => toast.success('Identidade verificada com sucesso!')}
        />
      )}

      {/* Alerta de Screenshot */}
      <ScreenshotAlert
        isVisible={screenshotAlertVisible}
        onClose={() => setScreenshotAlertVisible(false)}
        message={screenshotAlertMessage}
        variant={screenshotAlertVariant}
      />

      {/* Overlay de Proteção contra Screenshot */}
      <ScreenshotProtectionOverlay isActive={screenshotProtectionActive} />

      {/* Modal de Busca Avançada */}
      {currentUser && (
        <AdvancedSearchModal
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          messages={messages}
          chats={chats}
          currentUserId={currentUser.id}
          onResultClick={(msg) => {
            // Encontrar o chat da mensagem e selecioná-lo
            const chat = chats.find(c => c.id === msg.chat_id);
            if (chat) {
              setSelectedChat(chat);
              // Scroll para a mensagem (simplificado - requer implementação adicional)
              setTimeout(() => {
                const msgElement = document.querySelector(`[data-message-id="${msg.id}"]`);
                if (msgElement) {
                  msgElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  msgElement.classList.add('highlight-message');
                  setTimeout(() => msgElement.classList.remove('highlight-message'), 2000);
                }
              }, 300);
            }
          }}
        />
      )}
    </div>
  );
}
