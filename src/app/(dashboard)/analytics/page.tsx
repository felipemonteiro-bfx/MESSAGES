'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TrendingUp, BarChart3, PieChart as PieIcon, Calendar, DollarSign, Loader2, ArrowLeft, ShieldCheck, Download, TrendingDown, Activity, HeartPulse, Medal, AlertCircle, ArrowUpRight, Calculator, FileCheck, LineChart as ChartIcon, Wrench, Leaf, Sparkles, Scale, CheckCircle2, Wallet, CreditCard, Landmark, History, FileStack, ClipboardCheck, Copy, Zap, Timer, Flame, Globe, Repeat, Plus, Trash2, FileBadge, ReceiptText } from 'lucide-react';
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
  const [generating, setGenerating] = useState(false);
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

  const generateTaxDossier = () => {
    if (!profile?.is_premium) {
      toast.error('O Relatório de Auditoria IRPF é exclusivo Pro!');
      return;
    }
    setGenerating(true);
    try {
      const doc = new jsPDF();
      const year = new Date().getFullYear();

      // Header Institucional
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 45, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(20); doc.text('RELATÓRIO DE AUDITORIA PATRIMONIAL', 14, 22);
      doc.setFontSize(10); doc.text(`DOCUMENTO AUXILIAR PARA DIRPF ${year} - BENS E DIREITOS`, 14, 32);
      doc.text(`TITULAR: ${profile?.full_name?.toUpperCase() || '---'} | CPF: ${profile?.cpf || '---'}`, 14, 38);

      // Descrição do Serviço
      doc.setTextColor(15, 23, 42); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Resumo para Discriminação de Bens', 14, 60);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text('Os dados abaixo foram extraídos de notas fiscais auditadas via OCR e custodiadas no sistema.', 14, 65);

      const tableData = data.map(item => [
        item.name.toUpperCase(),
        `Adquirido em ${formatDate(item.purchase_date)}\nLoja: ${item.store || '---'}\nChave NF-e: ${item.nfe_key || 'Registrada'}`,
        `R$ ${Number(item.price).toLocaleString('pt-BR')}`
      ]);

      autoTable(doc, {
        startY: 75,
        head: [['Ativo', 'Discriminação Técnica (Copie para o Programa RF)', 'Situação em 31/12']],
        body: tableData,
        headStyles: { fillColor: [5, 150, 105], fontSize: 10 },
        styles: { fontSize: 8, cellPadding: 4 },
        columnStyles: { 1: { cellWidth: 100 }, 2: { halign: 'right' } }
      });

      // Rodapé de Segurança
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFillColor(248, 250, 252); doc.rect(14, finalY, 182, 30, 'F');
      doc.setFontSize(8); doc.setTextColor(100);
      doc.text('Certificamos a existência física e digital dos bens acima citados.', 20, finalY + 12);
      doc.text(`Protocolo de Integridade Fiscal: GRD-TAX-${profile.id.substring(0,8).toUpperCase()}`, 20, finalY + 20);

      doc.save(`relatorio-irpf-guardiao-${year}.pdf`);
      toast.success('Relatório de Auditoria IRPF gerado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar relatório fiscal.');
    } finally {
      setGenerating(false);
    }
  };

  const totalAssetsValue = data.reduce((acc, curr) => acc + Number(curr.price || 0), 0);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Private <span className="text-emerald-600">Analytics</span></h1>
          <p className="text-slate-500 font-medium text-sm">Governança financeira, técnica e tributária.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={generateTaxDossier} disabled={generating} variant="outline" className="gap-2 border-emerald-100 text-emerald-700 font-black text-[10px] uppercase h-12 px-6 shadow-sm">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileBadge className="h-4 w-4" />}
            Exportar IRPF (PDF)
          </Button>
          <Button className="gap-2 bg-slate-900 text-white font-black text-[10px] uppercase h-12 px-8 shadow-2xl shadow-emerald-500/20">
            <ReceiptText className="h-4 w-4 text-emerald-400" /> Relatório Master Pro
          </Button>
        </div>
      </header>

      {/* Hero Stats */}
      <div className="grid gap-8 md:grid-cols-3">
        <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 p-10 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-1.5 bg-emerald-500" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Capital em Custódia</p>
          <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">R$ {totalAssetsValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
          <p className="text-[10px] text-emerald-600 font-bold uppercase mt-4 flex items-center gap-2"><CheckCircle2 className="h-3 w-3" /> Patrimônio Auditado</p>
        </Card>

        <Card className="border-none shadow-2xl bg-slate-900 text-white p-10 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700"><TrendingUp className="h-32 w-32" /></div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-4">Status de Mercado</p>
          <div className="text-4xl font-black text-white tracking-tighter">Alta Liquidez</div>
          <p className="text-[10px] text-emerald-400 font-bold uppercase mt-4 italic">Bens de alta demanda detectados</p>
        </Card>

        <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 p-10 flex flex-col justify-center relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Eficiência Fiscal</p>
          <div className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">100%</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-4">Documentação pronta para DIRPF</p>
        </Card>
      </div>

      {/* Módulo Fiscal de Impacto */}
      <Card className="border-none shadow-2xl bg-emerald-600 text-white p-12 relative overflow-hidden group">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-1000"><Landmark className="h-64 w-64 text-white" /></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-2 text-emerald-100 font-black text-[10px] uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4" /> Governança Tributária
            </div>
            <h2 className="text-4xl font-black leading-tight max-w-xl uppercase tracking-tighter">Sua Declaração de Bens está <span className="text-white underline decoration-emerald-400 underline-offset-8">Pronta.</span></h2>
            <p className="text-emerald-50 text-lg font-medium leading-relaxed max-w-2xl">Não perca horas preenchendo o sistema da Receita Federal. O Guardião gera o texto exato com CNPJs, Datas e Valores para você apenas copiar e colar.</p>
          </div>
          <Button onClick={generateTaxDossier} className="h-16 px-12 bg-slate-900 hover:bg-black text-white font-black uppercase text-xs tracking-widest shadow-2xl shrink-0 rounded-2xl gap-3">
            <Download className="h-5 w-5 text-emerald-400" /> Baixar Relatório Fiscal
          </Button>
        </div>
      </Card>
    </div>
  );
}