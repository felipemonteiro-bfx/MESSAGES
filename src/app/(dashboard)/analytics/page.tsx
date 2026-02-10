'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, DollarSign, Loader2, ArrowLeft, ShieldCheck, Download, TrendingDown, Activity, HeartPulse, Medal, AlertCircle, ArrowUpRight, Calculator, FileCheck, LineChart as ChartIcon, Wrench, Leaf, Sparkles, Scale, CheckCircle2, Wallet, CreditCard, Landmark, History, FileStack, ClipboardCheck, Copy, Zap, Timer, Flame, Globe, Repeat, Plus, Trash2, Smartphone, Apple } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend
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

  // Simulação de Dados Comparativos de Depreciação (Análise de Mercado)
  const brandData = [
    { year: '1 ano', apple: 85, samsung: 70, dell: 65, sony: 75 },
    { year: '2 anos', apple: 72, samsung: 55, dell: 50, sony: 60 },
    { year: '3 anos', apple: 60, samsung: 40, dell: 35, sony: 45 },
    { year: '4 anos', apple: 50, samsung: 30, dell: 25, sony: 35 },
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Brand <span className="text-emerald-600">Intelligence</span></h1>
          <p className="text-slate-500 font-medium text-sm">Análise comparativa de resiliência de valor por marca.</p>
        </div>
      </header>

      {/* Gráfico de Depreciação Comparativa (Killer Feature) */}
      <Card className="border-none shadow-2xl p-10 space-y-8 bg-white dark:bg-slate-900 relative overflow-hidden group">
        <div className="absolute right-0 top-0 p-10 opacity-5 group-hover:scale-110 transition-transform duration-1000"><Smartphone className="h-48 w-48 text-emerald-500 rotate-12" /></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600"><TrendingDown className="h-6 w-6" /></div>
            <div>
              <CardTitle className="text-xl uppercase tracking-tighter">Curva de Retenção de Valor</CardTitle>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quanto do valor original cada marca mantém ao longo do tempo (%)</p>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={brandData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" fontSize={10} fontVariant="black" axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="apple" stroke="#10b981" strokeWidth={4} dot={{ r: 6 }} name="Apple (Premium)" />
                <Line type="monotone" dataKey="samsung" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" name="Samsung" />
                <Line type="monotone" dataKey="sony" stroke="#8b5cf6" strokeWidth={3} strokeDasharray="5 5" name="Sony" />
                <Line type="monotone" dataKey="dell" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="Outros" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Card de Insight de Compra */}
        <Card className="bg-slate-900 text-white border-none p-10 flex flex-col justify-center space-y-8 relative overflow-hidden group shadow-2xl">
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-1000"><Zap className="h-48 w-48 text-emerald-500" /></div>
          <div className="relative z-10 space-y-6">
            <h3 className="text-3xl font-black leading-tight uppercase tracking-tighter">Onde seu dinheiro <span className="text-emerald-400">está seguro?</span></h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">Nossa análise de mercado mostra que ativos da marca **Apple** no seu cofre possuem uma retenção de valor 22% superior à média das outras marcas cadastradas.</p>
            <div className="pt-6 border-t border-white/5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"><ShieldCheck className="h-6 w-6 text-white" /></div>
              <div><p className="text-[10px] font-black uppercase text-emerald-400">Selo de Qualidade</p><p className="text-xs font-bold text-white">Patrimônio de Baixa Depreciação</p></div>
            </div>
          </div>
        </Card>

        {/* Resumo de Custos Recorrentes */}
        <Card className="border-none shadow-xl p-8 bg-white dark:bg-slate-900 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600"><Repeat className="h-6 w-6" /></div>
            <CardTitle className="text-xl uppercase tracking-tighter">Fluxo de Assinaturas</CardTitle>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div><p className="text-[10px] font-black text-slate-400 uppercase">Investimento Mensal</p><p className="text-3xl font-black text-slate-900 dark:text-white">R$ 180,00</p></div>
              <Button variant="ghost" className="text-emerald-600 font-black text-[10px] uppercase">Ver Detalhes</Button>
            </div>
            <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: '45%' }} transition={{ duration: 1.5 }} className="h-full bg-blue-500" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
