'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShieldBan, AlertTriangle, Info, ShieldCheck, Loader2, ArrowLeft, Search, Sparkles, Zap, Package, ExternalLink, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function RecallCentralPage() {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [recalls, setRecalls] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchRecalls();
  }, []);

  const fetchRecalls = async () => {
    // Simulação de busca inicial
    setRecalls([
      { id: 1, item: 'Macbook Pro M3', brand: 'Apple', type: 'info', message: 'Nenhum alerta crítico. Mantenha o macOS atualizado.', action: 'Verificar atualizações no sistema.' },
    ]);
    setLoading(false);
  };

  const handleGlobalScan = async () => {
    setScanning(true);
    try {
      const { data: items } = await supabase.from('warranties').select('name, store');
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const context = items?.map(i => i.name).join(', ');
      const prompt = `Analise os seguintes produtos para recalls ou alertas de segurança globais (ANVISA/SENACON/FDA): ${context}. 
      Retorne em JSON um array de objetos: [{ "item": "nome", "type": "critical|warning|info", "message": "explicação", "action": "o que fazer" }]. Se nada for encontrado, retorne array vazio.`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
      
      setRecalls(data);
      toast.success('Scanner de Segurança concluído!');
    } catch (err) {
      toast.error('Erro ao realizar varredura global.');
    } finally {
      setScanning(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Recall <span className="text-red-600">Central</span></h1>
          <p className="text-slate-500 font-medium text-sm">Monitoramento IA de falhas e integridade de fábrica.</p>
        </div>
        <Button onClick={handleGlobalScan} disabled={scanning} className="h-14 px-8 bg-slate-900 text-white font-black uppercase text-xs tracking-widest gap-2 shadow-2xl">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4 text-emerald-400" />}
          {scanning ? 'Auditando Cofre...' : 'Scanner Global IA'}
        </Button>
      </header>

      <div className="grid gap-8">
        <AnimatePresence mode="popLayout">
          {recalls.map((recall, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.1 }}>
              <Card className="border-none shadow-xl overflow-hidden bg-white dark:bg-slate-900 group">
                <div className={`h-1.5 w-full ${recall.type === 'critical' ? 'bg-red-500' : recall.type === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-start gap-6">
                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${recall.type === 'critical' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {recall.type === 'critical' ? <AlertTriangle className="h-7 w-7" /> : <Info className="h-7 w-7" />}
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-black text-slate-900 dark:text-white text-lg uppercase tracking-tighter">{recall.item}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl">{recall.message}</p>
                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Ação Protetiva:</p>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{recall.action}</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="h-12 px-6 font-black uppercase text-[10px] tracking-widest border-slate-200 dark:border-white/10">Ver Ofício</Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}