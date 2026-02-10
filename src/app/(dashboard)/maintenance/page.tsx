'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Wrench, Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle2, ArrowRight, Loader2, Info, CalendarPlus, Download, Share2 } from 'lucide-react';
import { formatDate, calculateExpirationDate, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { addMonths, parseISO, isAfter, differenceInDays } from 'date-fns';
import { toast } from 'sonner';

export default function MaintenanceSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

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
    if (data) {
      const itemsWithSchedules = data.map(item => {
        const baseDate = item.last_maintenance_date ? parseISO(item.last_maintenance_date) : parseISO(item.purchase_date);
        const nextDate = addMonths(baseDate, item.maintenance_frequency_months || 6);
        const daysToNext = differenceInDays(nextDate, new Date());
        return { ...item, nextDate, daysToNext };
      }).sort((a, b) => a.daysToNext - b.daysToNext);
      
      setItems(itemsWithSchedules);
    }
    setLoading(false);
  };

  const handleSyncAll = () => {
    if (!profile?.is_premium) {
      toast.error('Sincronização de Calendário Global é um recurso Pro!');
      return;
    }
    toast.success('Calendário sincronizado com sucesso!');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  const overdueItems = items.filter(i => i.daysToNext < 0);
  const upcomingItems = items.filter(i => i.daysToNext >= 0 && i.daysToNext <= 30);
  const healthyItems = items.filter(i => i.daysToNext > 30);

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Centro de <span className="text-emerald-600">Revisões</span></h1>
          <p className="text-slate-500 font-medium">Sua agenda inteligente para conservação de patrimônio.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleSyncAll} variant="outline" className="gap-2 border-emerald-100 text-emerald-700 font-black text-[10px] uppercase h-12 shadow-sm">
            <CalendarPlus className="h-4 w-4" /> Sincronizar Google/Apple
          </Button>
        </div>
      </header>

      {/* Seção de Alertas Críticos */}
      {overdueItems.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Atenção Necessária ({overdueItems.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {overdueItems.map(item => (
              <MaintenanceItemCard key={item.id} item={item} status="overdue" />
            ))}
          </div>
        </section>
      )}

      {/* Seção de Próximos 30 dias */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Próximos Agendamentos ({upcomingItems.length})
        </h3>
        {upcomingItems.length === 0 && overdueItems.length === 0 ? (
          <div className="py-20 rounded-[40px] border-2 border-dashed border-teal-100 bg-emerald-50/20 text-center space-y-4">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Tudo em dia com seu patrimônio</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcomingItems.map(item => (
              <MaintenanceItemCard key={item.id} item={item} status="upcoming" />
            ))}
          </div>
        )}
      </section>

      {/* Visão de Planejamento */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" /> Planejamento a Longo Prazo
        </h3>
        <Card className="border-none shadow-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Ativo</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Pasta</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Ciclo</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400">Próxima Revisão</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 text-right">Calendário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {healthyItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 font-black text-slate-900 text-sm uppercase tracking-tighter">{item.name}</td>
                    <td className="px-8 py-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest">{item.folder}</td>
                    <td className="px-8 py-6 font-bold text-slate-500 text-xs">{item.maintenance_frequency_months}m</td>
                    <td className="px-8 py-6 font-black text-emerald-600 text-xs">{item.nextDate.toLocaleDateString('pt-BR')}</td>
                    <td className="px-8 py-6 text-right">
                      <Button variant="ghost" size="sm" onClick={() => {
                        const link = generateICalLink(item.name, item.nextDate);
                        window.open(link, '_blank');
                        toast.success('Evento gerado para o calendário!');
                      }} className="h-10 w-10 p-0 rounded-xl hover:bg-emerald-50 text-emerald-600">
                        <CalendarPlus className="h-4.5 w-4.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}

function MaintenanceItemCard({ item, status }: { item: any, status: 'overdue' | 'upcoming' }) {
  const isOverdue = status === 'overdue';
  return (
    <motion.div whileHover={{ y: -5 }} className="h-full">
      <Card className={`h-full border-none shadow-xl overflow-hidden bg-white`}>
        <div className={`h-1.5 w-full ${isOverdue ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
        <CardContent className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 text-lg uppercase tracking-tighter leading-tight">{item.name}</h4>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.folder}</p>
            </div>
            <div className={`p-3 rounded-2xl ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
              <Wrench className="h-5 w-5" />
            </div>
          </div>
          
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[9px] font-black text-slate-400 uppercase">Previsão</p>
              <p className={`text-md font-black ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                {item.nextDate.toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase">Status</p>
              <p className={`text-[10px] font-bold uppercase ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>
                {isOverdue ? `Atrasado` : `Faltam ${item.daysToNext}d`}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/products/${item.id}`} className="flex-1">
              <Button className={`w-full h-12 font-black uppercase text-[10px] tracking-widest ${isOverdue ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-slate-900 hover:bg-black shadow-slate-200'}`}>
                Resolver Agora
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => {
              const link = generateICalLink(item.name, item.nextDate);
              window.open(link, '_blank');
            }} className="h-12 w-12 p-0 rounded-xl border-slate-100 hover:bg-emerald-50 text-emerald-600">
              <CalendarPlus className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}