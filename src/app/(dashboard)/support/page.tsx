'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Scale, MessageCircle, FileText, ShieldCheck, ArrowRight, Loader2, Info, Gavel, Search, HelpCircle, ChevronDown, ChevronUp, Sparkles, Send } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function SupportPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
    { q: "Como a IA detecta os dados da minha nota?", a: "Usamos o modelo Gemini 1.5 Flash do Google para realizar OCR (Reconhecimento Óptico de Caracteres). O sistema lê a chave NF-e, valores, datas e até a bandeira do cartão usado." },
    { q: "Meus documentos estão seguros?", a: "Sim. Todos os arquivos são armazenados em buckets criptografados no Supabase (infraestrutura AWS) e o acesso é restrito apenas ao titular da conta." },
    { q: "O Dossiê Jurídico tem validade legal?", a: "O dossiê é um sumário probatório. Ele organiza as provas que você já possui (notas e logs) de forma técnica para facilitar a análise de um juiz ou seguradora." },
    { q: "Como funciona a transferência de bens?", a: "Ao vender um item, você gera um código único. O comprador insere esse código e recebe todo o histórico, nota fiscal e selo de integridade do produto." },
    { q: "Posso usar o app offline?", a: "Se você instalar o Guardião como PWA no seu celular, conseguirá visualizar seus bens cadastrados mesmo sem conexão ativa." }
  ];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Central de <span className="text-emerald-600">Suporte</span></h1>
          <p className="text-slate-500 font-medium">Tudo o que você precisa para dominar o Guardião.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/consultant">
            <Button className="gap-2 h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20">
              <Sparkles className="h-4 w-4" /> Consultoria IA
            </Button>
          </Link>
        </div>
      </header>

      {/* Busca Rápida */}
      <div className="relative group max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
        <input 
          type="text" 
          placeholder="Pesquisar por dúvidas (ex: segurança, nota fiscal, planos)..."
          className="w-full h-16 pl-12 pr-4 bg-white dark:bg-slate-900 border-2 border-teal-50 dark:border-white/5 rounded-[24px] focus:outline-none focus:border-emerald-500 shadow-xl shadow-emerald-500/5 font-medium"
        />
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* FAQ - Acordeon Profissional */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-emerald-600" /> Perguntas Frequentes
          </h3>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="border-none shadow-md overflow-hidden bg-white dark:bg-slate-900">
                <button 
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-6 text-left flex justify-between items-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                >
                  <span className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-tight">{faq.q}</span>
                  {openFaq === idx ? <ChevronUp className="h-5 w-5 text-emerald-600" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-6 pt-0 text-sm text-slate-500 font-medium leading-relaxed border-t border-slate-50 dark:border-white/5">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar de Contato VIP */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700">
              <MessageCircle className="h-48 w-48 text-emerald-500" />
            </div>
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4" /> Suporte VIP
              </div>
              <h4 className="text-2xl font-black leading-tight">Ainda com <span className="text-emerald-400">Dúvidas?</span></h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">Membros do Plano Pro e Família possuem atendimento humano prioritário via chat.</p>
              <Button className="w-full h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-emerald-900/20">
                <Send className="h-4 w-4" /> Abrir Chamado Agora
              </Button>
            </div>
          </Card>

          <div className="p-8 rounded-[40px] bg-emerald-50 border-2 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-500/20 space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">Ouvidoria Guardião</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Sugestões de melhorias ou parcerias? Envie um e-mail para **ajuda@guardiao.com**</p>
          </div>
        </div>
      </div>
    </div>
  );
}