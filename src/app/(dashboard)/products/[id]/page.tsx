'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert } from 'lucide-react';
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

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  const isInsured = !!warranty.insurance_policy;
  const insuranceDaysRemaining = warranty.insurance_expires_at ? getDaysRemaining(warranty.insurance_expires_at) : null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold"><Pencil className="h-4 w-4" /> Editar Ativo</Button></Link>
      </div>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{warranty.name}</h1>
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border shrink-0 ${isInsured ? 'bg-cyan-50 text-cyan-600 border-cyan-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
            {isInsured ? 'Bem Segurado' : 'Sem Seguro Ativo'}
          </div>
        </div>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Card de Cobertura de Seguro */}
          <Card className={`border-none shadow-xl overflow-hidden relative ${isInsured ? 'bg-white' : 'bg-slate-50/50'}`}>
            <div className={`h-1.5 w-full ${isInsured ? 'bg-cyan-500' : 'bg-slate-200'}`} />
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6">
                  <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${isInsured ? 'bg-cyan-50 text-cyan-600 shadow-lg shadow-cyan-500/10' : 'bg-slate-100 text-slate-300'}`}>
                    <Umbrella className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Proteção de Seguro</p>
                    <h3 className="text-2xl font-black text-slate-900">
                      {isInsured ? warranty.insurance_company : 'Patrimônio Desprotegido'}
                    </h3>
                    {isInsured && <p className="text-xs font-mono text-slate-500 mt-1 uppercase">Apólice: {warranty.insurance_policy}</p>}
                  </div>
                </div>
                {isInsured ? (
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400">Vencimento</p>
                    <p className={`text-lg font-black ${insuranceDaysRemaining && insuranceDaysRemaining < 30 ? 'text-amber-500' : 'text-slate-900'}`}>
                      {formatDate(warranty.insurance_expires_at)}
                    </p>
                    <p className="text-[9px] font-bold text-cyan-600 uppercase tracking-tighter mt-1">{insuranceDaysRemaining} dias restantes</p>
                  </div>
                ) : (
                  <Link href={`/insurance/simulator/${warranty.id}`}>
                    <Button className="bg-cyan-600 hover:bg-cyan-700 shadow-cyan-200 h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                      Simular Proteção <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-600" /> Progresso de Quitação</p>
                  <h3 className="text-3xl font-black text-slate-900">{Math.round((warranty.paid_installments / (warranty.total_installments || 1)) * 100)}% Pago</h3>
                </div>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50"><motion.div initial={{ width: 0 }} animate={{ width: `${(warranty.paid_installments / (warranty.total_installments || 1)) * 100}%` }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500 rounded-full" /></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden shadow-2xl">
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Líquido</p><div className="text-4xl font-black text-white mt-1">R$ {(Number(warranty.price || 0) * 0.8).toLocaleString('pt-BR')}</div>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-white border border-teal-50 shadow-xl space-y-4 relative overflow-hidden">
            <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-6 w-6" /></div>
            <h4 className="text-xl font-black text-slate-900 leading-tight">Dossiê Jurídico</h4>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">Documento formal auditado pronto para ser usado em qualquer tribunal ou seguradora.</p>
            <Button variant="ghost" className="w-full border-teal-100 text-emerald-700 font-black text-[10px] uppercase py-4">Gerar Relatório Pro</Button>
          </div>
        </div>
      </div>
    </div>
  );
}