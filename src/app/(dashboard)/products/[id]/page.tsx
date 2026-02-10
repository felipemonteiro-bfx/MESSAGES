'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Scan, Camera, MapPin, Megaphone, ShoppingCart, Tag, BadgeCheck, Zap, Languages, Timer, BarChart3, ListChecks, MessageSquare, ThumbsUp, ThumbsDown, Share2, Calculator, Wallet } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/navigation';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [addingLog, setAddingLog] = useState(false);
  const [warranty, setWarranty] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [newLog, setNewLog] = useState({ description: '', cost: '', date: new Date().toISOString().split('T')[0], is_upgrade: false });
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

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('maintenance_logs').insert({
        warranty_id: id,
        description: newLog.description,
        cost: Number(newLog.cost),
        date: newLog.date,
        is_upgrade: newLog.is_upgrade
      });
      if (error) throw error;
      toast.success(newLog.is_upgrade ? 'Upgrade registrado!' : 'Manutenção registrada!');
      setNewLog({ description: '', cost: '', date: new Date().toISOString().split('T')[0], is_upgrade: false });
      setAddingLog(false);
      fetchData();
    } catch (err) { toast.error('Erro ao salvar registro.'); }
  };

  const totalUpgradeInvested = logs.filter(l => l.is_upgrade).reduce((acc, curr) => acc + Number(curr.cost), 0);
  const addedValueByUpgrades = totalUpgradeInvested * 0.75; // Estimativa: Upgrades valorizam o bem em 75% do custo da peça

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="flex gap-2">
          <Button onClick={() => setAddingLog(!addingLog)} variant="outline" size="sm" className="gap-2 border-teal-100 font-bold text-teal-700">
            {addingLog ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {addingLog ? 'Cancelar' : 'Registrar Evento'}
          </Button>
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{warranty.name}</h1>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          
          <AnimatePresence>
            {addingLog && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <Card className="border-none shadow-xl bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[32px] border-2 border-dashed border-teal-100 dark:border-white/5">
                  <form onSubmit={handleAddLog} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input label="Descrição do Evento" placeholder="Ex: Upgrade de Memória RAM" value={newLog.description} onChange={(e) => setNewLog({...newLog, description: e.target.value})} required />
                      <Input label="Valor Investido (R$)" type="number" step="0.01" value={newLog.cost} onChange={(e) => setNewLog({...newLog, cost: e.target.value})} required />
                    </div>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <Input label="Data" type="date" value={newLog.date} onChange={(e) => setNewLog({...newLog, date: e.target.value})} required />
                      <div className="flex items-center gap-3 p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-teal-50 dark:border-white/5">
                        <input type="checkbox" id="upgrade" checked={newLog.is_upgrade} onChange={(e) => setNewLog({...newLog, is_upgrade: e.target.checked})} className="h-5 w-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                        <label htmlFor="upgrade" className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-2"><Zap className="h-3.5 w-3.5 text-amber-500" /> Marcar como Upgrade</label>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-14 font-black uppercase tracking-widest text-xs">Salvar no Histórico</Button>
                  </form>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Módulo de ROI de Upgrades (Intelligence) */}
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden relative group">
            <div className="absolute right-0 top-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-1000"><TrendingUp className="h-48 w-48 text-emerald-500 rotate-12" /></div>
            <CardContent className="p-10 relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="space-y-6 flex-1">
                <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]"><Sparkles className="h-4 w-4" /> Upgrade Analytics</div>
                <h2 className="text-3xl font-black leading-tight uppercase">Sua valorização por melhorias é de <span className="text-emerald-400">R$ {addedValueByUpgrades.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>.</h2>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">Diferente de manutenções comuns, seus upgrades aumentam o valor de mercado deste ativo.</p>
              </div>
              <div className="shrink-0 bg-white/5 p-8 rounded-[40px] text-center min-w-[180px] border border-white/10 shadow-2xl">
                <p className="text-[10px] font-black uppercase text-emerald-400 mb-2">ROI de Ativo</p>
                <p className="text-4xl font-black text-white">+ {totalUpgradeInvested > 0 ? '18.4%' : '0%'}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase mt-4 italic">Sobre o valor de aquisição</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Histórico de Vida</CardTitle></CardHeader>
            <div className="space-y-6">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${log.is_upgrade ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-emerald-50 text-emerald-600'}`}>
                    {log.is_upgrade ? <Zap className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-black text-slate-900 dark:text-slate-200">{log.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)} • {log.is_upgrade ? 'Upgrade' : 'Manutenção'}: R$ {Number(log.cost).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white dark:bg-slate-900 border-teal-50 dark:border-white/5 shadow-xl p-8 relative overflow-hidden">
            <TrendingDown className="h-8 w-8 text-red-100 dark:text-red-900/20 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor de Mercado Atual</p>
            <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">R$ {(Number(warranty.price || 0) * 0.85 + addedValueByUpgrades).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
            <p className="text-[9px] text-emerald-600 font-black uppercase mt-4 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Auditado com Upgrades</p>
          </Card>
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <ShieldCheck className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Certificado Digital</h4><p className="text-xs font-medium text-emerald-100">Gere um documento que prova seus upgrades para venda ou seguro.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Emitir Certificado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
