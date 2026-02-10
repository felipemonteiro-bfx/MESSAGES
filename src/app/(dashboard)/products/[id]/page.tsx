'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, HeartPulse, Activity } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/navigation';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [verifyingSafety, setVerifyingSafety] = useState(false);
  const [safetyData, setSafetyData] = useState<any>(null);
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

  const verifySafetyProfile = async () => {
    setVerifyingSafety(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analise o perfil de confiabilidade do produto: ${warranty.name}.
      Retorne em JSON: { 
        "score": 0 a 100, 
        "recalls": "número de recalls conhecidos", 
        "durability": "baixa/media/alta", 
        "common_issues": ["defeito 1", "defeito 2"],
        "verdict": "resumo final da segurança"
      }`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
      setSafetyData(data);
      toast.success('Perfil de segurança gerado!');
    } catch (err) {
      toast.error('Erro ao processar perfil IA.');
    } finally {
      setVerifyingSafety(false);
    }
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
        <div className="flex items-center gap-3">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">{warranty.name}</h1>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-emerald-100">Auditado</div>
        </div>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          
          {/* NOVO: Dashboard de Confiabilidade IA (Killer Feature) */}
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden relative group">
            <div className="h-2 w-full bg-cyan-500" />
            <CardHeader className="p-10 pb-0">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-2">
                    <HeartPulse className="h-6 w-6 text-emerald-500" /> Índice de Confiabilidade
                  </CardTitle>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Análise de saúde técnica via IA</p>
                </div>
                {!safetyData && (
                  <Button 
                    onClick={verifySafetyProfile} 
                    disabled={verifyingSafety}
                    className="bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest h-14 px-8 rounded-2xl gap-2 shadow-xl shadow-slate-200 dark:shadow-none"
                  >
                    {verifyingSafety ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {verifyingSafety ? 'Analisando...' : 'Gerar Perfil IA'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-8">
              <AnimatePresence mode="wait">
                {!safetyData ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10 text-center space-y-4 bg-slate-50 dark:bg-white/5 rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/5">
                    <Activity className="h-12 w-12 text-slate-300 mx-auto" />
                    <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Clique para analisar recalls conhecidos, durabilidade e vícios comuns deste produto.</p>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 text-center">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Score IA</p>
                        <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{safetyData.score}%</p>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Recalls</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{safetyData.recalls}</p>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Vida Útil</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase">{safetyData.durability}</p>
                      </div>
                      <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Veredito</p>
                        <ShieldCheck className="h-6 w-6 text-emerald-500 mx-auto mt-1" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><Info className="h-4 w-4 text-emerald-600" /> Alertas de Vícios Comuns</h4>
                      <div className="flex flex-wrap gap-2">
                        {safetyData.common_issues.map((issue: string, i: number) => (
                          <span key={i} className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase rounded-xl border border-red-100 dark:border-red-500/20">{issue}</span>
                        ))}
                      </div>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed italic">"{safetyData.verdict}"</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Diário de Vida</CardTitle></CardHeader>
            <div className="space-y-6">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="pt-1"><p className="text-sm font-black text-slate-900 dark:text-slate-200">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)} • R$ {Number(log.cost).toLocaleString('pt-BR')}</p></div>
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
            <ShieldCheck className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Certificado Digital</h4><p className="text-xs font-medium text-emerald-100">Gere um documento de autenticidade para venda ou seguro.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Emitir Certificado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
