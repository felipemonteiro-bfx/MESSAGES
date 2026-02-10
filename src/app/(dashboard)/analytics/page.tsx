'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, DollarSign, Loader2, ArrowLeft, ShieldCheck, Download, TrendingDown, Activity, HeartPulse, Medal, AlertCircle, ArrowUpRight, Calculator, FileCheck, LineChart as ChartIcon, Wrench, Leaf, Recycle, Wind } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, calculateExpirationDate } from '@/lib/utils/date-utils';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
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
      const { data: logData } = await supabase.from('maintenance_logs').select('*');
      if (logData) setLogs(logData);
    }
    setLoading(false);
  };

  // Lógica Eco-Impacto: 1 manutenção = prolonga vida em 20% = evita ~2kg de CO2 e 0.5kg de lixo
  const ecoMetrics = {
    co2Saved: logs.length * 2.4, // kg de CO2
    wasteAvoided: logs.length * 0.8, // kg de lixo eletrônico
    lifeProlonged: logs.length * 6, // meses extras de vida útil somados
  };

  const getDepreciatedValue = (item: any) => {
    const price = Number(item.price || 0);
    const yearsOwned = (new Date().getTime() - new Date(item.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, yearsOwned);
  };

  const categoryData = Array.from(new Set(data.map(item => item.category).filter(Boolean))).map(cat => ({
    name: cat,
    value: data.filter(i => i.category === cat).reduce((acc, curr) => acc + Number(curr.price || 0), 0)
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#059669', '#0891b2', '#0ea5e9', '#6366f1', '#8b5cf6'];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  if (!profile?.is_premium) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 bg-emerald-100 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200"><Leaf className="h-12 w-12 text-emerald-600" /></div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Eco <span className="text-emerald-600">Analytics</span></h1>
          <p className="text-slate-500 max-w-lg mx-auto font-medium">Veja seu impacto positivo no planeta ao cuidar dos seus bens. O monitor de sustentabilidade é exclusivo Pro.</p>
        </div>
        <Link href="/plans"><Button size="lg" className="h-16 px-12 text-lg">Ativar Modo Sustentável</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Impacto <span className="text-emerald-600">Positivo</span></h1>
          <p className="text-slate-500 font-medium text-sm">O valor ambiental de manter seu patrimônio em dia.</p>
        </div>
        <Button variant="outline" className="gap-2 border-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-widest h-12 px-6 shadow-sm">
          <Recycle className="h-4 w-4" /> Certificado Eco-Guardião
        </Button>
      </header>

      {/* Grid de Impacto Ambiental */}
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-emerald-600 text-white p-8 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:rotate-12 transition-transform duration-700"><Wind className="h-32 w-32" /></div>
          <div className="relative z-10 space-y-4">
            <p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest">CO2 Evitado</p>
            <div className="text-5xl font-black">{ecoMetrics.co2Saved.toFixed(1)} <span className="text-lg">kg</span></div>
            <p className="text-xs text-emerald-100 font-medium">Equivalente a {Math.round(ecoMetrics.co2Saved / 0.5)} árvores plantadas.</p>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-slate-900 text-white p-8 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:-rotate-12 transition-transform duration-700"><Recycle className="h-32 w-32 text-emerald-500" /></div>
          <div className="relative z-10 space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Lixo Eletrônico Evitado</p>
            <div className="text-5xl font-black">{ecoMetrics.wasteAvoided.toFixed(1)} <span className="text-lg">kg</span></div>
            <p className="text-xs text-slate-400 font-medium">Peso total de componentes que não foram para o descarte.</p>
          </div>
        </Card>

        <Card className="border-none shadow-xl bg-white p-8 relative overflow-hidden">
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Vida Útil Adicional</p>
            <div className="text-5xl font-black text-slate-900">{ecoMetrics.lifeProlonged} <span className="text-lg text-slate-400">meses</span></div>
            <p className="text-xs text-slate-500 font-medium">Tempo total que você estendeu a vida dos seus bens através do Guardião.</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Card de ROI de Sustentabilidade */}
        <Card className="border-none shadow-xl bg-white p-10 flex flex-col justify-center space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600"><Leaf className="h-6 w-6" /></div>
            <CardTitle className="text-xl">Por que cuidar é sustentável?</CardTitle>
          </div>
          <p className="text-slate-600 font-medium leading-relaxed">Cada registro de manutenção no Guardião representa uma vitória contra a obsolescência programada. Você está economizando dinheiro e protegendo o ecossistema.</p>
          <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-8">
            <div><p className="text-[10px] font-black uppercase text-slate-400">Eficiência Verde</p><p className="text-2xl font-black text-emerald-600">A+</p></div>
            <div><p className="text-[10px] font-black uppercase text-slate-400">Status Planetário</p><p className="text-2xl font-black text-slate-900">Protetor</p></div>
          </div>
        </Card>

        {/* Mix de Patrimônio Visual */}
        <Card className="border-none shadow-xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-50 rounded-2xl text-cyan-600"><PieIcon className="h-6 w-6" /></div>
            <CardTitle className="text-lg">Alocação de Capital</CardTitle>
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