'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Scan, Camera, MapPin, Megaphone, ShoppingCart, Tag } from 'lucide-react';
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
  const [generatedAd, setGeneratedAd] = useState<any>(null);
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
    setWritingAd(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const logSummary = logs.map(l => `- ${l.description} em ${formatDate(l.date)}`).join('\n');
      const prompt = `Crie um anúncio de venda para o produto: ${warranty.name}.
      Use estes diferenciais:
      - Nota Fiscal disponível
      - Histórico de manutenção:\n${logSummary || 'Item muito bem conservado'}
      - Selo de integridade digital do Guardião de Notas.
      Retorne em JSON: { "title": "título chamativo", "description": "descrição completa", "price_suggestion": "valor sugerido" }`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
      setGeneratedAd(data);
      toast.success('Anúncio gerado pela IA!');
    } catch (err) { toast.error('Erro ao gerar anúncio.'); } finally { setWritingAd(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="flex gap-2">
          {profile?.profile_type === 'business' && <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border border-blue-100 flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" /> Ativo Business</div>}
          <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold">Editar</Button></Link>
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">{warranty.name}</h1>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Módulo de Venda IA */}
          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden group">
            <div className="h-1.5 w-full bg-slate-900" />
            <CardContent className="p-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-[24px] bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm"><ShoppingCart className="h-8 w-8" /></div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Vender Agora</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs">Gere um anúncio profissional para o Mercado Livre ou OLX com um clique.</p>
                  </div>
                </div>
                <Button 
                  onClick={generateAdCopy} 
                  disabled={writingAd}
                  className="bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl gap-2"
                >
                  {writingAd ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                  {writingAd ? 'Redigindo...' : 'Criar Anúncio IA'}
                </Button>
              </div>

              <AnimatePresence>
                {generatedAd && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-10 p-8 bg-slate-50 dark:bg-white/5 rounded-[32px] border border-slate-100 dark:border-white/5 space-y-6 overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Título Sugerido</p><p className="text-lg font-black text-slate-900 dark:text-white">{generatedAd.title}</p></div>
                      <div className="text-right"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Valor de Mercado</p><p className="text-2xl font-black text-slate-900 dark:text-white">{generatedAd.price_suggestion}</p></div>
                    </div>
                    <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição Técnica</p><p className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">{generatedAd.description}</p></div>
                    <div className="flex gap-3"><Button className="flex-1" onClick={() => { navigator.clipboard.writeText(`${generatedAd.title}\n\n${generatedAd.description}`); toast.success('Copiado!'); }}>Copiar Anúncio</Button><Button variant="outline" className="flex-1" onClick={() => window.open('https://www.mercadolivre.com.br/anunciar')}>Anunciar no ML</Button></div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Linha do Tempo</CardTitle></CardHeader>
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
            <ShieldCheck className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Certificado Digital</h4><p className="text-xs font-medium text-emerald-100">Gere um documento de autenticidade para venda ou seguro.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Emitir Certificado</Button>
          </div>
        </div>
      </div>
    </div>
  );
}