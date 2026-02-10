'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Megaphone, Copy, X } from 'lucide-react';
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
  const [writingAd, setWritingAd] = useState(false);
  const [generatedAd, setGeneratedAd] = useState<string | null>(null);
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

  const generateAdCopy = async () => {
    if (!profile?.is_premium) {
      toast.error('O Copywriter IA é exclusivo para membros Pro!');
      return;
    }
    setWritingAd(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const logSummary = logs.map(l => `- ${l.description} (${formatDate(l.date)})`).join('\n');
      const prompt = `Escreva um anúncio de venda persuasivo e honesto para o produto "${warranty.name}".
      Dados do produto:
      - Comprado em: ${formatDate(warranty.purchase_date)} na loja ${warranty.store}.
      - Estado: Muito bem cuidado, com histórico de manutenção.
      - Diferencial: Possui Nota Fiscal e Selo de Integridade Guardião.
      - Manutenções realizadas:\n${logSummary || 'Nenhuma manutenção necessária até agora.'}
      O tom deve ser profissional e passar confiança para o comprador. Divida em Título e Descrição.`;

      const result = await model.generateContent(prompt);
      setGeneratedAd(result.response.text());
      toast.success('Anúncio gerado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar anúncio.');
    } finally {
      setWritingAd(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold uppercase text-[10px] tracking-widest">Editar Ativo</Button></Link>
      </div>

      {/* Modal de Anúncio IA */}
      <AnimatePresence>
        {generatedAd && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-[40px] p-10 max-w-2xl w-full text-left space-y-6 shadow-2xl relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-xl text-emerald-600"><Megaphone className="h-5 w-5" /></div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Seu Anúncio está Pronto</h3>
                </div>
                <button onClick={() => setGeneratedAd(null)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-white/5 max-h-[350px] overflow-y-auto no-scrollbar font-medium text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {generatedAd}
              </div>
              <div className="flex gap-4">
                <Button onClick={() => { navigator.clipboard.writeText(generatedAd); toast.success('Anúncio copiado!'); }} className="flex-1 h-14 gap-2 font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20"><Copy className="h-4 w-4" /> Copiar Texto</Button>
                <Button variant="outline" onClick={() => setGeneratedAd(null)} className="flex-1 h-14 font-black uppercase text-xs tracking-widest border-slate-200 dark:border-white/10">Fechar</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{warranty.name}</h1>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card de Copywriter IA (Venda Rápida) */}
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden group">
            <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700"><Megaphone className="h-48 w-48 text-emerald-500 rotate-12" /></div>
            <CardContent className="p-10 relative z-10 space-y-8">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]"><Sparkles className="h-4 w-4" /> Inteligência de Venda</div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black leading-tight uppercase tracking-tighter">Vai vender este <span className="text-emerald-400">item?</span></h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl">Nossa IA redige um anúncio profissional usando o histórico de manutenções e o selo de integridade do Guardião para você vender mais rápido e por um preço melhor.</p>
              </div>
              <Button 
                onClick={generateAdCopy} 
                disabled={writingAd}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-emerald-900/20 gap-2"
              >
                {writingAd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                {writingAd ? 'Redigindo Anúncio...' : 'Gerar Anúncio de Venda Pro'}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Histórico Consolidado</CardTitle></CardHeader>
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
          <Card className="bg-white dark:bg-slate-900 border-teal-50 dark:border-white/5 shadow-xl p-8 relative overflow-hidden">
            <TrendingDown className="h-8 w-8 text-red-100 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor de Mercado</p>
            <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">R$ {(Number(warranty.price || 0) * 0.82).toLocaleString('pt-BR')}</div>
            <p className="text-[9px] text-emerald-600 font-black uppercase mt-4 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Procedência Auditada</p>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <ShieldCheck className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Certificado Digital</h4><p className="text-xs font-medium text-emerald-100 leading-relaxed">Gere um documento de autenticidade reconhecido para venda ou seguro.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Emitir Certificado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
