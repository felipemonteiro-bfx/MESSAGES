'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, ArrowRight, Zap, Bell, FileText, Mail, Phone, Scale, TrendingUp, Umbrella, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();
  const logoUrl = "https://lh3.googleusercontent.com/gg-dl/AOI_d_9yfHBtXafzC8T3snFo7GdIXq6HQDLrt7Z5UxvjYWabsrwlj0P8aBncqzU2Ovv-1swtO5xi4N4ASTShjz3534eDjmZkVM-5XpKtkgZOgKZCfKpV3R-f4L2vd4ROx6xEZznyzv0oVwwV508ew19R7APwkVR_qqSSXJtDnNWguraFqE-xLQ=s1024-rj";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) router.push('/dashboard');
    });
  }, [router, supabase.auth]);

  return (
    <div className="min-h-screen bg-teal-50/20 overflow-x-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[800px] -z-10 opacity-40">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-400/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-[-5%] w-[500px] h-[500px] bg-cyan-400/20 blur-[100px] rounded-full" />
      </div>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <header className="flex flex-col items-center text-center space-y-8">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="relative h-28 w-28 overflow-hidden rounded-[32px] shadow-2xl border-4 border-white">
            <Image src={logoUrl} alt="Logo Guardião" fill className="object-cover" unoptimized />
          </motion.div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
            <Zap className="h-3 w-3 text-emerald-400" /> Inteligência de Ativos v3.0
          </div>

          <div className="space-y-6">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 leading-[0.85]">
              Gestão Inteligente de <br />
              <span className="gradient-text">Patrimônio Pessoal.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium leading-relaxed">
              O Guardião organiza suas notas, monitora a depreciação, simula seguros e protege seus direitos com IA. A evolução da sua organização pessoal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="h-16 px-12 text-xl font-black shadow-2xl shadow-emerald-500/20 group">
                Começar Grátis <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-all" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="h-16 px-12 text-xl font-bold border-teal-100">
                Entrar
              </Button>
            </Link>
          </div>
        </header>

        {/* Features Grid */}
        <section className="mt-32 grid gap-8 md:grid-cols-3 lg:grid-cols-4">
          <FeatureCard 
            icon={<FileText className="text-emerald-600" />} 
            title="IA Processadora" 
            desc="Extração automática de preços, datas e lojas via visão computacional." 
          />
          <FeatureCard 
            icon={<TrendingUp className="text-cyan-600" />} 
            title="Depreciação Real" 
            desc="Saiba quanto seus bens valem hoje com base em tendências de mercado." 
          />
          <FeatureCard 
            icon={<Umbrella className="text-blue-600" />} 
            title="Simulador de Seguro" 
            desc="Proteja seus bens contra roubos e danos com simulações instantâneas." 
          />
          <FeatureCard 
            icon={<Scale className="text-slate-900" />} 
            title="Dossiê Jurídico" 
            desc="Documentos prontos para o Procon ou pequenas causas em segundos." 
          />
        </section>

        {/* Trust Section */}
        <section className="mt-32 p-12 glass rounded-[48px] text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">O App que se <span className="text-emerald-600">Paga.</span></h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto">Nossos usuários economizam em média R$ 2.400 por ano recuperando garantias que seriam perdidas.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <div className="text-4xl font-black text-slate-900">100%</div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Segurança em Nuvem</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-black text-slate-900">2s</div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Processamento IA</p>
            </div>
            <div className="space-y-2">
              <div className="text-4xl font-black text-slate-900">R$ 0</div>
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Custo de Implementação</p>
            </div>
          </div>
        </section>

        <footer className="mt-32 pt-12 border-t border-teal-100 flex flex-col items-center space-y-8">
          <div className="flex flex-wrap justify-center gap-12 text-sm font-bold text-slate-400 uppercase tracking-widest">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-600" /> suporte@guardiaonotas.com.br</div>
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-600" /> (11) 9999-9999</div>
            <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-600" /> Disponível Web & PWA</div>
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
            © 2026 Guardião de Notas. Tecnologia para proteção patrimonial.
          </p>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <motion.div whileHover={{ y: -10 }} className="p-8 bg-white rounded-[32px] shadow-xl shadow-emerald-500/5 border border-teal-50 space-y-4 transition-all">
      <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-black text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
    </motion.div>
  );
}