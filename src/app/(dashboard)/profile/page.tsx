'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User, ShieldCheck, Mail, Fingerprint, Calendar, Loader2, Bell, Smartphone, Globe, Crown, ShieldAlert, Users, Plus, Trash2, FolderOpen, Heart, Anchor, Download, SmartphoneNfc, CreditCard, ExternalLink, Building2, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
      setProfile(profileData || { full_name: '', cpf: '', profile_type: 'personal', company_name: '', cnpj: '' });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) { toast.error('Erro ao salvar.'); } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Configurações</h1>
          <p className="text-slate-500 font-medium">Gerencie sua conta pessoal ou corporativa.</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-none shadow-xl bg-slate-900 text-white p-8 space-y-6 relative overflow-hidden group">
            <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700">
              {profile.profile_type === 'business' ? <Building2 className="h-32 w-32" /> : <User className="h-32 w-32" />}
            </div>
            <div className="relative z-10 space-y-4">
              <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Tipo de Conta</p>
              <h3 className="text-2xl font-black uppercase">{profile.profile_type === 'business' ? 'Guardião Business' : 'Guardião Pessoal'}</h3>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setProfile({...profile, profile_type: 'personal'})}
                  variant={profile.profile_type === 'personal' ? 'default' : 'ghost'}
                  className="flex-1 h-10 text-[9px] font-black uppercase tracking-widest"
                >Pessoal</Button>
                <Button 
                  onClick={() => setProfile({...profile, profile_type: 'business'})}
                  variant={profile.profile_type === 'business' ? 'default' : 'ghost'}
                  className="flex-1 h-10 text-[9px] font-black uppercase tracking-widest"
                >Business</Button>
              </div>
            </div>
          </Card>

          <div className="p-8 rounded-[40px] bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 space-y-4">
            <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-tighter flex items-center gap-2"><Briefcase className="h-4 w-4" /> Vantagem Business</h4>
            <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed font-medium">Ao ativar o modo Business, suas notas geram relatórios de depreciação contábil (mensal) para facilitar o balanço da sua empresa.</p>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <form onSubmit={handleSave} className="space-y-8">
            <Card className="border-none shadow-xl bg-white dark:bg-slate-900">
              <CardHeader className="border-b border-slate-50 dark:border-white/5"><CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white font-black uppercase text-sm"><Fingerprint className="h-5 w-5 text-emerald-600" /> Dados do Titular</CardTitle></CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid md:grid-cols-2 gap-6">
                  <Input label="Nome Completo / Administrador" value={profile?.full_name} onChange={(e) => setProfile({...profile, full_name: e.target.value})} />
                  <Input label="CPF do Titular" value={profile?.cpf} onChange={(e) => setProfile({...profile, cpf: e.target.value})} />
                </div>

                <AnimatePresence>
                  {profile.profile_type === 'business' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-6 border-t border-slate-50 dark:border-white/5 space-y-6 overflow-hidden">
                      <div className="grid md:grid-cols-2 gap-6">
                        <Input label="Razão Social / Nome Fantasia" value={profile?.company_name} onChange={(e) => setProfile({...profile, company_name: e.target.value})} />
                        <Input label="CNPJ da Empresa" value={profile?.cnpj} onChange={(e) => setProfile({...profile, cnpj: e.target.value})} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex justify-end pt-4"><Button type="submit" disabled={saving} className="px-10 h-14 font-black uppercase text-xs tracking-widest">{saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}Salvar Configurações</Button></div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}