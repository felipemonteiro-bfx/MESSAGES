'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Umbrella, ShieldCheck, Check, Zap, ArrowLeft, Loader2, Star, BadgeCheck, ExternalLink, Smartphone, Laptop, Camera, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';

export default function InsuranceComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [warranty, setWarranty] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data } = await supabase.from('warranties').select('*').eq('id', id).single();
    if (data) setWarranty(data);
    setLoading(false);
  };

  const insuranceOffers = [
    { provider: 'Pier Seguros', price: 42.90, coverage: 'Roubo, Furto e Danos', rating: 4.8, popular: true, speed: 'Ativação em 5 min' },
    { provider: 'Ciclic', price: 38.50, coverage: 'Roubo e Quebra Acidental', rating: 4.5, popular: false, speed: 'Processo 100% Online' },
    { provider: 'Porto Seguro', price: 55.00, coverage: 'Proteção Total + Internacional', rating: 4.9, popular: false, speed: 'Marca Tradicional' },
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="space-y-1 text-center md:text-left">
          <Link href={`/products/${id}`} className="inline-flex items-center gap-2 text-slate-400 font-bold hover:text-emerald-600 transition-all mb-2"><ArrowLeft className="h-4 w-4" /> Voltar ao Ativo</Link>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Marketplace de <span className="text-emerald-600">Seguros</span></h1>
          <p className="text-slate-500 font-medium">As melhores taxas do Brasil para seu {warranty.name}.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-slate-900/20">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Curadoria Guardião
        </div>
      </header>

      {/* Grid de Ofertas */}
      <div className="grid gap-8 md:grid-cols-3">
        {insuranceOffers.map((offer, idx) => (
          <motion.div key={offer.provider} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <Card className={`h-full flex flex-col border-2 transition-all duration-500 overflow-hidden relative group ${offer.popular ? 'border-emerald-500 shadow-2xl scale-105 z-10' : 'border-teal-50 dark:border-white/5 hover:border-emerald-200'}`}>
              {offer.popular && <div className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest py-1.5 text-center">Melhor Custo-Benefício</div>}
              
              <CardHeader className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-emerald-600 shadow-sm font-black italic">{offer.provider[0]}</div>
                  <div className="flex items-center gap-1 text-amber-500 font-black text-xs"><Star className="h-3 w-3 fill-current" /> {offer.rating}</div>
                </div>
                <CardTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{offer.provider}</CardTitle>
                <div className="mt-4 flex items-baseline"><span className="text-4xl font-black text-slate-900 dark:text-white">R$ {offer.price.toFixed(2)}</span><span className="ml-1 text-slate-400 font-bold text-xs">/mês</span></div>
              </CardHeader>

              <CardContent className="p-8 pt-0 flex-1 flex flex-col">
                <div className="space-y-4 flex-1">
                  <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cobertura Principal</p>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{offer.coverage}</p>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                    <BadgeCheck className="h-4 w-4" /> {offer.speed}
                  </div>
                </div>
                
                <Button className={`w-full h-14 mt-10 font-black uppercase text-xs tracking-widest gap-2 ${offer.popular ? 'bg-emerald-600' : 'bg-slate-900'}`}>
                  Contratar Agora <ExternalLink className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Seção de Por que Segurar via Guardião */}
      <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden group">
        <div className="h-2 w-full bg-emerald-500" />
        <CardContent className="p-12 flex flex-col md:flex-row items-center gap-12">
          <div className="h-24 w-24 rounded-[40px] bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 shrink-0 shadow-xl border-4 border-white dark:border-slate-800">
            <ShieldCheck className="h-12 w-12" />
          </div>
          <div className="space-y-4 flex-1">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">Indenização até <span className="text-emerald-600">40% mais rápida.</span></h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">Ao contratar um seguro através do marketplace do Guardião, enviamos automaticamente o seu **Dossiê Auditado** para a seguradora. Isso elimina a burocracia de envio de documentos em caso de sinistro.</p>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase"><Check className="h-4 w-4" /> Prova de Nota Fiscal</div>
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase"><Check className="h-4 w-4" /> Histórico de Manutenção</div>
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase"><Check className="h-4 w-4" /> Selo de Integridade</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
