'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, LineChart as ChartIcon, ArrowUpRight } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addMonths, parseISO, isAfter } from 'date-fns';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [addingLog, setAddingLog] = useState(false);
  const [warranty, setWarranty] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [newLog, setNewLog] = useState({ description: '', cost: '', date: new Date().toISOString().split('T')[0] });
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

  const runPrediction = async () => {
    if (!profile?.is_premium) {
      toast.error('Predição de Valor é um recurso Pro!');
      router.push('/plans');
      return;
    }
    setPredicting(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analise o mercado brasileiro para o produto "${warranty.name}" (Categoria: ${warranty.category}). 
      Valor original pago: R$ ${warranty.price}. Data da compra: ${warranty.purchase_date}.
      Retorne APENAS um JSON puro com:
      {
        "current_market_value": 0.00,
        "value_6_months": 0.00,
        "value_12_months": 0.00,
        "resale_recommendation": "Frase sobre se vale a pena vender agora ou esperar",
        "liquidity": "Alta/Média/Baixa"
      }`;

      const result = await model.generateContent(prompt);
      const data = JSON.parse(result.response.text().replace(/```json|```/g, '').trim());
      setPrediction(data);
      toast.success('IA: Projeção de mercado concluída!');
    } catch (err) {
      toast.error('Erro na projeção IA.');
    } finally {
      setPredicting(false);
    }
  };

  const calculateNextMaintenance = () => {
    if (!warranty.last_maintenance_date && !warranty.purchase_date) return null;
    const baseDate = warranty.last_maintenance_date ? parseISO(warranty.last_maintenance_date) : parseISO(warranty.purchase_date);
    return addMonths(baseDate, warranty.maintenance_frequency_months || 6);
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingLog(true);
    try {
      const { error } = await supabase.from('maintenance_logs').insert({ warranty_id: id, description: newLog.description, cost: Number(newLog.cost) || 0, date: newLog.date });
      if (error) throw error;
      await supabase.from('warranties').update({ last_maintenance_date: newLog.date }).eq('id', id);
      toast.success('Histórico atualizado!');
      setNewLog({ description: '', cost: '', date: new Date().toISOString().split('T')[0] });
      fetchData();
    } catch (err: any) { toast.error('Erro ao salvar.'); } finally { setAddingLog(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  const nextMaintenance = calculateNextMaintenance();
  const isMaintenanceOverdue = nextMaintenance ? isAfter(new Date(), nextMaintenance) : false;

  const chartData = prediction ? [
    { name: 'Hoje', valor: prediction.current_market_value },
    { name: '6 meses', valor: prediction.value_6_months },
    { name: '12 meses', valor: prediction.value_12_months },
  ] : [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <Link href="/dashboard"><Button variant="ghost" size="sm" className="gap-2 text-slate-500 font-bold mb-4"><ArrowLeft className="h-4 w-4" /> Painel Geral</Button></Link>

      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">{warranty.name}</h1>
          <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" className="gap-2 border-teal-100 font-bold"><Pencil className="h-4 w-4" /> Editar</Button></Link>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {/* Card de Projeção IA */}
          <Card className="border-none shadow-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" /> Projeção de Valorização (IA)
                </CardTitle>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Análise de Mercado em Tempo Real</p>
              </div>
              {!prediction && (
                <Button onClick={runPrediction} disabled={predicting} size="sm" className="bg-emerald-600 hover:bg-emerald-500 font-black text-[10px] uppercase">
                  {predicting ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <TrendingUp className="h-3 w-3 mr-2" />}
                  Prever Valor
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-8">
              {prediction ? (
                <div className="grid md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={10} fontVariant="black" />
                          <YAxis fontSize={10} hide />
                          <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                          <Line type="monotone" dataKey="valor" stroke="#059669" strokeWidth={4} dot={{ r: 6, fill: '#059669' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Liquidez de Revenda</p>
                        <p className="text-lg font-black text-slate-900">{prediction.liquidity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Valor em 1 ano</p>
                        <p className="text-lg font-black text-red-500">R$ {prediction.value_12_months.toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="p-6 rounded-[32px] bg-emerald-50 border border-emerald-100">
                      <h4 className="text-sm font-black text-emerald-900 uppercase mb-3 flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4" /> Recomendação do Guardião
                      </h4>
                      <p className="text-sm text-emerald-800 font-medium leading-relaxed italic">
                        "{prediction.resale_recommendation}"
                      </p>
                    </div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-tight text-center">
                      Esta é uma estimativa baseada em IA e tendências de mercado. O valor real pode variar conforme o estado de conservação.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="h-16 w-16 bg-slate-50 rounded-full mx-auto flex items-center justify-center">
                    <ChartIcon className="h-8 w-8 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-medium max-w-xs mx-auto text-sm">
                    Descubra quanto seu bem valerá no futuro e tome as melhores decisões de venda.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget de Cronograma */}
          <Card className={`border-none shadow-xl relative overflow-hidden ${isMaintenanceOverdue ? 'bg-amber-50' : 'bg-white'}`}>
            <CardContent className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${isMaintenanceOverdue ? 'bg-amber-100 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}><Wrench className="h-8 w-8" /></div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-400">Próxima Revisão</p>
                  <h3 className="text-2xl font-black text-slate-900">{nextMaintenance ? nextMaintenance.toLocaleDateString('pt-BR') : 'Não agendada'}</h3>
                </div>
              </div>
              <Button onClick={() => setAddingLog(true)} variant="outline" className="border-teal-100 font-black text-xs">Registrar Manutenção</Button>
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card className="border-none shadow-xl">
            <CardHeader className="border-b border-slate-50 p-6"><CardTitle className="flex items-center gap-2 text-slate-900"><History className="h-5 w-5 text-emerald-600" /> Histórico de Cuidados</CardTitle></CardHeader>
            <CardContent className="p-6">
              <AnimatePresence>{addingLog && (<motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} onSubmit={handleAddLog} className="mb-8 p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 space-y-4 overflow-hidden"><div className="grid md:grid-cols-2 gap-4"><Input label="O que foi feito?" value={newLog.description} onChange={(e) => setNewLog({...newLog, description: e.target.value})} required /><div className="grid grid-cols-2 gap-4"><Input label="Custo" type="number" value={newLog.cost} onChange={(e) => setNewLog({...newLog, cost: e.target.value})} /><Input label="Data" type="date" value={newLog.date} onChange={(e) => setNewLog({...newLog, date: e.target.value})} required /></div></div><div className="flex gap-2"><Button type="submit" className="flex-1">Salvar</Button><Button variant="ghost" onClick={() => setAddingLog(false)}>Cancelar</Button></div></motion.form>)}</AnimatePresence>
              <div className="space-y-4">{logs.length === 0 ? <div className="text-center py-8 text-slate-400 italic">Nenhum registro.</div> : logs.map((log) => (<div key={log.id} className="flex items-center justify-between p-4 bg-white border border-teal-50 rounded-2xl group"><div className="flex items-center gap-4"><div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div><div><p className="text-sm font-black text-slate-800">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)} • R$ {Number(log.cost).toLocaleString('pt-BR')}</p></div></div><button onClick={() => deleteLog(log.id)} className="opacity-0 group-hover:opacity-100 p-2 text-red-400"><Trash2 className="h-4 w-4" /></button></div>))}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-500 to-cyan-500" />
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-400">Valor Hoje</p><div className="text-4xl font-black text-white mt-1">R$ {(prediction?.current_market_value || 0).toLocaleString('pt-BR')}</div>
          </Card>
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <Umbrella className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight">Proteger Ativo</h4><p className="text-xs font-medium text-emerald-100">Simule um seguro e garanta que este patrimônio não se perca.</p>
            <Link href={`/insurance/simulator/${warranty.id}`} className="block"><Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4">Simular Seguro</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}