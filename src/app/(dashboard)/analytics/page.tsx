'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, DollarSign, Loader2, ArrowLeft, ShieldCheck, Download, TrendingDown, Activity, HeartPulse, Medal, AlertCircle, ArrowUpRight, Calculator, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate, calculateExpirationDate } from '@/lib/utils/date-utils';

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

  const generateIRPFReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text('Relatório Auxiliar IRPF - Bens e Direitos', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Documento para suporte à declaração anual de imposto de renda.`, 14, 28);
    doc.text(`Contribuinte: ${profile?.full_name || 'Usuário'} | CPF: ${profile?.cpf || '---'}`, 14, 33);

    const tableData = data.map(item => [
      item.name,
      `Adquirido em ${formatDate(item.purchase_date)} na loja ${item.store || 'Não Informada'}. Chave NF-e: ${item.nfe_key || '---'}`,
      `R$ ${Number(item.price || 0).toLocaleString('pt-BR')}`
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Bem / Produto', 'Discriminação Sugerida pela IA', 'Valor de Aquisição']],
      body: tableData,
      headStyles: { fillColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    doc.save(`irpf-guardiao-notas.pdf`);
    toast.success('Relatório IRPF gerado com sucesso!');
  };

  const getDepreciatedValue = (item: any) => {
    const price = Number(item.price || 0);
    const purchaseDate = new Date(item.purchase_date);
    const yearsOwned = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, yearsOwned);
  };

  const efficiencyRanking = data.map(item => {
    const currentVal = getDepreciatedValue(item);
    const originalVal = Number(item.price || 1);
    const efficiency = (currentVal / originalVal) * 100;
    return { ...item, efficiency };
  }).sort((a, b) => b.efficiency - a.efficiency);

  const bestBuy = efficiencyRanking[0];
  const worstBuy = efficiencyRanking[efficiencyRanking.length - 1];

  const categoryData = Array.from(new Set(data.map(item => item.category).filter(Boolean))).map(cat => ({
    name: cat,
    value: data.filter(i => i.category === cat).reduce((acc, curr) => acc + Number(curr.price || 0), 0)
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  const COLORS = ['#059669', '#0891b2', '#0ea5e9', '#6366f1', '#8b5cf6'];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  if (!profile?.is_premium) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 bg-amber-100 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-amber-200"><TrendingUp className="h-12 w-12 text-amber-600" /></div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Analytics <span className="text-emerald-600">Patrimonial</span></h1>
          <p className="text-slate-500 max-w-lg mx-auto font-medium">O Ranking de Eficiência de Compra, relatórios de IRPF e análise de ROI são exclusivos para o Plano Pro.</p>
        </div>
        <Link href="/plans"><Button size="lg" className="h-16 px-12 text-lg">Ativar Inteligência Pro</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Centro de <span className="text-emerald-600">Inteligência</span></h1>
          <p className="text-slate-500 font-medium">Analytics avançado para gestão de bens e impostos.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={generateIRPFReport} variant="outline" className="gap-2 border-emerald-100 text-emerald-700 font-black text-[10px] uppercase tracking-widest shadow-sm h-12 px-6">
            <Calculator className="h-4 w-4" /> Relatório IRPF
          </Button>
          <Button variant="outline" className="gap-2 border-teal-100 font-black text-[10px] uppercase tracking-widest shadow-sm h-12 px-6">
            <Download className="h-4 w-4" /> Balanço Pro
          </Button>
        </div>
      </header>

      {/* Cards de Eficiência */}
      <div className="grid gap-8 md:grid-cols-2">
        {bestBuy && (
          <Card className="border-none shadow-xl bg-emerald-600 text-white relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700"><Medal className="h-48 w-48" /></div>
            <CardContent className="p-8 space-y-4 relative z-10">
              <div className="flex items-center gap-2 text-emerald-100 font-black text-[10px] uppercase tracking-widest"><Medal className="h-4 w-4" /> Melhor Investimento</div>
              <div>
                <h3 className="text-3xl font-black">{bestBuy.name}</h3>
                <p className="text-emerald-100 font-medium text-sm">Este bem reteve {bestBuy.efficiency.toFixed(1)}% do seu valor original.</p>
              </div>
              <Link href={`/products/${bestBuy.id}`}><Button variant="ghost" className="text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest mt-4">Ver Detalhes</Button></Link>
            </CardContent>
          </Card>
        )}

        <Card className="border-none shadow-xl bg-white relative overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-widest mb-2">
              <FileCheck className="h-4 w-4" /> Compliance Fiscal
            </div>
            <CardTitle className="text-2xl font-black text-slate-900">Seu Imposto de Renda simplificado.</h3 >
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-4">
            <p className="text-slate-500 text-sm font-medium leading-relaxed">Geramos a discriminação completa para a ficha de "Bens e Direitos", incluindo data, CNPJ e valor histórico.</p>
            <Button onClick={generateIRPFReport} className="w-full h-12 font-black uppercase text-[10px] tracking-widest bg-slate-900 hover:bg-black">Baixar Guia IRPF</Button>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Ranking */}
      <Card className="border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6"><CardTitle className="text-sm font-black uppercase text-slate-400">Ranking de Retenção de Valor</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white border-b border-slate-50">
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Produto</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Valor Atual</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Eficiência</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Status Fiscal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {efficiencyRanking.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 font-black text-slate-900 text-sm">{item.name}</td>
                    <td className="px-8 py-6 font-black text-slate-700 text-sm">R$ {getDepreciatedValue(item).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${item.efficiency > 70 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${item.efficiency}%` }} /></div>
                        <span className="text-xs font-black text-slate-700">{item.efficiency.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                        {item.nfe_key ? 'NF-e Pronta' : 'Só Manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { toast } from 'sonner';
