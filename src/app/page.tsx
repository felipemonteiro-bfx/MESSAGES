'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ShieldCheck, ArrowRight, Zap, Bell, FileText, Mail, Phone, Scale, TrendingUp, Umbrella, Smartphone, BadgeCheck, Check, Star, Globe, Users, Landmark, CreditCard, Sparkles, BrainCircuit, Gavel } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) router.push('/dashboard');
    });
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden selection:bg-emerald-500/30">
      {/* Navbar Minimalista de Lançamento */}
      <nav className="fixed top-0 left-0 right-0 z-[100] p-6">
        <div className="max-w-7xl mx-auto glass rounded-full px-8 py-4 flex items-center justify-between border border-white/20 shadow-2xl">
          <div className="flex items-center gap-2 group">
            <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Guardião<span className="text-emerald-600">.</span></span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600 transition-all">Entrar</Link>
            <Link href="/signup"><Button size="sm" className="h-10 px-6 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20">Começar Agora</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero Section Master */}
      <main className="relative pt-40 pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-screen -z-10 overflow-hidden opacity-40">
          <div className="absolute top-[10%] left-[10%] w-[600px] h-[600px] bg-emerald-400/20 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] bg-cyan-400/20 blur-[100px] rounded-full" />
        </div>

        <section className="max-w-7xl mx-auto px-6 text-center space-y-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl">
            <Sparkles className="h-3 w-3 text-emerald-400" /> A Nova Era da Gestão Patrimonial
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-6">
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-slate-900 dark:text-white leading-[0.85] uppercase">
              SEU PATRIMÔNIO <br />
              <span className="gradient-text">AUDITADO & SEGURO.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              O Guardião organiza suas notas, monitora a depreciação, simula seguros e protege seus direitos com IA. A evolução da sua organização pessoal.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/signup">
              <Button size="lg" className="h-20 px-12 text-xl font-black shadow-[0_32px_64px_-12px_rgba(16,185,129,0.4)] rounded-[32px] group">
                Criar meu Cofre <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => <div key={i} className="h-12 w-12 rounded-full border-4 border-white dark:border-slate-950 bg-slate-200 overflow-hidden shadow-xl"><Image src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" width={100} height={100} /></div>)}
              <div className="h-12 px-4 rounded-full border-4 border-white dark:border-slate-950 bg-slate-900 flex items-center justify-center text-[10px] font-black text-emerald-400 shadow-xl">+12k</div>
            </div>
          </motion.div>
        </section>

        {/* Features Showcase */}
        <section className="mt-40 max-w-7xl mx-auto px-6 grid gap-12 md:grid-cols-3">
          <FeatureCard 
            icon={<BrainCircuit className="h-10 w-10 text-emerald-600" />}
            title="Inteligência de Mercado"
            desc="Nossa IA monitora variações cambiais e lançamentos para avisar o melhor momento de revenda."
          />
          <FeatureCard 
            icon={<Gavel className="h-10 w-10 text-cyan-600" />}
            title="Blindagem Jurídica"
            desc="Gere dossiês probatórios aceitos em tribunais e seguradoras com um único clique."
          />
          <FeatureCard 
            icon={<Globe className="h-10 w-10 text-blue-600" />}
            title="Global Compliance"
            desc="Modo viagem com declaração multilingue e rastreio de ativos em todo o mundo."
          />
        </section>

        {/* Pricing Platinum Section */}
        <section className="mt-40 max-w-5xl mx-auto px-6 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Escolha sua <span className="text-emerald-600">Proteção.</span></h2>
            <p className="text-slate-500 font-medium italic">Planos que se adaptam ao tamanho da sua ambição.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 p-12 space-y-8 rounded-[48px] relative overflow-hidden group">
              <div className="h-1.5 w-full bg-slate-900 absolute top-0 left-0" />
              <div className="space-y-2">
                <CardTitle className="text-3xl font-black uppercase">Guardião Pro</CardTitle>
                <p className="text-slate-500 font-medium">Ideal para profissionais e entusiastas de tecnologia.</p>
              </div>
              <div className="text-5xl font-black text-slate-900 dark:text-white">R$ 14,90 <span className="text-sm text-slate-400 font-bold uppercase">/mês</span></div>
              <div className="space-y-4">
                <PlanItem text="IA OCR Ilimitada" />
                <PlanItem text="Dossiês de Venda e Sinistro" />
                <PlanItem text="Monitor de Câmbio e ROI" />
                <PlanItem text="Zap Guardião (Alertas)" />
              </div>
              <Button className="w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs">Assinar Platinum</Button>
            </Card>

            <Card className="border-none shadow-2xl bg-slate-900 text-white p-12 space-y-8 rounded-[48px] relative overflow-hidden group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-[48px] blur opacity-20 transition duration-1000 group-hover:opacity-40" />
              <div className="h-1.5 w-full bg-emerald-500 absolute top-0 left-0" />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl font-black uppercase">Plano Família</CardTitle>
                  <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">Mais Popular</div>
                </div>
                <p className="text-slate-400 font-medium">Toda a segurança da casa em um único cofre.</p>
              </div>
              <div className="relative z-10 text-5xl font-black text-white">R$ 29,90 <span className="text-sm text-slate-500 font-bold uppercase">/mês</span></div>
              <div className="relative z-10 space-y-4">
                <PlanItem text="Até 5 usuários inclusos" />
                <PlanItem text="Pastas Compartilhadas em Tempo Real" />
                <PlanItem text="Dossiê de Sucessão Patrimonial" />
                <PlanItem text="Suporte VIP 24h Humanizado" />
              </div>
              <Button className="relative z-10 w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs border-none shadow-xl shadow-emerald-500/20">Proteger Família</Button>
            </Card>
          </div>
        </section>

        {/* Footer Master */}
        <footer className="mt-40 pt-20 border-t border-slate-100 dark:border-white/5 flex flex-col items-center space-y-12">
          <div className="flex flex-wrap justify-center gap-12 text-sm font-black text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-2 hover:text-emerald-600 transition-colors cursor-pointer"><Mail className="h-4 w-4" /> help@guardiaonotas.com.br</div>
            <div className="flex items-center gap-2 hover:text-emerald-600 transition-colors cursor-pointer"><Landmark className="h-4 w-4" /> Auditado Digitalmente</div>
            <div className="flex items-center gap-2 hover:text-emerald-600 transition-colors cursor-pointer"><ShieldCheck className="h-4 w-4" /> Criptografia AES-256</div>
          </div>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-xl font-black text-slate-900 dark:text-white">
              Guardião<span className="text-emerald-600 text-3xl">.</span>
            </div>
            <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.5em]">Tecnologia para a Proteção da Riqueza Privada © 2026</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} className="p-10 bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl border border-teal-50 dark:border-white/5 space-y-6 transition-all group">
      <div className="h-20 w-20 rounded-[32px] bg-slate-50 dark:bg-white/5 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  );
}

function PlanItem({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
        <Check className="h-3 w-3 text-emerald-600" />
      </div>
      <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{text}</span>
    </div>
  );
}