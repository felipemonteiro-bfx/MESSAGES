'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plane, ShieldCheck, FileDown, ArrowLeft, Loader2, CheckCircle2, QrCode, Smartphone, Camera, Laptop, Watch, Languages, Globe } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '@/lib/utils/date-utils';

export default function TravelModePage() {
  const [loading, setLoading] = useState(true);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [lang, setLang] = useState<'pt' | 'en' | 'es'>('pt');
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      const { data } = await supabase.from('warranties').select('*').order('name');
      if (data) setWarranties(data);
    }
    setLoading(false);
  };

  const generateCustomsPDF = () => {
    if (selectedItems.length === 0) {
      toast.error('Selecione itens para a mala.');
      return;
    }
    const doc = new jsPDF();
    const itemsToExport = warranties.filter(w => selectedItems.includes(w.id));

    const t = {
      pt: { title: 'Declaração de Bens para Alfândega', head: ['Item', 'S/N (Serial)', 'Valor', 'Data Compra', 'Loja'], sub: 'Documento auxiliar para comprovação de procedência.' },
      en: { title: 'Customs Asset Declaration', head: ['Asset', 'Serial Number', 'Value', 'Purchase Date', 'Source'], sub: 'Auxiliary document for proof of ownership and provenance.' },
      es: { title: 'Declaración de Bienes para Aduana', head: ['Bien', 'Número de Serie', 'Valor', 'Fecha de Compra', 'Origen'], sub: 'Documento auxiliar para la prueba de propiedad y origen.' }
    };

    const current = t[lang];

    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 45, 'F');
    doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.text(current.title.toUpperCase(), 14, 25);
    doc.setFontSize(10); doc.text(current.sub, 14, 35);

    doc.setTextColor(15, 23, 42); doc.text(`Owner: ${profile?.full_name} | Document: ${profile?.cpf || '---'}`, 14, 60);

    const tableData = itemsToExport.map(w => [
      w.name,
      w.serial_number || '---',
      `R$ ${Number(w.price).toLocaleString('pt-BR')}`,
      formatDate(w.purchase_date),
      w.store || '---'
    ]);

    autoTable(doc, {
      startY: 65,
      head: [current.head],
      body: tableData,
      headStyles: { fillColor: [5, 150, 105] },
      styles: { fontSize: 9 }
    });

    doc.save(`customs-declaration-${lang}.pdf`);
    toast.success(`Declaração em ${lang.toUpperCase()} gerada!`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Modo <span className="text-emerald-600">Viagem 2.0</span></h1>
          <p className="text-slate-500 font-medium">Documentação bilíngue para viagens internacionais.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <select 
            value={lang}
            onChange={(e) => setLang(e.target.value as any)}
            className="h-14 px-6 bg-white dark:bg-slate-900 border-2 border-teal-50 dark:border-white/5 rounded-2xl text-sm font-black uppercase focus:outline-none focus:border-emerald-500"
          >
            <option value="pt">Português (BR)</option>
            <option value="en">English (US)</option>
            <option value="es">Español (ES)</option>
          </select>
          <Button onClick={generateCustomsPDF} className="h-14 px-10 gap-2 font-black uppercase text-xs tracking-widest shadow-2xl shadow-emerald-500/20">
            <FileDown className="h-5 w-5" /> Exportar Guia Alfândega
          </Button>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4 sm:grid-cols-2 h-fit">
          {warranties.map((w) => (
            <motion.div 
              key={w.id} 
              onClick={() => setSelectedItems(prev => prev.includes(w.id) ? prev.filter(i => i !== w.id) : [...prev, w.id])}
              className={`p-6 rounded-[32px] border-2 cursor-pointer transition-all ${selectedItems.includes(w.id) ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 shadow-xl' : 'bg-white dark:bg-slate-900 border-teal-50 dark:border-white/5'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${selectedItems.includes(w.id) ? 'bg-emerald-600 text-white' : 'bg-slate-50 dark:bg-white/5 text-slate-400'}`}><Smartphone className="h-6 w-6" /></div>
                {selectedItems.includes(w.id) && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
              </div>
              <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter truncate">{w.name}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">S/N: {w.serial_number || 'REGISTRADO'}</p>
            </motion.div>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-10 relative overflow-hidden shadow-2xl group">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-1000"><Globe className="h-48 w-48 text-emerald-500" /></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest"><Languages className="h-4 w-4" /> Global Traveler</div>
              <h3 className="text-2xl font-black leading-tight uppercase tracking-tighter">Prepare-se para o <span className="text-emerald-400">Exterior.</span></h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed">Levar a prova de propriedade em Inglês evita barreiras de comunicação com autoridades alfandegárias no exterior.</p>
              <div className="pt-6 border-t border-white/5">
                <p className="text-[10px] font-black uppercase text-slate-500">Valor Protegido na Mala</p>
                <p className="text-3xl font-black text-white mt-1">R$ {warranties.filter(w => selectedItems.includes(w.id)).reduce((acc, curr) => acc + Number(curr.price), 0).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
