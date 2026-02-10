'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Check, Zap, Crown, Users, ShieldCheck, Star, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function PlansPage() {
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
      setIsPremium(!!data?.is_premium);
    }
  };

  const handleUpgrade = async (priceId: string, planName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, planName }),
      });

      const { url, error } = await response.json();
      if (error) throw new Error(error);

      // Redireciona para o checkout do Stripe
      window.location.href = url;
    } catch (err: any) {
      toast.error('Erro ao iniciar checkout: ' + err.message);
      setLoading(false);
    }
  };

  const plans = [
    {
      name: 'Gratuito',
      price: 'R$ 0',
      description: 'Essencial para quem está começando.',
      features: ['Até 10 notas', 'IA Básica', 'Busca Simples'],
      current: !isPremium,
      icon: <Zap className="h-6 w-6 text-slate-400" />
    },
    {
      name: 'Guardião Pro',
      price: 'R$ 14,90',
      period: '/mês',
      priceId: 'price_1Q...', // SUBSTIUIR COM ID DO STRIPE
      description: 'Potência total para seu patrimônio.',
      features: ['Notas Ilimitadas', 'IA Avançada', 'Dossiê Jurídico', 'Alertas WhatsApp'],
      current: isPremium,
      popular: true,
      icon: <Crown className="h-6 w-6 text-amber-500" />
    },
    {
      name: 'Família',
      price: 'R$ 29,90',
      period: '/mês',
      priceId: 'price_1Q...', // SUBSTIUIR COM ID DO STRIPE
      description: 'Segurança compartilhada para toda a casa.',
      features: ['Tudo do Pro', 'Até 5 Membros', 'Balanço Consolidado', 'IA Consultiva'],
      current: false,
      icon: <Users className="h-6 w-6 text-emerald-600" />
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-black tracking-tight text-slate-900">Assine o <span className="text-emerald-600">Guardião</span></h1>
        <p className="text-slate-500 font-medium">Libere ferramentas exclusivas de IA e proteção jurídica.</p>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan, idx) => (
          <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <Card className={`h-full flex flex-col border-2 transition-all ${plan.popular ? 'border-emerald-500 shadow-2xl scale-105' : 'border-teal-50'}`}>
              <CardHeader className="p-8">
                <div className="p-3 bg-slate-50 rounded-2xl w-fit mb-4">{plan.icon}</div>
                <CardTitle className="text-2xl font-black">{plan.name}</CardTitle>
                <div className="mt-2 flex items-baseline"><span className="text-4xl font-black"> {plan.price}</span>{plan.period && <span className="ml-1 text-slate-400 font-bold">{plan.period}</span>}</div>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex-1 flex flex-col">
                <div className="space-y-4 flex-1">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-3"><Check className="h-4 w-4 text-emerald-600" /><span className="text-sm font-bold text-slate-600">{f}</span></div>
                  ))}
                </div>
                <Button 
                  onClick={() => plan.priceId && handleUpgrade(plan.priceId, plan.name)}
                  disabled={loading || plan.current}
                  className="w-full h-14 mt-10"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (plan.current ? 'Seu Plano' : 'Assinar Agora')}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
