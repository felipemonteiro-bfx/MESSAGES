'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Calendar, 
  User, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  FileText,
  Filter,
  ChevronDown,
  Clock,
  SlidersHorizontal
} from 'lucide-react';
import type { Message, ChatWithRecipient } from '@/types/messaging';

interface SearchFilters {
  query: string;
  startDate: string | null;
  endDate: string | null;
  senderId: string | null;
  mediaType: 'all' | 'text' | 'image' | 'video' | 'audio';
}

interface AdvancedSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  chats: ChatWithRecipient[];
  currentUserId: string;
  onResultClick: (message: Message) => void;
}

export default function AdvancedSearchModal({
  isOpen,
  onClose,
  messages,
  chats,
  currentUserId,
  onResultClick,
}: AdvancedSearchModalProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    startDate: null,
    endDate: null,
    senderId: null,
    mediaType: 'all',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Coletar todos os participantes únicos das conversas
  const participants = Array.from(
    new Map(
      chats
        .filter(chat => chat.recipient)
        .map(chat => [chat.recipient!.id, chat.recipient!])
    ).values()
  );

  const performSearch = useCallback(() => {
    setIsSearching(true);
    
    setTimeout(() => {
      let results = [...messages];

      // Filtrar por query de texto
      if (filters.query.trim()) {
        const queryLower = filters.query.toLowerCase();
        results = results.filter(msg => 
          msg.content?.toLowerCase().includes(queryLower)
        );
      }

      // Filtrar por data de início
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        startDate.setHours(0, 0, 0, 0);
        results = results.filter(msg => 
          new Date(msg.created_at) >= startDate
        );
      }

      // Filtrar por data de fim
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);
        results = results.filter(msg => 
          new Date(msg.created_at) <= endDate
        );
      }

      // Filtrar por remetente
      if (filters.senderId) {
        results = results.filter(msg => msg.sender_id === filters.senderId);
      }

      // Filtrar por tipo de mídia
      if (filters.mediaType !== 'all') {
        if (filters.mediaType === 'text') {
          results = results.filter(msg => 
            !msg.media_type && msg.content
          );
        } else {
          results = results.filter(msg => 
            msg.media_type === filters.mediaType
          );
        }
      }

      // Ordenar por data (mais recentes primeiro)
      results.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setSearchResults(results.slice(0, 100)); // Limitar a 100 resultados
      setIsSearching(false);
    }, 100);
  }, [filters, messages]);

  // Buscar quando filtros mudam
  useEffect(() => {
    if (filters.query || filters.startDate || filters.endDate || filters.senderId || filters.mediaType !== 'all') {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [filters, performSearch]);

  const clearFilters = () => {
    setFilters({
      query: '',
      startDate: null,
      endDate: null,
      senderId: null,
      mediaType: 'all',
    });
    setSearchResults([]);
  };

  const getParticipantName = (senderId: string) => {
    if (senderId === currentUserId) return 'Você';
    const participant = participants.find(p => p.id === senderId);
    return participant?.nickname || 'Desconhecido';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMessagePreview = (msg: Message) => {
    if (msg.media_type === 'image') return '📷 Imagem';
    if (msg.media_type === 'video') return '🎥 Vídeo';
    if (msg.media_type === 'audio') return '🎤 Áudio';
    if (msg.content) {
      return msg.content.length > 60 
        ? msg.content.slice(0, 60) + '…' 
        : msg.content;
    }
    return 'Mensagem';
  };

  const hasActiveFilters = filters.startDate || filters.endDate || filters.senderId || filters.mediaType !== 'all';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-white dark:bg-[#17212b] rounded-t-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#17212b] border-b border-gray-200 dark:border-[#242f3d] p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-500" />
                  Busca Avançada
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#242f3d] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={filters.query}
                  onChange={(e) => setFilters(f => ({ ...f, query: e.target.value }))}
                  placeholder="Buscar mensagens..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-[#242f3d] text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showFilters || hasActiveFilters
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-[#242f3d] text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filtros
                  {hasActiveFilters && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>

              {/* Filters Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-4 space-y-4">
                      {/* Date Range */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Data inicial
                          </label>
                          <input
                            type="date"
                            value={filters.startDate || ''}
                            onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || null }))}
                            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#242f3d] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Data final
                          </label>
                          <input
                            type="date"
                            value={filters.endDate || ''}
                            onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || null }))}
                            className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#242f3d] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Sender Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Remetente
                        </label>
                        <select
                          value={filters.senderId || ''}
                          onChange={(e) => setFilters(f => ({ ...f, senderId: e.target.value || null }))}
                          className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#242f3d] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos</option>
                          <option value={currentUserId}>Você</option>
                          {participants.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nickname}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Media Type Filter */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center gap-1">
                          <Filter className="w-3 h-3" />
                          Tipo de conteúdo
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'all', label: 'Todos', icon: null },
                            { value: 'text', label: 'Texto', icon: FileText },
                            { value: 'image', label: 'Imagens', icon: ImageIcon },
                            { value: 'video', label: 'Vídeos', icon: Video },
                            { value: 'audio', label: 'Áudios', icon: Mic },
                          ].map(({ value, label, icon: Icon }) => (
                            <button
                              key={value}
                              onClick={() => setFilters(f => ({ ...f, mediaType: value as SearchFilters['mediaType'] }))}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                                filters.mediaType === value
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 dark:bg-[#242f3d] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2b5278]'
                              }`}
                            >
                              {Icon && <Icon className="w-3.5 h-3.5" />}
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Results */}
            <div className="overflow-y-auto max-h-[60vh] p-4">
              {isSearching ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Buscando...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
                  </p>
                  {searchResults.map(msg => (
                    <motion.button
                      key={msg.id}
                      onClick={() => {
                        onResultClick(msg);
                        onClose();
                      }}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#242f3d] hover:bg-gray-100 dark:hover:bg-[#2b5278] transition-colors text-left"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          msg.sender_id === currentUserId
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        }`}>
                          {msg.media_type === 'image' && <ImageIcon className="w-4 h-4" />}
                          {msg.media_type === 'video' && <Video className="w-4 h-4" />}
                          {msg.media_type === 'audio' && <Mic className="w-4 h-4" />}
                          {!msg.media_type && <FileText className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {getParticipantName(msg.sender_id)}
                            </span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(msg.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white truncate">
                            {getMessagePreview(msg)}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : filters.query || hasActiveFilters ? (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Nenhum resultado encontrado
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Tente ajustar os filtros de busca
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <SlidersHorizontal className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Digite algo ou use os filtros para buscar
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
