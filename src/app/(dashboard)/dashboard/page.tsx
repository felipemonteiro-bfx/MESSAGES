'use client';

import { createClient } from '@/lib/supabase/client';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Package, AlertCircle, ShieldCheck, Plus, Search, Filter, Wallet, FileDown, TrendingUp, X, Trophy, Share2, MessageCircle, Clock, BellRing, PieChart as ChartIcon, CheckCircle2, HeartHandshake, FolderOpen, BarChart3, Plane, QrCode, Lock, ArrowDownRight, ArrowUpRight, Calculator, Users } from 'lucide-react';
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
      
      // 1. Buscar minhas notas
      const { data: myWarranties } = await supabase.from('warranties').select('*').eq('user_id', user.id);
      
      // 2. Buscar notas compartilhadas comigo
      const { data: sharedFolders } = await supabase.from('folder_shares').select('*').eq('invited_email', user.email);
      
      let sharedWarranties: any[] = [];
      if (sharedFolders && sharedFolders.length > 0) {
        for (const share of sharedFolders) {
          const { data: items } = await supabase.from('warranties')
            .select('*')
            .eq('user_id', share.owner_id)
            .eq('folder', share.folder_name);
          if (items) sharedWarranties = [...sharedWarranties, ...items.map(i => ({ ...i, is_shared: true }))];
        }
      }

      const allWarranties = [...(myWarranties || []), ...sharedWarranties].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setWarranties(allWarranties);
      setFilteredWarranties(allWarranties);
      setCategories(Array.from(new Set(allWarranties.map(w => w.category).filter(Boolean))) as string[]);
      setFolders(Array.from(new Set(allWarranties.map(w => w.folder).filter(Boolean))) as string[]);
      checkAndNotify(allWarranties, user.id);
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
  const totalWarranties = warranties.length;
  const expiredCount = warranties.filter(w => getDaysRemaining(calculateExpirationDate(w.purchase_date, w.warranty_months)) < 0).length;
  const safetyScore = totalWarranties > 0 ? Math.round(((totalWarranties - expiredCount) / totalWarranties) * 100) : 0;

  const exportPDF = (items = filteredWarranties) => {
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(5, 150, 105); doc.text('Guardião - Inventário Familiar', 14, 20);
    const tableData = items.map(w => [w.name, w.store || '---', formatDate(w.purchase_date), `R$ ${Number(w.price || 0).toLocaleString('pt-BR')}`]);
    autoTable(doc, { startY: 40, head: [['Produto', 'Loja', 'Compra', 'Valor']], body: tableData, headStyles: { fillColor: [5, 150, 105] } });
    doc.save(`inventario-familiar.pdf`);
    toast.success('Dossiê familiar gerado!');
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div></div>;

  return (
    <div className="space-y-10 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-black tracking-tight text-slate-900">{greeting}, <span className="text-emerald-600">{profile?.full_name?.split(' ')[0] || 'Guardião'}</span>!</h1>
            {profile?.is_premium ? <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-amber-200">Pro</span> : <Link href="/plans" className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-slate-200 hover:bg-emerald-600 hover:text-white transition-all">Gratuito</Link>}
          </div>
          <p className="text-slate-500 font-medium">Você monitora <span className="text-emerald-600 font-black">{totalWarranties}</span> itens hoje (incluindo compartilhados).</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => exportPDF()} className="gap-2 border-emerald-100 text-emerald-700 font-bold shadow-sm"><FileDown className="h-4 w-4" /> Dossiê PDF</Button>
          <Link href="/products/new"><Button size="lg" className="shadow-2xl shadow-emerald-200 font-bold"><Plus className="h-5 w-5 mr-2" /> Nova Nota</Button></Link>
        </div>
      </header>

      {/* Carrossel de Oportunidades com Badge de Compartilhado */}
      {warranties.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative group">
          <div className="bg-slate-900 text-white rounded-[40px] p-8 overflow-hidden relative shadow-2xl">
            <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/10 -skew-x-12 translate-x-20" />
            <AnimatePresence mode="wait">
              <motion.div key={currentAssetIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                <div className="space-y-4 text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
                    <TrendingUp className="h-4 w-4" /> Insight Patrimonial {warranties[currentAssetIndex].is_shared && "• Compartilhado"}
                  </div>
                  <h3 className="text-3xl font-black leading-tight max-w-lg">
                    {warranties[currentAssetIndex].is_shared && <Users className="inline h-6 w-6 mr-2 text-cyan-400" />}
                    Seu <span className="text-emerald-400">{warranties[currentAssetIndex].name}</span> está monitorado.
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">Verifique os detalhes e dicas de cuidado para aumentar a vida útil do bem.</p>
                </div>
                <div className="flex gap-4">
                  <Link href={`/products/${warranties[currentAssetIndex].id}`}><Button variant="ghost" className="text-white hover:bg-white/10 font-bold border border-white/10 px-8 h-14 rounded-2xl uppercase text-[10px] tracking-widest">Ver Detalhes</Button></Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Grid de Cards */}
      <AnimatePresence mode="popLayout">
        <motion.div layout className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredWarranties.map((w) => (
            <div key={w.id} className="relative group">
              {w.is_shared && (
                <div className="absolute -top-3 -right-3 z-30 bg-cyan-600 text-white p-2 rounded-full shadow-lg border-2 border-white" title="Pasta Compartilhada">
                  <Users className="h-3 w-3" />
                </div>
              )}
              <WarrantyCard warranty={w} />
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}