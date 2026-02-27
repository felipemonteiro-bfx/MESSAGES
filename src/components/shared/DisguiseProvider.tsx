'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NewsDisguise from './NewsDisguise';
import PinPad from './PinPad';

const DisguiseContext = createContext({
  isDisguised: true,
  toggleDisguise: () => {},
});

export const useDisguise = () => useContext(DisguiseContext);

export default function DisguiseProvider({ children }: { children: React.ReactNode }) {
  const [isDisguised, setIsDisguised] = useState(true);
  const [showPinPad, setShowPinPad] = useState(false);

  useEffect(() => {
    // Em modo de teste, sempre desabilitar disfarce
    const isTestMode = document.cookie.includes('test-bypass=true');
    
    if (isTestMode) {
      setIsDisguised(false);
      document.title = "Noticias24h - Brasil e Mundo";
      return;
    }
    
    const saved = localStorage.getItem('disguise_mode');
    if (saved === null) {
      setIsDisguised(true);
      document.title = "Noticias24h - Brasil e Mundo";
    } else {
      const isHidden = saved === 'true';
      setIsDisguised(isHidden);
      document.title = "Noticias24h - Brasil e Mundo";
    }
  }, []);

  const toggleDisguise = () => {
    const newState = !isDisguised;
    setIsDisguised(newState);
    setShowPinPad(false);
    localStorage.setItem('disguise_mode', newState.toString());
    document.title = "Noticias24h - Brasil e Mundo";
  };

  const handleUnlockRequest = () => {
    setShowPinPad(true);
  };

  const handlePinSuccess = () => {
    const newState = false;
    setIsDisguised(newState);
    setShowPinPad(false);
    localStorage.setItem('disguise_mode', newState.toString());
    document.title = "Noticias24h - Brasil e Mundo";
  };

  return (
    <DisguiseContext.Provider value={{ isDisguised, toggleDisguise }}>
      <AnimatePresence mode="wait">
        {isDisguised ? (
          <motion.div 
            key="disguise"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white overflow-y-auto"
          >
            <NewsDisguise onUnlockRequest={handleUnlockRequest} />
            <AnimatePresence>
              {showPinPad && (
                <PinPad 
                    onSuccess={handlePinSuccess} 
                    onClose={() => setShowPinPad(false)} 
                />
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative min-h-screen">
            {children}
            {/* Secret Re-lock Button (Bottom Right Corner) */}
            <button 
                  onClick={toggleDisguise} 
                  className="fixed bottom-0 right-0 w-16 h-16 opacity-0 hover:opacity-10 z-[200] cursor-default"
                  title="Lock App"
                  aria-hidden="true"
             />
          </motion.div>
        )}
      </AnimatePresence>
    </DisguiseContext.Provider>
  );
}
