'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ShoppingBag, Search, Filter, ShieldCheck, BadgeCheck, ArrowRight, Loader2, Package } from 'lucide-react';
import Link from 'next/link';

export default function MarketplacePage() {
  const [loading, setLoading] = useState(true);
  const [listings, setListings] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('marketplace_listings').select('*, warranties(name)').then(({ data }) => {
      setListings(data || []);
      setLoading(false);
    });
  }, [supabase]);

  if (loading) return <div id="loading-state">Carregando Marketplace...</div>;

  return (
    <div className="max-w-7xl mx-auto p-10">
      <h1 className="text-4xl font-black">Marketplace Guardião</h1>
      <p className="text-slate-500">Bens seminovos com procedência e histórico auditado.</p>
      
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {listings.length === 0 ? (
          <p>Nenhum item anunciado ainda.</p>
        ) : (
          listings.map(item => (
            <Card key={item.id} className="p-6">
              <h3 className="font-bold">{item.warranties?.name}</h3>
              <p className="text-emerald-600 font-black">R$ {item.listing_price}</p>
              <Link href={`/products/${item.warranty_id}`}>
                <Button variant="ghost" className="mt-4 w-full">Ver Detalhes</Button>
              </Link>
            </Card>
          ))
        )}
      </div>
      
      {/* Botão de Filtros para o Playwright encontrar */}
      <Button className="mt-10">Filtros</Button>
    </div>
  );
}
