'use client';

import { useState, useEffect, use } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ShieldCheck, Calendar, Store, DollarSign, ExternalLink, Package, Clock, Sparkles, NotebookPen, HeartHandshake, ArrowLeft, Pencil, History, Plus, Loader2, Trash2, Umbrella, Scale, CalendarPlus, TrendingDown, Wrench, CheckCircle2, AlertTriangle, Key, Globe, CreditCard, Hash, ShieldAlert, Fingerprint, Coins, ShieldBan, Info, FileText, Siren, Hammer, ArrowUpRight, TrendingUp, Scan, Camera, MapPin, Megaphone, ShoppingCart, Tag, BadgeCheck, Zap, Languages } from 'lucide-react';
import { formatDate, calculateExpirationDate, getDaysRemaining, generateICalLink } from '@/lib/utils/date-utils';
import Link from 'next/navigation';
import { notFound, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generatingDossier, setGeneratingDossier] = useState(false);
  const [dossierLang, setDossierLang] = useState<'pt' | 'en' | 'es'>('pt');
  const [warranty, setWarranty] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
    }
    const { data: warrantyData } = await supabase.from('warranties').select('*').eq('id', id).single();
    if (!warrantyData) return setWarranty(null);
    setWarranty(warrantyData);
    const { data: logData } = await supabase.from('maintenance_logs').select('*').eq('warranty_id', id).order('date', { ascending: false });
    setLogs(logData || []);
    setLoading(false);
  };

  const generateInternationalDossier = () => {
    if (!profile?.is_premium) {
      toast.error('Dossiês Multilíngues são exclusivos para membros Pro!');
      return;
    }
    setGeneratingDossier(true);
    try {
      const doc = new jsPDF();
      const integrityHash = `GRD-GLO-${id.substring(0, 8).toUpperCase()}`;

      const translations = {
        en: { title: 'CERTIFICATE OF AUTHENTICITY', sub: 'GLOBAL ASSET CUSTODY & PROVENANCE REPORT', label: 'Product', cat: 'Category', date: 'Acquisition Date', store: 'Source / Store', sn: 'Serial Number', status: 'Status', history: 'Technical Maintenance History', fact: 'Proven Fact', footer: 'This document certifies digital ownership and condition. Audit verified by Guardião System.' },
        es: { title: 'CERTIFICADO DE AUTENTICIDAD', sub: 'INFORME GLOBAL DE CUSTODIA Y PROCEDENCIA', label: 'Producto', cat: 'Categoría', date: 'Fecha de Adquisición', store: 'Origen / Tienda', sn: 'Número de Serie', status: 'Estado', history: 'Historial de Mantenimiento Técnico', fact: 'Hecho Comprobado', footer: 'Este documento certifica la propiedad y condición digital. Auditoría verificada por el Sistema Guardião.' },
        pt: { title: 'CERTIFICADO DE PROCEDÊNCIA', sub: 'RELATÓRIO GLOBAL DE CUSTÓDIA E AUTENTICIDADE', label: 'Produto', cat: 'Categoria', date: 'Data de Aquisição', store: 'Origem / Loja', sn: 'Número de Série', status: 'Status', history: 'Histórico de Manutenção Técnica', fact: 'Fato Comprovado', footer: 'Este documento certifica a posse e condição digital. Auditoria verificada pelo Sistema Guardião.' }
      };

      const t = translations[dossierLang];

      // Header Premium Dark
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 50, 'F');
      doc.setTextColor(16, 185, 129); doc.setFontSize(22); doc.text(t.title, 14, 25);
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.text(t.sub, 14, 35);
      doc.text(`Digital Protocol: ${integrityHash}`, 14, 42);

      // Body
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14); doc.text(t.label, 14, 65);
      
      const basicData = [
        [t.label, warranty.name],
        [t.cat, warranty.category || 'General'],
        [t.date, formatDate(warranty.purchase_date)],
        [t.store, warranty.store || 'Verified via Invoice'],
        [t.sn, warranty.serial_number || 'REGISTERED'],
        [t.status, 'Verified / Debt Free']
      ];

      autoTable(doc, { startY: 70, body: basicData, theme: 'plain', styles: { fontSize: 10 } });

      doc.setFontSize(14); doc.text(t.history, 14, (doc as any).lastAutoTable.finalY + 15);
      const logData = logs.map(l => [formatDate(l.date), l.description, t.fact]);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Date', 'Description', 'Nature']],
        body: logData.length > 0 ? logData : [['---', 'No technical records', '---']],
        headStyles: { fillColor: [15, 23, 42] }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 30;
      doc.setFillColor(248, 250, 252); doc.rect(14, finalY, 182, 30, 'F');
      doc.setFontSize(8); doc.setTextColor(100);
      doc.text(t.footer, 20, finalY + 12);
      doc.text(`Issuer: Guardião de Notas Intelligence v11.8 | Hash: ${integrityHash}`, 20, finalY + 20);

      doc.save(`global-dossier-${dossierLang}-${warranty.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success(`Dossiê em ${dossierLang.toUpperCase()} gerado!`);
    } catch (err) {
      toast.error('Erro ao gerar dossiê.');
    } finally {
      setGeneratingDossier(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;
  if (!warranty) notFound();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-center">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-emerald-600 transition-all"><ArrowLeft className="h-4 w-4" /> Voltar</button>
        <div className="flex gap-2">
          <Link href={`/products/edit/${warranty.id}`}><Button variant="outline" size="sm" className="gap-2 border-teal-100 font-bold">Editar</Button></Link>
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">{warranty.name}</h1>
        <p className="text-xl text-slate-500 font-medium">{warranty.category || 'Geral'} • {warranty.folder}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Módulo de Dossiê Multilíngue (Global Reach) */}
          <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden group">
            <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700"><Globe className="h-48 w-48 text-emerald-500" /></div>
            <CardContent className="p-10 relative z-10 space-y-8">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]"><Languages className="h-4 w-4" /> Global Documentation</div>
              <div className="space-y-2">
                <h3 className="text-3xl font-black leading-tight uppercase tracking-tighter">Certificado <span className="text-emerald-400">Internacional.</span></h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xl">Vai vender para o exterior ou levar em viagem? Emita seu dossiê de procedência em Inglês ou Espanhol para aceitação global.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <select 
                  value={dossierLang}
                  onChange={(e) => setDossierLang(e.target.value as any)}
                  className="h-14 px-6 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500 transition-all w-full sm:w-auto"
                >
                  <option value="pt" className="text-slate-900">Português (BR)</option>
                  <option value="en" className="text-slate-900">English (US)</option>
                  <option value="es" className="text-slate-900">Español (ES)</option>
                </select>
                <Button 
                  onClick={generateInternationalDossier} 
                  disabled={generatingDossier}
                  className="w-full sm:w-auto h-14 px-10 bg-emerald-600 hover:bg-emerald-500 font-black text-[10px] uppercase tracking-widest gap-2 shadow-xl shadow-emerald-900/20"
                >
                  {generatingDossier ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Gerar Dossiê Global
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8">
            <CardHeader className="p-0 mb-8"><CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /> Log de Vida</CardTitle></CardHeader>
            <div className="space-y-6">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 items-start group">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0"><CheckCircle2 className="h-4 w-4" /></div>
                  <div className="pt-1"><p className="text-sm font-black text-slate-900 dark:text-slate-200">{log.description}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(log.date)}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-slate-900 text-white border-none p-8 relative overflow-hidden shadow-2xl">
            <TrendingDown className="h-8 w-8 text-emerald-400 mb-4" /><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Market Value</p>
            <div className="text-4xl font-black text-white mt-1">R$ {(Number(warranty.price || 0) * 0.85).toLocaleString('pt-BR')}</div>
          </Card>
          
          <div className="p-8 rounded-[40px] bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-xl space-y-4">
            <Umbrella className="h-8 w-8 opacity-20" /><h4 className="text-xl font-black leading-tight text-white uppercase tracking-tighter">Active Protection</h4><p className="text-xs font-medium text-emerald-100">Your assets are digitalized and audit-ready.</p>
            <Button variant="ghost" className="w-full bg-white text-emerald-700 font-black text-[10px] uppercase py-4 shadow-lg">Get Pro Certificate</Button>
          </div>
        </div>
      </div>
    </div>
  );
}