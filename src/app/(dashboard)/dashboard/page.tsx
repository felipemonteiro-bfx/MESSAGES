'use client';

import { createClient } from '@/lib/supabase/client';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, AlertCircle, ShieldCheck, Plus, Search, Filter, Wallet, FileDown, TrendingUp, X, Trophy, Share2, MessageCircle, Clock, BellRing, PieChart as ChartIcon, CheckCircle2, HeartHandshake, FolderOpen, BarChart3, Plane, QrCode, Lock, ArrowDownRight, ArrowUpRight, Calculator, Landmark, CreditCard, Sparkles, RefreshCcw, Zap } from 'lucide-react';
import { calculateExpirationDate, getDaysRemaining, formatDate } from '@/lib/utils/date-utils';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      result = result.filter(w => w.name.toLowerCase().includes(query) || (w.category && w.category.toLowerCase().includes(query)));
    }
    setFilteredWarranties(result);
  }, [selectedCategory, selectedFolder, searchQuery, warranties]);

  const totalOriginalValue = filteredWarranties.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const totalCurrentValue = filteredWarranties.reduce((acc, curr) => acc + getDepreciatedValue(curr), 0);
  
  // Encontrar o melhor item para troca (menor depreciação proporcional e valor alto)
  const bestTradeIn = [...warranties]
    .sort((a, b) => (getDepreciatedValue(b) / Number(b.price || 1)) - (getDepreciatedValue(a) / Number(a.price || 1)))[0];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">{greeting}, <span className="text-emerald-600">{profile?.full_name?.split(' ')[0] || 'Guardião'}</span>!</h1>
          <p className="text-slate-500 font-medium">Seu patrimônio hoje vale <span className="text-slate-900 font-black">R$ {totalCurrentValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>.</p>
        </div>
        <Link href="/products/new"><Button size="lg" className="shadow-2xl shadow-emerald-200 font-bold h-12"><Plus className="h-5 w-5 mr-2" /> Nova Nota</Button></Link>
      </header>

      {/* NOVO: Insight de Troca Inteligente (Trade-in) */}
      {bestTradeIn && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <Card className="bg-slate-900 text-white border-none p-1 overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-900/30 p-8 rounded-[38px] flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-10"><RefreshCcw className="h-40 w-40 text-emerald-500 rotate-12" /></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20"><Zap className="h-8 w-8 text-white" /></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest"><Sparkles className="h-3 w-3" /> Oportunidade de Troca</div>
                  <h3 className="text-3xl font-black leading-tight">Venda seu <span className="text-emerald-400">{bestTradeIn.name}</span> por R$ {getDepreciatedValue(bestTradeIn).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</h3>
                  <p className="text-slate-400 text-sm font-medium">Este item reteve {Math.round((getDepreciatedValue(bestTradeIn) / Number(bestTradeIn.price || 1)) * 100)}% do valor original. Momento ideal para o upgrade!</p>
                </div>
              </div>
              <div className="flex gap-4 relative z-10 shrink-0">
                <Link href={`/products/${bestTradeIn.id}`}><Button variant="ghost" className="text-white hover:bg-white/10 font-bold border border-white/10 px-8 h-14 rounded-2xl uppercase text-[10px] tracking-widest">Análise Completa</Button></Link>
                <Button className="bg-emerald-500 hover:bg-emerald-400 font-bold px-8 h-14 rounded-2xl uppercase text-[10px] tracking-widest shadow-emerald-500/20">Vender no Mercado</Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Stats Financeiras Rápidas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-teal-100 bg-white shadow-xl p-8 flex flex-col justify-center text-center md:text-left">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2"><Wallet className="h-4 w-4 text-emerald-600" /> Patrimônio Líquido</p>
          <div className="text-4xl font-black text-slate-900">R$ {totalCurrentValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Valor atual de mercado</p>
        </Card>
        <Card className="border-teal-100 bg-white shadow-xl p-8 flex flex-col justify-center text-center md:text-left"><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Economia Acumulada</p><div className="text-4xl font-black text-pink-600">R$ {warranties.reduce((a, b) => a + Number(b.total_saved || 0), 0).toLocaleString('pt-BR')}</div><p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Dinheiro recuperado</p></Card>
        <Card className="border-teal-100 bg-emerald-600 text-white shadow-xl p-8 flex flex-col justify-center text-center md:text-left relative overflow-hidden shadow-emerald-500/20"><div className="relative z-10"><p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest mb-2 flex items-center justify-center md:justify-start gap-2"><ShieldCheck className="h-4 w-4" /> Saúde de Ativos</p><div className="text-4xl font-black">100%</div><p className="text-[10px] text-emerald-100 font-bold uppercase mt-2">Proteção ativa contra perdas</p></div></Card>
      </div>

      <AnimatePresence mode="popLayout">
        <motion.div layout className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredWarranties.map((w) => (<div key={w.id} className="relative group"><WarrantyCard warranty={w} /></div>))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
