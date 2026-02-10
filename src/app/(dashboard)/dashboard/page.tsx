'use client';

import { createClient } from '@/lib/supabase/client';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, AlertCircle, ShieldCheck, Plus, Search, Filter, Wallet, FileDown, TrendingUp, X, Trophy, Share2, MessageCircle, Clock, BellRing, PieChart as ChartIcon, CheckCircle2, HeartHandshake, FolderOpen, BarChart3, Plane, QrCode, Lock, ArrowDownRight, ArrowUpRight, Calculator, Landmark, CreditCard, Sparkles, ShieldAlert, ScanSearch, Loader2 } from 'lucide-react';
import { calculateExpirationDate, getDaysRemaining, formatDate } from '@/lib/utils/date-utils';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default function DashboardPage() {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [filteredWarranties, setFilteredWarranties] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [greeting, setGreeting] = useState('');
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData || { full_name: user.user_metadata?.full_name, is_premium: false });
      const { data: warrantyData } = await supabase.from('warranties').select('*').order('created_at', { ascending: false });
      if (warrantyData) {
        setWarranties(warrantyData);
        setFilteredWarranties(warrantyData);
        setCategories(Array.from(new Set(warrantyData.map(w => w.category).filter(Boolean))) as string[]);
        setFolders(Array.from(new Set(warrantyData.map(w => w.folder).filter(Boolean))) as string[]);
      }
    }
    setLoading(false);
  };

  const runSmartAudit = async () => {
    if (!profile?.is_premium) {
      toast.error('O Check-up Completo é exclusivo para membros Pro!');
      return;
    }
    setChecking(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const productsList = warranties.map(w => `${w.name} (${w.category})`).join(', ');
      const prompt = `Você é o Auditor do Guardião de Notas. Analise esta lista de bens de um usuário: ${productsList}. 
      Faça um check-up rápido e retorne 3 pontos principais: 
      1. Há algum recall conhecido para estes itens recentemente?
      2. Alguma dica de segurança crítica para esta época do ano (ex: raios, umidade)?
      3. Qual item tem maior probabilidade de valorização ou necessidade de manutenção?
      Seja curto e direto. Máximo 300 caracteres.`;

      const result = await model.generateContent(prompt);
      setAuditResult(result.response.text());
      toast.success('Auditoria Patrimonial concluída!');
    } catch (err) {
      toast.error('Erro ao processar auditoria.');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    let result = warranties;
    if (selectedCategory !== 'all') result = result.filter(w => w.category === selectedCategory);
    if (selectedFolder !== 'all') result = result.filter(w => w.folder === selectedFolder);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w => w.name.toLowerCase().includes(query) || (w.category && w.category.toLowerCase().includes(query)));
    }
    setFilteredWarranties(result);
  }, [selectedCategory, selectedFolder, searchQuery, warranties]);

  const totalOriginalValue = filteredWarranties.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const totalDebt = filteredWarranties.reduce((acc, curr) => acc + ((curr.total_installments - curr.paid_installments) * Number(curr.installment_value || 0)), 0);
  const netWorth = totalOriginalValue - totalDebt;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{greeting}, <span className="text-emerald-600">{profile?.full_name?.split(' ')[0] || 'Guardião'}</span>!</h1>
            {profile?.is_premium ? <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-amber-200">Pro</span> : <Link href="/plans" className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-slate-200 hover:bg-emerald-600 hover:text-white transition-all">Gratuito</Link>}
          </div>
          <p className="text-slate-500 font-medium">Seu patrimônio líquido atual é <span className="text-slate-900 font-black">R$ {netWorth.toLocaleString('pt-BR')}</span>.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={runSmartAudit} disabled={checking} className="bg-slate-900 hover:bg-black text-white gap-2 h-12 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4 text-emerald-400" />}
            {checking ? 'Auditando...' : 'IA Check-up Patrimonial'}
          </Button>
          <Link href="/products/new"><Button size="lg" className="shadow-2xl shadow-emerald-200 font-bold h-12"><Plus className="h-5 w-5 mr-2" /> Nova Nota</Button></Link>
        </div>
      </header>

      <AnimatePresence>
        {auditResult && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="relative group">
            <div className="p-8 rounded-[40px] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4"><button onClick={() => setAuditResult(null)}><X className="h-5 w-5 text-slate-500" /></button></div>
              <div className="flex items-start gap-6 relative z-10">
                <div className="h-14 w-14 bg-emerald-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                  <ShieldCheck className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-emerald-400 uppercase tracking-tight">Resultado da Auditoria IA</h3>
                  <p className="text-slate-300 font-medium leading-relaxed italic">"{auditResult}"</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-slate-900 text-white border-none overflow-hidden relative shadow-2xl">
          <CardContent className="p-8 space-y-8 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Landmark className="h-3 w-3 text-emerald-500" /> Balanço Patrimonial</p>
                <div className="text-5xl font-black text-white">R$ {netWorth.toLocaleString('pt-BR')}</div>
                <p className="text-xs text-slate-400 font-medium">Valor real dos seus bens (Patrimônio Líquido)</p>
              </div>
              <div className="h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={[{ value: netWorth }, { value: totalDebt }]} innerRadius={30} outerRadius={40} dataKey="value"><Cell fill="#059669" /><Cell fill="#334155" /></Pie></PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500"><CheckCircle2 className="h-4 w-4" /></div>
                <div><p className="text-[9px] font-black uppercase text-slate-500">Quitado</p><p className="text-sm font-bold">R$ {netWorth.toLocaleString('pt-BR')}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400"><CreditCard className="h-4 w-4" /></div>
                <div><p className="text-[9px] font-black uppercase text-slate-500">Dívida</p><p className="text-sm font-bold">R$ {totalDebt.toLocaleString('pt-BR')}</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-white shadow-xl flex flex-col justify-between p-8">
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-2xl w-fit text-emerald-600"><Sparkles className="h-6 w-6" /></div>
            <h3 className="text-xl font-black text-slate-900 leading-tight">Dica de Hoje</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">Mantenha seu Guardião Pro ativo para receber verificações automáticas de Recall e Alertas Jurídicos.</p>
          </div>
          <Link href="/plans"><Button variant="ghost" className="w-full text-emerald-600 font-black text-[10px] uppercase tracking-widest mt-6">Assinar Plano Pro</Button></Link>
        </Card>
      </div>

      <AnimatePresence mode="popLayout"><motion.div layout className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredWarranties.map((w) => (<div key={w.id} className="relative group"><WarrantyCard warranty={w} /></div>))}
      </motion.div></AnimatePresence>
    </div>
  );
}
