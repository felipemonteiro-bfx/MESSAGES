'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Zap, X } from 'lucide-react';
import { Button } from '../ui/Button';

export const OnboardingTour = () => {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('onboarding_seen');
    if (!hasSeenTour) {
      setTimeout(() => setIsVisible(true), 1500);
    }
  }, []);

  const steps = [
    {
      title: "Bem-vindo ao Futuro!",
      desc: "O Guardião de Notas agora é seu consultor de patrimônio. Vamos te mostrar como dominar o sistema em 30 segundos.",
      icon: <Sparkles className="h-8 w-8 text-emerald-500" />,
      position: "center"
    },
    {
      title: "O Cérebro da Gestão",
      desc: "Aqui no Concierge, nossa IA analisa seu cofre e sugere ações para manter sua proteção em 100%.",
      icon: <Zap className="h-8 w-8 text-amber-500" />,
      position: "top-left",
      target: "concierge"
    },
    {
      title: "Saúde do Patrimônio",
      desc: "Acompanhe seu balanço real e quanto você já conquistou da sua meta financeira total.",
      icon: <ShieldCheck className="h-8 w-8 text-blue-500" />,
      position: "top-right",
      target: "health"
    },
    {
      title: "Inteligência em um Clique",
      desc: "Use o Cmd+K para buscar ativos ou navegue pelo menu 'Ferramentas' para acessar dossiês e auditorias.",
      icon: <CheckCircle2 className="h-8 w-8 text-emerald-600" />,
      position: "navbar"
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      closeTour();
    }
  };

  const closeTour = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_seen', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div 
          key={step}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[40px] shadow-2xl border border-white/20 overflow-hidden relative"
        >
          <button onClick={closeTour} className="absolute top-6 right-6 p-2 bg-slate-50 dark:bg-white/5 rounded-full text-slate-400 hover:text-red-500 transition-all"><X className="h-4 w-4" /></button>
          
          <div className="p-10 text-center space-y-8">
            <div className="h-20 w-20 bg-slate-50 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
              {steps[step].icon}
            </div>
            
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">{steps[step].title}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{steps[step].desc}</p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-emerald-500' : 'w-1.5 bg-slate-200 dark:bg-white/10'}`} />
                ))}
              </div>
              <Button onClick={handleNext} className="h-14 px-8 font-black uppercase text-xs tracking-widest gap-2 shadow-xl shadow-emerald-500/20">
                {step === steps.length - 1 ? 'Começar Agora' : 'Próximo'} 
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
