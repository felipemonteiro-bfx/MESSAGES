'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Scale, MessageCircle, FileText, ShieldCheck, ArrowRight, Loader2, Info, Gavel, Search, HelpCircle, ChevronDown, ChevronUp, Sparkles, Send, Landmark, Balance, PhoneIncoming } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function SupportPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
    }
    setLoading(false);
  };

  const faqs = [
    { q: "Como a IA detecta os dados da minha nota?", a: "Usamos o modelo Gemini 1.5 Flash do Google para realizar OCR. O sistema lê a chave NF-e, valores, datas e até a bandeira do cartão usado." },
    { q: "Meus documentos estão seguros?", a: "Sim. Todos os arquivos são armazenados em buckets criptografados no Supabase (infraestrutura AWS) e o acesso é restrito apenas ao titular da conta." },
    { q: "O Dossiê Jurídico tem validade legal?", a: "O dossiê é um sumário probatório. Ele organiza as provas que você já possui (notas e logs) de forma técnica para facilitar a análise de um juiz ou seguradora." },
    { q: "Como funciona a transferência de bens?", a: "Ao vender um item, você gera um código único. O comprador insere esse código e recebe todo o histórico, nota fiscal e selo de integridade do produto." },
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Central de <span className="text-emerald-600">Suporte</span></h1>
          <p className="text-slate-500 font-medium">Assistência técnica, financeira e jurídica completa.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/consultant">
            <Button className="gap-2 h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20">
              <Sparkles className="h-4 w-4" /> Consultoria IA
            </Button>
          </Link>
        </div>
      </header>

      {/* NOVO: Concierge Jurídico Humanizado (Top Feature) */}
      <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden group">
        <div className="absolute right-0 top-0 p-10 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Gavel className="h-64 w-64 text-emerald-500 rotate-12" /></div>
        <CardContent className="p-12 relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-[0.3em]">
              <Balance className="h-4 w-4" /> VIP Legal Channel
            </div>
            <h2 className="text-4xl font-black leading-tight uppercase tracking-tighter">Precisa de um <span className="text-emerald-400">Advogado?</span></h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-2xl">Membros Pro possuem acesso direto a escritórios de advocacia parceiros especialistas em Direito do Consumidor. Envie seu Dossiê Jurídico auditado e inicie sua ação em minutos.</p>
            <div className="flex flex-wrap gap-6 pt-4">
              <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /><p className="text-xs font-bold text-slate-300">Plantão Jurídico Ativo</p></div>
              <div className="flex items-center gap-3"><div className="h-2 w-2 rounded-full bg-blue-500" /><p className="text-xs font-bold text-slate-300">Análise de Dossiê em 2h</p></div>
            </div>
          </div>
          <Button onClick={() => window.open('https://wa.me/5511999999999')} className="h-20 px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-sm tracking-[0.2em] shadow-2xl shadow-emerald-900/20 shrink-0 rounded-[32px] gap-3">
            <PhoneIncoming className="h-6 w-6" /> Falar com Especialista
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-emerald-600" /> Perguntas Frequentes
          </h3>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full p-6 text-left flex justify-between items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <span className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-tight">{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="h-5 w-5 text-emerald-600" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </button>
                <AnimatePresence>{openFaq === idx && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="p-6 pt-0 text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed border-t border-slate-50 dark:border-white/5">{faq.a}</div>
                  </motion.div>
                )}</AnimatePresence>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 rounded-[40px] bg-white dark:bg-slate-900 border border-teal-50 dark:border-white/5 shadow-xl space-y-6 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform duration-700"><Landmark className="h-32 w-32 text-emerald-600" /></div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ouvidoria Guardião</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Sugestões de melhorias ou parcerias? Nossa diretoria avalia cada caso pessoalmente.</p>
            <Button variant="ghost" className="w-full h-12 text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-white/10">Enviar E-mail</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
