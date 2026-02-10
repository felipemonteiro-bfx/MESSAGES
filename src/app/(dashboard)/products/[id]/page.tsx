'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, MailSearch, Copy, X } from 'lucide-react';
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
  const [writingEmail, setWritingEmail] = useState(false);
  const [warranty, setWarranty] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [generatedEmail, setGeneratedEmail] = useState<string | null>(null);
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

  const generateClaimEmail = async () => {
    if (!profile?.is_premium) {
      toast.error('O Gerador de E-mail IA é exclusivo para membros Pro!');
      router.push('/plans');
      return;
    }
    setWritingEmail(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const logSummary = logs.map(l => `- ${l.description} em ${formatDate(l.date)}`).join('\n');
      const prompt = `Escreva um e-mail formal de reclamação para o fabricante do produto "${warranty.name}".
      O produto apresentou defeito. Dados para o e-mail:
      - Comprado em: ${formatDate(warranty.purchase_date)} na loja ${warranty.store}.
      - Valor: R$ ${warranty.price}.
      - Chave NF-e: ${warranty.nfe_key || 'Anexa ao e-mail'}.
      - Histórico de Cuidado: ${logSummary || 'O produto está em perfeito estado de conservação'}.
      Baseie-se no Código de Defesa do Consumidor (CDC) exigindo o reparo ou troca conforme o prazo legal. 
      Assine como ${profile?.full_name || 'Consumidor'}.`;

      const result = await model.generateContent(prompt);
      setGeneratedEmail(result.response.text());
      toast.success('E-mail de reclamação gerado pela IA!');
    } catch (err) {
      toast.error('Erro ao gerar e-mail.');
    } finally {
      setWritingEmail(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold text-teal-700">Editar Dados</Button></Link>
      </div>

      {/* Modal de E-mail IA */}
      <AnimatePresence>
        {generatedEmail && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[40px] p-10 max-w-2xl w-full text-left space-y-6 shadow-2xl relative">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 p-2 rounded-xl text-emerald-600"><MailSearch className="h-5 w-5" /></div>
                  <h3 className="text-xl font-black text-slate-900">E-mail de Reclamação Pronto</h3>
                </div>
                <button onClick={() => setGeneratedEmail(null)} className="p-2 bg-slate-50 rounded-full"><X className="h-5 w-5 text-slate-400" /></button>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 max-h-[350px] overflow-y-auto no-scrollbar font-medium text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {generatedEmail}
              </div>
              <div className="flex gap-4">
                <Button 
                  onClick={() => { navigator.clipboard.writeText(generatedEmail); toast.success('E-mail copiado!'); }}
                  className="flex-1 h-14 gap-2 font-black uppercase text-xs tracking-widest"
                >
                  <Copy className="h-4 w-4" /> Copiar Texto
                </Button>
                <Button variant="outline" onClick={() => setGeneratedEmail(null)} className="flex-1 h-14 font-black uppercase text-xs tracking-widest border-slate-200">Fechar</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{warranty.name}</h1>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Card de Ação Proativa */}
          <div className="p-8 rounded-[40px] bg-slate-900 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700"><Scale className="h-48 w-48 text-white rotate-12" /></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                <Sparkles className="h-4 w-4" /> Inteligência de Suporte
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black">O produto deu <span className="text-red-500">Defeito?</span></h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">Não perca tempo com burocracia. Nossa IA redige o e-mail formal de reclamação perfeito para você enviar ao fabricante agora mesmo.</p>
              </div>
              <Button 
                onClick={generateClaimEmail} 
                disabled={writingEmail}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest h-14 px-10 rounded-2xl shadow-xl shadow-emerald-500/20 gap-2"
              >
                {writingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailSearch className="h-4 w-4" />}
                {writingEmail ? 'Redigindo Reclamação...' : 'Gerar E-mail de Reclamação'}
              </Button>
            </div>
          </div>

          <Card className="border-none shadow-xl bg-white p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Histórico do Bem</CardTitle></CardHeader>
            <div className="space-y-6">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="pt-1"><p className="text-sm font-black text-slate-900">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)} • R$ {Number(log.cost).toLocaleString('pt-BR')}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-white border-teal-50 shadow-xl p-8 relative overflow-hidden">
            <TrendingDown className="h-8 w-8 text-red-100 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor de Mercado</p><div className="text-4xl font-black text-slate-900 mt-1">R$ {(Number(warranty.price || 0) * 0.85).toLocaleString('pt-BR')}</div>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <Umbrella className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Proteção Ativa</h4><p className="text-xs font-medium text-emerald-100 leading-relaxed">Simule um seguro residencial para proteger este e outros bens da sua casa.</p>
            <Link href={`/insurance/simulator/${warranty.id}`} className="block"><Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Simular Seguro</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
