'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { WarrantyCard } from '@/components/warranties/WarrantyCard';
import { LoadingSpinner, LoadingPage } from '@/components/ui/LoadingSpinner';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Plus, Search, Filter, Grid, List, Calendar, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { Warranty } from '@/types/supabase';
import { toast } from 'sonner';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { motion } from 'framer-motion';

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'active' | 'expiring' | 'expired';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    
    if (user) {
      fetchWarranties();
    }
  }, [user, authLoading, router]);

  const fetchWarrantiesMemo = useCallback(() => {
    if (user) {
      fetchWarranties();
    }
  }, [user, debouncedSearch, filterStatus]);

  useEffect(() => {
    fetchWarrantiesMemo();
  }, [fetchWarrantiesMemo]);

  const fetchWarranties = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('warranties')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Aplicar filtro de status
      if (filterStatus !== 'all') {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const thirtyDaysFromNowStr = thirtyDaysFromNow.toISOString().split('T')[0];

        if (filterStatus === 'expired') {
          // Garantias expiradas (data de expiração < hoje)
          query = query.lt('purchase_date', today);
        } else if (filterStatus === 'expiring') {
          // Garantias vencendo em breve (próximos 30 dias)
          // Isso requer cálculo, então vamos filtrar no cliente por enquanto
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtrar por busca e status no cliente
      let filtered = data || [];
      
      // Filtro de busca
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        filtered = filtered.filter(w => 
          w.name.toLowerCase().includes(searchLower) ||
          w.category?.toLowerCase().includes(searchLower) ||
          w.store?.toLowerCase().includes(searchLower)
        );
      }

      // Filtro de status (se não foi aplicado na query)
      if (filterStatus !== 'all') {
        filtered = filtered.filter(w => {
          const expirationDate = new Date(w.purchase_date);
          expirationDate.setMonth(expirationDate.getMonth() + w.warranty_months);
          const daysRemaining = Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          
          if (filterStatus === 'expired') return daysRemaining < 0;
          if (filterStatus === 'expiring') return daysRemaining >= 0 && daysRemaining <= 30;
          if (filterStatus === 'active') return daysRemaining > 30;
          return true;
        });
      }

      setWarranties(filtered);
      logger.info('Warranties fetched', { count: filtered.length });
    } catch (error) {
      const appError = normalizeError(error);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
    } finally {
      setLoading(false);
    }
  };

  // Memoizar estatísticas (cálculo custoso) - DEVE estar antes de qualquer return
  const stats = useMemo(() => {
    if (!user || !warranties.length) {
      return {
        total: 0,
        active: 0,
        expiring: 0,
        expired: 0,
        totalValue: 0,
      };
    }
    const now = Date.now();
    const oneDay = 1000 * 60 * 60 * 24;
    
    return warranties.reduce((acc, w) => {
      const expirationDate = new Date(w.purchase_date);
      expirationDate.setMonth(expirationDate.getMonth() + w.warranty_months);
      const daysRemaining = Math.ceil((expirationDate.getTime() - now) / oneDay);
      
      acc.total++;
      if (daysRemaining > 30) acc.active++;
      else if (daysRemaining >= 0 && daysRemaining <= 30) acc.expiring++;
      else acc.expired++;
      
      return acc;
    }, { total: 0, active: 0, expiring: 0, expired: 0 });
  }, [warranties, user]);

  if (authLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Meu Cofre
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Gerencie suas garantias e proteja seu patrimônio
            </p>
          </div>
          <Button
            onClick={() => router.push('/products/new')}
            className="h-12 px-6 rounded-xl font-black uppercase tracking-wider shadow-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Garantia
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total"
            value={stats.total}
            icon={<ShieldCheck className="h-5 w-5" />}
            color="emerald"
          />
          <StatCard
            label="Ativas"
            value={stats.active}
            icon={<ShieldCheck className="h-5 w-5" />}
            color="emerald"
          />
          <StatCard
            label="Vencendo"
            value={stats.expiring}
            icon={<ShieldAlert className="h-5 w-5" />}
            color="amber"
          />
          <StatCard
            label="Expiradas"
            value={stats.expired}
            icon={<ShieldX className="h-5 w-5" />}
            color="red"
          />
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar garantias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'all' ? 'primary' : 'outline'}
              onClick={() => setFilterStatus('all')}
              className="h-12 px-4 rounded-xl"
            >
              Todas
            </Button>
            <Button
              variant={filterStatus === 'active' ? 'primary' : 'outline'}
              onClick={() => setFilterStatus('active')}
              className="h-12 px-4 rounded-xl"
            >
              Ativas
            </Button>
            <Button
              variant={filterStatus === 'expiring' ? 'primary' : 'outline'}
              onClick={() => setFilterStatus('expiring')}
              className="h-12 px-4 rounded-xl"
            >
              Vencendo
            </Button>
            <Button
              variant={filterStatus === 'expired' ? 'primary' : 'outline'}
              onClick={() => setFilterStatus('expired')}
              className="h-12 px-4 rounded-xl"
            >
              Expiradas
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'primary' : 'outline'}
              onClick={() => setViewMode('grid')}
              className="h-12 w-12 rounded-xl"
            >
              <Grid className="h-5 w-5" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'primary' : 'outline'}
              onClick={() => setViewMode('list')}
              className="h-12 w-12 rounded-xl"
            >
              <List className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Lista de Garantias */}
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : warranties.length === 0 ? (
          <div className="text-center py-20">
            <ShieldCheck className="h-16 w-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-600 dark:text-slate-400 mb-2">
              Nenhuma garantia encontrada
            </h3>
            <p className="text-slate-500 dark:text-slate-500 mb-6">
              {searchQuery || filterStatus !== 'all'
                ? 'Tente ajustar seus filtros de busca'
                : 'Comece adicionando sua primeira garantia'}
            </p>
            {!searchQuery && filterStatus === 'all' && (
              <Button
                onClick={() => router.push('/products/new')}
                className="h-12 px-6 rounded-xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                Adicionar Primeira Garantia
              </Button>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {warranties.map((warranty, index) => (
              <motion.div
                key={warranty.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <WarrantyCard warranty={warranty} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const StatCard = memo(({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'emerald' | 'amber' | 'red' }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50',
    amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/50',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="text-3xl font-black">{value}</div>
    </div>
  );
});

StatCard.displayName = 'StatCard';
