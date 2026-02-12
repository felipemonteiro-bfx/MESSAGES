'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Search, Package, ShieldCheck, User, Plus, FileText, Zap, X, LayoutDashboard, BarChart3, Wrench, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const togglePalette = useCallback(() => setIsOpen(prev => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        togglePalette();
      }
      if (e.key === 'Escape') setIsOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePalette]);

  // Busca Padrão (Fuzzy Search)
  useEffect(() => {
    if (query.length < 2 || isAiSearching) {
      if (!isAiSearching) setResults([]);
      return;
    }

    const searchItems = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('warranties')
        .select('id, name, category, folder')
        .ilike('name', `%${query}%`)
        .limit(5);
      
      setResults(data || []);
      setLoading(false);
    };

    const timer = setTimeout(searchItems, 300);
    return () => clearTimeout(timer);
  }, [query, supabase, isAiSearching]);

  // Busca Semântica IA (Feature de Elite)
  const handleAiSearch = async () => {
    if (query.length < 3) return;
    setIsAiSearching(true);
    setLoading(true);
    try {
      const { data: allItems } = await supabase.from('warranties').select('id, name, category, folder, price, purchase_date, store');
      
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const context = allItems?.map(i => `[ID:${i.id}] ${i.name} - Loja: ${i.store}, Preço: ${i.price}, Data: ${i.purchase_date}`).join('\n');
      const prompt = `Você é o buscador inteligente do Guardião de Notas.
      Contexto dos bens do usuário:\n${context}\n
      Pergunta de busca: "${query}"
      Analise os bens e retorne APENAS os IDs (separados por vírgula) dos 3 itens mais relevantes para a pergunta do usuário. Se nada for relevante, retorne "null".`;

      const result = await model.generateContent(prompt);
      const ids = result.response.text().split(',').map(id => id.trim());
      
      const filtered = allItems?.filter(i => ids.includes(i.id)) || [];
      setResults(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setIsAiSearching(false);
    }
  };

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
    setQuery('');
  };

  const actions = [
    { name: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, path: '/dashboard' },
    { name: 'Cofre Global', icon: <ShieldCheck className="h-4 w-4" />, path: '/vault' },
    { name: 'Cadastrar Nota', icon: <Plus className="h-4 w-4" />, path: '/products/new' },
    { name: 'Análises Pro', icon: <BarChart3 className="h-4 w-4" />, path: '/analytics' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[15vh] px-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[32px] shadow-2xl border border-teal-50 dark:border-white/5 overflow-hidden">
            <div className="p-6 flex items-center gap-4 border-b border-teal-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50">
              <Search className="h-6 w-6 text-emerald-600" />
              <input 
                autoFocus
                placeholder="Busque por nome ou faça uma pergunta à IA..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                className="w-full bg-transparent border-none focus:ring-0 text-xl font-medium text-slate-700 dark:text-slate-200"
              />
              <Button onClick={handleAiSearch} disabled={loading || query.length < 3} size="sm" className="h-10 px-4 rounded-xl bg-slate-900 text-white gap-2 shrink-0">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-emerald-400" />}
                <span className="hidden sm:inline">Busca IA</span>
              </Button>
            </div>

            <div className="max-h-[450px] overflow-y-auto p-4 no-scrollbar">
              {loading && !isAiSearching ? (
                <div className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" /></div>
              ) : results.length > 0 ? (
                <div className="space-y-2">
                  <p className="px-4 py-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                    {isAiSearching ? <><Sparkles className="h-3 w-3" /> Resultados da Inteligência Artificial</> : 'Ativos Localizados'}
                  </p>
                  {results.map((item) => (
                    <button key={item.id} onClick={() => navigateTo(`/products/${item.id}`)} className="w-full flex items-center justify-between px-4 py-4 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group">
                      <div className="flex items-center gap-4 text-left">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600"><Package className="h-5 w-5" /></div>
                        <div>
                          <p className="font-black text-slate-900 dark:text-white uppercase text-sm">{item.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{item.category} • {item.folder}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              ) : query.length < 2 && (
                <div className="space-y-2">
                  <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações de Atalho</p>
                  {actions.map((action, i) => (
                    <button key={i} onClick={() => navigateTo(action.path)} className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 group transition-all">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">{action.icon}</div>
                      <span className="font-black text-sm uppercase tracking-tight">{action.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-teal-50 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <span>↑↓ Navegar</span>
                <span>ENTER Abrir</span>
                <span>ESC Fechar</span>
              </div>
              <div className="text-[10px] font-black text-emerald-600 uppercase">Semantic IA Engine</div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};