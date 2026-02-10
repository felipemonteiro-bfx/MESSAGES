'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, DollarSign, Loader2, ArrowLeft, ShieldCheck, Download, TrendingDown, Activity, BatteryCharging, HeartPulse } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

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

  const getHealthScore = (item: any) => {
    const purchaseDate = new Date(item.purchase_date);
    const monthsOwned = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const estimatedLifeMonths = 60; // Média de 5 anos para eletrônicos
    return Math.max(0, Math.round(((estimatedLifeMonths - monthsOwned) / estimatedLifeMonths) * 100));
  };

  const totalOriginalValue = data.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
  const averageHealth = data.length > 0 ? Math.round(data.reduce((acc, curr) => acc + getHealthScore(curr), 0) / data.length) : 0;

  const categoryData = Array.from(new Set(data.map(item => item.category).filter(Boolean))).map(cat => ({
    name: cat,
    value: data.filter(i => i.category === cat).reduce((acc, curr) => acc + Number(curr.price || 0), 0)
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#059669', '#0891b2', '#0ea5e9', '#6366f1', '#8b5cf6'];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  if (!profile?.is_premium) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 bg-indigo-100 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200"><TrendingUp className="h-12 w-12 text-indigo-600" /></div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Centro de Inteligência <span className="text-emerald-600">Pro</span></h1>
          <p className="text-slate-500 max-w-lg mx-auto font-medium">Análise de vida útil, saúde técnica dos bens e relatórios de reinvestimento são exclusivos para membros Pro.</p>
        </div>
        <Link href="/plans"><Button size="lg" className="h-16 px-12 text-lg">Ativar Inteligência Pro</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Saúde do <span className="text-emerald-600">Patrimônio</span></h1>
          <p className="text-slate-500 font-medium">Análise técnica e financeira do ciclo de vida dos seus bens.</p>
        </div>
        <Button variant="outline" className="gap-2 border-teal-100 font-bold"><Download className="h-4 w-4" /> Relatório Técnico PDF</Button>
      </header>

      {/* Overview de Saúde */}
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="border-none shadow-xl p-8 bg-slate-900 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Score de Longevidade</p>
              <HeartPulse className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-5xl font-black">{averageHealth}%</div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">Média de vida útil restante baseada no tempo de uso dos seus bens.</p>
          </div>
        </Card>

        <Card className="border-none shadow-xl p-8 bg-emerald-600 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest">Patrimônio Auditado</p>
              <ShieldCheck className="h-5 w-5 text-white opacity-50" />
            </div>
            <div className="text-2xl font-black uppercase tracking-tighter">R$ {totalOriginalValue.toLocaleString('pt-BR')}</div>
            <p className="text-xs text-emerald-100 font-medium leading-relaxed">Valor original monitorado e documentado pelo Guardião.</p>
          </div>
        </Card>

        <Card className="border-none shadow-xl p-8 bg-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Próximo Ciclo</p>
              <BatteryCharging className="h-5 w-5 text-cyan-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 uppercase tracking-tighter">2027 - 2028</div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Período estimado para necessidade de renovação de 30% dos bens.</p>
          </div>
        </Card>
      </div>

      {/* Gráfico de Saúde Técnica por Categoria */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card className="border-none shadow-xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Activity className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-lg">Vitalidade Patrimonial</CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Vida útil por categoria (estimativa)</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontVariant="black" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="value" fill="#059669" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-none shadow-xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600"><PieIcon className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-lg">Concentração de Risco</CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Onde seu capital está imobilizado</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
