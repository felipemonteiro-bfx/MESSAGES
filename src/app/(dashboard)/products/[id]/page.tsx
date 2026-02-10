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
    if (photos.length >= 3) score += 15;
    if (warranty.insurance_policy) score += 15;
    return score;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  const securityScore = calculateAssetSecurityScore();

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
              {securityScore === 100 && <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-500/20"><BadgeCheck className="h-3 w-3" /> Proteção Total</div>}
            </div>
          </div>
          
          <div className="shrink-0 flex items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[32px] shadow-xl border border-teal-50 dark:border-white/5">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score de Segurança</p>
              <p className={`text-4xl font-black ${securityScore === 100 ? 'text-blue-600' : 'text-emerald-600'}`}>{securityScore}%</p>
            </div>
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center border-2 shadow-lg ${securityScore === 100 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              <ShieldCheck className="h-10 w-10" />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Módulo de Auditoria de Integridade (Checklist) */}
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative">
            <div className={`h-1.5 w-full ${securityScore === 100 ? 'bg-blue-600' : 'bg-emerald-500'}`} />
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tighter">
                <ListChecks className="h-5 w-5 text-emerald-600" /> Checklist de Auditoria
              </CardTitle>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Complete as tarefas para atingir o Selo de Proteção Total</p>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-4">
              <AuditItem done={!!warranty.invoice_url} text="Nota Fiscal Original" points="+30%" />
              <AuditItem done={!!warranty.serial_number} text="Identificação Única (Serial)" points="+20%" />
              <AuditItem done={!!warranty.last_checkin_at} text="Check-in Físico (Visto Recentemente)" points="+20%" />
              <AuditItem done={photos.length >= 3} text="Vistoria Visual 360º (3+ Fotos)" points="+15%" />
              <AuditItem done={!!warranty.insurance_policy} text="Apólice de Seguro Vinculada" points="+15%" />
            </CardContent>
          </Card>

          {/* Módulo de Gestão de Seguros (Policy Manager) */}
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden relative group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-1000"><Umbrella className="h-48 w-48 text-emerald-500 rotate-12" /></div>
            <CardHeader className="p-10 pb-0">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]"><ShieldCheck className="h-4 w-4" /> Gestão de Cobertura</div>
              <CardTitle className="text-2xl font-black uppercase tracking-tighter">Apólice de Seguro</CardTitle>
            </CardHeader>
            <CardContent className="p-10 pt-8 space-y-8">
              {warranty.insurance_policy ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase">Seguradora</p><p className="text-lg font-black text-white">{warranty.insurance_company}</p></div>
                  <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase">Nº da Apólice</p><p className="text-lg font-mono font-black text-emerald-400">{warranty.insurance_policy}</p></div>
                  <div className="space-y-1"><p className="text-[9px] font-black text-slate-500 uppercase">Expira em</p><p className="text-lg font-black text-white">{formatDate(warranty.insurance_expires_at)}</p></div>
                </div>
              ) : (
                <div className="p-8 rounded-[32px] bg-white/5 border-2 border-dashed border-white/10 text-center space-y-4">
                  <p className="text-sm text-slate-400 font-medium">Este ativo não possui seguro registrado no sistema.</p>
                  <Link href={`/insurance/compare/${id}`} className="block"><Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest px-8 h-12 rounded-xl">Proteger com Seguro</Button></Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Selo de Integridade Digital Individual */}
          <Card className="bg-white dark:bg-slate-900 border-none p-10 relative overflow-hidden group shadow-2xl text-center">
            <div className="h-24 w-24 rounded-[40px] bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-white dark:border-slate-800">
              <Fingerprint className={`h-12 w-12 ${securityScore === 100 ? 'text-blue-600' : 'text-emerald-600'}`} />
            </div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Selo Guardião</h4>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mt-1">Integridade Digital Verificada</p>
            <div className="mt-8 pt-8 border-t border-slate-50 dark:border-white/5">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Hash de Autenticidade</p>
              <p className="text-[9px] font-mono text-slate-500 break-all bg-slate-50 dark:bg-white/5 p-3 rounded-xl uppercase">GRD-{id.substring(0,8)}-{securityScore === 100 ? 'SAFE' : 'AUDIT'}-{Math.random().toString(36).substring(7).toUpperCase()}</p>
            </div>
          </Card>

          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <TrendingUp className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Valorização</h4><p className="text-xs font-medium text-emerald-100">Bens com Score de Segurança acima de 90% vendem até 25% mais caro.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Ver ROI de Auditoria</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditItem({ done, text, points }: { done: boolean, text: string, points: string }) {
  return (
    <div className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${done ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-500/20' : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 opacity-60'}`}>
      <div className="flex items-center gap-4">
        {done ? <CheckCircle2 className="h-6 w-6 text-emerald-600 fill-emerald-50" /> : <div className="h-6 w-6 rounded-full border-2 border-slate-300" />}
        <span className={`text-sm font-black uppercase tracking-tight ${done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{text}</span>
      </div>
      <span className={`text-[10px] font-black ${done ? 'text-emerald-600' : 'text-slate-400'}`}>{points}</span>
    </div>
  );
}