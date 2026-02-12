'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trophy, Gift, Share2, Users, Copy, CheckCircle2, ArrowRight, Loader2, Zap, Heart, Star, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function ReferralPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [referredCount, setReferredCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      
      // Simulação de contagem de indicados (Em produção: query na tabela profiles)
      setReferredCount(3);
    }
    setLoading(false);
  };

  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/signup?ref=${profile?.referral_code || 'PRO'}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Link de indicação copiado!');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Programa de <span className="text-emerald-600">Recompensa</span></h1>
          <p className="text-slate-500 font-medium">Convide seus amigos e ganhe meses grátis do Plano Pro.</p>
        </div>
        <div className="px-6 py-3 rounded-2xl bg-slate-900 text-white flex items-center gap-3 shadow-2xl shadow-emerald-500/20">
          <Trophy className="h-5 w-5 text-emerald-400" />
          <p className="text-xs font-black uppercase tracking-widest">Nível: Embaixador</p>
        </div>
      </header>

      {/* Widget Principal de Indicação */}
      <div className="grid gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden relative group">
          <div className="h-2 w-full bg-emerald-500" />
          <CardContent className="p-12 space-y-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em]"><Gift className="h-4 w-4" /> Benefício Ativo</div>
              <h2 className="text-4xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">Ganhe <span className="text-emerald-600">1 Mês Grátis</span> por cada indicação.</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed max-w-xl">Quando seu amigo assina o Guardião usando seu link, nós creditamos automaticamente 30 dias de assinatura Pro na sua conta.</p>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seu Link Exclusivo</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 h-16 px-6 bg-slate-50 dark:bg-white/5 border-2 border-teal-50 dark:border-white/5 rounded-2xl flex items-center justify-between group/link overflow-hidden">
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate">{referralLink}</span>
                  <div className="flex items-center gap-2 text-emerald-600 bg-white dark:bg-slate-800 p-2 rounded-xl border border-teal-100 dark:border-white/10 shadow-sm opacity-0 group-hover/link:opacity-100 transition-opacity">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <Button onClick={copyLink} className="h-16 px-10 gap-2 font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 rounded-2xl shrink-0">
                  <Copy className="h-4 w-4" /> Copiar Link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status de Ganhos */}
        <div className="space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white p-10 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700"><Coins className="h-32 w-32 text-emerald-500" /></div>
            <div className="relative z-10 space-y-6">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Total de Convites Aceitos</p>
                <div className="text-6xl font-black text-white">{referredCount}</div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Economia Acumulada</p>
                <p className="text-2xl font-black text-white">R$ {(referredCount * 14.90).toFixed(2).replace('.', ',')}</p>
                <p className="text-[9px] text-slate-400 font-bold uppercase italic">Você ganhou {referredCount} meses de assinatura.</p>
              </div>
            </div>
          </Card>

          <div className="p-8 rounded-[40px] bg-emerald-50 dark:bg-emerald-900/10 border-2 border-emerald-100 dark:border-emerald-500/20 space-y-4">
            <div className="h-10 w-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><Zap className="h-6 w-6" /></div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Dica do Mestre</h4>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">Compartilhe seu link em grupos de colecionadores ou tecnologia. Usuários que têm muitos eletrônicos assinam o Pro em menos de 48h.</p>
          </div>
        </div>
      </div>

      {/* Footer de Regras */}
      <footer className="pt-10 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-2"><Star className="h-4 w-4 text-emerald-500" /> Válido para novos cadastros</div>
          <div className="flex items-center gap-2"><Heart className="h-4 w-4 text-pink-500" /> Sem limite de ganhos</div>
        </div>
        <Button variant="ghost" className="text-emerald-600 font-black uppercase text-[10px] tracking-widest gap-2">Ver Termos do Programa <ArrowRight className="h-4 w-4" /></Button>
      </footer>
    </div>
  );
}
