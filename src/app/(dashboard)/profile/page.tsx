'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, ShieldCheck, Mail, Fingerprint, Calendar, Loader2, Bell, Smartphone, Globe, Crown, ShieldAlert, Users, Plus, Trash2, FolderOpen, Heart, Anchor, Download, SmartphoneNfc, CreditCard, ExternalLink, Building2, Briefcase, HeartHandshake, FileBadge, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [warranties, setWarranties] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData || { full_name: '', cpf: '', profile_type: 'personal', legacy_enabled: false });
      
      const { data: items } = await supabase.from('warranties').select('*');
      if (items) setWarranties(items);
    }
    setLoading(false);
  };

  const generateSuccessionDossier = () => {
    if (!profile?.is_premium) {
      toast.error('O Dossiê de Sucessão é exclusivo para membros Pro!');
      return;
    }
    const doc = new jsPDF();
    doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 50, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text('INVENTÁRIO DE SUCESSÃO DIGITAL', 105, 25, { align: 'center' });
    doc.setFontSize(10); doc.text('DOCUMENTO PARA FINS DE TRANSMISSÃO PATRIMONIAL', 105, 35, { align: 'center' });

    doc.setTextColor(15, 23, 42); doc.setFontSize(14); doc.text('1. Identificação do Titular', 14, 65);
    doc.setFontSize(10); doc.text(`Titular: ${profile.full_name}`, 14, 72);
    doc.text(`CPF: ${profile.cpf || 'Não informado'}`, 14, 77);
    doc.text(`Herdeiro Designado: ${profile.legacy_contact_name || 'Não informado'}`, 14, 82);

    doc.setFontSize(14); doc.text('2. Lista de Bens e Ativos', 14, 95);
    const tableData = warranties.map(w => [w.name, w.folder, `R$ ${Number(w.price).toLocaleString('pt-BR')}`, w.serial_number || '---']);
    autoTable(doc, { startY: 100, head: [['Ativo', 'Localização/Pasta', 'Valor', 'Serial']], body: tableData, headStyles: { fillColor: [15, 23, 42] } });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text('Este documento consolida a existência física e digital de bens duráveis.', 14, finalY);
    doc.text('As notas fiscais originais estão custodiadas no Sistema Guardião de Notas.', 14, finalY + 6);

    doc.save(`dossie-sucessao-${profile.full_name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
    toast.success('Dossiê de Sucessão gerado com sucesso!');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('Configurações atualizadas!');
    } catch (err: any) { toast.error('Erro ao salvar.'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Gestão <span className="text-emerald-600">Patrimonial</span></h1>
          <p className="text-slate-500 font-medium">Configurações de conta e segurança de legado.</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700"><Heart className="h-32 w-32 text-red-500" /></div>
            <div className="relative z-10 space-y-4">
              <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Sucessão Digital</p>
              <h3 className="text-2xl font-black uppercase">Legado Ativo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Em caso de ausência, quem receberá o inventário do seu patrimônio?</p>
              <Button onClick={generateSuccessionDossier} variant="ghost" className="w-full bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase border border-white/10 h-12">Emitir Dossiê de Sucessão</Button>
            </div>
          </Card>

          <div className="p-8 rounded-[40px] bg-white dark:bg-slate-900 border border-teal-50 dark:border-white/5 shadow-xl space-y-4 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform duration-700"><Lock className="h-32 w-32 text-emerald-600" /></div>
            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase">Modo Seguro</h4>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Bloqueie pastas privadas ou oculte valores do Dashboard em ambientes públicos.</p>
            <Button variant="outline" className="w-full h-12 text-[10px] font-black uppercase tracking-widest">Configurar Privacy</Button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSave} className="space-y-8">
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-50 dark:border-white/5"><CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-black uppercase text-sm"><User className="h-5 w-5 text-emerald-600" /> Perfil do Titular</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Nome Completo" value={profile?.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} />
                  <Input label="CPF" value={profile?.cpf} onChange={(e) => setProfile({...profile, cpf: e.target.value})} />
                </div>

                <div className="pt-8 border-t border-slate-50 dark:border-white/5 space-y-6">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2"><HeartHandshake className="h-5 w-5 text-red-500" /> Herdeiro de Legado Digital</h3>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input label="Nome do Contato de Emergência" placeholder="Nome do herdeiro" value={profile?.legacy_contact_name} onChange={(e) => setProfile({...profile, legacy_contact_name: e.target.value})} />
                    <Input label="E-mail do herdeiro" placeholder="herdeiro@email.com" value={profile?.legacy_contact_email} onChange={(e) => setProfile({...profile, legacy_contact_email: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl">
                    <input type="checkbox" id="legacy" checked={profile?.legacy_enabled} onChange={(e) => setProfile({...profile, legacy_enabled: e.target.checked})} className="h-5 w-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    <label htmlFor="legacy" className="text-xs font-bold text-slate-600 dark:text-slate-300">Ativar Sucessão Digital Automática (Notificar contato em caso de inatividade)</label>
                  </div>
                </div>

                <div className="flex justify-end pt-4"><Button type="submit" disabled={saving} className="px-10 h-14 font-black uppercase text-xs tracking-widest">{saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}Salvar Legado</Button></div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
