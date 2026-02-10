'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShoppingBag, Search, Filter, ShieldCheck, Star, BadgeCheck, MessageCircle, ArrowRight, Loader2, Tag, Smartphone, Laptop, Camera, Watch, Zap, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';

export default function MarketplacePage() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      // BUSCA REAL: Pegando anúncios ativos e trazendo o nome do produto da tabela warranties
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(`
          id,
          listing_price,
          description,
          created_at,
          warranties (
            name,
            category,
            store,
            serial_number
          ),
          profiles (
            full_name
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (err: any) {
      toast.error('Erro ao carregar marketplace.');
    } finally {
      setLoading(false);
    }
  };

  const filteredListings = listings.filter(l => 
    l.warranties?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.warranties?.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Market<span className="text-emerald-600">place</span></h1>
          <p className="text-slate-500 font-medium">Bens seminovos com procedência e histórico auditado.</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <BadgeCheck className="h-4 w-4" /> {listings.length} Itens Auditados
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <input 
            type="text" 
            placeholder="O que você está procurando hoje?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-16 pl-12 pr-4 bg-white dark:bg-slate-900 border-2 border-teal-50 dark:border-white/5 rounded-[24px] focus:outline-none focus:border-emerald-500 shadow-xl shadow-emerald-500/5 font-medium dark:text-white"
          />
        </div>
        <Button variant="outline" className="h-16 px-8 rounded-[24px] border-2 border-teal-50 dark:border-white/5 font-black uppercase text-[10px] tracking-widest text-slate-600 dark:text-slate-300">
          <Filter className="h-4 w-4 mr-2" /> Filtros
        </Button>
      </div>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatePresence>
          {filteredListings.length === 0 ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <Package className="h-16 w-16 text-slate-200 mx-auto" />
              <p className="text-slate-400 font-bold uppercase text-xs">Nenhum anúncio ativo no momento.</p>
            </div>
          ) : (
            filteredListings.map((item, idx) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}>
                <Card className="border-none shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white dark:bg-slate-900 group h-full flex flex-col">
                  <div className="aspect-square bg-slate-50 dark:bg-white/5 relative flex items-center justify-center">
                    <div className="absolute top-3 left-3 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 flex items-center gap-1.5 shadow-sm">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      <span className="text-[8px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Histórico Auditado</span>
                    </div>
                    <div className="text-slate-300 dark:text-slate-700 group-hover:scale-110 transition-transform duration-500">
                      <Package className="h-16 w-16 opacity-20" />
                    </div>
                  </div>
                  <CardContent className="p-6 space-y-4 flex-1 flex flex-col">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{item.warranties?.category || 'Ativo'}</p>
                      <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">{item.warranties?.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Vendedor: {item.profiles?.full_name || 'Usuário Guardião'}</p>
                    </div>
                    
                    <div className="pt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between mt-auto">
                      <p className="text-xl font-black text-slate-900 dark:text-white">R$ {Number(item.listing_price).toLocaleString('pt-BR')}</p>
                      <Link href={`/share/${item.id}`}>
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-full bg-slate-50 dark:bg-white/5 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
                          <ArrowRight className="h-4.5 w-4.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <Card className="border-none shadow-2xl bg-slate-900 text-white p-12 relative overflow-hidden group">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-1000">
          <ShoppingBag className="h-64 w-64 text-emerald-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest">
              <Zap className="h-4 w-4" /> Ecossistema Seguro
            </div>
            <h2 className="text-4xl font-black leading-tight max-w-xl uppercase tracking-tighter">O único lugar onde você compra <span className="text-emerald-400">confiança.</span></h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-2xl">No Marketplace do Guardião, todos os itens possuem histórico verificado de manutenção e nota fiscal original custodiada.</p>
          </div>
          <Link href="/dashboard"><Button className="h-16 px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs tracking-widest shadow-2xl shadow-emerald-900/20 shrink-0 rounded-2xl">Anunciar Meus Bens</Button></Link>
        </div>
      </Card>
    </div>
  );
}