'use client';

import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, MoreVertical, Phone, Video, Send, Paperclip, Smile, Check, CheckCheck, Menu, User, Settings, LogOut, ArrowLeft, ArrowDown, Image as ImageIcon, Mic, UserPlus, X as CloseIcon, MessageSquare, Camera, FileVideo, FileAudio, Edit2, Clock, Newspaper, Bell, BellOff, Home, AlertCircle, ImagePlus, Copy, Reply, Forward, Trash2, Pencil, Shield, ExternalLink, Globe, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Message, ChatWithRecipient, User as UserType } from '@/types/messaging';
import { validateAndSanitizeNickname, validateAndSanitizeMessage } from '@/lib/validation';
import { ChatItemSkeleton, MessageListSkeleton } from '@/components/ui/Skeleton';
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
import { useEncryption } from '@/hooks/useEncryption';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';
import ChatHeader from '@/components/messaging/ChatHeader';
import MessageInput from '@/components/messaging/MessageInput';
import ChatModals from '@/components/messaging/ChatModals';

interface ChatLayoutProps {
  accessMode?: AccessMode;
}

const SwipeableChatItem = memo(function SwipeableChatItem({
  chat,
  selectedChat,
  onlineUsers,
  mutedChats,
  formatTime,
  style,
  onSelect,
  onMuteToggle,
  onDelete,
}: {
  chat: ChatWithRecipient;
  selectedChat: ChatWithRecipient | null;
  onlineUsers: Set<string>;
  mutedChats: Set<string>;
  formatTime: (t: string) => string;
  style: React.CSSProperties;
  onSelect: () => void;
  onMuteToggle: () => Promise<void>;
  onDelete: () => void;
}) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  const justSwipedRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const MIN_SWIPE = 80;
  const IOS_EDGE_ZONE = 30;
  const MAX_SWIPE_VISUAL = 100;

  const onTouchStart = (e: React.TouchEvent) => {
    const startX = e.targetTouches[0].clientX;
    const startY = e.targetTouches[0].clientY;

    if (startX < IOS_EDGE_ZONE) return;

    touchStartXRef.current = startX;
    touchStartYRef.current = startY;
    isHorizontalSwipeRef.current = null;
    setSwipeOffset(0);

    longPressTimerRef.current = setTimeout(() => {
      impactMedium();
      setShowContextMenu(true);
      justSwipedRef.current = true;

      if (itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect();
        const viewportH = window.innerHeight;
        setMenuPosition(rect.bottom + 120 > viewportH ? 'top' : 'bottom');
      }
    }, 400);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current == null || touchStartYRef.current == null) return;

    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const dx = touchStartXRef.current - currentX;
    const dy = Math.abs(currentY - touchStartYRef.current);

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 8 || dy > 8) {
        isHorizontalSwipeRef.current = Math.abs(dx) > dy;
      }
    }

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isHorizontalSwipeRef.current && dx > 0) {
      setSwipeOffset(Math.min(dx, MAX_SWIPE_VISUAL));
    }
  };

  const onTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (swipeOffset >= MIN_SWIPE) {
      justSwipedRef.current = true;
      impactLight();
      onMuteToggle();
    }

    setSwipeOffset(0);
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    isHorizontalSwipeRef.current = null;
  };

  const handleSelect = () => {
    if (justSwipedRef.current) {
      justSwipedRef.current = false;
      return;
    }
    onSelect();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    impactMedium();
    setShowContextMenu(true);
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      const viewportH = window.innerHeight;
      setMenuPosition(rect.bottom + 120 > viewportH ? 'top' : 'bottom');
    }
  };

  useEffect(() => {
    if (!showContextMenu) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', close);
      document.addEventListener('touchstart', close);
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', close);
      document.removeEventListener('touchstart', close);
    };
  }, [showContextMenu]);

  const isMuted = mutedChats.has(chat.id);
  const swipeProgress = Math.min(swipeOffset / MIN_SWIPE, 1);

  return (
    <div
      ref={itemRef}
      style={style}
      data-chat="true"
      data-chat-id={chat.id}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onContextMenu={handleContextMenu}
      className="touch-manipulation relative overflow-hidden"
    >
      {/* Swipe reveal layer */}
      <div
        className="absolute inset-0 flex items-center justify-end px-5 transition-opacity"
        style={{ opacity: swipeProgress }}
      >
        <div className={`flex items-center gap-2 text-sm font-medium ${isMuted ? 'text-green-500' : 'text-orange-500'}`}>
          {isMuted ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          <span className="hidden sm:inline">{isMuted ? 'Ativar' : 'Silenciar'}</span>
        </div>
      </div>

      <div
        onClick={handleSelect}
        className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#202b36] transition-colors relative bg-white dark:bg-[#17212b] ${selectedChat?.id === chat.id ? 'bg-blue-50 dark:bg-[#2b5278]' : ''}`}
        style={{
          transform: swipeOffset > 0 ? `translateX(-${swipeOffset}px)` : undefined,
          transition: swipeOffset > 0 ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        <div className="relative flex-shrink-0">
          <img
            src={chat.recipient?.avatar_url || DEFAULT_AVATAR_URL}
            alt={chat.recipient?.nickname || 'Avatar'}
            className="w-12 h-12 rounded-full object-cover"
            loading="lazy"
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
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {chat.time && (
                <span className={`text-[10px] flex-shrink-0 ${chat.unreadCount && chat.unreadCount > 0 ? 'text-blue-500 dark:text-blue-400 font-semibold' : 'text-gray-500 dark:text-[#708499]'}`}>
                  {formatTime(chat.time)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {(chat.lastMessage || chat.lastMessageMediaType) && (
              <p className={`text-xs truncate flex-1 min-w-0 ${chat.unreadCount && chat.unreadCount > 0 ? 'text-gray-800 dark:text-gray-200 font-medium' : 'text-gray-600 dark:text-[#708499]'}`}>
                {chat.lastMessageEncrypted
                  ? '🔒 Nova mensagem'
                  : chat.lastMessageMediaType === 'image'
                    ? '📷 Imagem'
                    : chat.lastMessageMediaType === 'video'
                      ? '🎥 Vídeo'
                      : chat.lastMessageMediaType === 'audio'
                        ? '🎤 Áudio'
                        : chat.lastMessage && chat.lastMessage.length > 40
                          ? `${chat.lastMessage.substring(0, 40)}...`
                          : chat.lastMessage}
              </p>
            )}
            {chat.unreadCount !== undefined && chat.unreadCount > 0 && (
              <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-blue-500 dark:bg-blue-600 text-white text-[11px] font-bold unread-badge">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            ref={contextMenuRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-3 z-50 bg-white dark:bg-[#242f3d] rounded-xl shadow-xl border border-gray-200 dark:border-[#17212b] overflow-hidden min-w-[180px] ${menuPosition === 'top' ? 'bottom-1' : 'top-1'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => { setShowContextMenu(false); onMuteToggle(); }}
              className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2b5278] transition-colors"
            >
              {isMuted
                ? <><Bell className="w-4 h-4" /><span>Ativar notificações</span></>
                : <><BellOff className="w-4 h-4" /><span>Silenciar</span></>
              }
            </button>
            <button
              onClick={() => { setShowContextMenu(false); onDelete(); }}
              className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir conversa</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) {
    return date.toLocaleDateString('pt-BR', { weekday: 'long' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isSameDay(d1: string, d2: string): boolean {
  const a = new Date(d1);
  const b = new Date(d2);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const URL_REGEX = /https?:\/\/[^\s<>)"']+/gi;

function extractFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  return match?.[0] || null;
}

function InlineLinkPreview({ url, cacheRef }: { url: string; cacheRef: React.MutableRefObject<Record<string, { title?: string; description?: string; image?: string; domain?: string } | null>> }) {
  const [data, setData] = useState<{ title?: string; description?: string; image?: string; domain?: string } | null>(cacheRef.current[url] || null);
  const [loading, setLoading] = useState(!cacheRef.current[url]);

  useEffect(() => {
    if (cacheRef.current[url] !== undefined) {
      setData(cacheRef.current[url]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error();
        const d = await res.json();
        if (!cancelled) {
          cacheRef.current[url] = d;
          setData(d);
        }
      } catch {
        if (!cancelled) cacheRef.current[url] = null;
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url, cacheRef]);

  if (loading) return <div className="mt-2 h-12 bg-gray-100 dark:bg-[#1a2432] rounded-lg animate-pulse" />;
  if (!data || !data.title) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 block rounded-lg border border-gray-200 dark:border-[#2b3945] overflow-hidden hover:bg-gray-50 dark:hover:bg-[#1a2432] transition-colors"
    >
      {data.image && (
        <div className="w-full h-28 bg-gray-100 dark:bg-[#1a2432]">
          <img src={data.image} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="px-3 py-2">
        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">
          <Globe className="w-3 h-3" />
          {data.domain}
        </div>
        <p className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">{data.title}</p>
        {data.description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{data.description}</p>
        )}
      </div>
    </a>
  );
}

function DragPreviewDisplay({ files, count }: { files: File[]; count: number }) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  useEffect(() => {
    const urls = files.slice(0, 3)
      .filter(f => f.type.startsWith('image/'))
      .map(f => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => { urls.forEach(u => URL.revokeObjectURL(u)); };
  }, [files]);

  return (
    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
        Enviando {count} arquivo(s)...
      </p>
      <div className="flex gap-2 flex-wrap">
        {files.slice(0, 3).map((file, idx) => (
          <div key={idx} className="relative">
            {file.type.startsWith('image/') && previewUrls[idx] && (
              <img src={previewUrls[idx]} alt={file.name} className="w-16 h-16 object-cover rounded" />
            )}
            <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[64px]">{file.name}</p>
          </div>
        ))}
        {count > 3 && (
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
            <span className="text-xs font-medium">+{count - 3}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatLayout({ accessMode = 'main' }: ChatLayoutProps) {
  const { lockMessaging, setFilePickerActive, e2ePin } = useStealthMessaging();
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessagesWhileScrolled, setNewMessagesWhileScrolled] = useState(0);
  const [uploadProgress, setUploadProgress] = useState<{ type: string; progress: number } | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const chatListScrollRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const activeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionState, setConnectionState] = useState<'connected' | 'reconnecting' | 'disconnected'>('connected');
  const mutedChatsRef = useRef<Set<string>>(new Set());
  const prevMessagesLengthRef = useRef(0);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const readObserverRef = useRef<IntersectionObserver | null>(null);
  const pendingReadIdsRef = useRef<Set<string>>(new Set());
  const readDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const linkPreviewCacheRef = useRef<Record<string, { title?: string; description?: string; image?: string; domain?: string } | null>>({});

  // iOS keyboard: atualizar --keyboard-height e body.keyboard-open via visualViewport
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;

    const onResize = () => {
      const kbHeight = Math.max(0, window.innerHeight - vv.height);
      document.documentElement.style.setProperty('--keyboard-height', `${kbHeight}px`);

      if (kbHeight > 100) {
        document.body.classList.add('keyboard-open');
        // Scroll messages area to keep bottom visible when keyboard opens
        const el = messagesScrollRef.current;
        if (el) {
          requestAnimationFrame(() => {
            el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
          });
        }
      } else {
        document.body.classList.remove('keyboard-open');
      }
    };

    vv.addEventListener('resize', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      document.body.classList.remove('keyboard-open');
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, []);
  // Memoizar cliente Supabase para evitar re-criação a cada render
  const supabase = useMemo(() => createClient(), []);

  const {
    e2eEnabled,
    initializeKeys,
    getRecipientPublicKey,
    encrypt,
    decrypt,
    sign,
    encryptFS,
    decryptFS,
    checkActiveSession,
    startForwardSecrecySession,
    acceptForwardSecrecySession,
    getLocalSessionKey,
    clearCache: clearEncryptionCache,
  } = useEncryption({ userId: currentUser?.id ?? null, pin: e2ePin });

  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const [currentUserPublicKey, setCurrentUserPublicKey] = useState<string | null>(null);

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
        mutedChatsRef.current = newMuted;

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

        if (e2ePin) {
          await initializeKeys();
          try {
            const res = await fetch('/api/profile/public-key');
            if (res.ok) {
              const { publicKey } = await res.json();
              if (publicKey) setCurrentUserPublicKey(publicKey);
            }
          } catch { /* ignore */ }
        }
        
        // Sugestão 15: Sincronizar mensagens pendentes ao inicializar (via API)
        try {
          const syncResult = await syncPendingMessages(async (pendingMsg) => {
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
          }, (droppedMsg) => {
            toast.warning(`Uma mensagem não pôde ser enviada e foi descartada: "${(droppedMsg.content || '').slice(0, 30)}..."`, { duration: 8000 });
          });
          if (syncResult.dropped > 0) {
            logger.warn('Mensagens descartadas na sincronização', { dropped: syncResult.dropped });
          }
        } catch (error) {
          logger.warn('Erro ao sincronizar mensagens pendentes', { error });
        }
        // Perfil já foi buscado e definido acima (linha 205-220)
      }
    };
    init();
  }, [supabase, fetchChats, e2ePin, initializeKeys]);

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
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [messages.length, currentUser, fetchChats]);

  // Canal global: atualizar lista de chats quando qualquer conversa receber mensagem nova
  useEffect(() => {
    if (!currentUser) return;

    let debounceTimeout: NodeJS.Timeout | null = null;

    const globalChannel = supabase
      .channel('global-chat-list-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: { new: { sender_id: string } }) => {
        if (payload.new.sender_id === currentUser.id) return;

        if (debounceTimeout) clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          fetchChats(currentUser.id);
        }, 500);
      })
      .subscribe();

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      supabase.removeChannel(globalChannel);
    };
  }, [currentUser, supabase, fetchChats]);

  // Lazy loading de mensagens (via API server-side)
  const fetchMessages = useCallback(async (chatId: string, page: number = 1, append: boolean = false, silent = false) => {
    if (append && isLoadingMore) return;
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }
    const controller = new AbortController();
    fetchAbortRef.current = controller;
    if (append) setIsLoadingMore(true);
    if (!append && page === 1) setIsLoadingMessages(true);
    
    try {
      const response = await fetch(`/api/messages?chatId=${chatId}&page=${page}&limit=${MESSAGES_PER_PAGE}`, { 
        credentials: 'include',
        signal: controller.signal,
      });
      
      if (controller.signal.aborted) return;
      
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
      
      if (controller.signal.aborted) return;
      
      if (data) {
        const sortedData = [...data].reverse();
        const scrollEl = messagesScrollRef.current;
        const prevScrollTop = scrollEl?.scrollTop;
        const prevScrollHeight = scrollEl?.scrollHeight;

        if (append) {
          setMessages(prev => [...sortedData, ...prev]);
        } else {
          setMessages(sortedData);
        }
        setHasMoreMessages(hasMore);

        if (append && scrollEl && prevScrollTop !== undefined && prevScrollHeight !== undefined) {
          requestAnimationFrame(() => {
            const newScrollHeight = scrollEl.scrollHeight;
            scrollEl.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
          });
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      logger.warn('Erro ao buscar mensagens', { error: err });
      if (!silent) {
        toast.error('Erro ao carregar mensagens. Verifique sua conexão.', {
          action: page === 1 ? { label: 'Tentar novamente', onClick: () => fetchMessages(chatId, 1, false) } : undefined,
        });
      }
    } finally {
      if (append) setIsLoadingMore(false);
      setIsLoadingMessages(false);
    }
  }, [isLoadingMore]);

  useEffect(() => {
    const closeMessageMenu = () => setMessageMenuId(null);
    if (messageMenuId) {
      document.addEventListener('click', closeMessageMenu);
      return () => document.removeEventListener('click', closeMessageMenu);
    }
  }, [messageMenuId]);

  useEffect(() => {
    if (selectedChat && currentUser) {
      setMessagesPage(1);
      setHasMoreMessages(true);
      setDecryptedMessages({});
      clearEncryptionCache();
      fetchMessages(selectedChat.id, 1, false);
      
      return () => {
        if (isIncognitoMode()) {
          setMessages([]);
          clearIncognitoData();
        }
      };
    }
  }, [selectedChat?.id, currentUser?.id, fetchMessages, clearEncryptionCache]);

  const decryptFailedRef = useRef<Set<string>>(new Set());

  const decryptBatchRef = useRef(false);

  useEffect(() => {
    if (!currentUser) return;
    const encryptedMsgs = messages.filter(
      m => m.is_encrypted && !decryptedMessages[m.id] && !decryptFailedRef.current.has(m.id)
    );
    if (encryptedMsgs.length === 0) return;
    if (!e2ePin) {
      encryptedMsgs.forEach(m => decryptFailedRef.current.add(m.id));
      return;
    }
    if (decryptBatchRef.current) return;
    decryptBatchRef.current = true;

    let cancelled = false;
    (async () => {
      const results: Record<string, string> = {};
      const failed: string[] = [];
      const BATCH_SIZE = 10;
      for (let i = 0; i < encryptedMsgs.length; i += BATCH_SIZE) {
        if (cancelled) break;
        const batch = encryptedMsgs.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (msg) => {
          if (cancelled) return;
          let plaintext: string | null = null;
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed.fs && parsed.ct && typeof parsed.idx === 'number') {
              plaintext = await decryptFS(msg.chat_id, parsed.ct, parsed.idx);
            }
          } catch {
            // Not FS format
          }
          if (!plaintext) {
            plaintext = await decrypt(msg.content, msg.id);
          }
          if (plaintext) {
            results[msg.id] = plaintext;
          } else {
            failed.push(msg.id);
          }
        }));
        if (!cancelled && Object.keys(results).length > 0) {
          setDecryptedMessages(prev => ({ ...prev, ...results }));
        }
      }
      if (!cancelled) {
        if (failed.length > 0) {
          failed.forEach(id => decryptFailedRef.current.add(id));
        }
        if (Object.keys(results).length > 0) {
          setDecryptedMessages(prev => ({ ...prev, ...results }));
        }
      }
    })().finally(() => { decryptBatchRef.current = false; });
    return () => { cancelled = true; decryptBatchRef.current = false; };
  }, [messages, e2ePin, currentUser, decrypt, decryptFS, decryptedMessages]);

  useEffect(() => {
    if (selectedChat && currentUser) {
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 10;

      const clearReconnectTimeout = () => {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      const handleManualReconnect = () => {
        clearReconnectTimeout();
        if (reconnectAttempts >= maxReconnectAttempts) {
          setConnectionState('disconnected');
          toast.error('Conexão perdida. Atualize a página para reconectar.', {
            id: 'connection-lost',
            duration: Infinity,
            action: { label: 'Atualizar', onClick: () => window.location.reload() }
          });
          return;
        }
        reconnectAttempts++;
        const base = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        const delay = base + Math.random() * base * 0.3;
        logger.info('Agendando reconexão manual do canal...', { attempt: reconnectAttempts, delayMs: Math.round(delay) });
        reconnectTimeoutRef.current = setTimeout(() => {
          const ch = activeChannelRef.current;
          if (ch) supabase.removeChannel(ch);
          const newCh = setupChannel();
          activeChannelRef.current = newCh;
        }, delay);
      };
      
      const setupChannel = () => {
        const channel = supabase
          .channel(`chat:${selectedChat.id}`)
          .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
            filter: `chat_id=eq.${selectedChat.id}` 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }, (payload: any) => {
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
            
            if (newMessage.sender_id !== currentUser?.id && !mutedChatsRef.current.has(selectedChat.id)) {
              const senderName = selectedChat?.recipient?.nickname || 'Alguém';
              const preview = newMessage.is_encrypted
                ? 'Mensagem criptografada'
                : typeof newMessage.content === 'string'
                  ? (newMessage.content.length > 50 ? newMessage.content.slice(0, 50) + '…' : newMessage.content)
                  : (newMessage.media_type === 'image' ? '📷 Imagem' : newMessage.media_type === 'video' ? '🎥 Vídeo' : '🎤 Áudio');
              toast.info(`Nova mensagem de ${senderName}`, {
                description: preview,
                duration: 4000,
                icon: newMessage.is_encrypted ? '🔒' : '💬',
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('broadcast', { event: 'typing' }, (payload: any) => {
            if (payload.payload.userId !== currentUser.id) {
              setOtherUserTyping(payload.payload.userId);
              setTimeout(() => setOtherUserTyping(null), 3000);
            }
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('broadcast', { event: 'fs_key_exchange' }, async (payload: any) => {
            if (payload.payload.userId !== currentUser.id && payload.payload.publicKey) {
              const accepted = await acceptForwardSecrecySession(selectedChat.id, payload.payload.publicKey);
              if (accepted) {
                const localKey = await getLocalSessionKey(selectedChat.id);
                if (localKey) {
                  channel.send({
                    type: 'broadcast',
                    event: 'fs_key_exchange',
                    payload: { userId: currentUser.id, publicKey: localKey },
                  });
                }
              }
            }
          })
          .on('presence', { event: 'sync' }, () => {
            const presenceState = channel.presenceState();
            const online = new Set<string>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (Object.values(presenceState) as any[][]).forEach((presences) => {
              presences.forEach((presence: any) => {
                if (presence.userId && presence.online !== false) {
                  online.add(presence.userId);
                }
              });
            });
            setOnlineUsers(online);
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('presence', { event: 'join' }, ({ newPresences }: any) => {
            newPresences.forEach((presence: any) => {
              if (presence.userId) {
                setOnlineUsers(prev => new Set(prev).add(presence.userId));
              }
            });
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
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
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              reconnectAttempts = 0;
              clearReconnectTimeout();
              setConnectionState('connected');
              toast.dismiss('connection-lost');
              channel.track({
                userId: currentUser.id,
                online: true,
                lastSeen: new Date().toISOString()
              });

              if (e2eEnabled) {
                startForwardSecrecySession(selectedChat.id).then(pubKey => {
                  if (pubKey) {
                    channel.send({
                      type: 'broadcast',
                      event: 'fs_key_exchange',
                      payload: { userId: currentUser.id, publicKey: pubKey },
                    });
                  }
                });
              }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              logger.warn('Canal realtime com erro/timeout, aguardando SDK reconectar...', { status, chatId: selectedChat.id });
              setConnectionState('reconnecting');
              clearReconnectTimeout();
              reconnectTimeoutRef.current = setTimeout(() => {
                const ch = activeChannelRef.current;
                if (ch && ch.state !== 'joined') {
                  logger.warn('SDK não reconectou a tempo, intervindo manualmente...');
                  handleManualReconnect();
                }
              }, 60000);
            } else if (status === 'CLOSED') {
              logger.warn('Canal realtime fechado, reconectando...', { chatId: selectedChat.id });
              setConnectionState('reconnecting');
              handleManualReconnect();
            }
          });

        return channel;
      };

      const channel = setupChannel();
      activeChannelRef.current = channel;
      
      const presenceIntervalId = setInterval(() => {
        const ch = activeChannelRef.current;
        if (ch && ch.state === 'joined') {
          ch.track({
            userId: currentUser.id,
            online: true,
            lastSeen: new Date().toISOString()
          });
        }
      }, 30000);

      const forceReconnectIfNeeded = () => {
        const ch = activeChannelRef.current;
        if (!ch || ch.state === 'closed' || ch.state === 'errored') {
          logger.info('Canal inativo detectado, reconectando...', { state: ch?.state });
          if (ch) supabase.removeChannel(ch);
          reconnectAttempts = 0;
          const newCh = setupChannel();
          activeChannelRef.current = newCh;
        } else {
          ch.track({
            userId: currentUser.id,
            online: true,
            lastSeen: new Date().toISOString()
          });
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          fetchMessages(selectedChat.id, 1, false, true);
          forceReconnectIfNeeded();
        }
      };

      const handleOnline = () => {
        logger.info('Rede restaurada, verificando canal...');
        fetchMessages(selectedChat.id, 1, false, true);
        forceReconnectIfNeeded();
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('online', handleOnline);

      return () => {
        if (presenceIntervalId) clearInterval(presenceIntervalId);
        clearReconnectTimeout();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
        activeChannelRef.current = null;
        channel.untrack();
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat, supabase, currentUser, fetchMessages]);

  useEffect(() => {
    if (!currentUser) return;
    const refreshSession = async () => {
      const { error } = await supabase.auth.refreshSession();
      if (error) logger.warn('Falha ao renovar sessão proativamente', { error: error.message });
    };
    const intervalId = setInterval(refreshSession, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [supabase, currentUser]);

  const isUserNearBottom = useCallback(() => {
    const el = messagesScrollRef.current;
    if (!el) return true;
    const threshold = 200;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback((instant = false) => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const doScroll = () => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: instant ? 'instant' : 'smooth',
      });
    };
    // Double rAF ensures the DOM has fully laid out virtualized items
    requestAnimationFrame(() => {
      requestAnimationFrame(doScroll);
    });
  }, []);

  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      setShowScrollToBottom(!nearBottom);
      if (nearBottom) setNewMessagesWhileScrolled(0);
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [selectedChat?.id]);

  const lastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentLen = messages.length;
    const prevLen = prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = currentLen;
    
    if (currentLen === 0) {
      lastMessageIdRef.current = null;
      return;
    }

    const lastMsg = messages[currentLen - 1];
    const lastId = lastMsg?.id ?? null;
    const prevLastId = lastMessageIdRef.current;
    lastMessageIdRef.current = lastId;

    if (prevLen === 0 || prevLastId === null) {
      // First load: scroll to bottom with multiple attempts for virtualizer to settle
      scrollToBottom(true);
      setTimeout(() => scrollToBottom(true), 100);
      setTimeout(() => scrollToBottom(true), 300);
      return;
    }

    if (lastId !== prevLastId) {
      if (lastMsg?.sender_id === currentUser?.id) {
        scrollToBottom(false);
      } else if (isUserNearBottom()) {
        scrollToBottom(false);
      } else {
        setNewMessagesWhileScrolled(prev => prev + 1);
      }
    }
  }, [messages, isUserNearBottom, scrollToBottom, currentUser?.id]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !selectedChat || !hasMoreMessages) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoadingMore && hasMoreMessages) {
          const nextPage = messagesPage + 1;
          setMessagesPage(nextPage);
          fetchMessages(selectedChat.id, nextPage, true);
        }
      },
      { root: messagesScrollRef.current, rootMargin: '200px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [selectedChat?.id, hasMoreMessages, isLoadingMore, messagesPage, fetchMessages]);

  const markMessagesAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await fetch('/api/messages/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: ids }),
      });
    } catch {
      // Silently fail - will retry on next visibility
    }
  }, []);

  const flushPendingReads = useCallback(() => {
    const ids = Array.from(pendingReadIdsRef.current);
    if (ids.length === 0) return;
    pendingReadIdsRef.current.clear();
    setMessages(prev => prev.map(m => ids.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m));
    markMessagesAsRead(ids);
  }, [markMessagesAsRead]);

  useEffect(() => {
    if (!selectedChat || !currentUser || !messagesScrollRef.current) return;

    readObserverRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const msgId = el.dataset.msgReadId;
          if (msgId) {
            pendingReadIdsRef.current.add(msgId);
            observer.unobserve(el);
          }
        }
        if (pendingReadIdsRef.current.size > 0) {
          if (readDebounceRef.current) clearTimeout(readDebounceRef.current);
          readDebounceRef.current = setTimeout(flushPendingReads, 500);
        }
      },
      { root: messagesScrollRef.current, threshold: 0.5 }
    );

    readObserverRef.current = observer;

    const container = messagesScrollRef.current;

    const mutObs = new MutationObserver(() => {
      const unreadEls = container.querySelectorAll('[data-msg-read-id]');
      unreadEls.forEach(el => observer.observe(el));
    });
    mutObs.observe(container, { childList: true, subtree: true });

    const unreadEls = container.querySelectorAll('[data-msg-read-id]');
    unreadEls.forEach(el => observer.observe(el));

    return () => {
      observer.disconnect();
      mutObs.disconnect();
      if (readDebounceRef.current) {
        clearTimeout(readDebounceRef.current);
        flushPendingReads();
      }
    };
  }, [selectedChat?.id, currentUser?.id, flushPendingReads]);

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
      const mediaMsgBody: Record<string, unknown> = {
        chatId: selectedChat.id,
        content: type === 'image' ? '📷 Imagem' : type === 'video' ? '🎥 Vídeo' : '🎤 Áudio',
        mediaUrl: publicUrl,
        mediaType: type,
      };
      if (isViewOnceMode) mediaMsgBody.isViewOnce = true;
      if (showEphemeralOption && ephemeralSeconds > 0) {
        mediaMsgBody.expiresAt = new Date(Date.now() + ephemeralSeconds * 1000).toISOString();
        mediaMsgBody.isEphemeral = true;
      }

      const msgResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mediaMsgBody),
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
      setIsViewOnceMode(false);
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
  }, [selectedChat, currentUser, supabase, fetchChats, isViewOnceMode, showEphemeralOption, ephemeralSeconds]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    setFilePickerActive(false);
    const files = e.target.files;
    if (!files?.length) return;
    const list = Array.from(files);
    list.forEach((file) => handleMediaUpload(file, type));
    if (e.target) e.target.value = '';
  }, [handleMediaUpload, setFilePickerActive]);

  useEffect(() => {
    const handleWindowFocus = () => {
      setTimeout(() => setFilePickerActive(false), 500);
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [setFilePickerActive]);

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
    
    if (!isTyping) {
      setIsTyping(true);
      const ch = activeChannelRef.current;
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: currentUser.id }
        });
      }
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
    
    let messageSent = false;
    try {
      const contentToSend = messageContent;

      const msgBody: Record<string, unknown> = {
        chatId: selectedChat.id,
        content: contentToSend,
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
      
      if (responseData.message) {
        setMessages(prev => [...prev, responseData.message]);
        setReplyingTo(null);
        setTimeout(() => scrollToBottom(false), 50);
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
      
      // Reset estados especiais
      setIsViewOnceMode(false);
      setReplyingTo(null);
      
      // Atualizar lista lateral de chats (mensagem ja foi adicionada otimisticamente)
      await fetchChats(currentUser.id);
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
      setInputText(userTypedContent); // Restaurar mensagem em caso de erro
    } finally {
      setIsSending(false);
    }
  }, [inputText, selectedChat, currentUser, supabase, isSending, replyingTo, isViewOnceMode, fetchChats, e2eEnabled, encrypt, getRecipientPublicKey, sign, encryptFS, checkActiveSession]);

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
        setTimeout(() => {
          setViewOnceMessageId(null);
          setMessages(prev => prev.map(m =>
            m.id === msg.id ? { ...m, viewed_at: new Date().toISOString() } : m
          ));
        }, 10000);
      } else {
        setViewOnceMessageId(null);
      }
    } catch (error) {
      console.error('Error marking view-once as viewed:', error);
      setViewOnceMessageId(null);
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

  const formatTime = useCallback((dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }, []);

  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      if (msg.expires_at) {
        const expiresAt = new Date(msg.expires_at);
        if (expiresAt <= new Date()) return false;
      }
      if (messageSearchQuery.trim()) {
        const q = messageSearchQuery.toLowerCase();
        const displayContent = msg.is_encrypted ? (decryptedMessages[msg.id] || '') : (msg.content || '');
        return displayContent.toLowerCase().includes(q);
      }
      return true;
    });
  }, [messages, messageSearchQuery]);

  const chatListVirtualizer = useVirtualizer({
    count: filteredChats.length,
    getScrollElement: () => chatListScrollRef.current,
    estimateSize: () => 72,
    overscan: 10,
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
      if (!msg) return 80;
      
      let height = 64;
      const prevMsg = msgIndex > 0 ? filteredMessages[msgIndex - 1] : null;
      if (!prevMsg || !isSameDay(prevMsg.created_at, msg.created_at)) {
        height += 32;
      }
      if (msg.media_url) {
        if (msg.media_type === 'video') height += 220;
        else if (msg.media_type === 'image') height += 200;
        else if (msg.media_type === 'audio') height += 80;
      }
      const contentLen = msg.content?.length || 0;
      if (contentLen > 0) {
        height += Math.ceil(contentLen / 35) * 20;
      }
      if (msg.reply_to_id) height += 52;
      return Math.max(height, 72);
    },
    overscan: 20,
    scrollMargin: 100,
    measureElement: typeof window !== 'undefined'
      ? (element: Element) => element?.getBoundingClientRect().height ?? undefined
      : undefined,
  });
  
  const handleMediaLoad = useCallback(() => {
    messagesVirtualizer.measure();
  }, [messagesVirtualizer]);

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
  const [deleteChatConfirm, setDeleteChatConfirm] = useState<ChatWithRecipient | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  const handleDeleteChat = useCallback(async (chat: ChatWithRecipient) => {
    setIsDeletingChat(true);
    try {
      const response = await fetch('/api/chats', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: chat.id }),
      });
      if (!response.ok) throw new Error('Failed to delete chat');

      if (selectedChat?.id === chat.id) {
        setSelectedChat(null);
        setMessages([]);
        setIsSidebarOpen(true);
      }
      setChats(prev => prev.filter(c => c.id !== chat.id));
      toast.success('Conversa excluída', { duration: 2000 });
    } catch {
      toast.error('Erro ao excluir conversa. Tente novamente.');
    } finally {
      setIsDeletingChat(false);
      setDeleteChatConfirm(null);
    }
  }, [selectedChat]);
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
      className="flex bg-gray-50 dark:bg-[#0e1621] text-gray-900 dark:text-white overflow-hidden font-sans h-full"
    >
      <aside className={`w-full md:w-[350px] border-r border-gray-200 dark:border-[#17212b] flex flex-col md:relative absolute inset-0 z-20 bg-white dark:bg-[#17212b] transition-transform duration-300 ease-out gpu-accelerated ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-[350px]'}`}>
        <div className="p-2 sm:p-4 flex items-center gap-2 sm:gap-3 border-b border-gray-200 dark:border-[#0e1621] relative z-30">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242f3d] text-[#708499] hover:text-white transition-colors touch-manipulation btn-compact flex items-center justify-center"
              aria-label="Menu"
              aria-expanded={isMenuOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Menu Dropdown */}
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full left-0 mt-2 w-52 bg-white dark:bg-[#242f3d] rounded-lg shadow-lg border border-gray-200 dark:border-[#17212b] overflow-hidden z-50"
                >
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      panicVibrate();
                      if (isIncognitoMode()) {
                        setMessages([]);
                        clearIncognitoData();
                      }
                      lockMessaging();
                      toast.success('Modo notícias ativado.', { duration: 2000 });
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2b5278] transition-colors"
                  >
                    <Newspaper className="w-4 h-4" />
                    <span>Modo notícias</span>
                  </button>
                  
                  <button
                    onClick={handleGoToNews}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2b5278] transition-colors"
                  >
                    <Home className="w-4 h-4" />
                    <span>Voltar para Noticias24h</span>
                  </button>
                  
                  <div className="border-t border-gray-200 dark:border-[#17212b]" />
                  
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
          <div className="flex-1 min-w-0 bg-gray-100 dark:bg-[#242f3d] rounded-xl flex items-center gap-1.5 px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 dark:text-[#708499] flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full min-w-0 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#708499]" 
            />
            <button 
              onClick={() => setShowAdvancedSearch(true)}
              className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-[#17212b] text-gray-500 dark:text-[#708499] transition-colors flex-shrink-0"
              title="Busca avançada"
              aria-label="Busca avançada"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          </div>
          {/* Botão Settings - apenas em telas maiores */}
          <button 
            onClick={() => setShowSettingsModal(true)} 
            className="hidden sm:flex p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-gray-600 dark:text-[#708499] transition-colors touch-manipulation btn-touch items-center justify-center" 
            title="Configurações" 
            aria-label="Configurações"
          >
            <Settings className="w-5 h-5" />
          </button>
          {/* Botão Adicionar contato */}
          <button 
            onClick={() => setIsAddContactOpen(true)} 
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-blue-600 dark:text-[#4c94d5] transition-colors touch-manipulation btn-compact sm:btn-touch flex items-center justify-center flex-shrink-0" 
            title="Adicionar contato" 
            data-testid="add-contact-button" 
            aria-label="Adicionar contato"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>
        <div ref={chatListScrollRef} className="flex-1 overflow-y-auto smooth-scroll overscroll-y-contain">
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
                      setShowMediaMenu(false);
                      setMessageMenuId(null);
                      prevMessagesLengthRef.current = 0;
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
                    onDelete={() => setDeleteChatConfirm(chat)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <main 
        className="flex-1 flex flex-col relative bg-gray-50 dark:bg-[#0e1621] min-w-0 overflow-hidden"
        data-stealth-content="true"
        onContextMenu={(e) => {
          // Sugestão 6: Dificultar screenshot - aviso silencioso
          e.preventDefault();
        }}
      >
        {selectedChat ? (
          <>
            <ChatHeader
              selectedChat={selectedChat}
              currentUser={currentUser!}
              onlineUsers={onlineUsers}
              mutedChats={mutedChats}
              otherUserTyping={otherUserTyping}
              messageSearchQuery={messageSearchQuery}
              connectionState={connectionState}
              onBack={() => {
                setIsSidebarOpen(true);
                // Limpar estado da conversa no mobile para evitar renderização fantasma
                if (window.innerWidth < 768) {
                  setMessageSearchQuery('');
                  setReplyingTo(null);
                  setShowMediaMenu(false);
                  setMessageMenuId(null);
                  // Blurrar input ativo para fechar teclado
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }
              }}
              onSetMessageSearchQuery={setMessageSearchQuery}
              onShowSecurityCode={() => setShowSecurityCode(true)}
              onShowMediaGallery={() => setShowMediaGallery(true)}
              onMutedChatsChange={(chatId, muted) => {
                if (muted) {
                  setMutedChats(prev => new Set(prev).add(chatId));
                } else {
                  setMutedChats(prev => { const s = new Set(prev); s.delete(chatId); return s; });
                }
              }}
            />
            <div
              ref={messagesScrollRef}
              className="flex-1 overflow-y-auto p-4 bg-white dark:bg-[#0e1621] relative smooth-scroll gpu-accelerated overscroll-y-contain"
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
                 <DragPreviewDisplay files={dragPreview.files} count={dragPreview.count} />
               )}
               
               <div className="flex flex-col gap-3 max-w-3xl mx-auto">
                {isLoadingMessages ? (
                  <MessageListSkeleton />
                ) : messages.length === 0 ? (
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
                            ref={(el) => {
                              messagesVirtualizer.measureElement(el!);
                              (loadMoreSentinelRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                            }}
                            data-index={virtualRow.index}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${virtualRow.start}px)`,
                            }}
                            className="flex justify-center py-2"
                          >
                            {isLoadingMore && (
                              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                Carregando...
                              </div>
                            )}
                          </div>
                        );
                      }
                      const msgIdx = messagesWithLoadMore ? virtualRow.index - 1 : virtualRow.index;
                      const msg = filteredMessages[msgIdx];
                      if (!msg) return null;
                      const prevMsg = msgIdx > 0 ? filteredMessages[msgIdx - 1] : null;
                      const showDateSep = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at);
                      return (
                    <div
                      key={msg.id}
                      ref={messagesVirtualizer.measureElement}
                      data-index={virtualRow.index}
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
                      {...(msg.sender_id !== currentUser?.id && !msg.read_at ? { 'data-msg-read-id': msg.id } : {})}
                    >
                    {showDateSep && (
                      <div className="flex items-center justify-center py-2 mb-1">
                        <span className="px-3 py-1 text-[11px] font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#182533] rounded-full">
                          {formatDateSeparator(msg.created_at)}
                        </span>
                      </div>
                    )}
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
                          ? (currentUserProfile?.avatar_url || DEFAULT_AVATAR_URL)
                          : (selectedChat.recipient?.avatar_url || DEFAULT_AVATAR_URL)
                        }
                        alt="Avatar" 
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
                        loading="lazy"
                      />
                      <div className={`flex-1 max-w-[85%] sm:max-w-[75%] ${msg.sender_id === currentUser?.id ? 'items-end' : 'items-start'} flex flex-col`}>
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
                          ) : msg.is_view_once && msg.sender_id !== currentUser?.id && !msg.viewed_at && viewOnceMessageId !== msg.id ? (
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
                          ) : msg.is_view_once && viewOnceMessageId === msg.id ? (
                            <div className="relative">
                              <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-orange-500 text-white text-[9px] rounded-full font-bold animate-pulse">
                                Desaparece em 10s
                              </div>
                              {msg.media_url ? (
                                msg.media_type === 'image' ? (
                                  <img src={msg.media_url} alt="Imagem" className="max-h-[200px] rounded-lg object-contain" />
                                ) : msg.media_type === 'video' ? (
                                  <video src={msg.media_url} controls className="max-h-[220px] rounded-lg" />
                                ) : msg.media_type === 'audio' ? (
                                  <audio src={msg.media_url} controls className="w-full" />
                                ) : null
                              ) : (
                                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-800 dark:text-white">
                                  {msg.content}
                                </div>
                              )}
                            </div>
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
                              {msg.is_encrypted ? (
                                decryptedMessages[msg.id] ? (
                                  <>
                                    <span>{decryptedMessages[msg.id]}</span>
                                    <span className="inline-flex items-center ml-1" aria-label="Criptografada ponta a ponta">
                                      <Shield className="w-3 h-3 text-green-500" />
                                    </span>
                                  </>
                                ) : decryptFailedRef.current.has(msg.id) ? (
                                  <span className="italic text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
                                    <button
                                      onClick={() => {
                                        decryptFailedRef.current.delete(msg.id);
                                        setDecryptedMessages(prev => {
                                          const next = { ...prev };
                                          delete next[msg.id];
                                          return next;
                                        });
                                      }}
                                      className="underline hover:text-gray-600 dark:hover:text-gray-300"
                                    >
                                      Mensagem protegida - toque para tentar novamente
                                    </button>
                                  </span>
                                ) : (
                                  <span className="italic text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                    <Shield className="w-3 h-3 animate-pulse" />
                                    Descriptografando...
                                  </span>
                                )
                              ) : (
                                msg.content
                              )}
                              {msg.edited_at && (
                                <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500 italic">
                                  (editado)
                                </span>
                              )}
                            </div>
                          )}
                          {(() => {
                            const text = msg.is_encrypted ? (decryptedMessages[msg.id] || '') : (msg.content || '');
                            const firstUrl = !msg.deleted_at && !msg.is_view_once ? extractFirstUrl(text) : null;
                            return firstUrl ? <InlineLinkPreview url={firstUrl} cacheRef={linkPreviewCacheRef} /> : null;
                          })()}
                          {msg.media_url && (
                          <div className="mt-2">
                            {msg.media_type === 'image' && (
                              <img 
                                src={msg.media_url} 
                                alt="Imagem enviada" 
                                className="max-w-full max-h-[160px] sm:max-h-[200px] object-contain rounded-lg cursor-pointer"
                                onClick={() => window.open(msg.media_url!, '_blank')}
                                onLoad={handleMediaLoad}
                                loading="lazy"
                              />
                            )}
                            {msg.media_type === 'video' && (
                              <video 
                                src={msg.media_url} 
                                controls 
                                className="max-w-full max-h-[180px] sm:max-h-[220px] rounded-lg"
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
                                        const displayContent = msg.is_encrypted ? (decryptedMessages[msg.id] || msg.content) : msg.content;
                                        const t = (displayContent || '').trim() || (msg.media_type ? `[${msg.media_type}]` : '');
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
                                      onClick={() => { setForwardingMessage(msg); setMessageMenuId(null); }}
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
                                      setEditContent(msg.is_encrypted ? (decryptedMessages[msg.id] || msg.content) : msg.content);
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
              <AnimatePresence>
                {showScrollToBottom && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => { scrollToBottom(false); setNewMessagesWhileScrolled(0); }}
                    className="absolute bottom-4 right-4 z-30 w-10 h-10 rounded-full bg-white dark:bg-[#242f3d] shadow-lg border border-gray-200 dark:border-[#17212b] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2b5278] transition-colors"
                    aria-label="Voltar ao final"
                  >
                    <ArrowDown className="w-5 h-5" />
                    {newMessagesWhileScrolled > 0 && (
                      <span className="absolute -top-2 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-blue-500 text-white text-[11px] font-bold">
                        {newMessagesWhileScrolled > 99 ? '99+' : newMessagesWhileScrolled}
                      </span>
                    )}
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            <MessageInput
              selectedChat={selectedChat}
              currentUserId={currentUser?.id}
              inputText={inputText}
              isSending={isSending}
              isRecording={isRecording}
              showMediaMenu={showMediaMenu}
              isViewOnceMode={isViewOnceMode}
              replyingTo={replyingTo}
              uploadProgress={uploadProgress}
              onInputChange={handleInputChange}
              onSend={handleSendMessage}
              onToggleMediaMenu={() => setShowMediaMenu(!showMediaMenu)}
              onToggleViewOnce={() => setIsViewOnceMode(!isViewOnceMode)}
              onCancelReply={() => setReplyingTo(null)}
              onStartRecording={startAudioRecording}
              onStopRecording={stopAudioRecording}
              onFileSelect={handleFileSelect}
              onFilePickerActive={setFilePickerActive}
              recipientNickname={selectedChat?.recipient?.nickname || ''}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-[#708499] p-8">
            <MessageSquare className="w-20 h-20 mb-4 opacity-30" />
            <p className="bg-black/20 px-4 py-2 rounded-full text-sm mb-2">Selecione uma conversa</p>
            <p className="text-xs opacity-70">ou adicione um novo contato para começar</p>
          </div>
        )}
      </main>

      <ChatModals
        currentUser={currentUser}
        selectedChat={selectedChat}
        chats={chats}
        messages={messages}
        decryptedMessages={decryptedMessages}
        isAddContactOpen={isAddContactOpen}
        nicknameSearch={nicknameSearch}
        isAddingContact={isAddingContact}
        onSetAddContactOpen={setIsAddContactOpen}
        onSetNicknameSearch={setNicknameSearch}
        onAddContact={handleAddContact}
        showEditNicknameModal={showEditNicknameModal}
        editingUserId={editingUserId}
        editingNickname={editingNickname}
        onCloseEditNickname={() => { setShowEditNicknameModal(false); setEditingUserId(null); setEditingNickname(''); }}
        onEditNicknameSuccess={async () => {
          if (currentUser) {
            await fetchChats(currentUser.id);
            const { data: profile } = await supabase.from('profiles').select('nickname, avatar_url').eq('id', currentUser.id).single();
            if (profile) setCurrentUserProfile(profile);
          }
        }}
        showSettingsModal={showSettingsModal}
        currentUserProfile={currentUserProfile}
        onCloseSettings={() => setShowSettingsModal(false)}
        onAvatarUpdate={(url) => setCurrentUserProfile(prev => prev ? { ...prev, avatar_url: url } : null)}
        showMediaGallery={showMediaGallery}
        onCloseMediaGallery={() => setShowMediaGallery(false)}
        showLogoutConfirm={showLogoutConfirm}
        onSetShowLogoutConfirm={setShowLogoutConfirm}
        onLogout={handleLogout}
        deleteChatConfirm={deleteChatConfirm}
        isDeletingChat={isDeletingChat}
        onSetDeleteChatConfirm={setDeleteChatConfirm}
        onDeleteChat={handleDeleteChat}
        editingMessage={editingMessage}
        editContent={editContent}
        isEditing={isEditing}
        onSetEditContent={setEditContent}
        onCloseEditMessage={() => { setEditingMessage(null); setEditContent(''); }}
        onEditMessage={handleEditMessage}
        deleteConfirmId={deleteConfirmId}
        onSetDeleteConfirmId={setDeleteConfirmId}
        onDeleteMessage={handleDeleteMessage}
        canDeleteForEveryone={canDeleteForEveryone}
        forwardingMessage={forwardingMessage}
        onSetForwardingMessage={setForwardingMessage}
        onForwardMessage={async (chatId) => {
          if (!forwardingMessage) return;
          try {
            const fwd = forwardingMessage;
            const displayContent = fwd.is_encrypted ? (decryptedMessages[fwd.id] || fwd.content) : fwd.content;
            const body: Record<string, unknown> = { chatId, content: `↪ Encaminhada\n${displayContent || ''}`.trim() };
            if (fwd.media_url) body.mediaUrl = fwd.media_url;
            if (fwd.media_type) body.mediaType = fwd.media_type;
            const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error('Falha ao encaminhar');
            const targetChat = chats.find(c => c.id === chatId);
            toast.success(`Encaminhada para ${targetChat?.recipient?.nickname || 'chat'}`);
            setForwardingMessage(null);
          } catch { toast.error('Erro ao encaminhar mensagem'); }
        }}
        showSecurityCode={showSecurityCode}
        currentUserPublicKey={currentUserPublicKey}
        onCloseSecurityCode={() => setShowSecurityCode(false)}
        screenshotAlertVisible={screenshotAlertVisible}
        screenshotAlertMessage={screenshotAlertMessage}
        screenshotAlertVariant={screenshotAlertVariant}
        screenshotProtectionActive={screenshotProtectionActive}
        onCloseScreenshotAlert={() => setScreenshotAlertVisible(false)}
        showAdvancedSearch={showAdvancedSearch}
        onCloseAdvancedSearch={() => setShowAdvancedSearch(false)}
        onSearchResultClick={(msg) => {
          const chat = chats.find(c => c.id === msg.chat_id);
          if (chat) {
            setSelectedChat(chat);
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
    </div>
  );
}
