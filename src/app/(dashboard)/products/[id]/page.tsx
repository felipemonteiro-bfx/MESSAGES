'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Scan, Camera, MapPin, Megaphone, ShoppingCart, Tag, BadgeCheck, Zap, Languages, Timer, BarChart3, ListChecks, MessageSquare, ThumbsUp, ThumbsDown, Share2, Calculator, Wallet, UserCircle2, Phone, AlertCircle } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [addingLoan, setAddingLoan] = useState(false);
  const [warranty, setWarranty] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loanForm, setLoanForm] = useState({ borrower_name: '', borrower_contact: '', expected_return_date: '' });
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

    const { data: loanData } = await supabase.from('lending_logs').select('*').eq('warranty_id', id).order('lent_at', { ascending: false });
    setLoans(loanData || []);
    
    setLoading(false);
  };

  const handleAddLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('lending_logs').insert({
        warranty_id: id,
        ...loanForm
      });
      if (error) throw error;
      toast.success('Empréstimo registrado com sucesso!');
      setAddingLoan(false);
      setLoanForm({ borrower_name: '', borrower_contact: '', expected_return_date: '' });
      fetchData();
    } catch (err) { toast.error('Erro ao registrar empréstimo.'); }
  };

  const handleReturn = async (loanId: string) => {
    try {
      const { error } = await supabase.from('lending_logs').update({
        returned_at: new Date().toISOString().split('T')[0],
        status: 'returned'
      }).eq('id', loanId);
      if (error) throw error;
      toast.success('Item devolvido ao cofre!');
      fetchData();
    } catch (err) { toast.error('Erro ao processar devolução.'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  const activeLoan = loans.find(l => l.status === 'active');

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="flex gap-2">
          <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold uppercase text-[10px] tracking-widest">Editar Ativo</Button></Link>
        </div>
      </div>

      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{warranty.name}</h1>
            <div className="flex flex-wrap gap-2">
              <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-emerald-100 shadow-sm">Patrimônio Auditado</div>
              {activeLoan && <div className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-amber-200 animate-pulse"><AlertCircle className="h-3 w-3" /> Emprestado para {activeLoan.borrower_name}</div>}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Módulo Lending Guard (New Feature) */}
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative">
            <div className={`h-1.5 w-full ${activeLoan ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tighter">
                  <HeartHandshake className="h-5 w-5 text-emerald-600" /> Lending Guard
                </CardTitle>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Controle quem pegou seus bens emprestados</p>
              </div>
              {!activeLoan && !addingLoan && (
                <Button onClick={() => setAddingLoan(true)} size="sm" className="bg-slate-900 text-white font-black text-[10px] uppercase h-10 px-4 rounded-xl gap-2">
                  <Plus className="h-4 w-4" /> Registrar Empréstimo
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-8 pt-4">
              <AnimatePresence mode="wait">
                {addingLoan ? (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Input label="Quem pegou?" placeholder="Nome do amigo/familiar" value={loanForm.borrower_name} onChange={(e) => setLoanForm({...loanForm, borrower_name: e.target.value})} required />
                      <Input label="Contato (Opcional)" placeholder="E-mail ou Telefone" value={loanForm.borrower_contact} onChange={(e) => setLoanForm({...loanForm, borrower_contact: e.target.value})} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 items-end">
                      <Input label="Previsão de Devolução" type="date" value={loanForm.expected_return_date} onChange={(e) => setLoanForm({...loanForm, expected_return_date: e.target.value})} />
                      <div className="flex gap-2">
                        <Button type="button" onClick={handleAddLoan} className="flex-1 h-14 font-black uppercase text-xs">Confirmar Saída</Button>
                        <Button type="button" variant="outline" onClick={() => setAddingLoan(false)} className="h-14 border-slate-100 dark:border-white/10">Cancelar</Button>
                      </div>
                    </div>
                  </motion.div>
                ) : activeLoan ? (
                  <div className="p-8 bg-amber-50 dark:bg-amber-900/10 rounded-[32px] border border-amber-100 dark:border-amber-500/20 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="h-16 w-16 rounded-[24px] bg-white dark:bg-slate-900 flex items-center justify-center text-amber-600 shadow-sm border border-amber-100 dark:border-amber-500/20">
                        <UserCircle2 className="h-8 w-8" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Ativo sob posse de:</p>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{activeLoan.borrower_name}</h4>
                        <p className="text-xs font-medium text-slate-500 flex items-center gap-2 mt-1"><Phone className="h-3 w-3" /> {activeLoan.borrower_contact || 'Sem contato registrado'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Previsão</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{activeLoan.expected_return_date ? formatDate(activeLoan.expected_return_date) : 'Não definida'}</p>
                      </div>
                      <Button onClick={() => handleReturn(activeLoan.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest h-12 px-8 rounded-2xl shadow-lg shadow-emerald-500/20">Registrar Devolução</Button>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-4 bg-slate-50 dark:bg-white/5 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-white/5">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                    <p className="text-sm text-slate-400 font-bold uppercase">Este item está seguro no seu cofre.</p>
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Histórico Consolidado</CardTitle></CardHeader>
            <div className="space-y-6">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="pt-1"><p className="text-sm font-black text-slate-900 dark:text-slate-200">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-10 relative overflow-hidden group shadow-2xl text-center">
            <div className="h-24 w-24 rounded-[40px] bg-emerald-500/10 flex items-center justify-center mx-auto mb-6 border-2 border-emerald-500/30 group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-12 w-12 text-emerald-500" />
            </div>
            <h4 className="text-2xl font-black uppercase tracking-tighter">Selo Guardião</h4>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-1">Integridade Digital Verificada</p>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <TrendingUp className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Valorização</h4><p className="text-xs font-medium text-emerald-100 leading-relaxed">Documentar cada saída e devolução aumenta o valor de revenda ao provar o cuidado com o bem.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Ver Histórico Pro</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
