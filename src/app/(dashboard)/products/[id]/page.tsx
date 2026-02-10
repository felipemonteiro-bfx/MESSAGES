'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info } from 'lucide-react';
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
  const [verifyingRecall, setVerifyingRecall] = useState(false);
  const [recallResult, setRecallResult] = useState<any>(null);
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

  const checkRecall = async () => {
    setVerifyingRecall(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Você é um especialista em recalls e segurança de produtos. Analise o produto: ${warranty.name}.
      Verifique se existe algum recall oficial ou problema crônico conhecido para este item ou marca no Brasil ou Globalmente.
      Retorne em JSON: { "status": "safe" | "warning" | "danger", "message": "breve explicação", "action": "o que o usuário deve fazer" }`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
      setRecallResult(data);
      if (data.status === 'safe') toast.success('Nenhum recall encontrado!');
      else toast.warning('Alerta de segurança detectado!');
    } catch (err) {
      toast.error('Erro ao verificar recalls.');
    } finally {
      setVerifyingRecall(false);
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
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{warranty.name}</h1>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-emerald-100">Patrimônio Auditado</div>
        </div>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • Adquirido em {formatDate(warranty.purchase_date)}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          
          {/* NOVO: Widget de Diagnóstico de Recall IA */}
          <Card className="border-none shadow-xl overflow-hidden relative group">
            <div className={`h-2 w-full ${recallResult ? (recallResult.status === 'danger' ? 'bg-red-500' : recallResult.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-200'}`} />
            <CardContent className="p-10">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                  <div className={`h-16 w-16 rounded-3xl flex items-center justify-center shadow-lg transition-all ${recallResult ? (recallResult.status === 'danger' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600') : 'bg-slate-50 text-slate-400'}`}>
                    {recallResult?.status === 'danger' ? <ShieldBan className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-900">Monitor de Recall</h3>
                    <p className="text-sm text-slate-500 font-medium max-w-sm">
                      {recallResult ? recallResult.message : 'Nossa IA pesquisa recalls ativos e problemas de segurança para este produto.'}
                    </p>
                  </div>
                </div>
                {!recallResult ? (
                  <Button 
                    onClick={checkRecall} 
                    disabled={verifyingRecall}
                    className="bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest h-14 px-8 rounded-2xl gap-2"
                  >
                    {verifyingRecall ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {verifyingRecall ? 'Pesquisando...' : 'Verificar Agora'}
                  </Button>
                ) : (
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black uppercase ${recallResult.status === 'safe' ? 'text-emerald-600' : 'text-red-600'}`}>Status: {recallResult.status.toUpperCase()}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Auditado hoje</p>
                  </div>
                )}
              </div>
              {recallResult && recallResult.status !== 'safe' && (
                <div className="mt-8 p-6 bg-red-50 rounded-3xl border border-red-100 flex items-start gap-4 animate-pulse">
                  <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-1" />
                  <div>
                    <p className="font-black text-red-900 uppercase text-xs">Ação Recomendada:</p>
                    <p className="text-sm text-red-700 font-medium leading-relaxed">{recallResult.action}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Histórico de Vida</CardTitle></CardHeader>
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
          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden shadow-2xl">
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Valor de Revenda Estimado</p>
            <div className="text-4xl font-black text-white mt-1">R$ {(Number(warranty.price || 0) * 0.85).toLocaleString('pt-BR')}</div>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <Umbrella className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Proteção Ativa</h4><p className="text-xs font-medium text-emerald-100 leading-relaxed">Este bem está documentado e auditado pelo Guardião. Gere dossiês para sinistros ou vendas rápidas.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Emitir Certificado Pro</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
