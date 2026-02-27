'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { optimizeImage } from '@/lib/image-optimization';
import { cacheMedia } from '@/lib/media-cache';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

interface UploadProgress {
  type: string;
  progress: number;
}

interface UseMediaUploadOptions {
  chatId: string | null;
  currentUserId: string | null;
  recipientId?: string | null;
  isViewOnceMode?: boolean;
  ephemeralSeconds?: number;
  showEphemeralOption?: boolean;
  onSuccess?: () => void;
}

export function useMediaUpload({
  chatId,
  currentUserId,
  recipientId,
  isViewOnceMode = false,
  ephemeralSeconds = 0,
  showEphemeralOption = false,
  onSuccess,
}: UseMediaUploadOptions) {
  const supabase = useMemo(() => createClient(), []);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const upload = useCallback(
    async (file: File, type: 'image' | 'video' | 'audio') => {
      const maxSize = type === 'video' ? MAX_VIDEO_SIZE : type === 'audio' ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;
      const maxSizeMB = maxSize / (1024 * 1024);

      if (file.size > maxSize) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        const typeNames = { image: 'Imagens', video: 'Vídeos', audio: 'Áudios' };
        toast.error(
          `Arquivo muito grande (${fileSizeMB}MB). ${typeNames[type]} devem ter no máximo ${maxSizeMB}MB.`,
          { duration: 5000 }
        );
        return false;
      }

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
          logger.warn('Image optimization failed, using original', { error });
        }
      }

      if (!chatId || !currentUserId) return false;

      try {
        setIsUploading(true);
        setUploadProgress({ type, progress: 0 });

        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (!prev) return null;
            return { ...prev, progress: Math.min(prev.progress + 10, 90) };
          });
        }, 200);

        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
        const filePath = `chat-media/${chatId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: false });

        clearInterval(progressInterval);

        if (uploadError) {
          const msg = String(uploadError.message || '').toLowerCase();
          if (msg.includes('bucket') && msg.includes('not found')) {
            throw new Error('Bucket "chat-media" não existe no Supabase Storage.');
          }
          if (msg.includes('payload too large') || msg.includes('size')) {
            throw new Error('Arquivo muito grande para enviar. Tente um arquivo menor.');
          }
          throw uploadError;
        }

        setUploadProgress({ type, progress: 95 });

        const {
          data: { publicUrl },
        } = supabase.storage.from('chat-media').getPublicUrl(filePath);

        if (publicUrl && (type === 'image' || type === 'video')) {
          try {
            const response = await fetch(publicUrl);
            const blob = await response.blob();
            await cacheMedia(publicUrl, blob);
          } catch {
            // Cache failure is non-critical
          }
        }

        const mediaMsgBody: Record<string, unknown> = {
          chatId,
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

        if (recipientId) {
          const mediaContent = type === 'image' ? '📷 Imagem' : type === 'video' ? '🎥 Vídeo' : '🎤 Áudio';
          fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipientId, content: mediaContent, isMessage: true }),
          }).catch(() => {});
        }

        onSuccess?.();
        return true;
      } catch (error) {
        const appError = normalizeError(error);
        logError(appError);
        toast.error(error instanceof Error ? error.message : getUserFriendlyMessage(appError), {
          duration: 5000,
        });
        return false;
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
      }
    },
    [chatId, currentUserId, recipientId, supabase, isViewOnceMode, showEphemeralOption, ephemeralSeconds, onSuccess]
  );

  return { upload, uploadProgress, isUploading };
}
