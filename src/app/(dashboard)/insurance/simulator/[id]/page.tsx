'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, Umbrella, Lock, ArrowLeft, Loader2, Sparkles, CheckCircle2, MessageCircle, Info } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function InsuranceSimulatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [simulation, setSimulation] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    const { data } = await supabase.from('warranties').select('*').eq('id', id).single();
    setProduct(data);
    setLoading(false);
  };

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Você é um analista de riscos de seguros no Brasil. Simule um seguro para o seguinte produto:
      Nome: ${product.name}
      Preço: R$ ${product.price}
      Categoria: ${product.category}

      Retorne APENAS um JSON puro com:
      {
        "estimated_annual_premium": 0.00,
        "monthly_installment": 0.00,
        "coverage_list": ["cobertura 1", "cobertura 2"],
        "risk_level": "Baixo/Médio/Alto",
        "why_protect": "Breve frase de impacto sobre por que segurar este bem."
      }`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
      setSimulation(data);
      toast.success('Simulação concluída com sucesso!');
    } catch (err) {
      toast.error('Erro ao simular seguro.');
    } finally {
      setSimulating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <Link href={`/products/${id}`}>
        <Button variant="ghost" size="sm" className="gap-2 text-slate-500 font-bold mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar ao Produto
        </Button>
      </Link>

      <header className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-slate-900">
          Simulador de <span className="text-emerald-600">Seguro</span>
        </h1>
        <p className="text-slate-500 font-medium">Proteja o seu {product.name} contra imprevistos.</p>
      </header>

      {!simulation ? (
        <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-emerald-500/10 -skew-x-12 translate-x-20" />
          <CardContent className="p-12 text-center space-y-8 relative z-10">
            <div className="h-20 w-20 bg-emerald-500 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <Umbrella className="h-10 w-10 text-white" />
            </div>
            <div className="space-y-4">
              <h3 className="text-3xl font-black">Pronto para simular?</h3>
              <p className="text-slate-400 max-w-md mx-auto">Nossa IA analisará o mercado para encontrar a melhor estimativa de proteção para o seu patrimônio.</p>
            </div>
            <Button 
              size="lg" 
              onClick={runSimulation} 
              disabled={simulating}
              className="h-16 px-12 text-lg font-black bg-emerald-500 hover:bg-emerald-400"
            >
              {simulating ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : <Sparkles className="h-6 w-6 mr-2" />}
              {simulating ? 'Analisando Mercado...' : 'Gerar Simulação Agora'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-none shadow-xl">
              <CardHeader className="bg-emerald-600 text-white p-8 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100">Estimativa Mensal</span>
                  <ShieldCheck className="h-6 w-6 opacity-50" />
                </div>
                <div className="text-5xl font-black mt-2">R$ {simulation.monthly_installment.toLocaleString('pt-BR')}</div>
                <p className="text-emerald-100 font-medium mt-2">Valor sugerido para proteção total</p>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Coberturas Inclusas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {simulation.coverage_list.map((c: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {c}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 flex items-start gap-4">
                  <Info className="h-6 w-6 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Por que proteger este bem?</p>
                    <p className="text-sm text-amber-800 leading-relaxed italic mt-1">"{simulation.why_protect}"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-none shadow-xl bg-slate-900 text-white">
              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nível de Risco</p>
                  <p className="text-2xl font-black text-amber-400">{simulation.risk_level}</p>
                </div>
                <div className="pt-6 border-t border-white/10 space-y-4">
                  <p className="text-xs text-slate-400 font-medium text-center">Interessado nesta proteção? Fale agora com um corretor parceiro.</p>
                  <Button className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 gap-2">
                    <MessageCircle className="h-5 w-5" /> Contratar via WhatsApp
                  </Button>
                  <p className="text-[9px] text-slate-500 text-center uppercase font-bold">Consulte condições reais com a seguradora</p>
                </div>
              </CardContent>
            </Card>
            
            <div className="p-6 rounded-3xl bg-white border border-teal-50 shadow-sm space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Parceiros Guardião</h4>
              <div className="grid grid-cols-2 gap-2 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all cursor-not-allowed">
                <div className="h-8 bg-slate-100 rounded-lg" />
                <div className="h-8 bg-slate-100 rounded-lg" />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
