'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, ShieldCheck, Mail, Fingerprint, Calendar, Loader2, Bell, Smartphone, Globe, Crown, ShieldAlert, Users, Plus, Trash2, FolderOpen, Heart, Anchor, Download, SmartphoneNfc, CreditCard, ExternalLink, Building2, Briefcase, HeartHandshake, FileBadge, Lock, MessageCircleCode, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData || { full_name: '', cpf: '', whatsapp_number: '', notify_whatsapp: false, profile_type: 'personal' });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('Configurações salvas! Canal WhatsApp ativo.');
    } catch (err: any) { toast.error('Erro ao salvar.'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Gestão <span className="text-emerald-600">Pro</span></h1>
          <p className="text-slate-500 font-medium">Configure seus canais de segurança e comunicação.</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sidebar: Status do Zap Guardião */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl bg-emerald-600 text-white p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700"><MessageCircleCode className="h-32 w-32" /></div>
            <div className="relative z-10 space-y-4">
              <p className="text-[10px] font-black uppercase text-emerald-100 tracking-widest">Zap Guardião</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter">Alertas no WhatsApp</h3>
              <p className="text-xs text-emerald-50 leading-relaxed">Receba PDFs de dossiês e avisos de garantia expirando direto no seu celular.</p>
              <div className={`mt-4 px-4 py-2 rounded-xl text-[10px] font-black uppercase inline-flex items-center gap-2 ${profile?.notify_whatsapp ? 'bg-white text-emerald-600' : 'bg-emerald-700 text-emerald-200'}`}>
                {profile?.notify_whatsapp ? <CheckCircle2 className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {profile?.notify_whatsapp ? 'Canal Ativo' : 'Aguardando Ativação'}
              </div>
            </div>
          </Card>

          <div className="p-8 rounded-[40px] bg-slate-900 text-white border-none shadow-xl space-y-4 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform duration-700"><ShieldCheck className="h-32 w-32 text-emerald-500" /></div>
            <h4 className="text-lg font-black uppercase tracking-tighter">Segurança 2FA</h4>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">Ative a proteção em duas etapas para garantir que ninguém acesse seu cofre sem autorização.</p>
            <Button variant="ghost" className="w-full bg-white/10 text-white font-black text-[10px] uppercase h-12 border border-white/10">Configurar 2FA</Button>
          </div>
        </div>

        {/* Formulário de Comunicação */}
        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSave} className="space-y-8">
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-black uppercase text-sm"><Smartphone className="h-5 w-5 text-emerald-600" /> Canais de Notificação</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-10">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp (Com DDD)</label>
                    <div className="relative">
                      <MessageCircleCode className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                      <input 
                        type="text" 
                        placeholder="Ex: 11999999999"
                        value={profile?.whatsapp_number}
                        onChange={(e) => setProfile({...profile, whatsapp_number: e.target.value})}
                        className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-2 border-teal-50 dark:border-white/5 rounded-2xl focus:outline-none focus:border-emerald-500 font-bold text-slate-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-center space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status do Serviço</p>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-500/20">
                      <input 
                        type="checkbox" 
                        id="notify_zap" 
                        checked={profile?.notify_whatsapp} 
                        onChange={(e) => setProfile({...profile, notify_whatsapp: e.target.checked})}
                        className="h-6 w-6 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                      />
                      <label htmlFor="notify_zap" className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-tighter cursor-pointer">Ativar Notificações no WhatsApp</label>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-50 dark:border-white/5">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input label="Nome Completo" value={profile?.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} />
                    <Input label="CPF de Segurança" value={profile?.cpf} onChange={(e) => setProfile({...profile, cpf: e.target.value})} />
                  </div>
                </div>

                <div className="flex justify-end"><Button type="submit" disabled={saving} className="px-12 h-16 font-black uppercase text-xs tracking-widest shadow-2xl shadow-emerald-500/20">{saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}Salvar Configurações</Button></div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}