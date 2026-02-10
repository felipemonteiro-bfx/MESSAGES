'use client';

import { createClient } from '@/lib/supabase/client';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, AlertCircle, ShieldCheck, Plus, Search, Filter, Wallet, FileDown, TrendingUp, X, Trophy, Share2, MessageCircle, Clock, BellRing, PieChart as ChartIcon, CheckCircle2, HeartHandshake, FolderOpen, BarChart3, Plane, QrCode, Lock, ArrowDownRight, ArrowUpRight, Calculator, Landmark, CreditCard, Sparkles, RefreshCcw, Zap, BrainCircuit, Loader2, SendHorizonal, DownloadCloud, Fingerprint, Cloud, ListChecks, ArrowRight, ShieldAlert, Calendar } from 'lucide-react';
import { calculateExpirationDate, getDaysRemaining, formatDate } from '@/lib/utils/date-utils';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  // Lógica de Parcelas: Filtrar itens que ainda possuem parcelas a pagar
  const installmentItems = warranties
    .filter(w => w.total_installments > w.paid_installments)
    .map(w => ({
      ...w,
      remainingAmount: (w.total_installments - w.paid_installments) * Number(w.installment_value || 0),
      remainingCount: w.total_installments - w.paid_installments
    }))
    .sort((a, b) => b.remainingAmount - a.marketValue);

  const totalMonthlyInstallment = installmentItems.reduce((acc, curr) => acc + Number(curr.installment_value || 0), 0);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">{greeting}, <span className="text-emerald-600">{profile?.full_name?.split(' ')[0] || 'Guardião'}</span>!</h1>
          <p className="text-slate-500 font-medium">Sua saúde patrimonial está monitorada.</p>
        </div>
        <Link href="/products/new"><Button size="lg" className="shadow-2xl shadow-emerald-200 dark:shadow-none font-bold h-12 rounded-2xl"><Plus className="h-5 w-5 mr-2" /> Nova Nota</Button></Link>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Principal: Ativos */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/10 skew-x-12 translate-x-10" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              <div className="space-y-4 text-center md:text-left">
                <h3 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2 text-emerald-400 uppercase tracking-widest"><ShieldCheck className="h-5 w-5" /> Patrimônio Gerido</h3>
                <div className="text-5xl font-black">R$ {warranties.reduce((acc, curr) => acc + Number(curr.price || 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">Valor total documentado e protegido sob sua titularidade digital.</p>
              </div>
            </div>
          </Card>

          <AnimatePresence mode="popLayout">
            <motion.div layout className="grid gap-6 md:grid-cols-2">
              {warranties.slice(0, 4).map((w) => (<WarrantyCard key={w.id} warranty={w} />))}
            </motion.div>
          </AnimatePresence>
          <div className="flex justify-center"><Link href="/vault"><Button variant="ghost" className="text-emerald-600 font-black uppercase text-[10px] tracking-widest">Ver todos os ativos no cofre</Button></Link></div>
        </div>

        {/* Sidebar: Compromissos Financeiros (Cartão de Crédito) */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden group">
            <div className="h-1.5 w-full bg-red-500" />
            <CardHeader className="p-6 pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><CreditCard className="h-4 w-4 text-red-500" /> Compromisso Mensal</CardTitle>
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 px-2 py-1 rounded-md text-[10px] font-black uppercase">Fatura Ativa</div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-black text-slate-900 dark:text-white">R$ {totalMonthlyInstallment.toLocaleString('pt-BR')}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Total em parcelas de ativos</p>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-4 space-y-4">
              <div className="space-y-3">
                {installmentItems.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Nenhum ativo parcelado no momento.</p>
                ) : (
                  installmentItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate max-w-[120px]">{item.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">{item.remainingCount} parcelas restantes</p>
                      </div>
                      <p className="text-xs font-black text-red-500">R$ {Number(item.installment_value).toLocaleString('pt-BR')}</p>
                    </div>
                  ))
                )}
              </div>
              <Button variant="outline" className="w-full h-12 text-[10px] font-black uppercase tracking-widest border-slate-100 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">Ver Cronograma Completo</Button>
            </CardContent>
          </Card>

          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4 relative overflow-hidden group">
            <div className="absolute right-[-10px] bottom-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700"><TrendingUp className="h-32 w-32" /></div>
            <h4 className="text-xl font-black leading-tight">Valorização Ativa</h4>
            <p className="text-xs font-medium text-emerald-100 leading-relaxed">Você já quitou **{Math.round(((warranties.reduce((acc, curr) => acc + (curr.paid_installments * Number(curr.installment_value || 0)), 0)) / (warranties.reduce((acc, curr) => acc + Number(curr.price || 1), 0)) * 100))}%** do seu patrimônio total documentado.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Ver ROI Detalhado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
