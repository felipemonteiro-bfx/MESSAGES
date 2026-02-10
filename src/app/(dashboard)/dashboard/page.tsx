'use client';

import { createClient } from '@/lib/supabase/client';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, AlertCircle, ShieldCheck, Plus, Search, Filter, Wallet, FileDown, TrendingUp, X, Trophy, Share2, MessageCircle, Clock, BellRing, PieChart as ChartIcon, CheckCircle2, HeartHandshake, FolderOpen, BarChart3, Plane, QrCode, Lock, ArrowDownRight, ArrowUpRight, Calculator, Landmark, CreditCard, Sparkles, ShieldAlert, ScanSearch, Loader2, RefreshCcw, Leaf, ShoppingBag, Stars } from 'lucide-react';
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
      }
    }
    setLoading(false);
  };

  const getDepreciatedValue = (item: any) => {
    const price = Number(item.price || 0);
    const years = (new Date().getTime() - new Date(item.purchase_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
    return price * 0.9 * Math.pow(0.85, years);
  };

  useEffect(() => {
    let result = warranties;
    if (result) setFilteredWarranties(result);
  }, [warranties]);

  // Lógica para o melhor item de upgrade
  const bestTradeIn = [...warranties]
    .filter(w => Number(w.price) > 500)
    .sort((a, b) => (getDepreciatedValue(b) / Number(b.price || 1)) - (getDepreciatedValue(a) / Number(a.price || 1)))[0];

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">{greeting}, <span className="text-emerald-600">{profile?.full_name?.split(' ')[0] || 'Guardião'}</span>!</h1>
          <p className="text-slate-500 font-medium text-sm">Gestão de patrimônio e oportunidades.</p>
        </div>
        <Link href="/products/new"><Button size="lg" className="shadow-2xl shadow-emerald-200 font-bold h-12"><Plus className="h-5 w-5 mr-2" /> Nova Nota</Button></Link>
      </header>

      {/* NOVO: Widget de Próxima Conquista (Aspiracional) */}
      {bestTradeIn && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-[40px] p-1 shadow-2xl shadow-emerald-200">
            <div className="bg-white rounded-[38px] p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              <div className="absolute top-[-20px] right-[-20px] opacity-5"><ShoppingBag className="h-40 w-40 text-emerald-600" /></div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-lg"><Stars className="h-8 w-8 text-emerald-600 animate-pulse" /></div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Sua Próxima Conquista</p>
                  <h3 className="text-3xl font-black text-slate-900 leading-tight">
                    Upgrade para o novo <span className="gradient-text">Premium</span>.
                  </h3>
                  <p className="text-slate-500 text-sm font-medium">Use seu {bestTradeIn.name} (R$ {getDepreciatedValue(bestTradeIn).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}) como entrada.</p>
                </div>
              </div>
              <div className="flex gap-4 relative z-10 shrink-0">
                <Button variant="outline" className="border-teal-100 font-black text-[10px] uppercase h-14 px-8 rounded-2xl">Simular Troca</Button>
                <Button className="bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase h-14 px-8 rounded-2xl shadow-xl shadow-slate-900/20">Ver Ofertas</Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid de Cards de Produto */}
      <AnimatePresence mode="popLayout">
        <motion.div layout className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredWarranties.map((w) => (<div key={w.id} className="relative group"><WarrantyCard warranty={w} /></div>))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
