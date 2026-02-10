'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, ShieldAlert } from 'lucide-react';
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

  const expirationDate = calculateExpirationDate(warranty.purchase_date, warranty.warranty_months);
  const daysRemaining = getDaysRemaining(expirationDate);
  const isExpired = daysRemaining < 0;
  const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 30;

  const calculateDepreciation = () => {
    const price = Number(warranty.price || 0);
    if (price === 0) return 0;
    const purchaseDate = new Date(warranty.purchase_date);
    const yearsOwned = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, yearsOwned);
  };

  const remainingValue = (warranty.total_installments - warranty.paid_installments) * Number(warranty.installment_value || 0);
  const nextMaintenance = warranty.last_maintenance_date ? addMonths(parseISO(warranty.last_maintenance_date), warranty.maintenance_frequency_months || 6) : null;
  const isMaintenanceOverdue = nextMaintenance ? isAfter(new Date(), nextMaintenance) : false;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
        </button>
        <Link href={`/products/edit/${warranty.id}`}>
          <Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold text-teal-700">
            <Pencil className="h-4 w-4" /> Editar Ativo
          </Button>
        </Link>
      </div>

      {isExpiringSoon && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="p-6 rounded-[32px] bg-gradient-to-r from-amber-500 to-orange-600 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-amber-200">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
                <ShieldAlert className="h-6 w-6 text-white animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-black">Sua garantia está expirando!</h3>
                <p className="text-sm font-medium text-amber-50">Faltam apenas {daysRemaining} dias para sua proteção acabar. Não fique no prejuízo.</p>
              </div>
            </div>
            <Button className="bg-slate-900 hover:bg-black text-white px-8 h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2">
              Contratar Garantia Estendida <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{warranty.name}</h1>
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border shrink-0 ${isExpired ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>Garantia {isExpired ? 'Expirada' : 'Ativa'}</div>
        </div>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-xl bg-white overflow-hidden relative">
            <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
            <CardContent className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-600" /> Progresso de Quitação</p>
                  <h3 className="text-3xl font-black text-slate-900">{Math.round((warranty.paid_installments / (warranty.total_installments || 1)) * 100)}% Pago</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-400">Dívida Ativa</p>
                  <p className="text-xl font-black text-slate-900">R$ {remainingValue.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50"><motion.div initial={{ width: 0 }} animate={{ width: `${(warranty.paid_installments / (warranty.total_installments || 1)) * 100}%` }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/20" /></div>
            </CardContent>
          </Card>

          <Card className={`border-none shadow-xl relative overflow-hidden ${isMaintenanceOverdue ? 'bg-amber-50' : 'bg-white'}`}>
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${isMaintenanceOverdue ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}><Wrench className="h-8 w-8" /></div>
                <div><p className="text-xs font-black uppercase text-slate-400">Próxima Revisão</p><h3 className="text-2xl font-black text-slate-900">{nextMaintenance ? nextMaintenance.toLocaleDateString('pt-BR') : 'Não agendada'}</h3></div>
              </div>
              <Button size="sm" className="bg-slate-900 font-black text-[10px] uppercase tracking-widest h-10 px-6">Histórico Completo</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden">
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400">Patrimônio Líquido</p><div className="text-4xl font-black text-white mt-1">R$ {(calculateDepreciation() - remainingValue).toLocaleString('pt-BR')}</div><p className="text-[10px] text-slate-500 mt-2">Valor descontando dívidas.</p>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <Umbrella className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white">Seguro Inteligente</h4><p className="text-xs font-medium text-emerald-100 leading-relaxed">Não deixe seu patrimônio descoberto. Simule proteção total em segundos.</p>
            <Link href={`/insurance/simulator/${warranty.id}`} className="block"><Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4">Simular Seguro</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}