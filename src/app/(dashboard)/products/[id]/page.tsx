'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Scan, Camera, MapPin, Megaphone, ShoppingCart, Tag, BadgeCheck } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/navigation';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
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

  const getExtendedWarrantyInfo = () => {
    if (!warranty.card_brand) return null;
    const brand = warranty.card_brand.toLowerCase();
    if (brand.includes('platinum') || brand.includes('infinite') || brand.includes('black') || brand.includes('gold')) {
      return {
        title: 'Garantia Estendida Gratuita!',
        desc: `Seu cartão ${warranty.card_brand} provavelmente oferece +1 ano de garantia original gratuita para este item.`,
        action: 'Como emitir o Bilhete?',
        link: brand.includes('visa') ? 'https://www.visa.com.br/portal-de-beneficios' : 'https://www.naotempreco.com.br/guia-de-beneficios'
      };
    }
    return null;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  const extendedInfo = getExtendedWarrantyInfo();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold uppercase text-[10px] tracking-widest">Editar</Button></Link>
      </div>

      {extendedInfo && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-[32px] bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform"><BadgeCheck className="h-32 w-32" /></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg"><ShieldCheck className="h-6 w-6 text-white" /></div>
            <div><h3 className="text-xl font-black uppercase tracking-tighter">{extendedInfo.title}</h3><p className="text-xs font-medium text-emerald-50 max-w-xl">{extendedInfo.desc}</p></div>
          </div>
          <a href={extendedInfo.link} target="_blank" rel="noopener noreferrer" className="relative z-10">
            <Button className="bg-white text-emerald-700 hover:bg-emerald-50 font-black text-[10px] uppercase h-12 px-8 rounded-xl shadow-lg border-none">{extendedInfo.action}</Button>
          </a>
        </motion.div>
      )}

      <header className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{warranty.name}</h1>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><CreditCard className="h-5 w-5 text-emerald-600" /> Inteligência Financeira</CardTitle></CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div className="space-y-1"><p className="text-[10px] font-black uppercase text-slate-400">Valor Original</p><p className="text-2xl font-black text-slate-900 dark:text-white">R$ {Number(warranty.price || 0).toLocaleString('pt-BR')}</p></div>
              <div className="space-y-1"><p className="text-[10px] font-black uppercase text-slate-400">Cartão de Compra</p><p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2"><CreditCard className="h-4 w-4 text-emerald-600" /> {warranty.card_brand || '---'}</p></div>
              <div className="space-y-1"><p className="text-[10px] font-black uppercase text-slate-400">Status Jurídico</p><p className="text-sm font-black text-emerald-600 uppercase">Auditado</p></div>
            </div>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Log de Vida</CardTitle></CardHeader>
            <div className="space-y-6">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="pt-1"><p className="text-sm font-black text-slate-900 dark:text-slate-200">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden shadow-2xl">
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor de Revenda</p>
            <div className="text-4xl font-black text-white mt-1">R$ {(Number(warranty.price || 0) * 0.82).toLocaleString('pt-BR')}</div>
            <p className="text-[9px] text-emerald-500 mt-4 italic flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Auditado pelo Guardião</p>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <Umbrella className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Proteção Ativa</h4><p className="text-xs font-medium text-emerald-100 leading-relaxed">Gere dossiês para sinistros ou seguros em segundos.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Ver Opções Pro</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
