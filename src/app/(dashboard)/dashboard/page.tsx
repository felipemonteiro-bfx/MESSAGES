'use client';

import { createClient } from '@/lib/supabase/client';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, AlertCircle, ShieldCheck, Plus, Search, Filter, Wallet, FileDown, TrendingUp, X, Trophy, Share2, MessageCircle, Clock, BellRing, PieChart as ChartIcon, CheckCircle2, HeartHandshake, FolderOpen, BarChart3, Plane, QrCode, Lock, ArrowDownRight, ArrowUpRight, Calculator, Landmark, CreditCard } from 'lucide-react';
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
  const [currentAssetIndex, setCurrentAssetIndex] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  useEffect(() => {
    if (warranties.length > 1) {
      const timer = setInterval(() => setCurrentAssetIndex((prev) => (prev + 1) % warranties.length), 5000);
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
      }
    }
    setLoading(false);
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

  // Cálculos de Patrimônio Líquido
  const totalDebt = warranties.reduce((acc, curr) => acc + ((curr.total_installments - curr.paid_installments) * Number(curr.installment_value || 0)), 0);
  const totalOriginalValue = warranties.reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);
  const netWorth = totalOriginalValue - totalDebt;

  const toggleSelect = (id: string) => {
    if (!profile?.is_premium && selectedItems.length >= 2) { toast.error('Selecione ilimitado no Plano Pro!'); return; }
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">{greeting}, <span className="text-emerald-600">{profile?.full_name?.split(' ')[0] || 'Guardião'}</span>!</h1>
          <p className="text-slate-500 font-medium">Você tem <span className="text-slate-900 font-black">R$ {netWorth.toLocaleString('pt-BR')}</span> em patrimônio quitado.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/products/new"><Button size="lg" className="shadow-2xl shadow-emerald-200 font-bold"><Plus className="h-5 w-5 mr-2" /> Nova Nota</Button></Link>
        </div>
      </header>

      {/* Widget de Patrimônio Líquido (Fintech Style) */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-slate-900 text-white border-none overflow-hidden relative shadow-2xl">
          <CardContent className="p-8 space-y-8 relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Landmark className="h-3 w-3 text-emerald-500" /> Balanço Patrimonial</p>
                <div className="text-5xl font-black text-white">R$ {netWorth.toLocaleString('pt-BR')}</div>
                <p className="text-xs text-slate-400 font-medium">Valor total dos seus bens (menos parcelas pendentes)</p>
              </div>
              <div className="h-24 w-24 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ value: netWorth }, { value: totalDebt }]} innerRadius={30} outerRadius={40} dataKey="value">
                      <Cell fill="#059669" />
                      <Cell fill="#334155" />
                    </Pie>
                  </PieChart>
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
                <div><p className="text-[9px] font-black uppercase text-slate-500">Dívida Ativa</p><p className="text-sm font-bold">R$ {totalDebt.toLocaleString('pt-BR')}</p></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-100 bg-white shadow-xl flex flex-col justify-between p-8">
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-2xl w-fit text-emerald-600"><TrendingUp className="h-6 w-6" /></div>
            <h3 className="text-xl font-black text-slate-900 leading-tight">Insight Financeiro</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              {totalDebt > 0 ? `Você ainda possui R$ ${totalDebt.toLocaleString('pt-BR')} em parcelas. Mantenha os pagamentos em dia para valorizar seu patrimônio.` : 'Excelente! Seu patrimônio está 100% quitado e sob custódia.'}
            </p>
          </div>
          <Button variant="ghost" className="w-full text-emerald-600 font-black text-[10px] uppercase tracking-widest mt-6">Ver Fluxo de Caixa</Button>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <input type="text" placeholder="Buscar produto, loja ou categoria..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 pl-12 pr-4 bg-white border-2 border-teal-50 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-slate-700 shadow-sm" />
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setSelectedFolder('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${selectedFolder === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>Todas</button>
          {folders.map(f => (<button key={f} onClick={() => setSelectedFolder(f)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase ${selectedFolder === f ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>{f}</button>))}
        </div>
      </div>

      <AnimatePresence mode="popLayout"><motion.div layout className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {filteredWarranties.map((w) => (<div key={w.id} className="relative group"><button onClick={() => toggleSelect(w.id)} className={`absolute -top-2 -left-2 z-20 h-6 w-6 rounded-full border-2 transition-all flex items-center justify-center ${selectedItems.includes(w.id) ? 'bg-emerald-600 border-emerald-600 scale-110 shadow-lg' : 'bg-white border-slate-200 opacity-0 group-hover:opacity-100'}`}>{selectedItems.includes(w.id) && <CheckCircle2 className="h-4 w-4 text-white" />}</button><WarrantyCard warranty={w} /></div>))}
      </motion.div></AnimatePresence>
    </div>
  );
}
