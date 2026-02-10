'use client';

import { createClient } from '@/lib/supabase/client';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, ShieldCheck, Plus, Wallet, TrendingUp, X, CheckCircle2, FolderOpen, BarChart3, QrCode, Lock, CreditCard, Sparkles, Loader2, Fingerprint, ListChecks, ArrowRight, ShieldAlert, Calendar, Target, Pencil, Activity, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [greeting, setGreeting] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData || { full_name: user.user_metadata?.full_name, is_premium: false });
      const { data: warrantyData } = await supabase.from('warranties').select('*').order('created_at', { ascending: false });
      if (warrantyData) setWarranties(warrantyData);
    }
    setLoading(false);
  };

  // Lógica do Concierge: Gerar tarefas baseadas na falta de dados
  const conciergeTasks = warranties.flatMap(w => {
    const tasks = [];
    if (!w.invoice_url) tasks.push({ id: `inv-${w.id}`, text: `Anexar Nota Fiscal: ${w.name}`, priority: 'high', type: 'doc', link: `/products/edit/${w.id}` });
    if (!w.serial_number) tasks.push({ id: `sn-${w.id}`, text: `Registrar S/N: ${w.name}`, priority: 'medium', type: 'security', link: `/products/edit/${w.id}` });
    if (!w.insurance_policy && Number(w.price) > 3000) tasks.push({ id: `ins-${w.id}`, text: `Simular Seguro: ${w.name}`, priority: 'low', type: 'money', link: `/insurance/compare/${w.id}` });
    return tasks;
  }).slice(0, 4);

  const totalValue = warranties.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const healthScore = warranties.length > 0 ? Math.round((warranties.filter(w => !!w.invoice_url && !!w.serial_number).length / warranties.length) * 100) : 100;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">{greeting}, <span className="text-emerald-600">{profile?.full_name?.split(' ')[0] || 'Guardião'}</span>!</h1>
          <p className="text-slate-500 font-medium">Seu ecossistema patrimonial está sob vigilância.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/products/new"><Button size="lg" className="shadow-2xl shadow-emerald-500/20 dark:shadow-none font-bold h-12 rounded-2xl"><Plus className="h-5 w-5 mr-2" /> Nova Nota</Button></Link>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Widget principal: Concierge de Tarefas */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative group">
          <div className="h-1.5 w-full bg-emerald-500" />
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tighter">
                <BellRing className="h-5 w-5 text-emerald-600" /> Guardião Concierge
              </CardTitle>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações recomendadas pela IA para segurança total</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{conciergeTasks.length} Pendências</div>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-4">
            {conciergeTasks.length === 0 ? (
              <div className="py-10 text-center space-y-4 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <p className="text-sm text-slate-400 font-bold uppercase">Patrimônio 100% Auditado!</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {conciergeTasks.map((task) => (
                  <Link key={task.id} href={task.link}>
                    <motion.div whileHover={{ x: 5 }} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-between group/task">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${task.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                          {task.type === 'doc' ? <FileSearch className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                        </div>
                        <span className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter truncate max-w-[150px]">{task.text}</span>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover/task:text-emerald-600 transition-colors" />
                    </motion.div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Widget Lateral: Saúde do Patrimônio */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white p-8 relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700"><Activity className="h-32 w-32 text-emerald-500" /></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]"><ShieldCheck className="h-4 w-4" /> Asset Health</div>
              <div className="space-y-1">
                <p className="text-5xl font-black tracking-tighter">{healthScore}%</p>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Integridade Digital Global</p>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${healthScore}%` }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8 flex flex-col justify-center">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center gap-2"><Wallet className="h-4 w-4 text-emerald-600" /> Balanço Consolidado</p>
            <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {totalValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-2">Capital Documentado Ativo</p>
          </Card>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div layout className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 pt-10 border-t border-slate-100 dark:border-white/5">
          {warranties.map((w) => (<WarrantyCard key={w.id} warranty={w} />))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

import { FileSearch } from 'lucide-react';
