'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Landmark, ShieldCheck, Zap, Search, Plus, Loader2, ArrowRight, CheckCircle2, ShoppingCart, Smartphone, Laptop, Tv, Coffee, ExternalLink, ArrowLeft, BrainCircuit, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function OpenFinanceImportPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detectedItems, setDetectedItems] = useState<any[]>([]);
  const router = useRouter();
  const supabase = createClient();

  const simulateConnection = () => {
    setLoading(true);
    setTimeout(() => {
      setStep(2);
      setLoading(false);
      toast.success('Conexão segura via Banco Central estabelecida!');
    }, 2500);
  };

  const simulateScan = () => {
    setLoading(true);
    setTimeout(() => {
      setDetectedItems([
        { id: 't1', name: 'iPhone 15 Pro', store: 'Apple Brasil', price: 7299.00, date: '2025-01-15', icon: <Smartphone className="h-5 w-5" />, reason: "Identificado pelo valor e nome do estabelecimento oficial." },
        { id: 't2', name: 'Dell Alienware M16', store: 'Dell Store', price: 14500.00, date: '2024-11-20', icon: <Laptop className="h-5 w-5" />, reason: "Compra de alto valor em fabricante de eletrônicos." },
        { id: 't3', name: 'Smart TV LG OLED', store: 'Magazine Luiza', price: 4200.00, date: '2024-12-05', icon: <Tv className="h-5 w-5" />, reason: "Valor compatível com bens duráveis em varejista." },
      ]);
      setStep(3);
      setLoading(false);
      toast.success('Varredura IA concluída: 3 bens duráveis encontrados!');
    }, 3500);
  };

  const handleImport = async (item: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('warranties').insert({
        user_id: user.id,
        name: item.name,
        store: item.store,
        price: item.price,
        purchase_date: item.date,
        folder: 'Importados',
        category: 'Eletrônicos'
      });

      if (error) throw error;
      
      setDetectedItems(prev => prev.filter(i => i.id !== item.id));
      toast.success(`${item.name} importado para o seu cofre!`);
      
      if (detectedItems.length === 1) {
        setTimeout(() => router.push('/dashboard'), 1500);
      }
    } catch (err) {
      toast.error('Erro ao importar item.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all">
          <ArrowLeft className="h-6 w-6 text-slate-500" />
        </button>
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Smart <span className="text-emerald-600">Import</span></h1>
          <p className="text-slate-500 font-medium text-sm">Integração Open Finance para automação de inventário.</p>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden text-center p-12 space-y-10">
              <div className="h-24 w-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-[40px] flex items-center justify-center mx-auto shadow-xl border-4 border-white dark:border-slate-800">
                <Landmark className="h-12 w-12 text-emerald-600" />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Conecte sua Conta</h2>
                <p className="text-slate-500 max-w-sm mx-auto font-medium leading-relaxed">O Guardião escaneará seu extrato bancário em busca de compras de bens duráveis para automatizar seu cadastro de garantias.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto opacity-40">
                <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center font-black text-[10px]">ITAÚ</div>
                <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center font-black text-[10px]">NUBANK</div>
                <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl flex items-center justify-center font-black text-[10px]">INTER</div>
              </div>
              <Button onClick={simulateConnection} disabled={loading} className="h-16 px-12 text-lg font-black uppercase tracking-widest shadow-2xl shadow-emerald-500/20 gap-3 rounded-[24px]">
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ShieldCheck className="h-6 w-6" />}
                {loading ? 'Validando Token...' : 'Conectar via Open Finance'}
              </Button>
              <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <Lock className="h-3 w-3" /> Criptografia Nível Bancário (AES-256)
              </div>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="border-none shadow-2xl bg-slate-900 text-white p-12 text-center space-y-10">
              <div className="relative h-32 w-32 mx-auto">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                <div className="relative h-32 w-32 bg-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                  <BrainCircuit className="h-16 w-16 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase tracking-tighter">IA em Processamento</h3>
                <p className="text-slate-400 font-medium max-w-md mx-auto leading-relaxed">Nossa inteligência artificial está filtrando milhares de transações para encontrar eletrônicos, móveis e eletrodomésticos.</p>
              </div>
              {!loading && (
                <Button onClick={simulateScan} className="bg-emerald-600 hover:bg-emerald-500 text-white h-14 px-10 font-black uppercase text-xs tracking-widest rounded-xl">Iniciar Varredura</Button>
              )}
              {loading && <Loader2 className="h-10 w-10 animate-spin mx-auto text-emerald-500" />}
            </Card>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" /> Ativos Localizados (Prontos para Auditoria)
              </h3>
              <p className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg">{detectedItems.length} Encontrados</p>
            </div>
            
            <div className="grid gap-4">
              {detectedItems.map((item) => (
                <Card key={item.id} className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden group hover:scale-[1.01] transition-all">
                  <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                      <div className="h-16 w-16 rounded-[24px] bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                        {item.icon}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg leading-none">{item.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{item.store} • {new Date(item.date).toLocaleDateString('pt-BR')}</p>
                        <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 mt-1"><Sparkles className="h-3 w-3" /> {item.reason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Valor de Nota</p>
                        <p className="text-xl font-black text-slate-900 dark:text-white">R$ {item.price.toLocaleString('pt-BR')}</p>
                      </div>
                      <Button onClick={() => handleImport(item)} className="h-14 px-8 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest gap-2 rounded-2xl shadow-xl shadow-slate-200 dark:shadow-none">
                        <Plus className="h-4 w-4" /> Importar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <div className="flex justify-center pt-10 border-t border-slate-100 dark:border-white/5">
              <Button variant="ghost" onClick={() => router.push('/dashboard')} className="text-slate-400 font-bold uppercase text-[10px] tracking-widest hover:text-emerald-600">Finalizar e ir para o Painel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border-none shadow-2xl bg-emerald-600 text-white p-12 relative overflow-hidden group rounded-[48px]">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-1000"><ShieldCheck className="h-64 w-64 text-white" /></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-6">
            <h3 className="text-3xl font-black leading-tight uppercase tracking-tighter">Sua segurança é <span className="text-emerald-100 underline underline-offset-8 decoration-emerald-200">Sagrada.</span></h3>
            <p className="text-emerald-50 text-lg font-medium leading-relaxed max-w-2xl">O Guardião não armazena suas senhas. Nossa tecnologia apenas solicita permissão de leitura via Banco Central para identificar ativos físicos. Seus dados financeiros nunca saem do seu navegador.</p>
          </div>
          <Button variant="ghost" className="h-16 px-10 bg-white text-emerald-700 hover:bg-emerald-50 font-black uppercase text-xs tracking-widest rounded-2xl shadow-2xl border-none">Segurança Whitepaper</Button>
        </div>
      </Card>
    </div>
  );
}

import { Lock } from 'lucide-react';
