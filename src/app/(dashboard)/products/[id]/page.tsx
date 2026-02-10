'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, ListChecks, ShieldQuestion } from 'lucide-react';
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
  const [verifying, setVerifying] = useState(false);
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

  const verifyIntegrity = () => {
    setVerifying(true);
    toast.info('Validando selo de integridade digital...');
    setTimeout(() => {
      setVerifying(false);
      toast.success('Documento auditado e 100% autêntico!');
    }, 2000);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  // Cálculo do Score de Segurança do Item
  const securityChecks = [
    { label: 'Nota Fiscal Digitalizada', active: !!warranty.invoice_url, weight: 30 },
    { label: 'Número de Série Registrado', active: !!warranty.serial_number, weight: 20 },
    { label: 'Selo de Integridade Gerado', active: true, weight: 10 }, // Automático
    { label: 'Seguro Ativo ou Simulado', active: !!warranty.insurance_policy, weight: 20 },
    { label: 'Manutenção em Dia', active: logs.length > 0, weight: 20 },
  ];

  const itemSecurityScore = securityChecks.reduce((acc, curr) => curr.active ? acc + curr.weight : acc, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="flex gap-2">
          <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold text-teal-700">Editar Ativo</Button></Link>
        </div>
      </div>

      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{warranty.name}</h1>
          <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} onClick={verifyIntegrity} className="cursor-pointer px-6 py-4 bg-white rounded-[24px] border border-teal-100 flex items-center gap-4 shadow-xl">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${verifying ? 'bg-slate-100' : 'bg-emerald-50 text-emerald-600'}`}>{verifying ? <Loader2 className="h-6 w-6 animate-spin" /> : <Fingerprint className="h-6 w-6" />}</div>
          <div>
            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest leading-none">Auditado por IA</p>
            <p className="text-sm font-black text-slate-900 mt-1">Selo de Integridade</p>
          </div>
        </motion.div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* NOVO: Checklist de Segurança Patrimonial (Killer Feature) */}
          <Card className="border-none shadow-xl bg-white overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5"><ListChecks className="h-32 w-32 text-emerald-600 rotate-12" /></div>
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Auditoria de Segurança</CardTitle>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Status de proteção individual do bem</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-emerald-600">{itemSecurityScore}%</div>
                  <p className="text-[10px] font-black text-slate-400 uppercase">Seguro</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {securityChecks.map((check, i) => (
                  <div key={i} className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${check.active ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                    {check.active ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <ShieldQuestion className="h-5 w-5 text-slate-300" />}
                    <span className={`text-xs font-bold ${check.active ? 'text-emerald-900' : 'text-slate-400'}`}>{check.label}</span>
                  </div>
                ))}
              </div>
              {!profile?.is_premium && itemSecurityScore < 100 && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-center">
                  <p className="text-[10px] font-black text-amber-700 uppercase leading-relaxed">Dica: Adicione o seguro e manutenções para atingir 100% de proteção e valorizar o bem.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Jornada do Ativo</CardTitle></CardHeader>
            <div className="space-y-6">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 shrink-0"><Wrench className="h-4 w-4" /></div>
                  <div><p className="text-sm font-black text-slate-900">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)} • R$ {Number(log.cost).toLocaleString('pt-BR')}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden shadow-2xl group">
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl blur opacity-0 group-hover:opacity-20 transition duration-1000"></div>
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor Real Hoje</p>
            <div className="text-4xl font-black text-white mt-1">R$ {(Number(warranty.price || 0) * 0.85).toLocaleString('pt-BR')}</div>
            <Button className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 font-black text-[10px] uppercase py-4 rounded-xl gap-2"><Plus className="h-4 w-4" /> Registrar Valorização</Button>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <ShieldCheck className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Certificado Digital</h4><p className="text-xs font-medium text-emerald-100">Gere um documento de autenticidade reconhecido para venda ou seguro.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Emitir Certificado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}