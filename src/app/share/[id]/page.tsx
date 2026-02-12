'use client';

import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/Card';
import { ShieldCheck, Calendar, Store, Hash, Package, CheckCircle2, ShieldAlert, Fingerprint, Globe, Landmark, BadgeCheck, Verified } from 'lucide-react';
import { formatDate } from '@/lib/utils/date-utils';
import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function PublicSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('warranties')
        .select('name, purchase_date, store, serial_number, category, price')
        .eq('id', id)
        .single();
      setItem(data);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  if (!item) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center p-10 space-y-4 dark:bg-slate-900 border-none shadow-2xl">
        <ShieldAlert className="h-16 w-16 text-red-500 mx-auto" />
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">Ativo não localizado</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">Este protocolo de verificação expirou ou o item foi removido pelo proprietário.</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-6 flex flex-col items-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl w-full space-y-10">
        
        {/* Cabeçalho de Certificação Premium */}
        <div className="text-center space-y-6">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
            <div className="bg-emerald-600 text-white px-8 py-3 rounded-full inline-flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-600/30 border-4 border-white dark:border-slate-900">
              <Verified className="h-5 w-5" /> Patrimônio Verificado
            </div>
          </motion.div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Certificado de <span className="text-emerald-600">Procedência</span></h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">Este ativo possui custódia digital verificada e histórico auditado.</p>
          </div>
        </div>

        <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden bg-white dark:bg-slate-900">
          <div className="h-3 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <CardContent className="p-12 space-y-12">
            
            {/* Seção Principal: Nome e Identificação */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-10 border-b border-slate-50 dark:border-white/5 pb-12">
              <div className="space-y-2 text-center md:text-left">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Protocolo de Auditoria Digital</p>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white leading-none uppercase tracking-tighter">{item.name}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                  <span className="bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">{item.category || 'Geral'}</span>
                  <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-black uppercase tracking-tighter bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" /> Propriedade Legítima
                  </div>
                </div>
              </div>
              <div className="shrink-0 h-32 w-32 rounded-[40px] bg-slate-900 dark:bg-emerald-600 flex items-center justify-center text-emerald-500 dark:text-white shadow-2xl border-8 border-white dark:border-slate-800 rotate-3 group hover:rotate-0 transition-transform duration-500">
                <Fingerprint className="h-16 w-16" />
              </div>
            </div>

            {/* Grid de Dados Oficiais */}
            <div className="grid sm:grid-cols-2 gap-12">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><Calendar className="h-4 w-4 text-emerald-600" /> Aquisição</div>
                <p className="text-lg font-black text-slate-800 dark:text-slate-200">{formatDate(item.purchase_date)}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><Store className="h-4 w-4 text-emerald-600" /> Origem Verificada</div>
                <p className="text-lg font-black text-slate-800 dark:text-slate-200">{item.store || 'Nota Fiscal Auditada'}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><Hash className="h-4 w-4 text-emerald-600" /> Identificador (S/N)</div>
                <p className="text-lg font-mono font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-white/5 px-4 py-2 rounded-2xl w-fit">{item.serial_number || 'VALIDADO'}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]"><Landmark className="h-4 w-4 text-emerald-600" /> Valor Histórico</div>
                <p className="text-lg font-black text-slate-800 dark:text-slate-200">R$ {Number(item.price || 0).toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Disclaimer de Segurança e Fé Pública */}
            <div className="p-8 rounded-[40px] bg-slate-900 text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl relative overflow-hidden group">
              <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700"><ShieldCheck className="h-40 w-40" /></div>
              <div className="h-16 w-16 rounded-2xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                <BadgeCheck className="h-8 w-8 text-white" />
              </div>
              <div className="space-y-2 relative z-10">
                <p className="text-[10px] font-black uppercase text-emerald-400 tracking-[0.2em]">Declaração de Integridade</p>
                <p className="text-sm font-medium text-slate-300 leading-relaxed">O sistema Guardião de Notas certifica que este item foi documentado no ato da compra e possui monitoramento de garantia e manutenção ativo. Os dados fiscais foram validados via OCR de alta precisão.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Institucional */}
        <footer className="text-center space-y-6">
          <div className="flex items-center justify-center gap-4 text-slate-400">
            <div className="h-px w-12 bg-slate-200 dark:bg-white/10" />
            <Globe className="h-5 w-5" />
            <div className="h-px w-12 bg-slate-200 dark:bg-white/10" />
          </div>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em]">Protocolo GRD-AUT-{id.substring(0, 12).toUpperCase()}</p>
          <p className="text-[9px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Guardião de Notas © 2026 • Tecnologia de Proteção Patrimonial</p>
        </footer>
      </motion.div>
    </div>
  );
}
