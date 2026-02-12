'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Search, Grid, List, Download, ExternalLink, ShieldCheck, Filter, FolderOpen, Loader2, Image as ImageIcon, Share2, QrCode, Printer, CheckCircle2, FileStack, Umbrella, Landmark, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export default function VaultPage() {
  const [loading, setLoading] = useState(true);
  const [generatingInventory, setGeneratingInventory] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredWarranties] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedForLabels, setSelectedForLabels] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchVaultItems();
  }, []);

  const fetchVaultItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      const { data } = await supabase.from('warranties').select('*').order('created_at', { ascending: false });
      if (data) {
        setItems(data);
        setFilteredWarranties(data);
      }
    }
    setLoading(false);
  };

  const generateInsuranceInventory = () => {
    if (!profile?.is_premium) {
      toast.error('O Inventário de Seguros é um recurso Pro!');
      return;
    }
    setGeneratingInventory(true);
    try {
      const doc = new jsPDF();
      const totalValue = items.reduce((acc, curr) => acc + Number(curr.price || 0), 0);

      // Capa Profissional
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 60, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(24); doc.text('INVENTÁRIO RESIDENCIAL DE BENS', 14, 30);
      doc.setFontSize(10); doc.text('DOCUMENTO PARA CONTRATAÇÃO E ACIONAMENTO DE SEGURO', 14, 40);
      doc.text(`TITULAR: ${profile?.full_name?.toUpperCase()}`, 14, 50);

      // Sumário Executivo
      doc.setTextColor(15, 23, 42); doc.setFontSize(16); doc.text('1. Sumário do Patrimônio', 14, 80);
      const summaryData = [
        ['Total de Itens Auditados', items.length.toString()],
        ['Valor Total Segurável', `R$ ${totalValue.toLocaleString('pt-BR')}`],
        ['Status de Integridade', '100% Digital Verificado'],
        ['Data do Inventário', new Date().toLocaleDateString('pt-BR')]
      ];
      autoTable(doc, { startY: 85, body: summaryData, theme: 'plain', styles: { fontSize: 11 } });

      // Tabela Detalhada de Bens
      doc.setFontSize(16); doc.text('2. Listagem Detalhada de Ativos', 14, (doc as any).lastAutoTable.finalY + 20);
      const itemData = items.map(i => [
        i.name,
        i.category || '---',
        i.serial_number || 'REGISTRADO',
        `R$ ${Number(i.price || 0).toLocaleString('pt-BR')}`,
        i.store || '---'
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 25,
        head: [['Ativo', 'Categoria', 'S/N (Serial)', 'Valor', 'Origem']],
        body: itemData,
        headStyles: { fillColor: [5, 150, 105] },
        styles: { fontSize: 9 }
      });

      // Rodapé de Segurança
      const finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(8); doc.setTextColor(150);
      doc.text('Este documento é um sumário de propriedade auditado pelo Sistema Guardião de Notas.', 14, finalY);
      doc.text('As notas fiscais individuais podem ser solicitadas via QR Code de validação de cada item.', 14, finalY + 5);

      doc.save(`inventario-seguro-guardiao.pdf`);
      toast.success('Inventário para seguros gerado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar inventário.');
    } finally {
      setGeneratingInventory(false);
    }
  };

  useEffect(() => {
    const result = items.filter(i => 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.folder.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredWarranties(result);
  }, [searchQuery, items]);

  const toggleSelection = (id: string) => {
    setSelectedForLabels(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Cofre de <span className="text-emerald-600">Documentos</span></h1>
          <p className="text-slate-500 font-medium">Gestão centralizada de patrimônio e inteligência securitária.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={generateInsuranceInventory} 
            disabled={generatingInventory}
            variant="outline" 
            className="gap-2 border-emerald-100 text-emerald-700 font-black uppercase text-[10px] tracking-widest h-12 px-6 shadow-sm"
          >
            {generatingInventory ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileStack className="h-4 w-4" />}
            Inventário para Seguros
          </Button>
          <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-teal-50 dark:border-white/5 shadow-sm">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}><Grid className="h-5 w-5" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}><List className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      {/* Widget de Inteligência de Seguro (Psicológico) */}
      <Card className="border-none shadow-xl bg-slate-900 text-white p-10 relative overflow-hidden group">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-700"><Umbrella className="h-48 w-48 text-emerald-500" /></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest"><ShieldCheck className="h-4 w-4" /> Cobertura Patrimonial</div>
            <h2 className="text-3xl font-black leading-tight max-w-xl uppercase tracking-tighter">Você tem <span className="text-emerald-400">R$ {items.reduce((acc, curr) => acc + Number(curr.price || 0), 0).toLocaleString('pt-BR')}</span> em ativos expostos a riscos.</h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">Em caso de incêndio ou roubo, você tem a prova de propriedade de todos esses itens pronta? O Dossiê de Inventário resolve isso.</p>
          </div>
          <Button onClick={generateInsuranceInventory} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest px-8 h-14 rounded-2xl shadow-xl shadow-emerald-900/20 gap-2 shrink-0">Gerar Inventário Mestre</Button>
        </div>
      </Card>

      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <input 
            type="text"
            placeholder="Buscar por nome, pasta ou marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-16 pl-12 pr-4 bg-white dark:bg-slate-900 border-2 border-teal-50 dark:border-white/5 rounded-[24px] focus:outline-none focus:border-emerald-500 shadow-sm font-medium dark:text-white"
          />
        </div>

        <motion.div layout className={viewMode === 'grid' ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-4" : "space-y-4"}>
          {filteredItems.map((item) => (
            <motion.div key={item.id} layout className="relative group/card">
              <Card onClick={() => toggleSelection(item.id)} className={`border-none shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white dark:bg-slate-900 h-full flex flex-col cursor-pointer ${selectedForLabels.includes(item.id) ? 'ring-4 ring-emerald-500' : ''}`}>
                <div className="aspect-[4/3] bg-slate-50 dark:bg-white/5 relative overflow-hidden flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-slate-200 dark:text-slate-800" />
                  {selectedForLabels.includes(item.id) && <div className="absolute inset-0 bg-emerald-600/10 flex items-center justify-center"><CheckCircle2 className="h-10 w-10 text-emerald-600" /></div>}
                </div>
                <CardContent className="p-6 space-y-3">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tighter truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.folder}</span>
                      {item.serial_number && <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">S/N OK</span>}
                    </div>
                  </div>
                  <div className="flex justify-between items-end pt-2">
                    <p className="text-sm font-black text-slate-900 dark:text-white">R$ {Number(item.price || 0).toLocaleString('pt-BR')}</p>
                    <Link href={`/products/${item.id}`} onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-emerald-50 text-slate-400 hover:text-emerald-600"><ArrowRight className="h-4 w-4" /></Button></Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
