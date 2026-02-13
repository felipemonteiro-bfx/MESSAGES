'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, MoreVertical, Phone, Video, Send, Paperclip, Smile, Check, CheckCheck, Menu, User, Settings, LogOut, ArrowLeft, Image as ImageIcon, Mic, UserPlus, X as CloseIcon, MessageSquare, Camera, FileVideo, FileAudio, Edit2, Clock, Newspaper, Bell, BellOff, Home, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Message, ChatWithRecipient, User as UserType } from '@/types/messaging';
import { validateAndSanitizeNickname, validateAndSanitizeMessage } from '@/lib/validation';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { optimizeImage } from '@/lib/image-optimization';
import { cacheMedia, fetchMediaWithCache } from '@/lib/media-cache';
import { queueMessage, syncPendingMessages } from '@/lib/background-sync';
import EditNicknameModal from '@/components/shared/EditNicknameModal';
import SettingsModal from '@/components/shared/SettingsModal';
import { useStealthMessaging } from '@/components/shared/StealthMessagingProvider';
import { isIncognitoMode, clearIncognitoData } from '@/lib/settings';

export default function ChatLayout() {
  const { lockMessaging } = useStealthMessaging();
  const [chats, setChats] = useState<ChatWithRecipient[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatWithRecipient | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [nicknameSearch, setNicknameSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
  // Sugestão 15: Lazy loading de mensagens
  const [messagesPage, setMessagesPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const MESSAGES_PER_PAGE = 50;
  // Sugestão 23: Drag & drop de arquivos
  const [isDragging, setIsDragging] = useState(false);
  const [dragPreview, setDragPreview] = useState<{ files: File[]; count: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const fetchChats = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      // Sugestão 12: Buscar campo muted também
      const { data: participants, error } = await supabase
        .from('chat_participants')
        .select('chat_id, muted, chats (*)')
        .eq('user_id', userId);
      
      if (error) {
        logger.error('Error fetching chat participants', error);
        throw error;
      }
      
      if (participants && participants.length > 0) {
        const formattedChats = await Promise.all(participants.map(async (p: { chat_id: string; muted?: boolean; chats: unknown }) => {
          try {
            const chat = (Array.isArray(p.chats) ? p.chats[0] : p.chats) as { id: string; type: 'private' | 'group'; name?: string | null };
            
            if (!chat || !chat.id) {
              logger.warn('Invalid chat data', { chat_id: p.chat_id, chat });
              return null;
            }
            
            let profile: { id: string; nickname: string; avatar_url: string } | null = null;
            
            // Buscar outro participante apenas para chats privados
            if (chat.type === 'private') {
              try {
                const { data: otherParticipant, error: participantError } = await supabase
                  .from('chat_participants')
                  .select('user_id, profiles!chat_participants_user_id_fkey (*)')
                  .eq('chat_id', p.chat_id)
                  .neq('user_id', userId)
                  .maybeSingle();

              if (participantError) {
                logger.warn('Error fetching other participant', { error: participantError.message });
              } else if (otherParticipant) {
                  const profileData = otherParticipant as { user_id: string; profiles: unknown } | null;
                  const profileObj = (profileData?.profiles && !Array.isArray(profileData.profiles) 
                    ? profileData.profiles 
                    : Array.isArray(profileData?.profiles) 
                      ? profileData.profiles[0] 
                      : null) as { id: string; nickname: string; avatar_url: string } | null;
                  
                  if (profileObj) {
                    profile = profileObj;
                  }
                }
              } catch (err) {
                logger.warn('Error processing participant profile', { error: err instanceof Error ? err.message : String(err) });
                // Continuar mesmo se falhar ao buscar perfil
              }
            }

            // Buscar última mensagem do chat
            let lastMessage: { content: string; created_at: string } | null = null;
            try {
              const { data: lastMsg, error: msgError } = await supabase
                .from('messages')
                .select('content, created_at')
                .eq('chat_id', p.chat_id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
              
              if (msgError && msgError.code !== 'PGRST116') { // PGRST116 = no rows returned
                logger.warn('Error fetching last message', { error: msgError.message });
              } else if (lastMsg) {
                lastMessage = lastMsg;
              }
            } catch (err) {
              logger.warn('Error processing last message', { error: err instanceof Error ? err.message : String(err) });
              // Continuar mesmo se falhar ao buscar última mensagem
            }

            // Sugestão 12: Armazenar muted no estado
            if (p.muted) {
              setMutedChats(prev => new Set(prev).add(p.chat_id));
            }

            return {
              id: p.chat_id,
              type: chat.type,
              name: chat.name || undefined,
              recipient: profile ? {
                id: profile.id,
                nickname: profile.nickname,
                avatar_url: profile.avatar_url
              } : undefined,
              lastMessage: lastMessage?.content || undefined,
              time: lastMessage?.created_at || undefined,
              muted: p.muted || false
            } as ChatWithRecipient & { muted?: boolean };
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            logger.error('Error processing chat', error, { chat_id: p.chat_id });
            return null; // Retornar null para chats com erro
          }
        }));
        
        // Filtrar chats nulos e ordenar por última mensagem (mais recente primeiro)
        const validChats = formattedChats.filter((chat): chat is ChatWithRecipient & { muted?: boolean } => chat !== null);
        
        validChats.sort((a, b) => {
          const timeA = a.time ? new Date(a.time).getTime() : 0;
          const timeB = b.time ? new Date(b.time).getTime() : 0;
          return timeB - timeA;
        });
        
        setChats(validChats);
      } else {
        // Nenhuma conversa encontrada - não é erro, apenas estado vazio
        setChats([]);
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error in fetchChats', err, { userId });
      const appError = normalizeError(error);
      logError(appError, { userId });
      
      // Mensagem mais específica baseada no tipo de erro
      let errorMessage = getUserFriendlyMessage(appError);
      if (appError.type === 'UNKNOWN' && appError.message === 'Erro desconhecido') {
        errorMessage = 'Erro ao carregar conversas. Verifique sua conexão e tente novamente.';
      }
      
      toast.error(errorMessage);
    }
  }, [supabase]);

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
        
        // Sugestão 15: Sincronizar mensagens pendentes ao inicializar
        try {
          await syncPendingMessages(async (pendingMsg) => {
            const { error } = await supabase.from('messages').insert({
              chat_id: pendingMsg.chatId,
              sender_id: user.id,
              content: pendingMsg.content,
              media_url: pendingMsg.mediaUrl,
              media_type: pendingMsg.type !== 'text' ? pendingMsg.type : undefined,
            });
            return !error;
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
  useEffect(() => {
    if (currentUser && messages.length > 0) {
      fetchChats(currentUser.id);
    }
  }, [messages.length, currentUser, fetchChats]);

  // Sugestão 15: Lazy loading de mensagens
  const fetchMessages = useCallback(async (chatId: string, page: number = 1, append: boolean = false) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range((page - 1) * MESSAGES_PER_PAGE, page * MESSAGES_PER_PAGE - 1);
    
    if (error) {
      console.error('Erro ao buscar mensagens:', error);
      return;
    }
    
    if (data) {
      // Reverter ordem para mostrar mais antigas primeiro
      const sortedData = [...data].reverse();
      
      if (append) {
        setMessages(prev => [...sortedData, ...prev]);
      } else {
        setMessages(sortedData);
      }
      
      // Verificar se há mais mensagens
      setHasMoreMessages(data.length === MESSAGES_PER_PAGE);
    }
  }, [supabase]);

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
      // Sugestão 8: Indicador digitando e status online
      const channel = supabase
        .channel(`chat:${selectedChat.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${selectedChat.id}` 
        }, payload => {
          const newMessage = payload.new as Message;
          // Sugestão 12: Notificação apenas se conversa não estiver silenciada
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
          
          // Sugestão 4: Remover mensagens efêmeras expiradas
          if (newMessage.expires_at) {
            const expiresAt = new Date(newMessage.expires_at);
            const now = new Date();
            if (expiresAt <= now) {
              // Mensagem já expirada, não adicionar
              return;
            }
            // Agendar remoção quando expirar
            const timeout = expiresAt.getTime() - now.getTime();
            setTimeout(() => {
              setMessages(prev => prev.filter(m => m.id !== newMessage.id));
            }, timeout);
          }
        })
        // Sugestão 8: Escutar eventos de digitação
        .on('broadcast', { event: 'typing' }, (payload) => {
          if (payload.payload.userId !== currentUser.id) {
            setOtherUserTyping(payload.payload.userId);
            setTimeout(() => setOtherUserTyping(null), 3000);
          }
        })
        // Sugestão 7: Escutar status online melhorado
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
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          // Usuário ficou online
          newPresences.forEach((presence: any) => {
            if (presence.userId) {
              setOnlineUsers(prev => new Set(prev).add(presence.userId));
            }
          });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          // Usuário ficou offline
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
        .subscribe();

      // Sugestão 7: Enviar presença online periodicamente
      channel.track({
        userId: currentUser.id,
        online: true,
        lastSeen: new Date().toISOString()
      });
      
      // Atualizar presença a cada 30 segundos
      const presenceIntervalId = setInterval(() => {
        channel.track({
          userId: currentUser.id,
          online: true,
          lastSeen: new Date().toISOString()
        });
      }, 30000);

      return () => {
        if (presenceIntervalId) clearInterval(presenceIntervalId);
        channel.untrack();
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat, supabase, currentUser, mutedChats]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMediaUpload = useCallback(async (file: File, type: 'image' | 'video' | 'audio') => {
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
        // Continuar com arquivo original em caso de erro
      }
    }
    if (!selectedChat || !currentUser) return;

    // Sugestão 29: Monitorar performance de upload
    const startTime = performance.now();

    try {
      setIsSending(true);
      
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

      if (uploadError) throw uploadError;

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
          // Não bloquear upload se cache falhar
        }
      }

      // Enviar mensagem com mídia
      const { error: messageError } = await supabase.from('messages').insert({
        chat_id: selectedChat.id,
        sender_id: currentUser.id,
        content: type === 'image' ? '📷 Imagem' : type === 'video' ? '🎥 Vídeo' : '🎤 Áudio',
        media_url: publicUrl,
        media_type: type
      });

      if (messageError) throw messageError;

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
            isMessage: true // Flag para notificação de mensagem real
          }),
        }).catch((err) => {
          // Log silencioso - push é opcional
          console.warn('Push notification failed:', err);
        });
      }

      await fetchChats(currentUser.id);
      toast.success('Bom trabalho! Mídia enviada com sucesso.', { duration: 2000 });
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
    } finally {
      setIsSending(false);
      setShowMediaMenu(false);
    }
  }, [selectedChat, currentUser, supabase, fetchChats]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const file = e.target.files?.[0];
    if (file) {
      handleMediaUpload(file, type);
    }
    // Reset input
    if (e.target) e.target.value = '';
  }, [handleMediaUpload]);

  const startAudioRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        await handleMediaUpload(file, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
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
    const messageContent = validation.data!;
    setInputText(''); // Limpar input imediatamente para melhor UX
    
    // Sugestão 4: Calcular expires_at se for mensagem efêmera
    const expiresAt = showEphemeralOption && ephemeralSeconds > 0
      ? new Date(Date.now() + ephemeralSeconds * 1000).toISOString()
      : null;
    
    // Sugestão 15: Tentar enviar mensagem, se falhar adicionar à fila de sync
    let messageSent = false;
    try {
      const { error } = await supabase.from('messages').insert({
        chat_id: selectedChat.id,
        sender_id: currentUser.id,
        content: messageContent,
        expires_at: expiresAt,
        is_ephemeral: showEphemeralOption && ephemeralSeconds > 0
      });

      if (error) throw error;
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
      
      toast.success('Mensagem enviada!', { duration: 1500 });
      
      // Atualizar lista de chats
      await fetchChats(currentUser.id);
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
      setInputText(messageContent); // Restaurar mensagem em caso de erro
    } finally {
      setIsSending(false);
    }
  }, [inputText, selectedChat, currentUser, supabase, isSending, fetchChats]);

  const handleAddContact = useCallback(async () => {
    if (!nicknameSearch.trim() || !currentUser || isAddingContact) return;
    
    setIsAddingContact(true);
    
    const searchTerm = nicknameSearch.trim().toLowerCase();
    const isEmail = searchTerm.includes('@');
    
    try {
      let targetUser = null;
      let fetchError = null;

      if (isEmail) {
        // Buscar por email usando função RPC
        const { data: rpcResult, error: rpcError } = await supabase.rpc('get_user_by_email', {
          user_email: searchTerm
        });
        
        if (!rpcError && rpcResult && rpcResult.length > 0) {
          // A função retorna uma tabela, então pegamos o primeiro resultado
          targetUser = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
        } else if (rpcError) {
          // Se a função não existe, mostrar erro específico
          if (rpcError.message?.includes('function') || rpcError.code === '42883') {
            fetchError = { 
              message: 'Função get_user_by_email não encontrada. Execute o SQL em docs/buscar_por_email.sql no Supabase SQL Editor.' 
            };
          } else {
            fetchError = rpcError;
          }
        } else {
          // Nenhum resultado encontrado
          fetchError = { message: 'Usuário não encontrado com este email' };
        }
      } else {
        // Buscar por nickname (comportamento original)
        const validation = validateAndSanitizeNickname(searchTerm);
        if (!validation.success) {
          toast.error(validation.error || 'Nickname inválido');
          setIsAddingContact(false);
          return;
        }
        
        const { data: userByNickname, error: nicknameError } = await supabase
          .from('profiles')
          .select('*')
          .eq('nickname', validation.data!)
          .single();
        
        if (!nicknameError && userByNickname) {
          targetUser = userByNickname;
        } else {
          fetchError = nicknameError;
        }
      }

      if (fetchError || !targetUser) {
        let errorMsg = '';
        if (isEmail) {
          errorMsg = 'Usuário não encontrado com este email. Certifique-se de que a função get_user_by_email está criada no Supabase.';
        } else {
          // Verificar se é erro de validação ou não encontrado
          if (fetchError?.code === 'PGRST116') {
            errorMsg = 'Usuário não encontrado com este nickname. Verifique se o nickname está correto.';
          } else if (fetchError?.message?.includes('Nickname inválido')) {
            errorMsg = fetchError.message;
          } else {
            errorMsg = 'Usuário não encontrado com este nickname. Verifique se está digitado corretamente.';
          }
        }
        toast.error(errorMsg);
        logger.warn('User not found', { searchTerm, isEmail, error: fetchError });
        setIsAddingContact(false);
        return;
      }

      if (targetUser.id === currentUser.id) {
        toast.error("Você não pode adicionar a si mesmo");
        setIsAddingContact(false);
        return;
      }

      // Verificar se já existe um chat entre esses dois usuários
      const { data: existingChats } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', currentUser.id);
      
      if (existingChats && existingChats.length > 0) {
        const chatIds = existingChats.map(cp => cp.chat_id);
        const { data: existingChatWithUser } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', targetUser.id)
          .in('chat_id', chatIds)
          .single();
        
        if (existingChatWithUser) {
          // Chat já existe, apenas selecionar
          const { data: existingChat } = await supabase
            .from('chats')
            .select('*')
            .eq('id', existingChatWithUser.chat_id)
            .single();
          
          if (existingChat) {
            toast.info('Chat já existe com este usuário');
            await fetchChats(currentUser.id);
            setSelectedChat({
              ...existingChat,
              recipient: {
                id: targetUser.id,
                nickname: targetUser.nickname,
                avatar_url: targetUser.avatar_url || ''
              }
            } as ChatWithRecipient);
            setIsAddContactOpen(false);
            setNicknameSearch('');
            setIsAddingContact(false);
            return;
          }
        }
      }

      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'private' })
        .select()
        .single();

      if (chatError) {
        logger.error('Error creating chat', chatError);
        throw chatError;
      }

      if (newChat) {
        const { error: participantsError } = await supabase.from('chat_participants').insert([
          { chat_id: newChat.id, user_id: currentUser.id },
          { chat_id: newChat.id, user_id: targetUser.id }
        ]);
        
        if (participantsError) {
          logger.error('Error adding participants', participantsError);
          // Tentar deletar o chat criado se falhar ao adicionar participantes
          await supabase.from('chats').delete().eq('id', newChat.id);
          throw participantsError;
        }
        
        logger.info('Chat created successfully', { 
          chatId: newChat.id, 
          userId: currentUser.id, 
          targetUserId: targetUser.id 
        });
        
        toast.success('Bom trabalho! Chat criado com sucesso.', { duration: 2000 });
        await fetchChats(currentUser.id);
        setSelectedChat({
          ...newChat,
          recipient: {
            id: targetUser.id,
            nickname: targetUser.nickname,
            avatar_url: targetUser.avatar_url || ''
          }
        } as ChatWithRecipient);
        setIsAddContactOpen(false);
        setNicknameSearch('');
      }
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
    } finally {
      setIsAddingContact(false);
    }
  }, [nicknameSearch, currentUser, supabase, fetchChats, isAddingContact]);

  // Filtrar chats baseado na busca
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => 
      chat.recipient?.nickname.toLowerCase().includes(query) ||
      chat.name?.toLowerCase().includes(query) ||
      chat.lastMessage?.toLowerCase().includes(query)
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

  // Handler para logout
  const handleLogout = async () => {
    try {
      setIsMenuOpen(false);
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
        <div className="p-4 flex items-center gap-4 border-b border-[#0e1621] relative">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242f3d] text-[#708499] hover:text-white transition-colors touch-manipulation"
              aria-label="Menu"
              aria-expanded={isMenuOpen}
            >
              <Menu className="w-6 h-6" />
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
                    <span>Voltar para Notícias</span>
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
                  
                  <div className="border-t border-gray-200 dark:border-[#17212b]" />
                  
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex-1 bg-gray-100 dark:bg-[#242f3d] rounded-xl flex items-center px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 dark:text-[#708499] mr-2" />
            <input 
              type="text" 
              placeholder="Buscar conversas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#708499]" 
            />
          </div>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-gray-600 dark:text-[#708499] transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" title="Configurações"><Settings className="w-5 h-5" /></button>
          <button onClick={() => setIsAddContactOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-blue-600 dark:text-[#4c94d5] transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" title="Adicionar contato" data-testid="add-contact-button" aria-label="Adicionar contato"><UserPlus className="w-5 h-5" /></button>
          {currentUser && (
            <button 
              onClick={async () => {
                try {
                  // Sempre buscar o perfil mais recente antes de editar
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
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-blue-600 dark:text-[#4c94d5] transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" 
              title="Editar meu nickname"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-600 dark:text-[#708499] text-sm">Carregando conversas...</div>
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
            filteredChats.map((chat) => (
              <div 
                key={chat.id}
                data-chat="true"
                data-chat-id={chat.id}
                onClick={() => { 
                  setSelectedChat(chat); 
                  if (window.innerWidth < 768) setIsSidebarOpen(false); 
                }} 
                className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#202b36] transition-colors touch-manipulation ${selectedChat?.id === chat.id ? 'bg-blue-50 dark:bg-[#2b5278]' : ''}`}
              >
                <div className="relative">
                  <img 
                    src={chat.recipient?.avatar_url || 'https://i.pravatar.cc/150'} 
                    alt={chat.recipient?.nickname || 'Avatar'} 
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
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
                  {/* Sugestão 7: Indicador de status online na lista */}
                  {chat.recipient && onlineUsers.has(chat.recipient.id) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-[#17212b] rounded-full"></span>
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
            ))
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
            <header className="p-3 border-b border-gray-200 dark:border-[#17212b] flex items-center justify-between bg-white dark:bg-[#17212b] z-10">
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
                  <p className="text-[11px] text-gray-500 dark:text-[#4c94d5] flex items-center gap-1">
                    {/* Sugestão 7: Status Online/Offline melhorado */}
                    {selectedChat.recipient && (
                      onlineUsers.has(selectedChat.recipient.id) ? (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          <span className="text-green-500 font-medium">Online</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          <span>Offline</span>
                        </div>
                      )
                    )}
                    {otherUserTyping === selectedChat.recipient?.id && (
                      <span className="ml-2 text-blue-600 dark:text-blue-400 animate-pulse">digitando...</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Sugestão 12: Botão para silenciar/ativar notificações */}
                {selectedChat.recipient && (
                  <button
                    onClick={async () => {
                      if (!currentUser || !selectedChat) return;
                      const newMutedState = !mutedChats.has(selectedChat.id);
                      try {
                        const { error } = await supabase
                          .from('chat_participants')
                          .update({ muted: newMutedState })
                          .eq('chat_id', selectedChat.id)
                          .eq('user_id', currentUser.id);
                        
                        if (error) throw error;
                        
                        if (newMutedState) {
                          setMutedChats(prev => new Set(prev).add(selectedChat.id));
                          toast.success('Notificações silenciadas', { duration: 2000 });
                        } else {
                          setMutedChats(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(selectedChat.id);
                            return newSet;
                          });
                          toast.success('Notificações ativadas', { duration: 2000 });
                        }
                      } catch (error) {
                        toast.error('Erro ao alterar notificações');
                      }
                    }}
                    className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
                    title={mutedChats.has(selectedChat.id) ? 'Ativar notificações' : 'Silenciar notificações'}
                  >
                    {mutedChats.has(selectedChat.id) ? (
                      <BellOff className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </button>
                )}
                {/* Sugestão 18: Botão discreto "Esconder agora" - volta ao portal imediatamente */}
                <button
                  onClick={() => {
                    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
                    // Sugestão 3: Limpar mensagens se modo incógnito estiver ativo
                    if (isIncognitoMode()) {
                      setMessages([]);
                      clearIncognitoData();
                    }
                    lockMessaging();
                  }}
                  className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
                  title="Ver notícias"
                  aria-label="Esconder agora"
                >
                  <Newspaper className="w-5 h-5" />
                </button>
                {selectedChat.recipient && (
                  <button
                    onClick={() => {
                      setEditingUserId(selectedChat.recipient!.id);
                      setEditingNickname(selectedChat.recipient!.nickname);
                      setShowEditNicknameModal(true);
                    }}
                    className="p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors"
                    title="Editar nickname"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </header>
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-[#0e1621] relative" 
              data-stealth-content="true"
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
                {/* Sugestão 15: Botão para carregar mais mensagens antigas */}
                {hasMoreMessages && messages.length > 0 && (
                  <div className="flex justify-center py-2">
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
                )}
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <MessageSquare className="w-16 h-16 text-gray-400 dark:text-[#708499] mb-4 opacity-50" />
                    <p className="text-gray-600 dark:text-[#708499] text-sm">Nenhum comentário ainda</p>
                    <p className="text-gray-500 dark:text-[#708499] text-xs mt-2">Seja o primeiro a comentar!</p>
                  </div>
                ) : (
                  messages
                    .filter(msg => {
                      // Sugestão 4: Filtrar mensagens efêmeras expiradas
                      if (msg.expires_at) {
                        const expiresAt = new Date(msg.expires_at);
                        return expiresAt > new Date();
                      }
                      return true;
                    })
                    .map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`flex gap-3 ${msg.sender_id === currentUser?.id ? 'flex-row-reverse' : 'flex-row'}`}
                      data-stealth-content="true"
                      data-message="true"
                      data-message-id={msg.id}
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
                          </div>
                          {msg.content && (
                            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-800 dark:text-white">
                              {msg.content}
                            </div>
                          )}
                          {msg.media_url && (
                          <div className="mt-2">
                            {msg.media_type === 'image' && (
                              <img 
                                src={msg.media_url} 
                                alt="Imagem enviada" 
                                className="max-w-full rounded-lg cursor-pointer"
                                onClick={() => window.open(msg.media_url!, '_blank')}
                              />
                            )}
                            {msg.media_type === 'video' && (
                              <video 
                                src={msg.media_url} 
                                controls 
                                className="max-w-full rounded-lg"
                              />
                            )}
                            {msg.media_type === 'audio' && (
                              <audio 
                                src={msg.media_url} 
                                controls 
                                className="w-full"
                              />
                            )}
                          </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <button className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                            Responder
                          </button>
                          <button className="text-[10px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                            Curtir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
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

                {/* Inputs ocultos para mídia */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
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

                <div className="flex items-end gap-2 safe-area-bottom">
                  <button
                    onClick={() => setShowMediaMenu(!showMediaMenu)}
                    className="w-11 h-11 bg-[#242f3d] rounded-full flex items-center justify-center text-[#4c94d5] hover:bg-[#2b5278] transition-colors"
                  >
                    <Paperclip className="w-5 h-5" />
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
                      placeholder="Adicione um comentário..." 
                      className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] resize-none py-1 placeholder-gray-400 dark:placeholder-[#708499] text-gray-900 dark:text-white"
                      disabled={isSending}
                      data-testid="message-input"
                      data-stealth-content="true"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      // Sugestão iPhone: Haptic Feedback
                      if (navigator.vibrate) {
                        navigator.vibrate(10); // Vibração suave de 10ms
                      }
                      handleSendMessage();
                    }}
                    disabled={!inputText.trim() || isSending}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] bg-blue-600 dark:bg-[#2b5278] rounded-full flex items-center justify-center text-white transition-opacity touch-manipulation ${
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
                      className="bg-transparent border-none focus:ring-0 text-sm w-full text-white placeholder-[#708499]"
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
        />
      )}
    </div>
  );
}
