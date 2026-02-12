'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, ShieldCheck, Mail, Fingerprint, Calendar, Loader2, Bell, Smartphone, Globe, Crown, ShieldAlert, Users, Plus, Trash2, FolderOpen, Heart, Anchor, Download, SmartphoneNfc, CreditCard, ExternalLink, Building2, Briefcase, HeartHandshake, FileBadge, Lock, Timer, Zap, History, Key } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { usePanic } from '@/components/shared/PanicProvider';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [panicPw, setPanicPw] = useState('');
  const { setPanicPassword } = usePanic();
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
    const savedPw = localStorage.getItem('panic_password') || '1234';
    setPanicPw(savedPw);
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData || { 
        full_name: '', 
        cpf: '', 
        profile_type: 'personal', 
        legacy_enabled: false
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });
      if (error) throw error;
      
      // Salvar senha de pânico localmente
      setPanicPassword(panicPw);
      
      toast.success('Configurações atualizadas!');
    } catch (err: any) { toast.error('Erro ao salvar.'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Gestão <span className="text-emerald-600">Patrimonial</span></h1>
          <p className="text-slate-500 font-medium">Segurança, Legado e Configurações de Elite.</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          {/* NOVO: Gestão de Senha de Pânico */}
          <Card className="border-none shadow-xl bg-red-600 text-white p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700"><ShieldAlert className="h-32 w-32" /></div>
            <div className="relative z-10 space-y-4">
              <p className="text-[10px] font-black uppercase text-red-100 tracking-widest">Segurança Camaleão</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Senha de Desbloqueio</h3>
              <p className="text-xs text-red-50 leading-relaxed">Defina a senha necessária para sair do modo de camuflagem (Panic Mode).</p>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-300" />
                <input 
                  type="text" 
                  value={panicPw}
                  onChange={(e) => setPanicPw(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 bg-white/10 border border-white/20 rounded-xl font-black text-xl tracking-[0.3em] focus:outline-none focus:bg-white/20 transition-all"
                />
              </div>
            </div>
          </Card>

          <Card className="border-none shadow-xl bg-slate-900 text-white p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700"><Timer className="h-32 w-32 text-emerald-500" /></div>
            <div className="relative z-10 space-y-4">
              <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Sucessão Digital</p>
              <h3 className="text-2xl font-black uppercase tracking-tighter leading-none">Death Switch</h3>
              <p className="text-xs text-slate-400 leading-relaxed">Em caso de ausência prolongada, seu herdeiro receberá o acesso ao cofre.</p>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSave} className="space-y-8">
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="border-b border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/50">
                <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-black uppercase text-sm"><User className="h-5 w-5 text-emerald-600" /> Perfil Principal</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Nome Completo" value={profile?.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} />
                  <Input label="CPF de Segurança" value={profile?.cpf} onChange={(e) => setProfile({...profile, cpf: e.target.value})} />
                </div>

                <div className="pt-8 border-t border-slate-50 dark:border-white/5">
                  <div className="flex justify-end"><Button type="submit" disabled={saving} className="px-12 h-16 font-black uppercase text-xs tracking-widest shadow-2xl shadow-emerald-500/20">{saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}Salvar Todas as Configurações</Button></div>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
