'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Scan, Camera, MapPin, Megaphone, ShoppingCart, Tag, BadgeCheck, Zap, Languages, Timer, BarChart3 } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/navigation';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyzingMarket, setAnalyzingMarket] = useState(false);
  const [marketData, setMarketData] = useState<any>(null);
  const [warranty, setWarranty] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
    }
    const { data: warrantyData } = await supabase.from('warranties').select('*').eq('id', id).single();
    if (!warrantyData) return setWarranty(null);
    setWarranty(warrantyData);
    const { data: logData } = await supabase.from('maintenance_logs').select('*').eq('warranty_id', id).order('date', { ascending: false });
    setLogs(logData || []);
    setLoading(false);
  };

  const analyzeMarketTiming = async () => {
    setAnalyzingMarket(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analise o ciclo de mercado do produto: ${warranty.name}.
      Com base no histórico da marca e rumores atuais, responda em JSON:
      {
        "next_launch": "mês/ano estimado do próximo modelo",
        "days_left_golden_window": 0 a 365,
        "recommendation": "vender / manter / trocar",
        "expected_drop": "porcentagem de queda no valor quando o novo sair",
        "insight": "breve explicação estratégica"
      }`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
      setMarketData(data);
      toast.success('Análise de mercado concluída!');
    } catch (err) { toast.error('Erro na análise IA.'); } finally { setAnalyzingMarket(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="flex gap-2">
          <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold">Editar</Button></Link>
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{warranty.name}</h1>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          
          {/* NOVO: Monitor de Janela de Oportunidade (Market Timing IA) */}
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden relative group">
            <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-1000"><Timer className="h-48 w-48 text-emerald-500" /></div>
            <CardHeader className="p-10 pb-0">
              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]"><Sparkles className="h-4 w-4" /> Market Timing IA</div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tighter">Oportunidade de Venda</CardTitle>
                </div>
                {!marketData && (
                  <Button 
                    onClick={analyzeMarketTiming} 
                    disabled={analyzingMarket}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest h-14 px-8 rounded-2xl shadow-xl shadow-emerald-900/20 gap-2"
                  >
                    {analyzingMarket ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                    Analisar Janela
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-8 relative z-10">
              <AnimatePresence mode="wait">
                {!marketData ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center space-y-4 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
                    <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Nossa IA estima a data do próximo lançamento desta marca para você vender no melhor momento.</p>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Próximo Lançamento</p>
                        <p className="text-lg font-black text-emerald-400">{marketData.next_launch}</p>
                      </div>
                      <div className="p-6 bg-white/5 rounded-3xl border border-white/10 text-center">
                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Queda de Valor Est.</p>
                        <p className="text-lg font-black text-red-400">- {marketData.expected_drop}</p>
                      </div>
                      <div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 text-center col-span-2 md:col-span-1">
                        <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Recomendação</p>
                        <p className="text-lg font-black text-white uppercase">{marketData.recommendation}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-emerald-600/20 rounded-[32px] border border-emerald-500/30 flex items-start gap-4">
                      <Info className="h-6 w-6 text-emerald-400 shrink-0" />
                      <p className="text-sm font-medium text-emerald-50 leading-relaxed italic">"{marketData.insight}"</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Log do Ativo</CardTitle></CardHeader>
            <div className="space-y-6">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="pt-1"><p className="text-sm font-black text-slate-900 dark:text-slate-200">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden shadow-2xl">
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Valor Real Hoje</p>
            <div className="text-4xl font-black text-white mt-1">R$ {(Number(warranty.price || 0) * 0.85).toLocaleString('pt-BR')}</div>
            <p className="text-[9px] text-emerald-500 mt-4 italic">Auditado pelo selo de integridade Guardião.</p>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4 relative overflow-hidden">
            <ShieldCheck className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Certificado Digital</h4><p className="text-xs font-medium text-emerald-100">Gere um documento de autenticidade para venda ou seguro.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Emitir Certificado Pro</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
