'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Scale, MessageCircle, FileText, ShieldCheck, ArrowRight, Loader2, Info, Gavel, Search } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function SupportPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [step, setStep] = useState(1);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      const { data: items } = await supabase.from('warranties').select('*');
      if (items) setWarranties(items);
    }
    setLoading(false);
  };

  const handleStartProcess = () => {
    if (!selectedProduct) return toast.error('Selecione um produto para continuar.');
    setStep(2);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  if (!profile?.is_premium) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 bg-indigo-100 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200"><Scale className="h-12 w-12 text-indigo-600" /></div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Concierge <span className="text-indigo-600">Jurídico</span></h1>
          <p className="text-slate-500 max-w-lg mx-auto font-medium">O suporte especializado para reclamações formais e auxílio em processos de garantia é exclusivo para membros Pro.</p>
        </div>
        <Link href="/plans"><Button size="lg" className="h-16 px-12 text-lg bg-indigo-600">Fazer Upgrade e Acessar Suporte</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Concierge <span className="text-emerald-600">Jurídico</span></h1>
          <p className="text-slate-500 font-medium">Assistência completa para acionar seus direitos de consumidor.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest">Atendimento VIP Ativo</div>
      </header>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <Card className="border-none shadow-2xl p-8 space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-black text-slate-900">Passo 1: Qual produto deu defeito?</h3>
                    <p className="text-sm text-slate-500">Selecione um dos seus bens cadastrados para iniciarmos o roteiro de reclamação.</p>
                  </div>
                  <div className="grid gap-4">
                    {warranties.map(item => (
                      <button 
                        key={item.id} 
                        onClick={() => setSelectedProduct(item.id)}
                        className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${selectedProduct === item.id ? 'border-emerald-500 bg-emerald-50 shadow-lg' : 'border-slate-100 bg-white hover:border-emerald-200'}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${selectedProduct === item.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Package className="h-6 w-6" /></div>
                          <div className="text-left">
                            <p className="font-black text-slate-900">{item.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">{item.store || 'Loja não informada'}</p>
                          </div>
                        </div>
                        {selectedProduct === item.id && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                  <Button onClick={handleStartProcess} className="w-full h-16 text-lg font-black uppercase tracking-widest gap-2">Iniciar Roteiro Jurídico <ArrowRight className="h-6 w-6" /></Button>
                </Card>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="border-none shadow-2xl bg-white overflow-hidden">
                  <div className="h-2 w-full bg-emerald-600" />
                  <CardHeader className="p-8 border-b border-slate-50">
                    <CardTitle className="text-2xl font-black flex items-center gap-3">
                      <Gavel className="h-8 w-8 text-emerald-600" /> Roteiro de Ação Jurídica
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-10">
                    <div className="space-y-6">
                      <ActionStep number="01" title="Tente o Contato Amigável" desc="Use nosso Dossiê Jurídico e envie para o SAC da fabricante. Informe que o produto foi auditado pelo Guardião." />
                      <ActionStep number="02" title="Registre no Consumidor.gov" desc="Caso não resolvam em 5 dias úteis, abra uma reclamação oficial no portal federal usando os dados da nota que guardamos." />
                      <ActionStep number="03" title="Acione o JEC (Pequenas Causas)" desc="Se o valor for até 40 salários mínimos, você pode entrar com o processo sem advogado. Nosso dossiê serve como prova técnica." />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-slate-50">
                      <Link href={`/products/${selectedProduct}`} className="flex-1">
                        <Button variant="outline" className="w-full h-14 font-black text-xs uppercase tracking-widest">Baixar Dossiê de Prova</Button>
                      </Link>
                      <Button className="flex-1 h-14 font-black text-xs uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 gap-2">Falar com Consultor Humano <MessageCircle className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-6">
          <div className="p-8 rounded-[40px] bg-slate-900 text-white shadow-xl space-y-4">
            <ShieldCheck className="h-8 w-8 text-emerald-400" />
            <h4 className="text-xl font-black leading-tight">Garantia de Resolução</h4>
            <p className="text-xs font-medium text-slate-400 leading-relaxed">Nossa metodologia de organização de notas fiscais aumenta em 85% a chance de vitória em causas de garantia contra fabricantes.</p>
          </div>
          
          <div className="p-8 rounded-[40px] bg-white border border-teal-50 shadow-xl space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Precisa de Ajuda?</h4>
            <p className="text-sm font-bold text-slate-700 leading-relaxed">Nossa equipe jurídica de plantão responde em até 24h para membros Família.</p>
            <Button variant="ghost" className="w-full text-emerald-600 font-black text-[10px] uppercase tracking-widest border border-teal-100 h-12">Abrir Chamado VIP</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionStep({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="flex items-start gap-6">
      <div className="text-4xl font-black text-emerald-100 select-none shrink-0">{number}</div>
      <div className="space-y-1">
        <h4 className="text-lg font-black text-slate-900 tracking-tight">{title}</h4>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
