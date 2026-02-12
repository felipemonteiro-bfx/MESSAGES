'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Wrench, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Info, CalendarPlus, Home, Droplets, Paintbrush, Zap, ShieldCheck, Hammer, Building2, ListChecks, FileText, Plus } from 'lucide-react';
import { formatDate, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { addMonths, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function MaintenanceSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'structural'>('all');
  const supabase = createClient();

  const structuralTasks = [
    { id: 'p1', name: 'Limpeza de Caixa d\'água', category: 'Hidráulica', frequency: 6, lastDate: '2024-10-15', icon: <Droplets className="h-5 w-5" /> },
    { id: 'p2', name: 'Revisão Elétrica (Quadro)', category: 'Elétrica', frequency: 24, lastDate: '2023-05-20', icon: <Zap className="h-5 w-5" /> },
    { id: 'p3', name: 'Pintura e Fachada', category: 'Conservação', frequency: 60, lastDate: '2021-08-10', icon: <Paintbrush className="h-5 w-5" /> },
    { id: 'p4', name: 'Manutenção de Elevadores', category: 'Mecânica', frequency: 1, lastDate: '2025-01-30', icon: <Building2 className="h-5 w-5" /> },
  ];

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    const { data } = await supabase.from('warranties').select('*');
    
    const assetItems = (data || []).map(item => {
      const baseDate = item.last_maintenance_date ? parseISO(item.last_maintenance_date) : parseISO(item.purchase_date);
      const nextDate = addMonths(baseDate, item.maintenance_frequency_months || 6);
      const daysToNext = differenceInDays(nextDate, new Date());
      return { ...item, nextDate, daysToNext, type: 'asset' };
    });

    const houseItems = structuralTasks.map(task => {
      const nextDate = addMonths(parseISO(task.lastDate), task.frequency);
      const daysToNext = differenceInDays(nextDate, new Date());
      return { ...task, nextDate, daysToNext, type: 'structural' };
    });

    setItems([...assetItems, ...houseItems].sort((a, b) => a.daysToNext - b.daysToNext));
    setLoading(false);
  };

  const filteredItems = activeTab === 'all' ? items : items.filter(i => i.type === 'structural');

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Gestor de <span className="text-emerald-600">Conservação</span></h1>
          <p className="text-slate-500 font-medium">Cronograma inteligente para ativos móveis e patrimônio predial.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-emerald-100 text-emerald-700 font-black h-12 shadow-sm uppercase text-[10px] tracking-widest">
            <FileText className="h-4 w-4" /> Laudo de Vistoria
          </Button>
          <Button className="gap-2 bg-slate-900 text-white font-black h-12 px-6 shadow-xl shadow-slate-900/20 uppercase text-[10px] tracking-widest">
            <Plus className="h-4 w-4" /> Nova Tarefa
          </Button>
        </div>
      </header>

      {/* Filtros de Categoria */}
      <div className="flex gap-4 p-1 bg-white dark:bg-slate-900 border border-teal-50 dark:border-white/5 rounded-2xl w-fit">
        <button onClick={() => setActiveTab('all')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'all' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Todos os Ativos</button>
        <button onClick={() => setActiveTab('structural')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'structural' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Manutenção Predial</button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="popLayout">
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredItems.map((item) => (
                <motion.div key={item.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Card className={`border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900 group ${item.daysToNext < 0 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'}`}>
                    <CardContent className="p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.type === 'structural' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20'}`}>
                            {item.type === 'structural' ? 'Imóvel' : 'Ativo Físico'}
                          </span>
                          <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none group-hover:text-emerald-600 transition-colors">{item.name}</h4>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                          {item.icon || <Wrench className="h-5 w-5" />}
                        </div>
                      </div>
                      
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Próxima Revisão</p>
                          <p className={`text-md font-black ${item.daysToNext < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>{item.nextDate.toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${item.daysToNext < 0 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                          {item.daysToNext < 0 ? 'Atrasado' : `Em ${item.daysToNext}d`}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-2xl bg-slate-900 text-white p-10 relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700"><ListChecks className="h-48 w-48 text-emerald-500" /></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest"><ShieldCheck className="h-4 w-4" /> Conformidade Predial</div>
              <h3 className="text-2xl font-black leading-tight uppercase tracking-tighter">Saúde da sua <span className="text-emerald-400">Edificação.</span></h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">O Guardião agora monitora itens de segurança predial. Manter esses logs em dia garante a validade do seu Seguro Residencial em caso de perícia técnica.</p>
              <Button variant="ghost" className="w-full bg-white/10 text-white font-black text-[10px] uppercase h-14 border border-white/10 hover:bg-white/20 rounded-2xl">Gerar Laudo para Seguro</Button>
            </div>
          </Card>

          <div className="p-8 rounded-[40px] bg-white dark:bg-slate-900 border border-teal-50 dark:border-white/5 shadow-xl space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Hammer className="h-4 w-4 text-emerald-600" /> Dica de Auditoria</h4>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic">"Manter o quadro elétrico revisado anualmente reduz o risco de incêndios em 85%. Registre sua última revisão hoje."</p>
          </div>
        </div>
      </div>
    </div>
  );
}