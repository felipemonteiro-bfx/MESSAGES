'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, FileWarning } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/navigation';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addMonths, parseISO, isAfter } from 'date-fns';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [addingLog, setAddingLog] = useState(false);
  const [warranty, setWarranty] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
    }
    const { data: warrantyData } = await supabase.from('warranties').select('*').eq('id', id).single();
    if (!warrantyData) return setWarranty(null);
    setWarranty(warrantyData);
    const { data: logData } = await supabase.from('maintenance_logs').select('*').eq('warranty_id', id).order('date', { ascending: false });
    setLogs(logData || []);
    setLoading(false);
  };

  const generateClaimPDF = () => {
    if (!profile?.is_premium) {
      toast.error('O Dossiê de Sinistro é exclusivo Pro!');
      router.push('/plans');
      return;
    }

    const doc = new jsPDF();
    doc.setFillColor(185, 28, 28); // Red 700 para Sinistro
    doc.rect(0, 0, 210, 50, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('DOSSIÊ DE SINISTRO (PERDA/ROUBO)', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Relatório de Identificação de Bem e Prova de Propriedade', 105, 35, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text('1. IDENTIFICAÇÃO DO BEM', 14, 65);
    doc.setFontSize(10);
    doc.text(`Produto: ${warranty.name}`, 14, 75);
    doc.text(`Número de Série (S/N): ${warranty.serial_number || 'NÃO INFORMADO'}`, 14, 80);
    doc.text(`Chave NF-e: ${warranty.nfe_key || '---'}`, 14, 85);
    doc.text(`Valor de Mercado Estimado: R$ ${calculateDepreciation().toLocaleString('pt-BR')}`, 14, 90);

    doc.setFontSize(14);
    doc.text('2. PROVA DE AQUISIÇÃO', 14, 105);
    doc.setFontSize(10);
    doc.text(`Data de Compra: ${formatDate(warranty.purchase_date)}`, 14, 115);
    doc.text(`Loja: ${warranty.store || '---'}`, 14, 120);
    doc.text(`Valor Pago Original: R$ ${Number(warranty.price || 0).toLocaleString('pt-BR')}`, 14, 125);

    doc.setFontSize(14);
    doc.text('3. DADOS DO PROPRIETÁRIO LEGAL', 14, 140);
    doc.text(`Nome: ${profile?.full_name || '---'}`, 14, 150);
    doc.text(`CPF: ${profile?.cpf || '---'}`, 14, 155);

    doc.setDrawColor(200);
    doc.rect(14, 170, 182, 40);
    doc.text('AUTENTICAÇÃO DIGITAL', 105, 178, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Este documento foi gerado via plataforma Guardião de Notas e possui selo de integridade baseado em criptografia de dados. As informações aqui contidas são de responsabilidade do usuário proprietário e foram cruzadas com os dados da Nota Fiscal anexada.', 105, 185, { align: 'center', maxWidth: 160 });

    doc.save(`sinistro-${warranty.name}.pdf`);
    toast.success('Dossiê de Sinistro gerado com sucesso!');
  };

  const calculateDepreciation = () => {
    const price = Number(warranty.price || 0);
    if (price === 0) return 0;
    const yearsOwned = (new Date().getTime() - new Date(warranty.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, yearsOwned);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="flex gap-2">
          <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold"><Pencil className="h-4 w-4" /> Editar Ativo</Button></Link>
        </div>
      </div>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{warranty.name}</h1>
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border shrink-0 ${getDaysRemaining(calculateExpirationDate(warranty.purchase_date, warranty.warranty_months)) < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>Garantia {getDaysRemaining(calculateExpirationDate(warranty.purchase_date, warranty.warranty_months)) < 0 ? 'Expirada' : 'Ativa'}</div>
        </div>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Card de Identificação Única */}
          <Card className="border-none shadow-xl bg-white overflow-hidden relative">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><Hash className="h-4 w-4 text-emerald-600" /> Identificação do Patrimônio</CardTitle></CardHeader>
            <CardContent className="p-8 grid md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400">Número de Série (S/N)</p>
                <p className="text-lg font-black text-slate-900 font-mono tracking-widest">{warranty.serial_number || 'Não cadastrado'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase text-slate-400">Chave NF-e</p>
                <p className="text-xs font-mono text-slate-600 break-all">{warranty.nfe_key || 'Não cadastrada'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-0"><div className="h-1 w-full bg-emerald-500" /></CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Progresso de Quitação</p>
                <p className="text-xl font-black text-slate-900">{Math.round((warranty.paid_installments / (warranty.total_installments || 1)) * 100)}% Pago</p>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50"><motion.div initial={{ width: 0 }} animate={{ width: `${(warranty.paid_installments / (warranty.total_installments || 1)) * 100}%` }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500 rounded-full" /></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Card de Sinistro (Vermelho) */}
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-red-600 to-red-800 text-white shadow-xl shadow-red-500/20 space-y-4 relative overflow-hidden group">
            <FileWarning className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 -rotate-12 group-hover:rotate-0 transition-transform duration-500" />
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-2 rounded-xl"><ShieldAlert className="h-5 w-5 text-white" /></div>
              <h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Sinistro</h4>
            </div>
            <p className="text-xs font-medium text-red-100 leading-relaxed">Fui roubado ou o produto foi danificado? Gere o dossiê de prova de propriedade para polícia ou seguro.</p>
            <Button onClick={generateClaimPDF} variant="ghost" className="w-full bg-white text-red-700 font-black text-[10px] uppercase tracking-widest py-4 shadow-lg hover:bg-red-50 transition-all">Gerar Dossiê de Perda</Button>
          </div>

          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden shadow-2xl">
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Patrimônio Líquido</p><div className="text-4xl font-black text-white mt-1">R$ {(calculateDepreciation() - ((warranty.total_installments - warranty.paid_installments) * Number(warranty.installment_value || 0))).toLocaleString('pt-BR')}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
