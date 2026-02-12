'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, DollarSign, Loader2, ArrowLeft, ShieldCheck, Download, TrendingDown, Activity, HeartPulse, Medal, AlertCircle, ArrowUpRight, Calculator, FileCheck, LineChart as ChartIcon, Wrench, Leaf, Sparkles, Scale, CheckCircle2, Wallet, CreditCard, Landmark, History, FileStack, ClipboardCheck, Copy, Zap, Timer, Flame, Globe, Repeat, Plus, Trash2, FileBadge, ReceiptText, ChartCandlestick, TreeDeciduous, Recycle } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, ComposedChart
} from 'recharts';
import { formatDate } from '@/lib/utils/date-utils';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [rates, setRates] = useState({ usd: 5.12, history: [] });
  const supabase = createClient();

  useEffect(() => {
    fetchAnalytics();
    fetchRatesHistory();
  }, []);

  const fetchRatesHistory = async () => {
    try {
      const res = await fetch('https://economia.awesomeapi.com.br/json/daily/USD-BRL/15');
      const json = await res.json();
      const history = json.map((day: any) => ({
        date: new Date(day.timestamp * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        usd: parseFloat(day.bid),
        assetFactor: parseFloat(day.bid) * 1.2
      })).reverse();
      setRates({ usd: parseFloat(json[0].bid), history });
    } catch (err) { console.error("Erro ao buscar câmbio"); }
  };

  const fetchAnalytics = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: items } = await supabase.from('warranties').select('*');
      if (items) setData(items);
    }
    setLoading(false);
  };

  // Lógica Eco-Impact: Estimativa de CO2 por categoria
  // Fonte: Média de relatórios de sustentabilidade (ex: Apple, Dell)
  const calculateEcoImpact = () => {
    return data.reduce((acc, curr) => {
      const cat = curr.category?.toLowerCase() || '';
      if (cat.includes('comput') || cat.includes('laptop')) return acc + 250; // kg CO2
      if (cat.includes('celular') || cat.includes('phone')) return acc + 70;
      if (cat.includes('tv') || cat.includes('monitor')) return acc + 350;
      return acc + 50;
    }, 0);
  };

  const totalCO2 = calculateEcoImpact();
  const treesToOffset = Math.ceil(totalCO2 / 15); // Uma árvore absorve ~15kg CO2/ano

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Impact <span className="text-emerald-600">Analytics</span></h1>
          <p className="text-slate-500 font-medium text-sm">Monitor de sustentabilidade e responsabilidade patrimonial.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-100 dark:border-emerald-500/20">
          <TreeDeciduous className="h-4 w-4" /> Portfólio Eco-Consciente
        </div>
      </header>

      {/* Widget de Impacto Ambiental (Feature Platinum) */}
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2 border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden relative group">
          <div className="h-1.5 w-full bg-emerald-500" />
          <CardContent className="p-10 flex flex-col md:flex-row items-center gap-12">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em]"><Leaf className="h-4 w-4" /> Pegada de Carbono Patrimonial</div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">Seu inventário gerou <span className="text-emerald-600">{totalCO2}kg de CO2.</span></h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">Este valor representa a emissão estimada na fabricação e logística dos seus bens cadastrados. Para compensar este impacto anual, você precisaria plantar <span className="font-black text-slate-900 dark:text-white">{treesToOffset} árvores</span>.</p>
              <div className="flex gap-3">
                <Button className="h-12 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg">Compensar Agora</Button>
                <Button variant="ghost" className="h-12 px-6 text-[10px] font-black uppercase tracking-widest text-emerald-600">Ver Metodologia</Button>
              </div>
            </div>
            <div className="shrink-0 h-48 w-48 relative">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-full animate-pulse" />
              <div className="relative h-48 w-48 rounded-full border-8 border-emerald-50 dark:border-white/5 flex items-center justify-center flex-col text-center">
                <Leaf className="h-10 w-10 text-emerald-500 mb-2" />
                <p className="text-3xl font-black text-slate-900 dark:text-white">{totalCO2}</p>
                <p className="text-[8px] font-black text-slate-400 uppercase">KG / CO2e</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Descarte Consciente */}
        <Card className="border-none shadow-xl bg-slate-900 text-white p-8 relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-1000"><Recycle className="h-32 w-32 text-emerald-500" /></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">Circular Economy</div>
            <h3 className="text-2xl font-black uppercase tracking-tighter">Logística <span className="text-emerald-400">Reversa.</span></h3>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">Possui itens quebrados? Localizamos pontos de descarte ecológico certificados próximos a você para evitar o lixo eletrônico.</p>
            <Button variant="ghost" className="w-full bg-white/10 text-white border-white/10 font-black text-[10px] uppercase h-12 rounded-xl hover:bg-white/20">Achar Pontos de Coleta</Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gráfico de Câmbio (Mantendo o que estava bom) */}
        <Card className="border-none shadow-xl p-8 bg-white dark:bg-slate-900 space-y-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600"><ChartCandlestick className="h-6 w-6" /></div>
            <CardTitle className="text-xl uppercase tracking-tighter">Variação Cambial USD</CardTitle>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rates.history}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={10} fontVariant="black" axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="usd" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Balanço Master */}
        <Card className="bg-slate-900 text-white border-none p-10 flex flex-col justify-center space-y-8 relative overflow-hidden group shadow-2xl">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative z-10 space-y-6">
            <h3 className="text-3xl font-black leading-tight uppercase tracking-tighter">Patrimônio é <span className="text-emerald-400">Responsabilidade.</span></h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">Gerir seus bens no Guardião de Notas garante uma vida útil 30% maior para seus equipamentos, reduzindo o consumo desenfreado e o impacto ambiental global.</p>
            <div className="pt-6 border-t border-white/5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20"><ShieldCheck className="h-6 w-6 text-white" /></div>
              <div><p className="text-[10px] font-black uppercase text-emerald-400">Certificação ESG</p><p className="text-xs font-bold text-white">Status: Gestão Consciente</p></div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
