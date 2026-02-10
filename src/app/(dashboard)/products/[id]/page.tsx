'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/link';
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
  const [newLog, setNewLog] = useState({ description: '', cost: '', date: new Date().toISOString().split('T')[0] });
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

  const calculateNextMaintenance = () => {
    if (!warranty.last_maintenance_date && !warranty.purchase_date) return null;
    const baseDate = warranty.last_maintenance_date ? parseISO(warranty.last_maintenance_date) : parseISO(warranty.purchase_date);
    return addMonths(baseDate, warranty.maintenance_frequency_months || 6);
  };

  const calculateDepreciation = () => {
    const price = Number(warranty.price || 0);
    if (price === 0) return 0;
    const purchaseDate = new Date(warranty.purchase_date);
    const yearsOwned = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, yearsOwned);
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingLog(true);
    try {
      const { error } = await supabase.from('maintenance_logs').insert({ warranty_id: id, description: newLog.description, cost: Number(newLog.cost) || 0, date: newLog.date });
      if (error) throw error;
      
      // Atualizar também a data da última manutenção na tabela principal
      await supabase.from('warranties').update({ last_maintenance_date: newLog.date }).eq('id', id);
      
      toast.success('Registro adicionado e cronograma atualizado!');
      setNewLog({ description: '', cost: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err: any) { toast.error('Erro ao salvar log.'); } finally { setAddingLog(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  const nextMaintenance = calculateNextMaintenance();
  const isMaintenanceOverdue = nextMaintenance ? isAfter(new Date(), nextMaintenance) : false;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <Link href="/dashboard"><Button variant="ghost" size="sm" className="gap-2 text-slate-500 font-bold mb-4"><ArrowLeft className="h-4 w-4" /> Painel Geral</Button></Link>

      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{warranty.name}</h1>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border shrink-0 ${getDaysRemaining(calculateExpirationDate(warranty.purchase_date, warranty.warranty_months)) < 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>Garantia {getDaysRemaining(calculateExpirationDate(warranty.purchase_date, warranty.warranty_months)) < 0 ? 'Expirada' : 'Ativa'}</div>
          </div>
          <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Categoria Geral'}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" className="gap-2 border-teal-100 font-bold"><Pencil className="h-4 w-4" /> Editar</Button></Link>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Widget de Cronograma de Manutenção */}
          <Card className={`border-none shadow-xl relative overflow-hidden ${isMaintenanceOverdue ? 'bg-amber-50' : 'bg-white'}`}>
            <div className={`h-2 w-full ${isMaintenanceOverdue ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${isMaintenanceOverdue ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Wrench className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Próxima Revisão Preventiva</p>
                  <h3 className={`text-2xl font-black ${isMaintenanceOverdue ? 'text-amber-700' : 'text-slate-900'}`}>
                    {nextMaintenance ? nextMaintenance.toLocaleDateString('pt-BR') : 'Não agendada'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    Frequência: a cada {warranty.maintenance_frequency_months} meses.
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 text-right">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${isMaintenanceOverdue ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'}`}>
                  {isMaintenanceOverdue ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                  {isMaintenanceOverdue ? 'Revisão Atrasada' : 'Em Dia'}
                </span>
                <Button onClick={() => setAddingLog(true)} variant="ghost" size="sm" className="text-[10px] uppercase font-black tracking-tighter text-emerald-600 hover:bg-emerald-50">Registrar Manutenção</Button>
              </div>
            </CardContent>
          </Card>

          {/* Diário de Vida */}
          <Card className="border-none shadow-xl">
            <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between p-6">
              <CardTitle className="flex items-center gap-2 text-slate-900"><History className="h-5 w-5 text-emerald-600" /> Histórico Completo</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <AnimatePresence>{addingLog && (<motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={handleAddLog} className="mb-8 p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 space-y-4 overflow-hidden"><div className="grid md:grid-cols-2 gap-4"><Input label="O que foi feito?" placeholder="Ex: Limpeza, troca de óleo" value={newLog.description} onChange={(e) => setNewLog({...newLog, description: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><Input label="Custo (R$)" type="number" value={newLog.cost} onChange={(e) => setNewLog({...newLog, cost: e.target.value})} /><Input label="Data" type="date" value={newLog.date} onChange={(e) => setNewLog({...newLog, date: e.target.value})} required /></div></div><div className="flex gap-2"><Button type="submit" className="flex-1">Salvar Registro</Button><Button variant="ghost" onClick={() => setAddingLog(false)}>Cancelar</Button></div></motion.form>)}</AnimatePresence>
              <div className="space-y-4">{logs.length === 0 ? <div className="text-center py-8 text-slate-400 italic">Nenhum registro.</div> : logs.map((log) => (<div key={log.id} className="flex items-center justify-between p-4 bg-white border border-teal-50 rounded-2xl shadow-sm group"><div className="flex items-center gap-4"><div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-sm font-black text-slate-800">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)} • R$ {Number(log.cost).toLocaleString('pt-BR')}</p></div></div></div>))}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none p-8"><TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valor Atual Estimado</p><div className="text-4xl font-black text-white mt-1">R$ {calculateDepreciation().toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</div><p className="text-[10px] text-slate-500 mt-2 italic font-medium">Desvalorização de {Math.round((1 - (calculateDepreciation() / Number(warranty.price || 1))) * 100)}% desde a compra.</p></Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4 relative overflow-hidden">
            <Umbrella className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10" />
            <h4 className="text-xl font-black leading-tight">Proteger Agora?</h4>
            <p className="text-xs font-medium text-emerald-100 leading-relaxed">Não corra riscos. Simule o seguro para este bem e garanta reposição imediata em caso de danos.</p>
            <Link href={`/insurance/simulator/${warranty.id}`} className="block"><Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4">Simular Seguro</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
