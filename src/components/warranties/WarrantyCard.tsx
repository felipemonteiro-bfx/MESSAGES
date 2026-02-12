'use client';

import { memo, useMemo, useCallback } from 'react';
import { Warranty } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatDate, calculateExpirationDate, getDaysRemaining } from '@/lib/utils/date-utils';
import { Calendar, Package, Clock, Trash2, ExternalLink, Pencil, ShieldAlert, ShieldCheck, ShieldX, Store, DollarSign, Info, Share2, HeartHandshake, FileBadge, Umbrella } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

export const WarrantyCard = memo(({ warranty }: { warranty: Warranty }) => {
  const router = useRouter();
  const supabase = createClient();
  
  // Memoizar cálculos custosos
  const { expirationDate, daysRemaining, progress, isExpired, isExpiringSoon } = useMemo(() => {
    const expDate = calculateExpirationDate(warranty.purchase_date, warranty.warranty_months);
    const daysRem = getDaysRemaining(expDate);
    const totalDays = warranty.warranty_months * 30;
    const elapsedDays = totalDays - daysRem;
    const prog = Math.min(Math.max((elapsedDays / totalDays) * 100, 0), 100);
    
    return {
      expirationDate: expDate,
      daysRemaining: daysRem,
      progress: prog,
      isExpired: daysRem < 0,
      isExpiringSoon: daysRem >= 0 && daysRem <= 30,
    };
  }, [warranty.purchase_date, warranty.warranty_months]);

  const handleShare = useCallback(() => {
    const shareUrl = `${window.location.origin}/share/${warranty.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link de compartilhamento copiado!');
  }, [warranty.id]);

  const exportResalePDF = useCallback(() => {
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('CERTIFICADO DE REVENDA SEGURA', 105, 25, { align: 'center' });
    
    doc.setTextColor(5, 150, 105);
    doc.setFontSize(12);
    doc.text('Guardião de Notas - Documentação Verificada', 105, 35, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text(warranty.name, 105, 60, { align: 'center' });

    doc.setFontSize(10);
    doc.text(`Este produto possui garantia ativa até: ${formatDate(expirationDate)}`, 14, 80);
    doc.text(`Loja de Origem: ${warranty.store || 'Não informada'}`, 14, 90);
    doc.text(`Data da Compra: ${formatDate(warranty.purchase_date)}`, 14, 100);
    doc.text(`Valor de Mercado Sugerido: R$ ${Number(warranty.price || 0).toLocaleString('pt-BR')}`, 14, 110);

    if (warranty.notes) {
      doc.text('Observações do Vendedor:', 14, 130);
      doc.setFont('helvetica', 'italic');
      doc.text(warranty.notes, 14, 140, { maxWidth: 180 });
    }

    doc.save(`resale-dossier-${warranty.name}.pdf`);
    toast.success('Dossiê de revenda gerado!');
  }, [warranty, expirationDate]);

  const handleLogSaving = useCallback(async () => {
    const amount = prompt('Quanto você economizou com este conserto/troca? (Valor em R$)');
    if (amount && !isNaN(Number(amount))) {
      const { error } = await supabase.from('warranties').update({ total_saved: (Number(warranty.total_saved || 0) + Number(amount)) }).eq('id', warranty.id);
      if (!error) { toast.success(`Economia de R$ ${amount} registrada!`); router.refresh(); }
    }
  }, [warranty.id, warranty.total_saved, supabase, router]);

  const handleDelete = useCallback(async () => {
    if (confirm('Deseja realmente excluir esta garantia?')) {
      try {
        if (warranty.invoice_url) {
          const urlParts = warranty.invoice_url.split('/');
          const filePath = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;
          await supabase.storage.from('invoices').remove([filePath]);
        }
        const { error } = await supabase.from('warranties').delete().eq('id', warranty.id);
        if (error) throw error;
        toast.success('Garantia removida!');
        router.refresh();
      } catch (err: any) { toast.error('Erro ao excluir: ' + err.message); }
    }
  }, [warranty.id, warranty.invoice_url, supabase, router]);

  // Memoizar statusConfig
  const statusConfig = useMemo(() => {
    if (isExpired) {
      return { 
        icon: <ShieldX className="h-4 w-4" />, 
        color: 'text-red-600', 
        bg: 'bg-red-50', 
        border: 'border-red-100', 
        label: 'Expirada', 
        tip: 'Dica: Guarde a nota por mais 5 anos para fins fiscais.' 
      };
    }
    if (isExpiringSoon) {
      return { 
        icon: <ShieldAlert className="h-4 w-4" />, 
        color: 'text-amber-600', 
        bg: 'bg-amber-50', 
        border: 'border-amber-100', 
        label: 'Vencendo', 
        tip: 'Urgente: Verifique se o produto apresenta vícios antes do prazo.' 
      };
    }
    return { 
      icon: <ShieldCheck className="h-4 w-4" />, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50', 
      border: 'border-emerald-100', 
      label: 'Protegido', 
      tip: 'Segurança: Você tem cobertura total do fabricante.' 
    };
  }, [isExpired, isExpiringSoon]);

  return (
    <motion.div whileHover={{ y: -8 }} className="group">
      <Card className={`h-full border-t-4 ${isExpired ? 'border-t-red-500' : isExpiringSoon ? 'border-t-amber-500' : 'border-t-emerald-500'} shadow-sm hover:shadow-2xl transition-all duration-500`}>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="space-y-1">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border`}>
              {statusConfig.icon} {statusConfig.label}
            </span>
            <CardTitle className="text-xl font-black text-slate-800 pt-2 group-hover:text-emerald-600 transition-colors cursor-pointer">
              <Link href={`/products/${warranty.id}`}>{warranty.name}</Link>
            </CardTitle>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-tighter"><Store className="h-3.5 w-3.5" /> {warranty.store || 'Loja não informada'}</div>
          </div>
          <div className="flex gap-1">
            {!isExpired && (
              <Button variant="ghost" size="sm" onClick={exportResalePDF} className="h-8 w-8 p-0" title="Dossiê de Revenda">
                <FileBadge className="h-4 w-4 text-emerald-600" />
              </Button>
            )}
            {!isExpired && (
              <Button variant="ghost" size="sm" onClick={() => router.push(`/insurance/simulator/${warranty.id}`)} className="h-8 w-8 p-0" title="Simular Seguro">
                <Umbrella className="h-4 w-4 text-cyan-600" />
              </Button>
            )}
            {!isExpired && (
              <Button variant="ghost" size="sm" onClick={handleLogSaving} className="h-8 w-8 p-0" title="Registrar Economia">
                <HeartHandshake className="h-4 w-4 text-pink-500" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleShare} className="h-8 w-8 p-0" title="Compartilhar">
              <Share2 className="h-4 w-4 text-slate-400 hover:text-emerald-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/products/edit/${warranty.id}`)} className="h-8 w-8 p-0" title="Editar">
              <Pencil className="h-4 w-4 text-slate-400 hover:text-emerald-600" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} className="h-8 w-8 p-0" title="Excluir">
              <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter"><span>Status do Prazo</span><span>{progress.toFixed(0)}% Consumido</span></div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }} className={`h-full rounded-full ${isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'}`} /></div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Compra</p><p className="text-sm font-bold text-slate-700">{formatDate(warranty.purchase_date)}</p></div>
            <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Expiração</p><p className={`text-sm font-bold ${isExpired ? 'text-red-600' : 'text-slate-700'}`}>{formatDate(expirationDate)}</p></div>
          </div>

          {Number(warranty.total_saved || 0) > 0 && (
            <div className="px-4 py-2 rounded-xl bg-pink-50 border border-pink-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-pink-600 uppercase">Economia Gerada</span>
              <span className="text-sm font-black text-pink-700 font-mono">R$ {Number(warranty.total_saved).toLocaleString('pt-BR')}</span>
            </div>
          )}

          <div className={`p-3 rounded-xl ${statusConfig.bg} border ${statusConfig.border} flex items-start gap-2`}>
            <Info className={`h-4 w-4 ${statusConfig.color} shrink-0 mt-0.5`} /><p className={`text-[11px] font-bold leading-tight ${statusConfig.color}`}>{statusConfig.tip}</p>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex flex-col"><span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Valor de Nota</span><span className="text-lg font-black text-slate-800">{warranty.price ? `R$ ${Number(warranty.price).toLocaleString('pt-BR')}` : '---'}</span></div>
            {warranty.invoice_url && (
              <a href={warranty.invoice_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border-2 border-slate-100 text-xs font-black text-slate-600 hover:border-emerald-600 hover:text-emerald-600 transition-all shadow-sm">Nota Fiscal <ExternalLink className="h-3.5 w-3.5" /></a>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Comparação customizada para evitar re-renders desnecessários
  return (
    prevProps.warranty.id === nextProps.warranty.id &&
    prevProps.warranty.name === nextProps.warranty.name &&
    prevProps.warranty.purchase_date === nextProps.warranty.purchase_date &&
    prevProps.warranty.warranty_months === nextProps.warranty.warranty_months &&
    prevProps.warranty.total_saved === nextProps.warranty.total_saved &&
    prevProps.warranty.invoice_url === nextProps.warranty.invoice_url
  );
});

WarrantyCard.displayName = 'WarrantyCard';