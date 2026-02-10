'use client';

import { createClient } from '@/lib/supabase/client';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, AlertCircle, ShieldCheck, Plus, Search, Filter, Wallet, FileDown, TrendingUp, X, Trophy, Share2, MessageCircle, Clock, BellRing, PieChart as ChartIcon, CheckCircle2, HeartHandshake, FolderOpen, BarChart3, Plane, QrCode, Lock, ArrowDownRight, Wrench } from 'lucide-react';
import { calculateExpirationDate, getDaysRemaining, formatDate } from '@/lib/utils/date-utils';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { QRCodeSVG } from 'qrcode.react';

export default function DashboardPage() {
  const [warranties, setWarranties] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [filteredWarranties, setFilteredWarranties] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [greeting, setGreeting] = useState('');
  const [showTravelQR, setShowTravelQR] = useState(false);
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
        checkAndNotify(warrantyData, user.id);

        // Buscar todos os logs de manutenção dos itens do usuário
        const warrantyIds = warrantyData.map(w => w.id);
        const { data: logData } = await supabase.from('maintenance_logs').select('*').in('warranty_id', warrantyIds);
        setMaintenanceLogs(logData || []);
      }
    }
    setLoading(false);
  };

  const checkAndNotify = async (items: any[], userId: string) => {
    const expiringSoon = items.filter(w => {
      const exp = calculateExpirationDate(w.purchase_date, w.warranty_months);
      return getDaysRemaining(exp) >= 0 && getDaysRemaining(exp) <= 15;
    });
    for (const item of expiringSoon) {
      const { data: existing } = await supabase.from('notifications').select('id').eq('user_id', userId).ilike('message', `%${item.name}%`).limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert({ user_id: userId, title: 'Alerta de Expiração', message: `A garantia de "${item.name}" vence em ${getDaysRemaining(calculateExpirationDate(item.purchase_date, item.warranty_months))} dias.`, type: 'warning' });
      }
    }
  };

  const getDepreciatedValue = (item: any) => {
    const price = Number(item.price || 0);
    const purchaseDate = new Date(item.purchase_date);
    const yearsOwned = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, yearsOwned);
  };

  useEffect(() => {
    let result = warranties;
    if (selectedCategory !== 'all') result = result.filter(w => w.category === selectedCategory);
    if (selectedFolder !== 'all') result = result.filter(w => w.folder === selectedFolder);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w => w.name.toLowerCase().includes(query) || (w.category && w.category.toLowerCase().includes(query)) || (w.store && w.store.toLowerCase().includes(query)));
    }
    setFilteredWarranties(result);
  }, [selectedCategory, selectedFolder, searchQuery, warranties]);

  const totalOriginalValue = filteredWarranties.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const totalCurrentValue = filteredWarranties.reduce((acc, curr) => acc + getDepreciatedValue(curr), 0);
  const totalSaved = warranties.reduce((acc, curr) => acc + (Number(curr.total_saved) || 0), 0);
  const totalMaintenanceCost = maintenanceLogs.reduce((acc, curr) => acc + Number(curr.cost), 0);
  
  const totalWarranties = warranties.length;
  const expiredCount = warranties.filter(w => getDaysRemaining(calculateExpirationDate(w.purchase_date, w.warranty_months)) < 0).length;
  const safetyScore = totalWarranties > 0 ? Math.round(((totalWarranties - expiredCount) / totalWarranties) * 100) : 0;

  const folderData = Array.from(new Set(warranties.map(w => w.folder))).map(folder => ({
    name: folder,
    valor: warranties.filter(w => w.folder === folder).reduce((acc, curr) => acc + (Number(curr.price) || 0), 0)
  })).sort((a, b) => b.valor - a.valor);

  const toggleSelect = (id: string) => {
    if (!profile?.is_premium && selectedItems.length >= 2) { toast.error('Limite Pro: Selecione no máximo 2 itens.'); return; }
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const exportPDF = (items = filteredWarranties) => {
    if (!profile?.is_premium && items.length > 5) { toast.error('Limite Pro: Selecione no máximo 5 itens.'); return; }
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(5, 150, 105); doc.text('Guardião - Dossiê de Patrimônio', 14, 20);
    const tableData = items.map(w => [w.name, w.store || '---', formatDate(w.purchase_date), `R$ ${Number(w.price || 0).toLocaleString('pt-BR')}`]);
    autoTable(doc, { startY: 40, head: [['Produto', 'Loja', 'Compra', 'Valor']], body: tableData, headStyles: { fillColor: [5, 150, 105] } });
    doc.save(`dossie-guardiao.pdf`);
    toast.success('PDF Gerado!');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-10 pb-32">
      <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="fixed bottom-8 right-8 z-50 p-4 bg-emerald-500 text-white rounded-full shadow-2xl animate-float"><MessageCircle className="h-7 w-7" /></a>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{greeting}, <span className="text-emerald-600">{profile?.full_name?.split(' ')[0] || 'Guardião'}</span>!</h1>
            {profile?.is_premium ? (<span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200">Pro</span>) : (<Link href="/plans" className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:bg-emerald-600 hover:text-white transition-all">Gratuito</Link>)}
          </div>
          <p className="text-slate-500 font-medium">Você tem {totalWarranties} notas sob sua proteção.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => exportPDF()} className="gap-2 border-emerald-100 text-emerald-700 font-bold shadow-sm"><FileDown className="h-4 w-4" /> Dossiê PDF</Button>
          <Link href="/products/new"><Button size="lg" className="shadow-2xl shadow-emerald-200 font-bold"><Plus className="h-5 w-5 mr-2" /> Nova Nota</Button></Link>
        </div>
      </header>

      {/* Barra de Ações em Massa */}
      <AnimatePresence>{selectedItems.length > 0 && (<motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-2xl"><div className="bg-slate-900 text-white rounded-[32px] p-4 shadow-2xl flex items-center justify-between border border-white/10"><div className="flex items-center gap-4 ml-4"><div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center font-black">{selectedItems.length}</div><div className="hidden sm:block"><p className="text-xs font-black uppercase tracking-widest text-emerald-400">Selecionados</p><p className="text-[10px] text-slate-400 font-bold">Modo de Viagem Ativo</p></div></div><div className="flex gap-2"><Button variant="ghost" onClick={() => setShowTravelQR(true)} className="text-white hover:bg-white/10 gap-2 font-bold"><QrCode className="h-4 w-4" /> QR Pass</Button><Button variant="outline" onClick={() => exportPDF(warranties.filter(w => selectedItems.includes(w.id)))} className="border-white/20 text-white hover:bg-white/10 gap-2 font-bold"><Plane className="h-4 w-4" /> Dossiê Viagem</Button><Button variant="ghost" onClick={() => setSelectedItems([])} className="text-slate-400 h-10 w-10 p-0 rounded-full"><X className="h-5 w-5" /></Button></div></div></motion.div>)}</AnimatePresence>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-slate-900 text-white border-none overflow-hidden relative shadow-2xl">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/10 skew-x-12 translate-x-10" />
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative h-32 w-32 shrink-0">
              <svg className="h-full w-full" viewBox="0 0 36 36">
                <path className="text-slate-700" strokeDasharray="100, 100" strokeWidth="3" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path className="text-emerald-500" strokeDasharray={`${safetyScore}, 100`} strokeWidth="3" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-black">{safetyScore}</span><span className="text-[8px] font-black uppercase text-emerald-400">Score</span></div>
            </div>
            <div className="space-y-4 text-center md:text-left flex-1">
              <div><h3 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2"><Trophy className="h-5 w-5 text-amber-400" /> Saúde Patrimonial</h3><p className="text-sm text-slate-400 font-medium">Investimento total de <span className="text-white font-black text-lg">R$ {totalOriginalValue.toLocaleString('pt-BR')}</span> monitorado.</p></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-left">
                  <p className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1">Valor Atual <ArrowDownRight className="h-3 w-3" /></p>
                  <p className="text-base font-black text-emerald-400">R$ {totalCurrentValue.toLocaleString('pt-BR')}</p>
                </div>
                <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-left">
                  <p className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-1">Manutenção <Wrench className="h-3 w-3" /></p>
                  <p className="text-base font-black text-cyan-400">R$ {totalMaintenanceCost.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-pink-600 text-white border-none shadow-xl relative overflow-hidden">
          <HeartHandshake className="absolute -right-4 -bottom-4 h-32 w-32 opacity-10 -rotate-12" />
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-pink-100 flex items-center gap-2"><TrendingUp className="h-3 w-3" /> Economia Real</CardTitle></CardHeader>
          <CardContent className="space-y-2 relative z-10">
            <div className="text-3xl font-black">R$ {totalSaved.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] font-bold text-pink-100 uppercase">Dinheiro que você recuperou usando o Guardião.</p>
            <div className="pt-4"><div className="bg-white/20 rounded-xl p-2 text-[9px] font-black uppercase text-center border border-white/10">O App se paga!</div></div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <input type="text" placeholder="Buscar produto, loja ou categoria..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 pl-12 pr-4 bg-white border-2 border-teal-50 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-700 shadow-sm" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-teal-50 shadow-sm overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 text-teal-600 font-bold text-[10px] uppercase tracking-tighter"><FolderOpen className="h-3.5 w-3.5" /> Pastas:</div>
            <button onClick={() => setSelectedFolder('all')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase ${selectedFolder === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Todas</button>
            {folders.map(f => (<button key={f} onClick={() => setSelectedFolder(f)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase ${selectedFolder === f ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{f}</button>))}
          </div>
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-teal-50 shadow-sm overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 text-teal-600 font-bold text-[10px] uppercase tracking-tighter"><Filter className="h-3.5 w-3.5" /> Categorias:</div>
            <button onClick={() => setSelectedCategory('all')} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase ${selectedCategory === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Todas</button>
            {categories.map(c => (<button key={c} onClick={() => setSelectedCategory(c)} className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all uppercase ${selectedCategory === c ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{c}</button>))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="popLayout"><motion.div layout className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredWarranties.map((w) => (<div key={w.id} className="relative group"><button onClick={() => toggleSelect(w.id)} className={`absolute -top-2 -left-2 z-20 h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center ${selectedItems.includes(w.id) ? 'bg-emerald-600 border-emerald-600 scale-110 shadow-lg' : 'bg-white border-slate-200 opacity-0 group-hover:opacity-100'}`}>{selectedItems.includes(w.id) && <CheckCircle2 className="h-4 w-4 text-white" />}</button><WarrantyCard warranty={w} /></div>))}
      </motion.div></AnimatePresence>
    </div>
  );
}
