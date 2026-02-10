'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Scan, Camera, MapPin, Megaphone, ShoppingCart, Tag, BadgeCheck, Zap, Languages, Timer, BarChart3, ListChecks, MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';
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
  const [analyzingBrand, setAnalyzingBrand] = useState(false);
  const [brandReputation, setBrandReputation] = useState<any>(null);
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

  const analyzeBrandReputation = async () => {
    setAnalyzingBrand(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analise a reputação atual da marca: ${warranty.store || warranty.name}.
      Considere o atendimento pós-venda no Brasil, facilidade de conserto e satisfação geral.
      Responda em JSON: 
      { 
        "score": 0 a 10, 
        "sentiment": "Positivo / Neutro / Negativo", 
        "repair_index": "Fácil / Médio / Difícil",
        "top_complaint": "qual o principal problema relatado hoje",
        "verdict": "recomenda comprar novamente desta marca?"
      }`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
      setBrandReputation(data);
      toast.success('Análise de reputação concluída!');
    } catch (err) { toast.error('Erro na análise da marca.'); } finally { setAnalyzingBrand(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold uppercase text-[10px] tracking-widest">Editar</Button></Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{warranty.name}</h1>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          
          {/* NOVO: Monitor de Sentimento da Marca (Brand Reputation IA) */}
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative group">
            <div className="h-1.5 w-full bg-blue-500" />
            <CardHeader className="p-10 pb-0">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-[0.2em]"><MessageSquare className="h-4 w-4" /> Brand Intelligence</div>
                  <CardTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Saúde da Fabricante</CardTitle>
                </div>
                {!brandReputation && (
                  <Button 
                    onClick={analyzeBrandReputation} 
                    disabled={analyzingBrand}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest h-12 px-6 rounded-xl shadow-lg shadow-blue-500/20 gap-2"
                  >
                    {analyzingBrand ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Analisar Marca
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-8">
              <AnimatePresence mode="wait">
                {!brandReputation ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center space-y-4 bg-slate-50 dark:bg-white/5 rounded-[32px] border-2 border-dashed border-slate-100 dark:border-white/5">
                    <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Nossa IA analisa o Reclame Aqui e fóruns técnicos para avaliar se a marca deste produto ainda é confiável.</p>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-500/20 text-center">
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Reputação</p>
                        <p className="text-3xl font-black text-blue-700 dark:text-blue-400">{brandReputation.score}/10</p>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Sentimento</p>
                        <div className="flex items-center justify-center gap-2 mt-1">
                          {brandReputation.sentiment === 'Positivo' ? <ThumbsUp className="h-5 w-5 text-emerald-500" /> : <ThumbsDown className="h-5 w-5 text-red-500" />}
                          <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{brandReputation.sentiment}</p>
                        </div>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Reparo</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{brandReputation.repair_index}</p>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mt-1" />
                      </div>
                    </div>
                    <div className="p-6 bg-slate-900 text-white rounded-[32px] border border-white/10 space-y-4">
                      <div className="flex items-center gap-2 text-red-400 font-black text-[10px] uppercase tracking-widest"><AlertTriangle className="h-4 w-4" /> Alerta Crítico de Mercado</div>
                      <p className="text-sm font-medium text-slate-300 leading-relaxed italic">"Reclamação mais comum hoje: {brandReputation.top_complaint}. Veredito IA: {brandReputation.verdict}"</p>
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
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <ShieldCheck className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Certificado Digital</h4><p className="text-xs font-medium text-emerald-100">Sua documentação está auditada e pronta para venda ou seguro.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Emitir Certificado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
