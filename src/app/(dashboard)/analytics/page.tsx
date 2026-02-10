'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, DollarSign, Loader2, ArrowLeft, ShieldCheck, Download } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area 
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

  // Processamento de dados para os gráficos
  const monthlyData = [
    { name: 'Jan', valor: 0 }, { name: 'Fev', valor: 0 }, { name: 'Mar', valor: 0 },
    { name: 'Abr', valor: 0 }, { name: 'Mai', valor: 0 }, { name: 'Jun', valor: 0 }
  ];

  data.forEach(item => {
    const month = new Date(item.purchase_date).getMonth();
    if (month < 6) monthlyData[month].valor += Number(item.price || 0);
  });

  const categoryData = Array.from(new Set(data.map(item => item.category).filter(Boolean))).map(cat => ({
    name: cat,
    value: data.filter(i => i.category === cat).reduce((acc, curr) => acc + Number(curr.price || 0), 0)
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#059669', '#0891b2', '#0ea5e9', '#6366f1', '#8b5cf6'];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  if (!profile?.is_premium) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 bg-amber-100 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-amber-200">
          <BarChart3 className="h-12 w-12 text-amber-600" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Centro de Inteligência <span className="text-emerald-600">Pro</span></h1>
          <p className="text-slate-500 max-w-lg mx-auto font-medium">Gráficos de evolução patrimonial, análise de depreciação anual e relatórios detalhados são exclusivos para membros Pro.</p>
        </div>
        <Link href="/plans">
          <Button size="lg" className="h-16 px-12 text-lg">Liberar Acesso Pro Agora</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Análise de <span className="text-emerald-600">Patrimônio</span></h1>
          <p className="text-slate-500 font-medium">Entenda como seu dinheiro está distribuído.</p>
        </div>
        <Button variant="outline" className="gap-2 border-teal-100 font-bold">
          <Download className="h-4 w-4" /> Exportar Relatório Anual
        </Button>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gráfico de Investimento Mensal */}
        <Card className="border-none shadow-xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Calendar className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-lg">Investimento Mensal</CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Novas notas cadastradas por mês</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} fontVariant="black" axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v/1000}k`} />
                <Tooltip />
                <Area type="monotone" dataKey="valor" stroke="#059669" fillOpacity={1} fill="url(#colorValor)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Distribuição por Valor de Categoria */}
        <Card className="border-none shadow-xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600"><PieIcon className="h-5 w-5" /></div>
            <div>
              <CardTitle className="text-lg">Peso das Categorias</CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Onde seu patrimônio está concentrado</p>
            </div>
          </div>
          <div className="h-[300px] w-full flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `R$ ${v.toLocaleString('pt-BR')}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {categoryData.map((cat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-[10px] font-black text-slate-500 uppercase">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="bg-slate-900 text-white border-none p-8 text-center space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-500">Média por Nota</p>
          <div className="text-3xl font-black text-emerald-400">R$ {(data.reduce((a, b) => a + Number(b.price || 0), 0) / (data.length || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
        </Card>
        <Card className="bg-slate-900 text-white border-none p-8 text-center space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-500">Taxa de Proteção IA</p>
          <div className="text-3xl font-black text-cyan-400">100%</div>
        </Card>
        <Card className="bg-slate-900 text-white border-none p-8 text-center space-y-2">
          <p className="text-[10px] font-black uppercase text-slate-500">Maior Categoria</p>
          <div className="text-3xl font-black text-white">{categoryData[0]?.name || '---'}</div>
        </Card>
      </div>
    </div>
  );
}
