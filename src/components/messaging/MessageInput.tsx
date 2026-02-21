'use client';

import { useRef, useCallback } from 'react';
import { Send, Paperclip, Mic, Camera, FileVideo, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message, ChatWithRecipient } from '@/types/messaging';
import { impactLight } from '@/lib/haptics';

interface MessageInputProps {
  selectedChat: ChatWithRecipient;
  currentUserId: string | undefined;
  inputText: string;
  isSending: boolean;
  isRecording: boolean;
  showMediaMenu: boolean;
  isViewOnceMode: boolean;
  replyingTo: Message | null;
  uploadProgress: { type: string; progress: number } | null;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onToggleMediaMenu: () => void;
  onToggleViewOnce: () => void;
  onCancelReply: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => void;
  onFilePickerActive: (active: boolean) => void;
  recipientNickname?: string;
}

export default function MessageInput({
  selectedChat,
  currentUserId,
  inputText,
  isSending,
  isRecording,
  showMediaMenu,
  isViewOnceMode,
  replyingTo,
  uploadProgress,
  onInputChange,
  onSend,
  onToggleMediaMenu,
  onToggleViewOnce,
  onCancelReply,
  onStartRecording,
  onStopRecording,
  onFileSelect,
  onFilePickerActive,
  recipientNickname,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }, [onSend]);

  return (
    <footer className="sticky bottom-0 p-3 bg-white dark:bg-[#17212b] border-t border-gray-200 dark:border-[#0e1621] safe-area-inset-bottom chat-input-area keyboard-aware z-10">
      <div className="max-w-3xl mx-auto">
        <AnimatePresence>
          {showMediaMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-2 flex gap-2 p-2 bg-[#242f3d] rounded-xl"
            >
              <button
                onClick={() => { onFilePickerActive(true); fileInputRef.current?.click(); }}
                className="flex-1 flex flex-col items-center gap-2 p-3 bg-[#17212b] rounded-lg hover:bg-[#2b5278] transition-colors"
              >
                <Camera className="w-5 h-5 text-[#4c94d5]" />
                <span className="text-xs text-white">Foto</span>
              </button>
              <button
                onClick={() => { onFilePickerActive(true); videoInputRef.current?.click(); }}
                className="flex-1 flex flex-col items-center gap-2 p-3 bg-[#17212b] rounded-lg hover:bg-[#2b5278] transition-colors"
              >
                <FileVideo className="w-5 h-5 text-[#4c94d5]" />
                <span className="text-xs text-white">Vídeo</span>
              </button>
              <button
                onClick={isRecording ? onStopRecording : onStartRecording}
                className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                  isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-[#17212b] hover:bg-[#2b5278]'
                }`}
              >
                <Mic className={`w-5 h-5 ${isRecording ? 'text-white animate-pulse' : 'text-[#4c94d5]'}`} />
                <span className="text-xs text-white">{isRecording ? 'Gravando...' : 'Áudio'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFileSelect(e, 'image')} />
        <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => onFileSelect(e, 'video')} />
        <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={(e) => onFileSelect(e, 'audio')} />

        {replyingTo && (
          <div className="mb-2 flex items-center gap-2 p-2 bg-gray-100 dark:bg-[#242f3d] rounded-lg border-l-2 border-blue-500">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Respondendo a {replyingTo.sender_id === currentUserId ? 'você' : (recipientNickname || '')}
              </p>
              <p className="text-sm text-gray-800 dark:text-white truncate">
                {(replyingTo.content || '').slice(0, 60)}{(replyingTo.content?.length || 0) > 60 ? '...' : ''}
              </p>
            </div>
            <button onClick={onCancelReply} className="p-1 text-gray-500 hover:text-gray-700 dark:hover:text-white" aria-label="Cancelar resposta">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {isViewOnceMode && (
          <div className="mb-2 flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg border border-orange-300 dark:border-orange-700">
            <span className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">1</span>
            <span className="flex-1 text-sm text-orange-700 dark:text-orange-300">Mensagem para ver uma vez</span>
            <button onClick={onToggleViewOnce} className="p-1 text-orange-500 hover:text-orange-700" aria-label="Desativar modo ver uma vez">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 safe-area-bottom">
          <button
            onClick={onToggleMediaMenu}
            className="w-10 h-10 bg-[#242f3d] rounded-full flex items-center justify-center text-[#4c94d5] hover:bg-[#2b5278] transition-colors flex-shrink-0"
            aria-label="Anexar arquivo"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            onClick={onToggleViewOnce}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              isViewOnceMode ? 'bg-orange-500 text-white' : 'bg-[#242f3d] text-[#4c94d5] hover:bg-[#2b5278]'
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
                onInputChange(e);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Mensagem..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-base resize-none py-1 placeholder-gray-400 dark:placeholder-[#708499] text-gray-900 dark:text-white"
              disabled={isSending}
              data-testid="message-input"
              data-stealth-content="true"
            />
          </div>
          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center transition-all touch-manipulation flex-shrink-0 ${
              isRecording ? 'bg-red-500 text-white animate-pulse hover:bg-red-600' : 'bg-[#242f3d] text-[#4c94d5] hover:bg-[#2b5278]'
            }`}
            aria-label={isRecording ? 'Parar gravação' : 'Gravar áudio'}
            title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={() => { impactLight(); onSend(); }}
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
  );
}
