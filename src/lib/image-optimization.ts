/**
 * Sugestão 14: Otimização de Imagens Automática
 * Redimensiona e comprime imagens antes do upload
 */

import { logger } from '@/lib/logger';

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  maxSizeMB: 5,
};

/**
 * Redimensiona imagem mantendo proporção
 */
function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calcular novas dimensões mantendo proporção
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Falha ao converter imagem'));
            }
          },
          file.type || 'image/jpeg',
          0.9
        );
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });
}

/**
 * Comprime imagem até atingir tamanho máximo
 */
async function compressImage(
  blob: Blob,
  targetSizeMB: number,
  quality: number
): Promise<Blob> {
  const targetSizeBytes = targetSizeMB * 1024 * 1024;
  let currentQuality = quality;
  let compressedBlob = blob;

  // Se já está abaixo do tamanho, retornar
  if (blob.size <= targetSizeBytes) {
    return blob;
  }

  // Tentar comprimir progressivamente
  while (compressedBlob.size > targetSizeBytes && currentQuality > 0.1) {
    const canvas = document.createElement('canvas');
    const img = new Image();
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Erro ao criar contexto'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              compressedBlob = blob;
              currentQuality -= 0.1;
              resolve();
            } else {
              reject(new Error('Erro ao comprimir'));
            }
          },
          'image/jpeg',
          currentQuality
        );
      };
      img.onerror = () => reject(new Error('Erro ao carregar imagem'));
      img.src = URL.createObjectURL(compressedBlob);
    });
  }

  return compressedBlob;
}

/**
 * Otimiza imagem antes do upload
 */
export async function optimizeImage(
  file: File,
  options: ImageOptimizationOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Verificar se é imagem
  if (!file.type.startsWith('image/')) {
    throw new Error('Arquivo não é uma imagem');
  }

  // Verificar tamanho inicial
  const initialSizeMB = file.size / (1024 * 1024);
  if (initialSizeMB <= opts.maxSizeMB && file.size < 500 * 1024) {
    // Se já está pequeno, retornar original
    return file;
  }

  try {
    // 1. Redimensionar se necessário
    let optimizedBlob = await resizeImage(file, opts.maxWidth, opts.maxHeight);

    // 2. Comprimir se ainda estiver grande
    if (optimizedBlob.size > opts.maxSizeMB * 1024 * 1024) {
      optimizedBlob = await compressImage(optimizedBlob, opts.maxSizeMB, opts.quality);
    }

    // 3. Criar novo File com nome original
    const optimizedFile = new File(
      [optimizedBlob],
      file.name,
      {
        type: file.type || 'image/jpeg',
        lastModified: Date.now(),
      }
    );

    if (process.env.NODE_ENV === 'development') {
      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const optimizedSizeMB = (optimizedFile.size / (1024 * 1024)).toFixed(2);
      const reduction = ((1 - optimizedFile.size / file.size) * 100).toFixed(1);
      logger.debug(`Imagem otimizada: ${originalSizeMB}MB → ${optimizedSizeMB}MB (${reduction}% redução)`);
    }

    return optimizedFile;
  } catch (error) {
    logger.error('Erro ao otimizar imagem', error instanceof Error ? error : new Error(String(error)));
    // Em caso de erro, retornar arquivo original
    return file;
  }
}

/**
 * Verifica se arquivo precisa de otimização
 */
export function needsOptimization(file: File): boolean {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return file.size > maxSize || file.type.startsWith('image/');
}
