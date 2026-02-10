'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Scan, Camera, MapPin, Megaphone, ShoppingCart, Tag, BadgeCheck, Zap, Languages, Timer, BarChart3, ListChecks } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/navigation';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [warranty, setWarranty] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
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

    const { data: photoData } = await supabase.from('asset_photos').select('*').eq('warranty_id', id);
    setPhotos(photoData || []);
    
    setLoading(false);
  };

  const calculateAssetSecurityScore = () => {
    let score = 0;
    if (warranty.invoice_url) score += 30;
    if (warranty.serial_number) score += 20;
    if (warranty.last_checkin_at) score += 20;
    if (photos.length >= 3) score += 20;
    if (logs.length > 0) score += 10;
    return score;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  const securityScore = calculateAssetSecurityScore();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold uppercase text-[10px] tracking-widest">Editar</Button></Link>
      </div>

      <header className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{warranty.name}</h1>
            <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
          </div>
          <div className="shrink-0 flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[32px] shadow-xl border border-teal-50 dark:border-white/5">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score de Proteção</p>
              <p className="text-3xl font-black text-emerald-600">{securityScore}%</p>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 border border-emerald-100 dark:border-emerald-500/20">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          
          {/* NOVO: Checklist de Auditoria de Integridade (Asset Score) */}
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative group">
            <div className="h-1.5 w-full bg-emerald-500" />
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tighter">
                <ListChecks className="h-5 w-5 text-emerald-600" /> Auditoria de Segurança
              </CardTitle>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Complete os requisitos para um dossiê incontestável</p>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-4">
              <AuditItem done={!!warranty.invoice_url} text="Nota Fiscal Digitalizada" points="+30%" />
              <AuditItem done={!!warranty.serial_number} text="Número de Série Registrado" points="+20%" />
              <AuditItem done={!!warranty.last_checkin_at} text="Check-in Físico realizado" points="+20%" />
              <AuditItem done={photos.length >= 3} text="Vistoria Visual 360º (3+ fotos)" points="+20%" />
              <AuditItem done={logs.length > 0} text="Histórico de Manutenção ativo" points="+10%" />
              
              {securityScore < 100 && (
                <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[32px] border border-amber-100 dark:border-amber-500/20 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-amber-600 shadow-sm"><AlertTriangle className="h-5 w-5" /></div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Seu dossiê ainda pode ser contestado. Complete os itens acima.</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-amber-600 font-black text-[10px] uppercase">Resolver</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Log de Auditoria</CardTitle></CardHeader>
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
          {/* Selo de Integridade Digital (Visual) */}
          <Card className="bg-slate-900 text-white border-none p-10 relative overflow-hidden group shadow-2xl">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-1000"><ShieldCheck className="h-48 w-48 text-emerald-500" /></div>
            <div className="relative z-10 space-y-6 text-center">
              <div className="h-20 w-20 rounded-[32px] bg-emerald-500 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <Fingerprint className="h-10 w-10 text-white" />
              </div>
              <div>
                <h4 className="text-xl font-black uppercase tracking-tighter">Selo de Integridade</h4>
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-1">Auditado Digitalmente</p>
              </div>
              <div className="pt-6 border-t border-white/5 space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Validação Hash</p>
                <p className="text-[10px] font-mono text-slate-400 break-all">GRD-{id.substring(0,16).toUpperCase()}-V12</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white dark:bg-slate-900 border-teal-50 dark:border-white/5 shadow-xl p-8 relative overflow-hidden">
            <TrendingDown className="h-8 w-8 text-red-100 dark:text-red-900/20 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor de Revenda</p>
            <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">R$ {(Number(warranty.price || 0) * 0.85).toLocaleString('pt-BR')}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AuditItem({ done, text, points }: { done: boolean, text: string, points: string }) {
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${done ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-60'}`}>
      <div className="flex items-center gap-4">
        {done ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-300" />}
        <span className={`text-sm font-bold ${done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{text}</span>
      </div>
      <span className={`text-[10px] font-black ${done ? 'text-emerald-600' : 'text-slate-400'}`}>{points}</span>
    </div>
  );
}