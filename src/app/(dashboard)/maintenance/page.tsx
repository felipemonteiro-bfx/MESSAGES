'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Wrench, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Info, CalendarPlus, Home, Droplets, Paintbrush, Zap, ShieldCheck } from 'lucide-react';
import { formatDate, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { addMonths, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function MaintenanceSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  // Mock de Tarefas Prediais (Futuro: Viria do banco)
  const structuralTasks = [
    { id: 'p1', name: 'Limpeza de Caixa d\'água', category: 'Hidráulica', frequency: 6, lastDate: '2024-10-15', icon: <Droplets className="h-5 w-5" /> },
    { id: 'p2', name: 'Revisão Elétrica (Quadro)', category: 'Elétrica', frequency: 24, lastDate: '2023-05-20', icon: <Zap className="h-5 w-5" /> },
    { id: 'p3', name: 'Manutenção de Calhas', category: 'Estrutura', frequency: 12, lastDate: '2024-02-10', icon: <Home className="h-5 w-5" /> },
  ];

  useEffect(() => {
    fetchMaintenanceData();
  }, []);

  const fetchMaintenanceData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
    }
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

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Gestor de <span className="text-emerald-600">Conservação</span></h1>
          <p className="text-slate-500 font-medium">Cuide dos seus eletrônicos e da saúde da sua casa em um só lugar.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 border-emerald-100 text-emerald-700 font-bold h-12 shadow-sm">
            <CalendarPlus className="h-4 w-4" /> Sincronizar Agenda
          </Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Lado Esquerdo: Agenda de Ativos e Casa */}
        <div className="lg:col-span-2 space-y-10">
          
          <section className="space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-600" /> Próximas Intervenções
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.slice(0, 6).map((item) => (
                <motion.div key={item.id} whileHover={{ y: -5 }}>
                  <Card className={`border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900 ${item.daysToNext < 0 ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-emerald-500'}`}>
                    <CardContent className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.type === 'structural' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                              {item.type === 'structural' ? 'Imóvel' : 'Ativo'}
                            </span>
                          </div>
                          <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{item.name}</h4>
                        </div>
                        <div className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl text-slate-400">
                          {item.icon || <Wrench className="h-4 w-4" />}
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase">Previsão</p>
                          <p className={`text-sm font-black ${item.daysToNext < 0 ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                            {item.nextDate.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <p className={`text-[10px] font-bold uppercase ${item.daysToNext < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {item.daysToNext < 0 ? 'Atrasado' : `Faltam ${item.daysToNext}d`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>
        </div>

        {/* Lado Direito: Insights de Valorização Predial */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white p-8 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700">
              <ShieldCheck className="h-32 w-32 text-emerald-500" />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                <Home className="h-4 w-4" /> Home Health
              </div>
              <h3 className="text-2xl font-black leading-tight uppercase tracking-tighter">Valorize seu <span className="text-emerald-400">Imóvel.</span></h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">Manter um log de manutenção predial pode aumentar o valor de venda da sua casa em até 15% ao provar o cuidado estrutural.</p>
              <Button variant="ghost" className="w-full bg-white/10 text-white font-black text-[10px] uppercase h-12 border border-white/10">Ver Checklists Casa</Button>
            </div>
          </Card>

          <div className="p-8 rounded-[40px] bg-white dark:bg-slate-900 border border-teal-50 dark:border-white/5 shadow-xl space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">< Droplets className="h-4 w-4 text-blue-500" /> Dica de Outono</h4>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed">É época de limpar as calhas. Evite infiltrações que podem depreciar seu imóvel em milhares de reais.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
