'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldBan, AlertTriangle, Info, ShieldCheck, Loader2, ArrowLeft, Search, Sparkles, Zap, Package, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function RecallCentralPage() {
  const [loading, setLoading] = useState(true);
  const [recalls, setRecalls] = useState<any[]>([
    { id: 1, item: 'iPhone 15 Pro', brand: 'Apple', type: 'critical', message: 'Recall de Bateria: Risco de superaquecimento em lotes específicos.', action: 'Agendar troca na Apple Store.' },
    { id: 2, item: 'Macbook Air M2', brand: 'Apple', type: 'warning', message: 'Desgaste prematuro do revestimento da tela relatado por usuários.', action: 'Monitorar e evitar produtos de limpeza abrasivos.' },
    { id: 3, item: 'Geladeira Samsung', brand: 'Samsung', type: 'info', message: 'Atualização de Firmware disponível para economia de energia.', action: 'Conectar ao SmartThings para atualizar.' },
  ]);
  const supabase = createClient();

  useEffect(() => {
    // Simulação de carregamento de recalls vinculados aos itens do usuário
    setTimeout(() => setLoading(false), 1200);
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Recall <span className="text-red-600">Central</span></h1>
          <p className="text-slate-500 font-medium text-sm">Monitoramento global de falhas e alertas de segurança.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
          <Zap className="h-4 w-4 animate-pulse" /> Monitor Ativo 24/7
        </div>
      </header>

      {/* Busca Global de Recalls */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
        <input 
          type="text" 
          placeholder="Pesquisar recalls por marca ou modelo (Ex: Toyota, Sony Bravia)..."
          className="w-full h-16 pl-12 pr-4 bg-white dark:bg-slate-900 border-2 border-teal-50 dark:border-white/5 rounded-[24px] focus:outline-none focus:border-emerald-500 shadow-xl shadow-emerald-500/5 font-medium"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Button className="h-10 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest gap-2">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> IA Search
          </Button>
        </div>
      </div>

      <div className="grid gap-8">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <ShieldBan className="h-4 w-4" /> Alertas para seus Bens Cadastrados
        </h3>
        
        <AnimatePresence mode="popLayout">
          {recalls.map((recall, idx) => (
            <motion.div 
              key={recall.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className={`border-none shadow-xl overflow-hidden group transition-all hover:scale-[1.01] bg-white dark:bg-slate-900`}>
                <div className={`h-1.5 w-full ${recall.type === 'critical' ? 'bg-red-500' : recall.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-start gap-6">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      recall.type === 'critical' ? 'bg-red-50 text-red-600' : 
                      recall.type === 'warning' ? 'bg-amber-50 text-amber-600' : 
                      'bg-emerald-50 text-emerald-600'
                    }`}>
                      {recall.type === 'critical' ? <AlertTriangle className="h-7 w-7" /> : <Info className="h-7 w-7" />}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tighter">{recall.item}</h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[8px] font-black uppercase tracking-widest">{recall.brand}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl">{recall.message}</p>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Ação do Proprietário:</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">{recall.action}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <Button variant="outline" className="h-12 px-6 font-black uppercase text-[10px] tracking-widest border-slate-200 dark:border-white/10">Ver Detalhes</Button>
                    <Button className="h-12 px-6 font-black uppercase text-[10px] tracking-widest bg-slate-900 text-white gap-2">
                      <ExternalLink className="h-3.5 w-3.5" /> Site Oficial
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Card className="border-none shadow-2xl bg-slate-900 text-white p-10 relative overflow-hidden group">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700">
          <ShieldCheck className="h-48 w-48 text-emerald-500" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
            <ShieldCheck className="h-4 w-4" /> Compromisso de Segurança
          </div>
          <h2 className="text-3xl font-black leading-tight max-w-xl uppercase tracking-tighter">Auditamos mais de <span className="text-emerald-400">12.000 bases de recalls</span> mensalmente.</h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">O Guardião utiliza inteligência artificial para cruzar os dados dos seus bens com alertas globais da ANVISA, SENACON e agências internacionais.</p>
          <Button variant="ghost" className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest px-8 h-14 rounded-2xl border border-white/10">Relatório Geral de Recall</Button>
        </div>
      </Card>
    </div>
  );
}
