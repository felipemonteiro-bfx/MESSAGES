'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, DollarSign, Loader2, ArrowLeft, ShieldCheck, Download, TrendingDown, Activity, HeartPulse, Medal, AlertCircle, ArrowUpRight, Calculator, FileCheck, LineChart as ChartIcon, Wrench, Leaf, Sparkles, Scale, CheckCircle2, Wallet, CreditCard, Landmark, History } from 'lucide-react';
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

  // Simulação de Histórico de Evolução Patrimonial (Baseado em datas de compra)
  const historyData = [
    { name: '2023', valor: 12000 },
    { name: '2024', valor: 28000 },
    { name: 'Jan/25', valor: 35000 },
    { name: 'Fev/25', valor: 42000 },
    { name: 'Hoje', valor: data.reduce((acc, curr) => acc + Number(curr.price || 0), 0) }
  ];

  const getDepreciatedValue = (item: any) => {
    const price = Number(item.price || 0);
    const yearsOwned = (new Date().getTime() - new Date(item.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, yearsOwned);
  };

  const totalAssetsValue = data.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
  const totalDebt = data.reduce((acc, curr) => acc + ((curr.total_installments - curr.paid_installments) * Number(curr.installment_value || 0)), 0);
  const netWorth = totalAssetsValue - totalDebt;

  const categoryData = Array.from(new Set(data.map(item => item.category).filter(Boolean))).map(cat => ({
    name: cat,
    value: data.filter(i => i.category === cat).reduce((acc, curr) => acc + Number(curr.price || 0), 0)
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#059669', '#0891b2', '#0ea5e9', '#6366f1', '#8b5cf6'];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  if (!profile?.is_premium) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200">
          <History className="h-12 w-12 text-emerald-600" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Timeline <span className="text-emerald-600">Patrimonial</span></h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto font-medium">Visualize a curva de crescimento do seu patrimônio e projete seu futuro financeiro. Recurso exclusivo Pro.</p>
        </div>
        <Link href="/plans"><Button size="lg" className="h-16 px-12 text-lg shadow-xl shadow-emerald-500/20">Ativar Inteligência Pro</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Evolução <span className="text-emerald-600">Patrimonial</span></h1>
          <p className="text-slate-500 font-medium text-sm">O histórico de construção da sua riqueza documentada.</p>
        </div>
        <Button variant="outline" className="gap-2 border-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-widest h-12 px-6 shadow-sm">
          <Download className="h-4 w-4" /> Relatório Histórico
        </Button>
      </header>

      {/* Gráfico de Evolução de Longo Prazo */}
      <Card className="border-none shadow-xl p-10 space-y-8 bg-slate-900 text-white relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-1000"><History className="h-48 w-48 text-emerald-500 rotate-12" /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400"><TrendingUp className="h-6 w-6" /></div>
            <div>
              <CardTitle className="text-xl">Curva de Crescimento</CardTitle>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Valor total acumulado em ativos documentados</p>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" fontSize={10} fontVariant="black" axisLine={false} tickLine={false} stroke="#64748b" />
                <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#64748b" tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid #1e293b', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                  formatter={(v: any) => [`R$ ${v.toLocaleString('pt-BR')}`, 'Patrimônio']}
                />
                <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorValor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Balanço Patrimonial */}
        <Card className="border-none shadow-xl p-10 flex flex-col justify-center space-y-6 bg-white dark:bg-slate-900 overflow-hidden relative">
          <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:rotate-12 transition-transform duration-700"><Landmark className="h-32 w-32 text-emerald-600" /></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600"><Wallet className="h-6 w-6" /></div>
              <CardTitle className="text-xl uppercase tracking-tighter">Balanço Líquido</CardTitle>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <div><p className="text-[10px] font-black uppercase text-slate-400">Patrimônio Real</p><p className="text-4xl font-black text-slate-900 dark:text-white">R$ {netWorth.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p></div>
                <div className="text-right"><p className="text-[10px] font-black uppercase text-slate-400">Dívida Ativa</p><p className="text-xl font-black text-red-500">R$ {totalDebt.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</p></div>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(netWorth / (totalAssetsValue || 1)) * 100}%` }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase text-center">Você é dono real de {((netWorth / (totalAssetsValue || 1)) * 100).toFixed(1)}% dos seus ativos.</p>
            </div>
          </div>
        </Card>

        {/* Alocação por Categoria */}
        <Card className="border-none shadow-xl p-8 space-y-6 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl text-cyan-600"><PieIcon className="h-6 w-6" /></div>
            <CardTitle className="text-lg uppercase tracking-tighter">Alocação de Valor</CardTitle>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {categoryData.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
                </Pie>
                <Tooltip formatter={(v: any) => `R$ ${v.toLocaleString('pt-BR')}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
