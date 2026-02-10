'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FolderOpen, Plus, Search, MoreVertical, ShieldCheck, Landmark, Package, ArrowRight, Loader2, Home, Briefcase, Car, Smartphone, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function FolderManagementPage() {
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('warranties').select('*');
    if (data) setWarranties(data);
    setLoading(false);
  };

  const folderIcons: Record<string, any> = {
    'Pessoal': <UserIcon className="h-6 w-6" />,
    'Trabalho': <Briefcase className="h-6 w-6" />,
    'Casa': <Home className="h-6 w-6" />,
    'Veículo': <Car className="h-6 w-6" />,
    'Eletrônicos': <Smartphone className="h-6 w-6" />,
    'Outros': <Package className="h-6 w-6" />,
  };

  const folderColors: Record<string, string> = {
    'Pessoal': 'bg-emerald-500',
    'Trabalho': 'bg-blue-500',
    'Casa': 'bg-amber-500',
    'Veículo': 'bg-rose-500',
    'Eletrônicos': 'bg-cyan-500',
    'Outros': 'bg-slate-500',
  };

  const folderNames = Array.from(new Set(warranties.map(w => w.folder).filter(Boolean)));
  
  const foldersData = folderNames.map(name => {
    const items = warranties.filter(w => w.folder === name);
    const totalValue = items.reduce((acc, curr) => acc + Number(curr.price || 0), 0);
    return { name, count: items.length, value: totalValue };
  }).sort((a, b) => b.value - a.value);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Pastas do <span className="text-emerald-600">Cofre</span></h1>
          <p className="text-slate-500 font-medium">Segmentação estratégica do seu patrimônio documentado.</p>
        </div>
        <Button className="gap-2 h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20">
          <Plus className="h-4 w-4" /> Nova Pasta
        </Button>
      </header>

      {/* Grid de Pastas Premium */}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {foldersData.map((folder, idx) => (
          <motion.div key={folder.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
            <Card className="group border-none shadow-xl hover:shadow-2xl transition-all duration-500 bg-white dark:bg-slate-900 overflow-hidden cursor-pointer">
              <div className={`h-2 w-full ${folderColors[folder.name] || 'bg-slate-400'}`} />
              <CardContent className="p-8 space-y-8">
                <div className="flex justify-between items-start">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${folderColors[folder.name] || 'bg-slate-400'} group-hover:scale-110 transition-transform`}>
                    {folderIcons[folder.name] || <FolderOpen className="h-6 w-6" />}
                  </div>
                  <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-slate-600 dark:hover:text-white">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{folder.name}</h3>
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <Package className="h-3 w-3" /> {folder.count} Itens Protegidos
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Acumulado</p>
                    <p className="text-lg font-black text-slate-900 dark:text-emerald-400">R$ {folder.value.toLocaleString('pt-BR')}</p>
                  </div>
                  <Link href={`/vault?search=${folder.name}`}>
                    <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full bg-slate-50 dark:bg-white/5 text-slate-400 group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all">
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Widget de Consolidação Global */}
      <Card className="border-none shadow-2xl bg-slate-900 text-white p-10 relative overflow-hidden group">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Landmark className="h-48 w-48 text-emerald-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4" /> Governança do Cofre
            </div>
            <h2 className="text-3xl font-black leading-tight max-w-xl uppercase tracking-tighter">Seu capital está segmentado em <span className="text-emerald-400">{folderNames.length} divisões estratégicas.</span></h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">A organização por pastas permite auditorias mais rápidas e relatórios de IRPF automatizados por categoria.</p>
          </div>
          <Button variant="ghost" className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest px-8 h-14 rounded-2xl border border-white/10 shrink-0">Relatório por Pasta</Button>
        </div>
      </Card>
    </div>
  );
}

import { User as UserIcon } from 'lucide-react';
