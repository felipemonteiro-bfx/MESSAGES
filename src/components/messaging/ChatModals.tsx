'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X as CloseIcon, Pencil, Trash2, Forward, MessageSquare, Image as ImageIcon } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import type { Message, ChatWithRecipient, User as UserType } from '@/types/messaging';
import EditNicknameModal from '@/components/shared/EditNicknameModal';
import SettingsModal from '@/components/shared/SettingsModal';
import SecurityCodeModal from '@/components/shared/SecurityCodeModal';
import ScreenshotAlert, { ScreenshotProtectionOverlay } from '@/components/messaging/ScreenshotAlert';
import AdvancedSearchModal from '@/components/messaging/AdvancedSearchModal';
import { toast } from 'sonner';

interface ChatModalsProps {
  currentUser: UserType | null;
  selectedChat: ChatWithRecipient | null;
  chats: ChatWithRecipient[];
  messages: Message[];
  decryptedMessages: Record<string, string>;

  isAddContactOpen: boolean;
  nicknameSearch: string;
  isAddingContact: boolean;
  onSetAddContactOpen: (open: boolean) => void;
  onSetNicknameSearch: (search: string) => void;
  onAddContact: () => void;

  showEditNicknameModal: boolean;
  editingUserId: string | null;
  editingNickname: string;
  onCloseEditNickname: () => void;
  onEditNicknameSuccess: () => Promise<void>;

  showSettingsModal: boolean;
  currentUserProfile: { nickname: string; avatar_url?: string | null } | null;
  onCloseSettings: () => void;
  onAvatarUpdate: (url: string) => void;

  showMediaGallery: boolean;
  onCloseMediaGallery: () => void;

  showLogoutConfirm: boolean;
  onSetShowLogoutConfirm: (show: boolean) => void;
  onLogout: () => void;

  deleteChatConfirm: ChatWithRecipient | null;
  isDeletingChat: boolean;
  onSetDeleteChatConfirm: (chat: ChatWithRecipient | null) => void;
  onDeleteChat: (chat: ChatWithRecipient) => void;

  editingMessage: Message | null;
  editContent: string;
  isEditing: boolean;
  onSetEditContent: (content: string) => void;
  onCloseEditMessage: () => void;
  onEditMessage: () => void;

  deleteConfirmId: string | null;
  onSetDeleteConfirmId: (id: string | null) => void;
  onDeleteMessage: (id: string, forEveryone: boolean) => void;
  canDeleteForEveryone: (msg: Message) => boolean;

  forwardingMessage: Message | null;
  onSetForwardingMessage: (msg: Message | null) => void;
  onForwardMessage: (chatId: string) => void;

  showSecurityCode: boolean;
  currentUserPublicKey: string | null;
  onCloseSecurityCode: () => void;

  screenshotAlertVisible: boolean;
  screenshotAlertMessage: string | undefined;
  screenshotAlertVariant: 'detected' | 'received';
  screenshotProtectionActive: boolean;
  onCloseScreenshotAlert: () => void;

  showAdvancedSearch: boolean;
  onCloseAdvancedSearch: () => void;
  onSearchResultClick: (msg: Message) => void;
}

export default function ChatModals(props: ChatModalsProps) {
  const {
    currentUser, selectedChat, chats, messages, decryptedMessages,
    isAddContactOpen, nicknameSearch, isAddingContact,
    onSetAddContactOpen, onSetNicknameSearch, onAddContact,
    showEditNicknameModal, editingUserId, editingNickname,
    onCloseEditNickname, onEditNicknameSuccess,
    showSettingsModal, currentUserProfile, onCloseSettings, onAvatarUpdate,
    showMediaGallery, onCloseMediaGallery,
    showLogoutConfirm, onSetShowLogoutConfirm, onLogout,
    deleteChatConfirm, isDeletingChat, onSetDeleteChatConfirm, onDeleteChat,
    editingMessage, editContent, isEditing,
    onSetEditContent, onCloseEditMessage, onEditMessage,
    deleteConfirmId, onSetDeleteConfirmId, onDeleteMessage, canDeleteForEveryone,
    forwardingMessage, onSetForwardingMessage, onForwardMessage,
    showSecurityCode, currentUserPublicKey, onCloseSecurityCode,
    screenshotAlertVisible, screenshotAlertMessage, screenshotAlertVariant,
    screenshotProtectionActive, onCloseScreenshotAlert,
    showAdvancedSearch, onCloseAdvancedSearch, onSearchResultClick,
  } = props;

  const addContactTrapRef = useFocusTrap(isAddContactOpen, () => onSetAddContactOpen(false));
  const editMessageTrapRef = useFocusTrap(!!editingMessage, onCloseEditMessage);
  const deleteChatTrapRef = useFocusTrap(!!deleteChatConfirm, () => onSetDeleteChatConfirm(null));
  const deleteMsgTrapRef = useFocusTrap(!!deleteConfirmId, () => onSetDeleteConfirmId(null));

  return (
    <>
      {/* Add Contact Modal */}
      <AnimatePresence>
        {isAddContactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              ref={addContactTrapRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="add-contact-title"
              className="w-full max-w-sm bg-[#17212b] rounded-2xl p-6 shadow-2xl border border-[#242f3d]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 id="add-contact-title" className="text-xl font-bold text-white">Novo Contato</h3>
                <button onClick={() => onSetAddContactOpen(false)} className="text-[#708499] hover:text-white transition-colors"><CloseIcon className="w-6 h-6" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[#708499] mb-2">Nickname ou Email do usuário</label>
                  <div className="bg-[#242f3d] rounded-xl flex items-center px-4 py-3 border border-[#17212b]">
                    <input
                      type="text"
                      value={nicknameSearch}
                      onChange={(e) => onSetNicknameSearch(e.target.value)}
                      placeholder="Digite o nickname ou email..."
                      className="bg-transparent border-none focus:ring-0 text-base w-full text-white placeholder-[#708499]"
                      onKeyDown={(e) => { if (e.key === 'Enter') onAddContact(); }}
                    />
                  </div>
                  <p className="text-xs text-[#708499] mt-2">
                    {nicknameSearch.includes('@') ? 'Buscando por email...' : 'Digite o nickname (3-20 caracteres) ou email do usuário'}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddContact(); }}
                  disabled={!nicknameSearch.trim() || isAddingContact}
                  className={`w-full bg-[#2b5278] hover:bg-[#346290] disabled:hover:bg-[#2b5278] py-3 rounded-xl font-bold text-white transition-colors flex items-center justify-center gap-2 ${!nicknameSearch.trim() || isAddingContact ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isAddingContact ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Adicionando...</>) : 'Adicionar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Nickname Modal */}
      {showEditNicknameModal && editingUserId && (
        <EditNicknameModal
          isOpen={showEditNicknameModal}
          onClose={onCloseEditNickname}
          currentNickname={editingNickname}
          userId={editingUserId}
          isOwnProfile={editingUserId === currentUser?.id}
          onSuccess={onEditNicknameSuccess}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={onCloseSettings}
          currentAvatarUrl={currentUserProfile?.avatar_url}
          onAvatarUpdate={onAvatarUpdate}
        />
      )}

      {/* Media Gallery */}
      <AnimatePresence>
        {showMediaGallery && selectedChat && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex flex-col bg-white dark:bg-[#17212b]">
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-[#242f3d]">
              <h3 className="font-bold text-gray-900 dark:text-white">Fotos e vídeos</h3>
              <button onClick={onCloseMediaGallery} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-[#242f3d] transition-colors" aria-label="Fechar">
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {(() => {
                const mediaItems = messages.filter(m =>
                  m.media_url &&
                  (m.media_type === 'image' || m.media_type === 'video') &&
                  !m.deleted_at &&
                  !m.is_view_once
                );
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
                      <a key={m.id} href={m.media_url!} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-[#242f3d] block relative">
                        {m.media_type === 'image' ? (
                          <img
                            src={m.media_url!}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <video
                            src={m.media_url!}
                            className="w-full h-full object-cover"
                            muted
                            preload="metadata"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        )}
                        <div className="absolute inset-0 items-center justify-center text-gray-400" style={{ display: 'none' }}>
                          <ImageIcon className="w-8 h-8 opacity-50" />
                        </div>
                        {m.media_type === 'video' && (
                          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">▶</div>
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

      {/* Logout Confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4" onClick={() => onSetShowLogoutConfirm(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-[#17212b] rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sair da conta?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Você precisará entrar novamente para acessar suas conversas.</p>
              <div className="flex gap-3">
                <button onClick={() => onSetShowLogoutConfirm(false)} className="flex-1 py-2.5 px-4 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242f3d] hover:bg-gray-200 dark:hover:bg-[#2b5278] transition-colors">Cancelar</button>
                <button onClick={onLogout} className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors">Sair</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Chat Confirmation */}
      <AnimatePresence>
        {deleteChatConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4" onClick={() => onSetDeleteChatConfirm(null)}>
            <motion.div ref={deleteChatTrapRef} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" className="bg-white dark:bg-[#17212b] rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir conversa?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Conversa com <span className="font-semibold text-gray-800 dark:text-gray-200">{deleteChatConfirm.recipient?.nickname || 'este contato'}</span>
              </p>
              <p className="text-sm text-red-500 dark:text-red-400 mb-6">Todas as mensagens serão apagadas permanentemente para ambos.</p>
              <div className="flex gap-3">
                <button onClick={() => onSetDeleteChatConfirm(null)} disabled={isDeletingChat} className="flex-1 py-2.5 px-4 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242f3d] hover:bg-gray-200 dark:hover:bg-[#2b5278] transition-colors disabled:opacity-50">Cancelar</button>
                <button onClick={() => onDeleteChat(deleteChatConfirm)} disabled={isDeletingChat} className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50">
                  {isDeletingChat ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Message Modal */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4" onClick={onCloseEditMessage}>
            <motion.div ref={editMessageTrapRef} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" className="bg-white dark:bg-[#17212b] rounded-2xl p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Pencil className="w-5 h-5" />Editar mensagem</h3>
              <textarea value={editContent} onChange={(e) => onSetEditContent(e.target.value)} className="w-full p-3 rounded-xl bg-gray-100 dark:bg-[#242f3d] text-base text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" rows={4} maxLength={10000} autoFocus />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">{editContent.length}/10000 caracteres</p>
              <div className="flex gap-3">
                <button onClick={onCloseEditMessage} className="flex-1 py-2.5 px-4 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242f3d] hover:bg-gray-200 dark:hover:bg-[#2b5278] transition-colors">Cancelar</button>
                <button onClick={onEditMessage} disabled={!editContent.trim() || editContent === editingMessage.content || isEditing} className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors">{isEditing ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4" onClick={() => onSetDeleteConfirmId(null)}>
            <motion.div ref={deleteMsgTrapRef} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" className="bg-white dark:bg-[#17212b] rounded-2xl p-6 max-w-sm w-full shadow-xl">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2"><Trash2 className="w-5 h-5 text-red-500" />Apagar mensagem?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Escolha como deseja apagar esta mensagem.</p>
              <div className="space-y-2">
                <button onClick={() => onDeleteMessage(deleteConfirmId, false)} className="w-full py-2.5 px-4 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-[#242f3d] hover:bg-gray-200 dark:hover:bg-[#2b5278] transition-colors text-left">
                  Apagar para mim<span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">Outros participantes ainda poderão ver a mensagem</span>
                </button>
                {(() => {
                  const msg = messages.find(m => m.id === deleteConfirmId);
                  return msg && canDeleteForEveryone(msg) && (
                    <button onClick={() => onDeleteMessage(deleteConfirmId, true)} className="w-full py-2.5 px-4 rounded-xl font-medium text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-left">
                      Apagar para todos<span className="block text-xs text-red-500 dark:text-red-400 mt-0.5">A mensagem será apagada para todos os participantes</span>
                    </button>
                  );
                })()}
                <button onClick={() => onSetDeleteConfirmId(null)} className="w-full py-2.5 px-4 rounded-xl font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancelar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Code Modal */}
      {showSecurityCode && selectedChat && currentUser && selectedChat.recipient && (
        <SecurityCodeModal
          isOpen={showSecurityCode}
          onClose={onCloseSecurityCode}
          chatId={selectedChat.id}
          currentUserId={currentUser.id}
          recipientId={selectedChat.recipient.id}
          recipientNickname={selectedChat.recipient.nickname || 'Usuário'}
          currentUserPublicKey={currentUserPublicKey}
          recipientPublicKey={selectedChat.recipient.public_key}
          onVerified={() => toast.success('Identidade verificada com sucesso!')}
        />
      )}

      {/* Screenshot Alert */}
      <ScreenshotAlert isVisible={screenshotAlertVisible} onClose={onCloseScreenshotAlert} message={screenshotAlertMessage} variant={screenshotAlertVariant} />
      <ScreenshotProtectionOverlay isActive={screenshotProtectionActive} />

      {/* Advanced Search */}
      {currentUser && (
        <AdvancedSearchModal
          isOpen={showAdvancedSearch}
          onClose={onCloseAdvancedSearch}
          messages={messages}
          chats={chats}
          currentUserId={currentUser.id}
          onResultClick={onSearchResultClick}
        />
      )}

      {/* Forward Message Modal */}
      <AnimatePresence>
        {forwardingMessage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => onSetForwardingMessage(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-[#17212b] rounded-xl shadow-2xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-200 dark:border-[#0e1621] flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">Encaminhar para...</h3>
                <button onClick={() => onSetForwardingMessage(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-[#242f3d] rounded-lg"><CloseIcon className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="px-3 py-2 border-b border-gray-200 dark:border-[#0e1621] bg-gray-50 dark:bg-[#0e1621]">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  <Forward className="w-3 h-3 inline mr-1" />
                  {forwardingMessage.media_type
                    ? `${forwardingMessage.media_type === 'image' ? '📷 Imagem' : forwardingMessage.media_type === 'video' ? '🎥 Vídeo' : '🎤 Áudio'}`
                    : (forwardingMessage.is_encrypted ? (decryptedMessages[forwardingMessage.id] || 'Mensagem criptografada').slice(0, 60) : (forwardingMessage.content || '').slice(0, 60))
                  }
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {chats.filter(c => c.id !== selectedChat?.id).map(chat => (
                  <button
                    key={chat.id}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#242f3d] transition-colors text-left"
                    onClick={() => onForwardMessage(chat.id)}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {(chat.recipient?.nickname || '?')[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{chat.recipient?.nickname || 'Chat'}</span>
                  </button>
                ))}
                {chats.filter(c => c.id !== selectedChat?.id).length === 0 && (
                  <p className="p-4 text-sm text-gray-500 dark:text-gray-400 text-center">Nenhum outro chat disponível</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
