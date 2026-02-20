'use client';

import { useEffect, useCallback, useRef } from 'react';

interface ScreenshotDetectionOptions {
  onScreenshotDetected?: (method: string) => void;
  onBlur?: () => void;
  enabled?: boolean;
}

/**
 * Hook para detectar possíveis capturas de tela
 * Nota: Detecção de screenshots não é 100% confiável em navegadores
 * Este hook usa heurísticas para detectar padrões comuns
 */
export function useScreenshotDetection({
  onScreenshotDetected,
  onBlur,
  enabled = true,
}: ScreenshotDetectionOptions = {}) {
  const lastKeyTimeRef = useRef<number>(0);
  const printKeyPressedRef = useRef<boolean>(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const now = Date.now();
    
    // Detectar Print Screen (Windows/Linux)
    if (e.key === 'PrintScreen') {
      onScreenshotDetected?.('printscreen');
      return;
    }

    // Detectar Cmd+Shift+3 ou Cmd+Shift+4 (macOS screenshot)
    if (e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5')) {
      onScreenshotDetected?.('macos_shortcut');
      return;
    }

    // Detectar Win+Shift+S (Windows Snipping Tool)
    if (e.key === 's' && e.shiftKey && (e.metaKey || e.getModifierState('OS'))) {
      onScreenshotDetected?.('windows_snip');
      return;
    }

    // Detectar Win+Print Screen
    if ((e.metaKey || e.getModifierState('OS')) && e.key === 'PrintScreen') {
      onScreenshotDetected?.('windows_screenshot');
      return;
    }

    // Detectar Cmd+Ctrl+Shift+3 ou 4 (macOS screenshot to clipboard)
    if (e.metaKey && e.ctrlKey && e.shiftKey && (e.key === '3' || e.key === '4')) {
      onScreenshotDetected?.('macos_clipboard');
      return;
    }

    lastKeyTimeRef.current = now;
  }, [enabled, onScreenshotDetected]);

  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;

    if (document.hidden) {
      onBlur?.();
    }
  }, [enabled, onBlur]);

  // Listener para o evento de clipboard (algumas capturas copiam para clipboard)
  const handleCopy = useCallback((e: ClipboardEvent) => {
    if (!enabled) return;

    // Se há imagens no clipboard, pode ser um screenshot
    const clipboardData = e.clipboardData;
    if (clipboardData) {
      for (const item of Array.from(clipboardData.items)) {
        if (item.type.startsWith('image/')) {
          onScreenshotDetected?.('clipboard_image');
          return;
        }
      }
    }
  }, [enabled, onScreenshotDetected]);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', handleCopy);
    };
  }, [enabled, handleKeyDown, handleVisibilityChange, handleCopy]);

  // Função para blur manual (útil para aplicar blur em elementos sensíveis)
  const triggerBlur = useCallback(() => {
    onBlur?.();
  }, [onBlur]);

  return { triggerBlur };
}

/**
 * Função utilitária para aplicar blur em elementos durante captura suspeita
 */
export function blurSensitiveElements(blur: boolean) {
  const elements = document.querySelectorAll('[data-sensitive="true"]');
  elements.forEach(el => {
    if (el instanceof HTMLElement) {
      el.style.filter = blur ? 'blur(10px)' : 'none';
      el.style.transition = 'filter 0.2s ease';
    }
  });
}
