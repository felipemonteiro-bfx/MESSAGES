'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, ShieldCheck, Mail, Fingerprint, Calendar, Loader2, Bell, Smartphone, Globe, Crown, ShieldAlert, Users, Plus, Trash2, FolderOpen, Heart, Anchor, Download, SmartphoneNfc, CreditCard, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
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
      setProfile(profileData || { full_name: '', cpf: '', birth_date: '', is_premium: false });
    }
    setLoading(false);
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      const response = await fetch('/api/billing-portal', { method: 'POST' });
      const { url, error } = await response.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: any) {
      toast.error(err.message);
      setBillingLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('Perfil atualizado!');
    } catch (err: any) { toast.error('Erro ao salvar.'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Configurações</h1>
          <p className="text-slate-500 font-medium">Gestão de conta, pagamentos e privacidade.</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className={`border-none overflow-hidden relative ${profile?.is_premium ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-emerald-200' : 'bg-slate-900 text-white'}`}>
            <CardContent className="p-8 text-center space-y-6 relative z-10">
              <div className={`h-20 w-20 rounded-full mx-auto flex items-center justify-center shadow-2xl ${profile?.is_premium ? 'bg-white text-emerald-600' : 'bg-emerald-50 text-white'}`}>{profile?.is_premium ? <Crown className="h-10 w-10" /> : <ShieldCheck className="h-10 w-10" />}</div>
              <div>
                <h3 className="text-2xl font-black">{profile?.is_premium ? 'Membro Pro' : 'Plano Gratuito'}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">{profile?.is_premium ? 'Proteção Ativa' : 'Upgrade Disponível'}</p>
              </div>
              
              {profile?.is_premium && (
                <Button 
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                  className="w-full h-12 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-[10px] uppercase tracking-widest gap-2"
                >
                  {billingLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CreditCard className="h-3 w-3" />}
                  Gerenciar Assinatura
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="p-8 rounded-[40px] bg-white dark:bg-slate-900 border border-teal-50 dark:border-white/5 shadow-xl space-y-4 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:scale-110 transition-transform duration-700"><CreditCard className="h-32 w-32 text-emerald-600" /></div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><CreditCard className="h-5 w-5" /></div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">Pagamento</h4>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">Acesse o portal do Stripe para atualizar seus dados de cobrança, trocar cartão de crédito ou baixar recibos.</p>
            {profile?.is_premium ? (
              <Button onClick={handleManageBilling} variant="ghost" className="w-full h-12 text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-white/10 flex items-center gap-2">
                Abrir Portal Financeiro <ExternalLink className="h-3 w-3" />
              </Button>
            ) : (
              <Button onClick={() => window.location.href='/plans'} className="w-full h-12 text-[10px] font-black uppercase tracking-widest">Ver Planos Pro</Button>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSave} className="space-y-8">
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-50 dark:border-white/5"><CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-black uppercase text-sm"><User className="h-5 w-5 text-emerald-600" /> Perfil de Titular</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Nome Completo" value={profile?.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} />
                  <Input label="CPF" value={profile?.cpf} onChange={(e) => setProfile({...profile, cpf: e.target.value})} />
                  <Input label="Data de Nascimento" type="date" value={profile?.birth_date} onChange={(e) => setProfile({...profile, birth_date: e.target.value})} />
                </div>
                <div className="flex justify-end"><Button type="submit" disabled={saving} className="px-10 h-14 font-black uppercase text-xs tracking-widest">{saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}Salvar Perfil</Button></div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
