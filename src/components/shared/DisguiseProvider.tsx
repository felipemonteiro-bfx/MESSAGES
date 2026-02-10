'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Pencil, Check } from 'lucide-react';

const DisguiseContext = createContext({
  isDisguised: false,
  toggleDisguise: () => {},
});

export const useDisguise = () => useContext(DisguiseContext);

export default function DisguiseProvider({ children }: { children: React.ReactNode }) {
  const [isDisguised, setIsDisguised] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('disguise_mode') === 'true';
    setIsDisguised(saved);
  }, []);

  const toggleDisguise = () => {
    const newState = !isDisguised;
    setIsDisguised(newState);
    localStorage.setItem('disguise_mode', newState.toString());
    // Mudar o título da aba do navegador para camuflar
    document.title = newState ? "Minhas Notas Pessoais" : "Guardião de Notas - Gestão Patrimonial";
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
            className="min-h-screen bg-[#fafafa] text-slate-800 p-8 font-serif"
          >
            <div className="max-w-2xl mx-auto space-y-10">
              <div className="flex justify-between items-center border-b pb-4 border-slate-200">
                <h1 className="text-2xl font-medium">Bloco de Notas</h1>
                <button onClick={toggleDisguise} className="opacity-0 w-10 h-10">Secret</button>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="mt-1 h-5 w-5 rounded border border-slate-300 flex items-center justify-center"><Check className="h-3 w-3 text-slate-300" /></div>
                  <p className="text-lg">Comprar pão e leite na volta do trabalho.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="mt-1 h-5 w-5 rounded border border-slate-300 flex items-center justify-center"><Check className="h-3 w-3 text-slate-300" /></div>
                  <p className="text-lg">Ligar para o dentista e desmarcar consulta.</p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="mt-1 h-5 w-5 rounded border border-slate-300"></div>
                  <p className="text-lg">Pesquisar roteiro para viagem de final de ano.</p>
                </div>
                <textarea className="w-full h-64 bg-transparent border-none focus:ring-0 text-lg resize-none" placeholder="Continuar escrevendo..."></textarea>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </DisguiseContext.Provider>
  );
}
