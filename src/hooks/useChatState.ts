'use client';

import { useReducer, useRef, useMemo } from 'react';
import type { Message, ChatWithRecipient, User as UserType } from '@/types/messaging';
import { createClient } from '@/lib/supabase/client';

interface ChatState {
  chats: ChatWithRecipient[];
  selectedChat: ChatWithRecipient | null;
  messages: Message[];
  inputText: string;
  isSidebarOpen: boolean;
  isAddContactOpen: boolean;
  nicknameSearch: string;
  searchQuery: string;
  messageSearchQuery: string;
  replyingTo: Message | null;
  currentUser: UserType | null;
  isLoading: boolean;
  isSending: boolean;
  isAddingContact: boolean;
  showMediaMenu: boolean;
  isRecording: boolean;
  mediaRecorder: MediaRecorder | null;
  showEditNicknameModal: boolean;
  showSettingsModal: boolean;
  editingUserId: string | null;
  editingNickname: string;
  currentUserProfile: { nickname: string; avatar_url?: string | null } | null;
  mutedChats: Set<string>;
  isTyping: boolean;
  otherUserTyping: string | null;
  onlineUsers: Set<string>;
  showEphemeralOption: boolean;
  ephemeralSeconds: number;
  messagesPage: number;
  hasMoreMessages: boolean;
  isDragging: boolean;
  dragPreview: { files: File[]; count: number } | null;
  isMenuOpen: boolean;
  showMediaGallery: boolean;
  messageMenuId: string | null;
  muteMenuOpen: boolean;
  editingMessage: Message | null;
  editContent: string;
  isEditing: boolean;
  deleteConfirmId: string | null;
  showReactionPicker: string | null;
  messageReactions: Record<string, Record<string, { count: number; userReacted: boolean }>>;
  isViewOnceMode: boolean;
  viewOnceMessageId: string | null;
  showSecurityCode: boolean;
  screenshotAlertVisible: boolean;
  screenshotAlertMessage: string | undefined;
  screenshotAlertVariant: 'detected' | 'received';
  screenshotProtectionActive: boolean;
  showAdvancedSearch: boolean;
  uploadProgress: { type: string; progress: number } | null;
  showLogoutConfirm: boolean;
  forwardingMessage: Message | null;
  decryptedMessages: Record<string, string>;
  currentUserPublicKey: string | null;
}

type ChatAction =
  | { type: 'SET_CHATS'; payload: ChatWithRecipient[] }
  | { type: 'SET_SELECTED_CHAT'; payload: ChatWithRecipient | null }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'APPEND_MESSAGE'; payload: Message }
  | { type: 'PREPEND_MESSAGES'; payload: Message[] }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; updates: Partial<Message> } }
  | { type: 'REMOVE_MESSAGE'; payload: string }
  | { type: 'SET_INPUT_TEXT'; payload: string }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SET_ADD_CONTACT_OPEN'; payload: boolean }
  | { type: 'SET_NICKNAME_SEARCH'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_MESSAGE_SEARCH_QUERY'; payload: string }
  | { type: 'SET_REPLYING_TO'; payload: Message | null }
  | { type: 'SET_CURRENT_USER'; payload: UserType | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SENDING'; payload: boolean }
  | { type: 'SET_ADDING_CONTACT'; payload: boolean }
  | { type: 'SET_SHOW_MEDIA_MENU'; payload: boolean }
  | { type: 'SET_RECORDING'; payload: boolean }
  | { type: 'SET_MEDIA_RECORDER'; payload: MediaRecorder | null }
  | { type: 'SET_SHOW_EDIT_NICKNAME_MODAL'; payload: boolean }
  | { type: 'SET_SHOW_SETTINGS_MODAL'; payload: boolean }
  | { type: 'SET_EDITING_USER_ID'; payload: string | null }
  | { type: 'SET_EDITING_NICKNAME'; payload: string }
  | { type: 'SET_CURRENT_USER_PROFILE'; payload: { nickname: string; avatar_url?: string | null } | null }
  | { type: 'SET_MUTED_CHATS'; payload: Set<string> }
  | { type: 'ADD_MUTED_CHAT'; payload: string }
  | { type: 'REMOVE_MUTED_CHAT'; payload: string }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_OTHER_USER_TYPING'; payload: string | null }
  | { type: 'SET_ONLINE_USERS'; payload: Set<string> }
  | { type: 'ADD_ONLINE_USER'; payload: string }
  | { type: 'REMOVE_ONLINE_USER'; payload: string }
  | { type: 'SET_SHOW_EPHEMERAL_OPTION'; payload: boolean }
  | { type: 'SET_EPHEMERAL_SECONDS'; payload: number }
  | { type: 'SET_MESSAGES_PAGE'; payload: number }
  | { type: 'SET_HAS_MORE_MESSAGES'; payload: boolean }
  | { type: 'SET_DRAGGING'; payload: boolean }
  | { type: 'SET_DRAG_PREVIEW'; payload: { files: File[]; count: number } | null }
  | { type: 'SET_MENU_OPEN'; payload: boolean }
  | { type: 'SET_SHOW_MEDIA_GALLERY'; payload: boolean }
  | { type: 'SET_MESSAGE_MENU_ID'; payload: string | null }
  | { type: 'SET_MUTE_MENU_OPEN'; payload: boolean }
  | { type: 'SET_EDITING_MESSAGE'; payload: Message | null }
  | { type: 'SET_EDIT_CONTENT'; payload: string }
  | { type: 'SET_IS_EDITING'; payload: boolean }
  | { type: 'SET_DELETE_CONFIRM_ID'; payload: string | null }
  | { type: 'SET_SHOW_REACTION_PICKER'; payload: string | null }
  | { type: 'SET_MESSAGE_REACTIONS'; payload: Record<string, Record<string, { count: number; userReacted: boolean }>> }
  | { type: 'SET_VIEW_ONCE_MODE'; payload: boolean }
  | { type: 'SET_VIEW_ONCE_MESSAGE_ID'; payload: string | null }
  | { type: 'SET_SHOW_SECURITY_CODE'; payload: boolean }
  | { type: 'SET_SCREENSHOT_ALERT_VISIBLE'; payload: boolean }
  | { type: 'SET_SCREENSHOT_ALERT_MESSAGE'; payload: string | undefined }
  | { type: 'SET_SCREENSHOT_ALERT_VARIANT'; payload: 'detected' | 'received' }
  | { type: 'SET_SCREENSHOT_PROTECTION_ACTIVE'; payload: boolean }
  | { type: 'SET_SHOW_ADVANCED_SEARCH'; payload: boolean }
  | { type: 'SET_UPLOAD_PROGRESS'; payload: { type: string; progress: number } | null }
  | { type: 'SET_SHOW_LOGOUT_CONFIRM'; payload: boolean }
  | { type: 'SET_FORWARDING_MESSAGE'; payload: Message | null }
  | { type: 'SET_DECRYPTED_MESSAGES'; payload: Record<string, string> }
  | { type: 'MERGE_DECRYPTED_MESSAGES'; payload: Record<string, string> }
  | { type: 'SET_CURRENT_USER_PUBLIC_KEY'; payload: string | null };

const MESSAGES_PER_PAGE = 50;

const initialState: ChatState = {
  chats: [],
  selectedChat: null,
  messages: [],
  inputText: '',
  isSidebarOpen: true,
  isAddContactOpen: false,
  nicknameSearch: '',
  searchQuery: '',
  messageSearchQuery: '',
  replyingTo: null,
  currentUser: null,
  isLoading: true,
  isSending: false,
  isAddingContact: false,
  showMediaMenu: false,
  isRecording: false,
  mediaRecorder: null,
  showEditNicknameModal: false,
  showSettingsModal: false,
  editingUserId: null,
  editingNickname: '',
  currentUserProfile: null,
  mutedChats: new Set(),
  isTyping: false,
  otherUserTyping: null,
  onlineUsers: new Set(),
  showEphemeralOption: false,
  ephemeralSeconds: 30,
  messagesPage: 1,
  hasMoreMessages: true,
  isDragging: false,
  dragPreview: null,
  isMenuOpen: false,
  showMediaGallery: false,
  messageMenuId: null,
  muteMenuOpen: false,
  editingMessage: null,
  editContent: '',
  isEditing: false,
  deleteConfirmId: null,
  showReactionPicker: null,
  messageReactions: {},
  isViewOnceMode: false,
  viewOnceMessageId: null,
  showSecurityCode: false,
  screenshotAlertVisible: false,
  screenshotAlertMessage: undefined,
  screenshotAlertVariant: 'detected',
  screenshotProtectionActive: false,
  showAdvancedSearch: false,
  uploadProgress: null,
  showLogoutConfirm: false,
  forwardingMessage: null,
  decryptedMessages: {},
  currentUserPublicKey: null,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CHATS': return { ...state, chats: action.payload };
    case 'SET_SELECTED_CHAT': return { ...state, selectedChat: action.payload };
    case 'SET_MESSAGES': return { ...state, messages: action.payload };
    case 'APPEND_MESSAGE': return { ...state, messages: [...state.messages, action.payload] };
    case 'PREPEND_MESSAGES': return { ...state, messages: [...action.payload, ...state.messages] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      };
    case 'REMOVE_MESSAGE':
      return { ...state, messages: state.messages.filter(m => m.id !== action.payload) };
    case 'SET_INPUT_TEXT': return { ...state, inputText: action.payload };
    case 'SET_SIDEBAR_OPEN': return { ...state, isSidebarOpen: action.payload };
    case 'SET_ADD_CONTACT_OPEN': return { ...state, isAddContactOpen: action.payload };
    case 'SET_NICKNAME_SEARCH': return { ...state, nicknameSearch: action.payload };
    case 'SET_SEARCH_QUERY': return { ...state, searchQuery: action.payload };
    case 'SET_MESSAGE_SEARCH_QUERY': return { ...state, messageSearchQuery: action.payload };
    case 'SET_REPLYING_TO': return { ...state, replyingTo: action.payload };
    case 'SET_CURRENT_USER': return { ...state, currentUser: action.payload };
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_SENDING': return { ...state, isSending: action.payload };
    case 'SET_ADDING_CONTACT': return { ...state, isAddingContact: action.payload };
    case 'SET_SHOW_MEDIA_MENU': return { ...state, showMediaMenu: action.payload };
    case 'SET_RECORDING': return { ...state, isRecording: action.payload };
    case 'SET_MEDIA_RECORDER': return { ...state, mediaRecorder: action.payload };
    case 'SET_SHOW_EDIT_NICKNAME_MODAL': return { ...state, showEditNicknameModal: action.payload };
    case 'SET_SHOW_SETTINGS_MODAL': return { ...state, showSettingsModal: action.payload };
    case 'SET_EDITING_USER_ID': return { ...state, editingUserId: action.payload };
    case 'SET_EDITING_NICKNAME': return { ...state, editingNickname: action.payload };
    case 'SET_CURRENT_USER_PROFILE': return { ...state, currentUserProfile: action.payload };
    case 'SET_MUTED_CHATS': return { ...state, mutedChats: action.payload };
    case 'ADD_MUTED_CHAT': return { ...state, mutedChats: new Set(state.mutedChats).add(action.payload) };
    case 'REMOVE_MUTED_CHAT': {
      const next = new Set(state.mutedChats);
      next.delete(action.payload);
      return { ...state, mutedChats: next };
    }
    case 'SET_TYPING': return { ...state, isTyping: action.payload };
    case 'SET_OTHER_USER_TYPING': return { ...state, otherUserTyping: action.payload };
    case 'SET_ONLINE_USERS': return { ...state, onlineUsers: action.payload };
    case 'ADD_ONLINE_USER': return { ...state, onlineUsers: new Set(state.onlineUsers).add(action.payload) };
    case 'REMOVE_ONLINE_USER': {
      const next = new Set(state.onlineUsers);
      next.delete(action.payload);
      return { ...state, onlineUsers: next };
    }
    case 'SET_SHOW_EPHEMERAL_OPTION': return { ...state, showEphemeralOption: action.payload };
    case 'SET_EPHEMERAL_SECONDS': return { ...state, ephemeralSeconds: action.payload };
    case 'SET_MESSAGES_PAGE': return { ...state, messagesPage: action.payload };
    case 'SET_HAS_MORE_MESSAGES': return { ...state, hasMoreMessages: action.payload };
    case 'SET_DRAGGING': return { ...state, isDragging: action.payload };
    case 'SET_DRAG_PREVIEW': return { ...state, dragPreview: action.payload };
    case 'SET_MENU_OPEN': return { ...state, isMenuOpen: action.payload };
    case 'SET_SHOW_MEDIA_GALLERY': return { ...state, showMediaGallery: action.payload };
    case 'SET_MESSAGE_MENU_ID': return { ...state, messageMenuId: action.payload };
    case 'SET_MUTE_MENU_OPEN': return { ...state, muteMenuOpen: action.payload };
    case 'SET_EDITING_MESSAGE': return { ...state, editingMessage: action.payload };
    case 'SET_EDIT_CONTENT': return { ...state, editContent: action.payload };
    case 'SET_IS_EDITING': return { ...state, isEditing: action.payload };
    case 'SET_DELETE_CONFIRM_ID': return { ...state, deleteConfirmId: action.payload };
    case 'SET_SHOW_REACTION_PICKER': return { ...state, showReactionPicker: action.payload };
    case 'SET_MESSAGE_REACTIONS': return { ...state, messageReactions: action.payload };
    case 'SET_VIEW_ONCE_MODE': return { ...state, isViewOnceMode: action.payload };
    case 'SET_VIEW_ONCE_MESSAGE_ID': return { ...state, viewOnceMessageId: action.payload };
    case 'SET_SHOW_SECURITY_CODE': return { ...state, showSecurityCode: action.payload };
    case 'SET_SCREENSHOT_ALERT_VISIBLE': return { ...state, screenshotAlertVisible: action.payload };
    case 'SET_SCREENSHOT_ALERT_MESSAGE': return { ...state, screenshotAlertMessage: action.payload };
    case 'SET_SCREENSHOT_ALERT_VARIANT': return { ...state, screenshotAlertVariant: action.payload };
    case 'SET_SCREENSHOT_PROTECTION_ACTIVE': return { ...state, screenshotProtectionActive: action.payload };
    case 'SET_SHOW_ADVANCED_SEARCH': return { ...state, showAdvancedSearch: action.payload };
    case 'SET_UPLOAD_PROGRESS': return { ...state, uploadProgress: action.payload };
    case 'SET_SHOW_LOGOUT_CONFIRM': return { ...state, showLogoutConfirm: action.payload };
    case 'SET_FORWARDING_MESSAGE': return { ...state, forwardingMessage: action.payload };
    case 'SET_DECRYPTED_MESSAGES': return { ...state, decryptedMessages: action.payload };
    case 'MERGE_DECRYPTED_MESSAGES': return { ...state, decryptedMessages: { ...state.decryptedMessages, ...action.payload } };
    case 'SET_CURRENT_USER_PUBLIC_KEY': return { ...state, currentUserPublicKey: action.payload };
    default: return state;
  }
}

export { MESSAGES_PER_PAGE };
export type { ChatState, ChatAction };

export function useChatState() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const supabase = useMemo(() => createClient(), []);

  const mutedChatsRef = useRef<Set<string>>(new Set());

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
  const prevMessagesLengthRef = useRef(0);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const readObserverRef = useRef<IntersectionObserver | null>(null);
  const pendingReadIdsRef = useRef<Set<string>>(new Set());
  const readDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const linkPreviewCacheRef = useRef<Record<string, { title?: string; description?: string; image?: string; domain?: string } | null>>({});
  const decryptFailedRef = useRef<Set<string>>(new Set());
  const lastMessageCountRef = useRef(0);

  return {
    state,
    dispatch,
    supabase,
    refs: {
      mutedChatsRef,
      longPressRef,
      typingTimeoutRef,
      messagesEndRef,
      fileInputRef,
      videoInputRef,
      audioInputRef,
      menuRef,
      chatListScrollRef,
      messagesScrollRef,
      activeChannelRef,
      prevMessagesLengthRef,
      fetchAbortRef,
      readObserverRef,
      pendingReadIdsRef,
      readDebounceRef,
      linkPreviewCacheRef,
      decryptFailedRef,
      lastMessageCountRef,
    },
  };
}
