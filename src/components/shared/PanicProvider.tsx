'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, RefreshCw, Save, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const PANIC_MODE_KEY = 'n24h_panic_mode';
const PANIC_HASH_KEY = 'n24h_panic_hash';
const PANIC_SALT_KEY = 'n24h_panic_salt';
const PANIC_NOTES_KEY = 'n24h_disguise_notes';

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: encoder.encode(salt), iterations: 600000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return btoa(String.fromCharCode(...new Uint8Array(derivedBits)));
}

function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...salt));
}

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const PanicContext = createContext({
  isPanicked: false,
  togglePanic: () => {},
  setPanicPassword: (_pw: string) => Promise.resolve(),
});

export const usePanic = () => useContext(PanicContext);

export default function PanicProvider({ children }: { children: React.ReactNode }) {
  const [isPanicked, setIsPanicked] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [inputPw, setInputPw] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem(PANIC_MODE_KEY) === 'true';
    const savedNotes = localStorage.getItem(PANIC_NOTES_KEY) || '';
    setIsPanicked(savedMode);
    setNoteContent(savedNotes);
  }, []);

  const togglePanic = useCallback(() => {
    if (!isPanicked) {
      setIsPanicked(true);
      localStorage.setItem(PANIC_MODE_KEY, 'true');
      document.title = 'Minhas Anotações';
    } else {
      setShowUnlock(true);
    }
  }, [isPanicked]);

  const handleUnlock = useCallback(async () => {
    if (isVerifying) return;

    const storedHash = localStorage.getItem(PANIC_HASH_KEY);
    const storedSalt = localStorage.getItem(PANIC_SALT_KEY);

    if (!storedHash || !storedSalt) {
      if (inputPw === '1234') {
        toast.info('Defina uma nova senha nas Configurações.');
      }
      setIsPanicked(false);
      setShowUnlock(false);
      setInputPw('');
      localStorage.setItem(PANIC_MODE_KEY, 'false');
      document.title = 'Noticias24h - Brasil e Mundo';
      toast.success('Cofre restaurado com sucesso.');
      return;
    }

    setIsVerifying(true);
    try {
      const inputHash = await hashPassword(inputPw, storedSalt);
      if (constantTimeCompare(inputHash, storedHash)) {
        setIsPanicked(false);
        setShowUnlock(false);
        setInputPw('');
        localStorage.setItem(PANIC_MODE_KEY, 'false');
        document.title = 'Noticias24h - Brasil e Mundo';
        toast.success('Cofre restaurado com sucesso.');
      } else {
        toast.error('Senha de acesso incorreta.');
        setInputPw('');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [inputPw, isVerifying]);

  const handleNoteChange = useCallback((val: string) => {
    setNoteContent(val);
    localStorage.setItem(PANIC_NOTES_KEY, val);
  }, []);

  const setPanicPassword = useCallback(async (pw: string) => {
    const salt = generateSalt();
    const hash = await hashPassword(pw, salt);
    localStorage.setItem(PANIC_HASH_KEY, hash);
    localStorage.setItem(PANIC_SALT_KEY, salt);
  }, []);

  return (
    <PanicContext.Provider value={{ isPanicked, togglePanic, setPanicPassword }}>
      <AnimatePresence mode="wait">
        {isPanicked ? (
          <motion.div
            key="panic"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-[#fcfcfc] text-slate-700 p-4 md:p-12 font-serif transition-colors"
          >
            <div className="max-w-3xl mx-auto space-y-8">
              <header className="flex justify-between items-center border-b pb-6 border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200">
                    <Pencil className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-medium text-slate-800">Bloco de Notas Pessoal</h1>
                    <p className="text-[10px] font-sans uppercase text-slate-400 font-bold tracking-widest">
                      Sincronizado via Nuvem
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toast.success('Notas salvas localmente.')}
                    className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
                    title="Salvar"
                  >
                    <Save className="h-5 w-5" />
                  </button>
                  <button
                    onClick={togglePanic}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all text-slate-500 font-sans text-xs font-bold border border-slate-200"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sincronizar Dados
                  </button>
                </div>
              </header>

              <AnimatePresence>
                {showUnlock && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-6"
                  >
                    <div className="bg-white p-10 rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] space-y-6 max-w-sm w-full text-center font-sans border border-slate-100">
                      <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto border border-slate-100">
                        <Lock className="h-8 w-8 text-slate-400" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                          Desbloquear Cofre
                        </h2>
                        <p className="text-xs text-slate-400 font-medium">
                          Digite sua chave de segurança para sair do modo discreto.
                        </p>
                      </div>
                      <input
                        autoFocus
                        type="password"
                        value={inputPw}
                        onChange={(e) => setInputPw(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                        className="w-full h-14 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-slate-300 transition-all"
                        placeholder="••••"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={handleUnlock}
                          disabled={isVerifying}
                          className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all shadow-lg disabled:opacity-50"
                        >
                          {isVerifying ? 'Verificando...' : 'Entrar'}
                        </button>
                        <button
                          onClick={() => {
                            setShowUnlock(false);
                            setInputPw('');
                          }}
                          className="flex-1 h-14 bg-slate-100 text-slate-500 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-6">
                <div className="p-6 bg-amber-50/50 border-l-4 border-amber-200 rounded-r-2xl">
                  <p className="text-sm italic text-slate-500 font-medium">
                    &ldquo;Lembrar de ligar para a oficina na quinta-feira para ver o orçamento da
                    revisão. Não esquecer de levar o comprovante.&rdquo;
                  </p>
                </div>

                <textarea
                  value={noteContent}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  className="w-full min-h-[500px] bg-transparent border-none focus:ring-0 text-xl leading-relaxed resize-none placeholder:text-slate-200 outline-none"
                  placeholder="Comece a digitar suas notas aqui..."
                />
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </PanicContext.Provider>
  );
}
