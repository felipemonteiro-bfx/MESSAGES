'use client';

import { createClient } from '@/lib/supabase/client';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, AlertCircle, ShieldCheck, Plus, Search, Filter, Wallet, FileDown, TrendingUp, X, Trophy, Share2, MessageCircle, Clock, BellRing, PieChart as ChartIcon, CheckCircle2, HeartHandshake, FolderOpen, BarChart3, Plane, QrCode, Lock, ArrowDownRight, ArrowUpRight } from 'lucide-react';
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
  const [filteredWarranties, setFilteredWarranties] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [greeting, setGreeting] = useState('');
  const [showTravelQR, setShowTravelQR] = useState(false);
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  // Efeito de carrossel para os bens
  useEffect(() => {
    if (warranties.length > 1) {
      const timer = setInterval(() => {
        setCurrentAssetIndex((prev) => (prev + 1) % warranties.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [warranties.length]);

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
      }
    }
    setLoading(false);
  };

  const getDepreciatedValue = (item: any) => {
    const price = Number(item.price || 0);
    const purchaseDate = new Date(item.purchase_date);
    const yearsOwned = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, yearsOwned);
  };

  const checkAndNotify = async (items: any[], userId: string) => {
    const expiringSoon = items.filter(w => {
      const exp = calculateExpirationDate(w.purchase_date, w.warranty_months);
      const days = getDaysRemaining(exp);
      return days >= 0 && days <= 15;
    });
    for (const item of expiringSoon) {
      const { data: existing } = await supabase.from('notifications').select('id').eq('user_id', userId).ilike('message', `%${item.name}%`).limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from('notifications').insert({ user_id: userId, title: 'Alerta de Expiração', message: `A garantia de "${item.name}" vence em ${getDaysRemaining(calculateExpirationDate(item.purchase_date, item.warranty_months))} dias.`, type: 'warning' });
      }
    }
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
  const totalWarranties = warranties.length;
  const expiredCount = warranties.filter(w => getDaysRemaining(calculateExpirationDate(w.purchase_date, w.warranty_months)) < 0).length;
  const safetyScore = totalWarranties > 0 ? Math.round(((totalWarranties - expiredCount) / totalWarranties) * 100) : 0;

  const exportPDF = (items = filteredWarranties) => {
    if (!profile?.is_premium && items.length > 5) { toast.error('Limite gratuito: 5 itens.'); return; }
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(5, 150, 105); doc.text('Guardião - Inventário de Bens', 14, 20);
    const tableData = items.map(w => [w.name, w.store || '---', formatDate(w.purchase_date), `R$ ${Number(w.price || 0).toLocaleString('pt-BR')}`]);
    autoTable(doc, { startY: 40, head: [['Produto', 'Loja', 'Compra', 'Valor']], body: tableData, headStyles: { fillColor: [5, 150, 105] } });
    doc.save(`inventario-guardiao.pdf`);
    toast.success('Dossiê gerado com sucesso!');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-10 pb-32">
      <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer" className="fixed bottom-8 right-8 z-50 p-4 bg-emerald-500 text-white rounded-full shadow-2xl animate-float"><MessageCircle className="h-7 w-7" /></a>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{greeting}, <span className="text-emerald-600">{profile?.full_name?.split(' ')[0] || 'Guardião'}</span>!</h1>
            {profile?.is_premium && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-amber-200">Pro</span>}
          </div>
          <p className="text-slate-500 font-medium">Seu patrimônio hoje vale <span className="text-slate-900 font-black">R$ {totalCurrentValue.toLocaleString('pt-BR')}</span>.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => exportPDF()} className="gap-2 border-emerald-100 text-emerald-700 font-bold shadow-sm">
            <FileDown className="h-4 w-4" /> Exportar Inventário
          </Button>
          <Link href="/products/new"><Button size="lg" className="shadow-2xl shadow-emerald-200 font-bold"><Plus className="h-5 w-5 mr-2" /> Nova Nota</Button></Link>
        </div>
      </header>

      {/* Carrossel de Oportunidades de Venda (ROI) */}
      {warranties.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative group">
          <div className="bg-slate-900 text-white rounded-[40px] p-8 overflow-hidden relative shadow-2xl">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/10 -skew-x-12 translate-x-20" />
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentAssetIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10"
              >
                <div className="space-y-4 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                    <TrendingUp className="h-4 w-4" /> Insight de Patrimônio
                  </div>
                  <h3 className="text-3xl font-black leading-tight max-w-lg">
                    Seu <span className="text-emerald-400">{warranties[currentAssetIndex].name}</span> vale R$ {getDepreciatedValue(warranties[currentAssetIndex]).toLocaleString('pt-BR')} hoje.
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">Hora de trocar? Recupere até 80% do valor de nota vendendo este mês.</p>
                </div>
                <div className="flex gap-4">
                  <Link href={`/products/${warranties[currentAssetIndex].id}`}>
                    <Button variant="ghost" className="text-white hover:bg-white/10 font-bold border border-white/10 px-8 h-14 rounded-2xl uppercase text-[10px] tracking-widest">Ver Dossiê</Button>
                  </Link>
                  <Button className="bg-emerald-500 hover:bg-emerald-400 font-bold px-8 h-14 rounded-2xl uppercase text-[10px] tracking-widest shadow-emerald-500/20">Anunciar Venda</Button>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="flex gap-1 mt-8 justify-center md:justify-start">
              {warranties.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all ${i === currentAssetIndex ? 'w-8 bg-emerald-500' : 'w-2 bg-white/20'}`} />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Financeiras */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-teal-100 bg-white shadow-xl p-8 flex flex-col justify-center text-center md:text-left">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Saúde Patrimonial
          </p>
          <div className="text-4xl font-black text-slate-900">{safetyScore}%</div>
          <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${safetyScore}%` }} className="h-full bg-emerald-500" />
          </div>
        </Card>

        <Card className="border-teal-100 bg-white shadow-xl p-8 flex flex-col justify-center text-center md:text-left">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Investido (Original)</p>
          <div className="text-4xl font-black text-slate-900">R$ {totalOriginalValue.toLocaleString('pt-BR')}</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Valor de todas as suas notas</p>
        </Card>

        <Card className="border-teal-100 bg-emerald-600 text-white shadow-xl p-8 flex flex-col justify-center text-center md:text-left relative overflow-hidden shadow-emerald-500/20">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2">
              <ArrowUpRight className="h-4 w-4" /> Liquidez Total
            </p>
            <div className="text-4xl font-black">R$ {totalCurrentValue.toLocaleString('pt-BR')}</div>
            <p className="text-[10px] text-emerald-100 font-bold uppercase mt-2">Valor de revenda somado hoje</p>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <input type="text" placeholder="Buscar produto, loja ou categoria..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 pl-12 pr-4 bg-white border-2 border-teal-50 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-700 shadow-sm" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-teal-600 font-bold text-[10px] uppercase tracking-tighter mr-2"><FolderOpen className="h-3.5 w-3.5" /> Filtrar Pastas:</div>
          <button onClick={() => setSelectedFolder('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${selectedFolder === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Todas</button>
          {folders.map(f => (<button key={f} onClick={() => setSelectedFolder(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${selectedFolder === f ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{f}</button>))}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div layout className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredWarranties.map((w) => (
            <div key={w.id} className="relative group">
              <button onClick={() => toggleSelect(w.id)} className={`absolute -top-2 -left-2 z-20 h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center ${selectedItems.includes(w.id) ? 'bg-emerald-600 border-emerald-600 scale-110 shadow-lg' : 'bg-white border-slate-200 opacity-0 group-hover:opacity-100'}`}>{selectedItems.includes(w.id) && <CheckCircle2 className="h-4 w-4 text-white" />}</button>
              <WarrantyCard warranty={w} />
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}