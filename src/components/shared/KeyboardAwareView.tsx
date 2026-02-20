'use client';

import { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { useKeyboard } from '@/hooks/useKeyboard';

interface KeyboardContextType {
  isKeyboardOpen: boolean;
  keyboardHeight: number;
}

const KeyboardContext = createContext<KeyboardContextType>({
  isKeyboardOpen: false,
  keyboardHeight: 0,
});

export function useKeyboardContext() {
  return useContext(KeyboardContext);
}

interface KeyboardAwareProviderProps {
  children: ReactNode;
}

export function KeyboardAwareProvider({ children }: KeyboardAwareProviderProps) {
  const { isOpen, height } = useKeyboard();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (isOpen) {
      document.body.style.setProperty('--keyboard-height', `${height}px`);
      document.body.classList.add('keyboard-open');
    } else {
      document.body.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-open');
    }
  }, [isOpen, height, mounted]);

  return (
    <KeyboardContext.Provider value={{ isKeyboardOpen: isOpen, keyboardHeight: height }}>
      {children}
    </KeyboardContext.Provider>
  );
}

interface KeyboardAwareViewProps {
  children: ReactNode;
  className?: string;
}

export function KeyboardAwareView({ children, className = '' }: KeyboardAwareViewProps) {
  const { isKeyboardOpen, keyboardHeight } = useKeyboardContext();

  return (
    <div
      className={className}
      style={{
        paddingBottom: isKeyboardOpen ? keyboardHeight : 0,
        transition: 'padding-bottom 0.25s ease-out',
      }}
    >
      {children}
    </div>
  );
}

export default KeyboardAwareProvider;
