'use client';

import { useEffect, useRef, useCallback } from 'react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Hook para manter o foco dentro de um modal (focus trap).
 * Foca o primeiro elemento focável ao abrir e mantém Tab/Shift+Tab dentro do container.
 */
export function useFocusTrap(isOpen: boolean, onClose?: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const getFocusableElements = useCallback(() => {
    const el = containerRef.current;
    if (!el) return [];
    return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (node) => !node.hasAttribute('disabled') && node.offsetParent !== null
    );
  }, []);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const el = containerRef.current;
    const focusables = getFocusableElements();
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first.focus({ preventScroll: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const active = document.activeElement as HTMLElement | null;
      if (!active || !el.contains(active)) return;

      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    el.addEventListener('keydown', handleKeyDown, true);
    return () => el.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose, getFocusableElements]);

  return containerRef;
}
