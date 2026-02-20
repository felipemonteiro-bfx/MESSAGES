'use client';

import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface KeyboardInfo {
  isOpen: boolean;
  height: number;
}

interface KeyboardPlugin {
  addListener(event: 'keyboardWillShow', callback: (info: { keyboardHeight: number }) => void): Promise<{ remove: () => void }>;
  addListener(event: 'keyboardDidShow', callback: (info: { keyboardHeight: number }) => void): Promise<{ remove: () => void }>;
  addListener(event: 'keyboardWillHide', callback: () => void): Promise<{ remove: () => void }>;
  addListener(event: 'keyboardDidHide', callback: () => void): Promise<{ remove: () => void }>;
  setAccessoryBarVisible(options: { isVisible: boolean }): Promise<void>;
  setScroll(options: { isDisabled: boolean }): Promise<void>;
  setResizeMode(options: { mode: 'body' | 'ionic' | 'native' | 'none' }): Promise<void>;
}

let keyboardPlugin: KeyboardPlugin | null = null;

async function getKeyboard(): Promise<KeyboardPlugin | null> {
  if (keyboardPlugin) return keyboardPlugin;
  
  if (Capacitor.isNativePlatform()) {
    try {
      const { Keyboard } = await import('@capacitor/keyboard');
      keyboardPlugin = Keyboard as unknown as KeyboardPlugin;
      return keyboardPlugin;
    } catch {
      return null;
    }
  }
  return null;
}

export function useKeyboard(): KeyboardInfo & {
  scrollToInput: (element: HTMLElement | null) => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    let cleanupFns: (() => void)[] = [];

    const setup = async () => {
      const keyboard = await getKeyboard();
      if (!keyboard) return;

      try {
        await keyboard.setResizeMode({ mode: 'body' });
        await keyboard.setAccessoryBarVisible({ isVisible: true });
      } catch {
        // Ignore errors
      }

      try {
        const willShowListener = await keyboard.addListener('keyboardWillShow', (info) => {
          setIsOpen(true);
          setHeight(info.keyboardHeight);
        });
        cleanupFns.push(() => willShowListener.remove());

        const willHideListener = await keyboard.addListener('keyboardWillHide', () => {
          setIsOpen(false);
          setHeight(0);
        });
        cleanupFns.push(() => willHideListener.remove());
      } catch {
        // Fallback for web - use visualViewport API
        if (typeof window !== 'undefined' && window.visualViewport) {
          const handleResize = () => {
            const viewportHeight = window.visualViewport!.height;
            const windowHeight = window.innerHeight;
            const keyboardHeight = windowHeight - viewportHeight;
            
            if (keyboardHeight > 100) {
              setIsOpen(true);
              setHeight(keyboardHeight);
            } else {
              setIsOpen(false);
              setHeight(0);
            }
          };

          window.visualViewport.addEventListener('resize', handleResize);
          cleanupFns.push(() => window.visualViewport?.removeEventListener('resize', handleResize));
        }
      }
    };

    setup();

    return () => {
      cleanupFns.forEach(fn => fn());
    };
  }, []);

  const scrollToInput = useCallback((element: HTMLElement | null) => {
    if (!element || !isOpen) return;
    
    setTimeout(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, [isOpen]);

  return { isOpen, height, scrollToInput };
}

export async function hideKeyboard(): Promise<void> {
  if (typeof document !== 'undefined') {
    const activeElement = document.activeElement as HTMLElement | null;
    activeElement?.blur();
  }
}

export async function showAccessoryBar(visible: boolean): Promise<void> {
  const keyboard = await getKeyboard();
  if (keyboard) {
    await keyboard.setAccessoryBarVisible({ isVisible: visible });
  }
}

export default useKeyboard;
