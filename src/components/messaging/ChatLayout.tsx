'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, MoreVertical, Phone, Video, Send, Paperclip, Smile, Check, CheckCheck, Menu, User, Settings, LogOut, ArrowLeft, Image as ImageIcon, Mic, UserPlus, X as CloseIcon, MessageSquare, Camera, FileVideo, FileAudio, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Message, ChatWithRecipient, User as UserType } from '@/types/messaging';
import { validateAndSanitizeNickname, validateAndSanitizeMessage } from '@/lib/validation';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import EditNicknameModal from '@/components/shared/EditNicknameModal';

export default function ChatLayout() {
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
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState<string>('');
  const [currentUserProfile, setCurrentUserProfile] = useState<{ nickname: string; avatar_url?: string | null } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const fetchChats = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      const { data: participants, error } = await supabase
        .from('chat_participants')
        .select('chat_id, chats (*)')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      if (participants) {
        const formattedChats = await Promise.all(participants.map(async (p: { chat_id: string; chats: unknown }) => {
          const chat = (Array.isArray(p.chats) ? p.chats[0] : p.chats) as { id: string; type: 'private' | 'group'; name?: string | null };
          
          const { data: otherParticipant } = await supabase
            .from('chat_participants')
            .select('profiles!chat_participants_user_id_fkey (*)')
            .eq('chat_id', p.chat_id)
            .neq('user_id', userId)
            .maybeSingle();

          const profileData = otherParticipant as { profiles: unknown } | null;
          const profile = (profileData?.profiles && !Array.isArray(profileData.profiles) 
            ? profileData.profiles 
            : Array.isArray(profileData?.profiles) 
              ? profileData.profiles[0] 
              : null) as { id: string; nickname: string; avatar_url: string } | null;

          // Buscar última mensagem do chat
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('chat_id', p.chat_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

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
            time: lastMessage?.created_at || undefined
          } as ChatWithRecipient;
        }));
        
        // Ordenar por última mensagem (mais recente primeiro)
        formattedChats.sort((a, b) => {
          const timeA = a.time ? new Date(a.time).getTime() : 0;
          const timeB = b.time ? new Date(b.time).getTime() : 0;
          return timeB - timeA;
        });
        
        setChats(formattedChats);
      }
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      const appError = normalizeError(error);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
    }
  }, [supabase]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      if (user) {
        await fetchChats(user.id);
        // Buscar perfil do usuário atual
        const { data: profile } = await supabase
          .from('profiles')
          .select('nickname, avatar_url')
          .eq('id', user.id)
          .single();
        if (profile) {
          setCurrentUserProfile(profile);
        }
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

  const fetchMessages = useCallback(async (chatId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (data) setMessages(data);
  }, [supabase]);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.id);
      
      const channel = supabase
        .channel(`chat:${selectedChat.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${selectedChat.id}` 
        }, payload => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedChat, fetchMessages, supabase]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleMediaUpload = useCallback(async (file: File, type: 'image' | 'video' | 'audio') => {
    if (!selectedChat || !currentUser) return;

    try {
      setIsSending(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;
      const filePath = `chat-media/${selectedChat.id}/${fileName}`;

      // Upload para Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      // Enviar mensagem com mídia
      const { error: messageError } = await supabase.from('messages').insert({
        chat_id: selectedChat.id,
        sender_id: currentUser.id,
        content: type === 'image' ? '📷 Imagem' : type === 'video' ? '🎥 Vídeo' : '🎤 Áudio',
        media_url: publicUrl,
        media_type: type
      });

      if (messageError) throw messageError;

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

  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || !selectedChat || !currentUser || isSending) return;
    
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
    
    try {
      const { error } = await supabase.from('messages').insert({
        chat_id: selectedChat.id,
        sender_id: currentUser.id,
        content: messageContent
      });

      if (error) throw error;
      
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
        const errorMsg = isEmail 
          ? 'Usuário não encontrado com este email. Certifique-se de que a função get_user_by_email está criada no Supabase.'
          : 'Usuário não encontrado com este nickname';
        toast.error(errorMsg);
        setIsAddingContact(false);
        return;
      }

      if (targetUser.id === currentUser.id) {
        toast.error("Você não pode adicionar a si mesmo");
        return;
      }

      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ type: 'private' })
        .select()
        .single();

      if (chatError) throw chatError;

      if (newChat) {
        const { error: participantsError } = await supabase.from('chat_participants').insert([
          { chat_id: newChat.id, user_id: currentUser.id },
          { chat_id: newChat.id, user_id: targetUser.id }
        ]);
        
        if (participantsError) throw participantsError;
        
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

  return (
    <div 
      className="flex h-screen bg-gray-50 dark:bg-[#0e1621] text-gray-900 dark:text-white overflow-hidden font-sans"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <aside className={`${isSidebarOpen ? 'w-full md:w-[350px]' : 'w-0'} border-r border-gray-200 dark:border-[#17212b] flex flex-col transition-all duration-300 md:relative absolute inset-0 z-20 bg-white dark:bg-[#17212b]`}>
        <div className="p-4 flex items-center gap-4 border-b border-[#0e1621]">
          <Menu className="w-6 h-6 text-[#708499] cursor-pointer hover:text-white" />
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
          <button onClick={() => setIsAddContactOpen(true)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] text-blue-600 dark:text-[#4c94d5] transition-colors touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center" title="Adicionar contato"><UserPlus className="w-5 h-5" /></button>
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
                onClick={() => { 
                  setSelectedChat(chat); 
                  if (window.innerWidth < 768) setIsSidebarOpen(false); 
                }} 
                className={`p-3 flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-[#202b36] transition-colors touch-manipulation ${selectedChat?.id === chat.id ? 'bg-blue-50 dark:bg-[#2b5278]' : ''}`}
              >
                <img 
                  src={chat.recipient?.avatar_url || 'https://i.pravatar.cc/150'} 
                  alt={chat.recipient?.nickname || 'Avatar'} 
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  loading="lazy"
                  onLoad={(e) => {
                    e.currentTarget.classList.add('loaded');
                  }}
                />
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

      <main className="flex-1 flex flex-col relative bg-gray-50 dark:bg-[#0e1621] min-w-0">
        {selectedChat ? (
          <>
            <header className="p-3 border-b border-gray-200 dark:border-[#17212b] flex items-center justify-between bg-white dark:bg-[#17212b] z-10">
              <div className="flex items-center gap-3">
                <button className="md:hidden p-2 text-gray-500 dark:text-[#708499] hover:text-gray-700 dark:hover:text-white transition-colors" onClick={() => setIsSidebarOpen(true)}><ArrowLeft className="w-5 h-5" /></button>
                <img 
                  src={selectedChat.recipient?.avatar_url || 'https://i.pravatar.cc/150'} 
                  alt={selectedChat.recipient?.nickname || 'Avatar'} 
                  className="w-10 h-10 rounded-full object-cover"
                  loading="lazy"
                  onLoad={(e) => {
                    e.currentTarget.classList.add('loaded');
                  }}
                />
                <div>
                  <h2 className="font-bold text-sm leading-tight text-gray-900 dark:text-white">
                    Discussão • {selectedChat.recipient?.nickname || selectedChat.name || 'Tópico'}
                  </h2>
                  <p className="text-[11px] text-gray-500 dark:text-[#4c94d5]">Leitores ativos</p>
                </div>
              </div>
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
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-[#0e1621]">
               <div className="flex flex-col gap-3 max-w-3xl mx-auto">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12">
                    <MessageSquare className="w-16 h-16 text-gray-400 dark:text-[#708499] mb-4 opacity-50" />
                    <p className="text-gray-600 dark:text-[#708499] text-sm">Nenhum comentário ainda</p>
                    <p className="text-gray-500 dark:text-[#708499] text-xs mt-2">Seja o primeiro a comentar!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-3 ${msg.sender_id === currentUser?.id ? 'flex-row-reverse' : 'flex-row'}`}>
                      <img 
                        src={msg.sender_id === currentUser?.id 
                          ? (currentUserProfile?.avatar_url || 'https://i.pravatar.cc/150')
                          : (selectedChat.recipient?.avatar_url || 'https://i.pravatar.cc/150')
                        }
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        loading="lazy"
                        onLoad={(e) => {
                          e.currentTarget.classList.add('loaded');
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

                <div className="flex items-end gap-2">
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
                        setInputText(e.target.value);
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
                    />
                  </div>
                  <button 
                    onClick={handleSendMessage} 
                    disabled={!inputText.trim() || isSending}
                    className={`w-11 h-11 min-w-[44px] min-h-[44px] bg-blue-600 dark:bg-[#2b5278] rounded-full flex items-center justify-center text-white transition-opacity touch-manipulation ${
                      !inputText.trim() || isSending ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 dark:hover:bg-[#346290] active:scale-95'
                    }`}
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
    </div>
  );
}
