'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, DollarSign, Loader2, ArrowLeft, ShieldCheck, Download, TrendingDown, Activity, HeartPulse, Medal, AlertCircle, ArrowUpRight, Calculator, FileCheck, LineChart as ChartIcon, Wrench, Leaf, Sparkles, Scale, CheckCircle2, Wallet, CreditCard, Landmark } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '@/lib/utils/date-utils';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      const { data: items } = await supabase.from('warranties').select('*');
      if (items) setData(items);
    }
    setLoading(false);
  };

  const getDepreciatedValue = (item: any) => {
    const price = Number(item.price || 0);
    const yearsOwned = (new Date().getTime() - new Date(item.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, yearsOwned);
  };

  // Lógica Financeira: Ativos vs Dívidas
  const totalAssetsValue = data.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
  const totalDebt = data.reduce((acc, curr) => acc + ((curr.total_installments - curr.paid_installments) * Number(curr.installment_value || 0)), 0);
  const netWorth = totalAssetsValue - totalDebt;
  const equityRatio = totalAssetsValue > 0 ? (netWorth / totalAssetsValue) * 100 : 0;

  const balanceData = [
    { name: 'Patrimônio Líquido', valor: netWorth, fill: '#059669' },
    { name: 'Dívida a Vencer', valor: totalDebt, fill: '#ef4444' }
  ];

  const categoryData = Array.from(new Set(data.map(item => item.category).filter(Boolean))).map(cat => ({
    name: cat,
    value: data.filter(i => i.category === cat).reduce((acc, curr) => acc + Number(curr.price || 0), 0)
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#059669', '#0891b2', '#0ea5e9', '#6366f1', '#8b5cf6'];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  if (!profile?.is_premium) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 bg-amber-100 dark:bg-amber-900/20 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-amber-200">
          <Landmark className="h-12 w-12 text-amber-600" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Balanço <span className="text-emerald-600">Patrimonial</span></h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto font-medium">Veja quanto do seu patrimônio já é realmente seu. A análise de ativos e dívidas é exclusiva Pro.</p>
        </div>
        <Link href="/plans"><Button size="lg" className="h-16 px-12 text-lg shadow-xl shadow-emerald-500/20">Liberar Inteligência Financeira</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Saúde <span className="text-emerald-600">Financeira</span></h1>
          <p className="text-slate-500 font-medium text-sm">Análise de capital imobilizado e compromissos futuros.</p>
        </div>
        <Button variant="outline" className="gap-2 border-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-widest h-12 px-6 shadow-sm">
          <FileCheck className="h-4 w-4" /> Balanço Consolidado
        </Button>
      </header>

      {/* Overview de Patrimônio Real */}
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-slate-900 text-white p-8 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700"><Landmark className="h-32 w-32 text-emerald-500" /></div>
          <div className="relative z-10 space-y-4">
            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Patrimônio Líquido</p>
            <div className="text-4xl font-black">R$ {netWorth.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-slate-400 font-medium">Valor total dos seus bens subtraindo as parcelas a pagar.</p>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8 relative overflow-hidden">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dívida Ativa (Cartão)</p>
            <div className="text-4xl font-black text-red-500">R$ {totalDebt.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <p className="text-xs text-slate-500 font-medium">Total de parcelas restantes de todos os bens cadastrados.</p>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-emerald-600 text-white p-8 relative overflow-hidden">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest">Índice de Posse</p>
            <div className="text-5xl font-black">{equityRatio.toFixed(1)}%</div>
            <p className="text-xs text-emerald-100 font-medium">Você é dono real de {equityRatio.toFixed(0)}% do que cadastrou.</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gráfico de Composição Financeira */}
        <Card className="border-none shadow-xl p-8 space-y-8 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600"><Wallet className="h-6 w-6" /></div>
            <div>
              <CardTitle className="text-xl">Balanço Ativos vs Passivos</CardTitle>
              <p className="text-xs text-slate-400 font-bold uppercase">Relação entre valor quitado e saldo devedor</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={10} fontVariant="black" axisLine={false} tickLine={false} width={120} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                  formatter={(v: any) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Valor']}
                />
                <Bar dataKey="valor" radius={[0, 10, 10, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Card de Meta Financeira */}
        <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-500/20 p-10 flex flex-col justify-center space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-emerald-600 shadow-sm"><TrendingUp className="h-6 w-6" /></div>
            <CardTitle className="text-xl uppercase tracking-tighter">Meta: Independência Patrimonial</CardTitle>
          </div>
          <p className="text-emerald-900 dark:text-emerald-100 font-medium leading-relaxed">Você está a **R$ {totalDebt.toLocaleString('pt-BR')}** de ser o dono integral do seu patrimônio atual. Ao quitar essas parcelas, seu Score de Liquidez subirá 15%.</p>
          <div className="pt-6 border-t border-emerald-200/50">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase">
              <CheckCircle2 className="h-4 w-4" /> Auditoria Financeira Pro Ativa
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}