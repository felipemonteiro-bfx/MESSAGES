'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Search, Grid, List, Download, ExternalLink, ShieldCheck, Filter, FolderOpen, Loader2, Image as ImageIcon, Share2, QrCode, Printer, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export default function VaultPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [filteredItems, setFilteredWarranties] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedForLabels, setSelectedForLabels] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchVaultItems();
  }, []);

  const fetchVaultItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('warranties')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        setItems(data);
        setFilteredWarranties(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    const result = items.filter(i => 
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.folder.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredWarranties(result);
  }, [searchQuery, items]);

  const toggleSelection = (id: string) => {
    setSelectedForLabels(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const generateLabelsPDF = async () => {
    if (selectedForLabels.length === 0) {
      toast.error('Selecione itens para gerar as etiquetas.');
      return;
    }
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const labelWidth = 80;
      const labelHeight = 50;
      const margin = 10;
      let x = margin;
      let y = margin;

      for (const id of selectedForLabels) {
        const item = items.find(i => i.id === id);
        const shareUrl = `${window.location.origin}/share/${id}`;
        const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1 });

        // Desenhar Borda da Etiqueta
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, y, labelWidth, labelHeight);

        // Logo Guardião (Simulado)
        doc.setFillColor(5, 150, 105);
        doc.rect(x, y, 5, labelHeight, 'F');

        // Conteúdo
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('GUARDIÃO DE NOTAS', x + 10, y + 10);
        
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.text(item.name.toUpperCase(), x + 10, y + 18, { maxWidth: 40 });

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(`S/N: ${item.serial_number || 'REGISTRADO'}`, x + 10, y + 35);
        doc.text(`AQUISIÇÃO: ${new Date(item.purchase_date).toLocaleDateString('pt-BR')}`, x + 10, y + 40);

        // QR Code
        doc.addImage(qrDataUrl, 'PNG', x + 50, y + 10, 25, 25);
        doc.setFontSize(6);
        doc.text('ESCANEIE PARA VALIDAR', x + 50, y + 38);

        // Atualizar coordenadas para próxima etiqueta (2 por linha)
        x += labelWidth + margin;
        if (x + labelWidth > 210) {
          x = margin;
          y += labelHeight + margin;
        }
        if (y + labelHeight > 297) {
          doc.addPage();
          x = margin;
          y = margin;
        }
      }

      doc.save('etiquetas-patrimonio-guardiao.pdf');
      toast.success('Arquivo de etiquetas pronto para impressão!');
      setSelectedForLabels([]);
    } catch (err) {
      toast.error('Erro ao gerar etiquetas.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">Cofre de <span className="text-emerald-600">Documentos</span></h1>
          <p className="text-slate-500 font-medium">Gerencie suas notas e gere etiquetas físicas para seus bens.</p>
        </div>
        <div className="flex gap-3">
          <AnimatePresence>
            {selectedForLabels.length > 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <Button onClick={generateLabelsPDF} disabled={generating} className="gap-2 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest h-12 px-6">
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                  Imprimir {selectedForLabels.length} Etiquetas
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2 bg-white dark:bg-slate-900 p-1 rounded-2xl border border-teal-50 dark:border-white/5 shadow-sm">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}><Grid className="h-5 w-5" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}><List className="h-5 w-5" /></button>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <input 
            type="text"
            placeholder="Buscar no cofre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-12 pr-4 bg-white dark:bg-slate-900 border-2 border-teal-50 dark:border-white/5 rounded-2xl focus:outline-none focus:border-emerald-500 shadow-sm font-medium dark:text-white"
          />
        </div>

        <motion.div layout className={viewMode === 'grid' ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-4" : "space-y-4"}>
          {filteredItems.map((item) => (
            <motion.div key={item.id} layout className="relative">
              <Card onClick={() => toggleSelection(item.id)} className={`group border-none shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white dark:bg-slate-900 h-full flex flex-col cursor-pointer ${selectedForLabels.includes(item.id) ? 'ring-4 ring-emerald-500 shadow-emerald-500/20' : ''}`}>
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                  <div className={`absolute top-3 right-3 z-30 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedForLabels.includes(item.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/50 border-white/50 text-transparent'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <ImageIcon className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                </div>
                <CardContent className="p-5 space-y-3 flex-1 flex flex-col">
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tighter truncate">{item.name}</h4>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.folder}</p>
                  </div>
                  <div className="flex gap-2 pt-2 border-t border-slate-50 dark:border-white/5">
                    <Button variant="ghost" size="sm" className="flex-1 h-9 text-[9px] font-black uppercase tracking-widest gap-1.5"><QrCode className="h-3 w-3" /> Etiqueta</Button>
                    <a href={item.invoice_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl"><ExternalLink className="h-3.5 w-3.5" /></Button></a>
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