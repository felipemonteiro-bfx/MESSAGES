'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, UserPlus, ShieldCheck, Share2, Mail, Trash2, Loader2, ArrowRight, CheckCircle2, Heart, Home, Car, Smartphone, Briefcase, Lock, Crown, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function FamilySharingPage() {
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shares, setShares] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [inviteEmail, setEmail] = useState('');
  const [selectedFolder, setFolder] = useState('Casa');
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      
      const { data: shareData } = await supabase.from('folder_shares').select('*').order('created_at', { ascending: false });
      setShares(shareData || []);
    }
    setLoading(false);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.is_premium && shares.length >= 1) {
      toast.error('O compartilhamento de pastas é exclusivo para Planos Família!');
      return;
    }
    setSharing(true);
    try {
      const { error } = await supabase.from('folder_shares').insert({
        folder_name: selectedFolder,
        owner_id: profile.id,
        shared_with_email: inviteEmail,
        permission: 'editor'
      });
      if (error) throw error;
      toast.success(`Convite enviado para ${inviteEmail}!`);
      setEmail('');
      fetchData();
    } catch (err) { toast.error('Erro ao enviar convite.'); } finally { setSharing(false); }
  };

  const removeShare = async (id: string) => {
    const { error } = await supabase.from('folder_shares').delete().eq('id', id);
    if (!error) {
      setShares(prev => prev.filter(s => s.id !== id));
      toast.success('Acesso removido.');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Gestão <span className="text-emerald-600">Compartilhada</span></h1>
          <p className="text-slate-500 font-medium">Proteja o patrimônio de quem você ama com acesso colaborativo.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-slate-900/20">
          <Crown className="h-4 w-4 text-amber-400" /> Plano Família Ativo
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Lado Esquerdo: Formulário de Convite */}
        <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden h-fit">
          <div className="h-1.5 w-full bg-emerald-500" />
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black flex items-center gap-2 text-slate-900 dark:text-white uppercase tracking-tighter">
              <UserPlus className="h-5 w-5 text-emerald-600" /> Convidar Membro
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4">
            <form onSubmit={handleInvite} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Pasta Compartilhada</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Casa', 'Veículo', 'Trabalho', 'Viagem'].map(f => (
                    <button 
                      key={f} 
                      type="button"
                      onClick={() => setFolder(f)}
                      className={`h-12 rounded-xl text-[10px] font-black uppercase border-2 transition-all ${selectedFolder === f ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">E-mail do Familiar</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="email" 
                    placeholder="email@familiar.com" 
                    value={inviteEmail}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                  />
                </div>
              </div>
              <Button type="submit" disabled={sharing} className="w-full h-14 font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20">
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                Conceder Acesso
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lado Direito: Lista de Acessos Ativos */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Membros com Acesso ao Cofre
          </h3>
          
          <div className="grid gap-4">
            {shares.length === 0 ? (
              <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-12 text-center">
                <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                <p className="text-sm text-slate-400 font-bold uppercase">Nenhum compartilhamento ativo.</p>
              </Card>
            ) : (
              shares.map((share) => (
                <motion.div key={share.id} layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card className="border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden group">
                    <CardContent className="p-6 flex items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100 dark:border-emerald-500/20">
                          {share.folder_name === 'Casa' ? <Home className="h-6 w-6" /> : share.folder_name === 'Veículo' ? <Car className="h-6 w-6" /> : <Smartphone className="h-6 w-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tighter">{share.shared_with_email}</h4>
                            <span className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase">Editor</span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Pasta: <span className="text-emerald-600">{share.folder_name}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Status</p>
                          <p className="text-xs font-black text-emerald-600 uppercase">Acesso Ativo</p>
                        </div>
                        <Button onClick={() => removeShare(share.id)} variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>

          <Card className="border-none shadow-2xl bg-slate-900 text-white p-10 relative overflow-hidden group">
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-1000"><Heart className="h-48 w-48 text-red-500" /></div>
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase tracking-widest"><Star className="h-4 w-4" /> Inteligência Familiar</div>
              <h2 className="text-3xl font-black leading-tight max-w-xl uppercase tracking-tighter">O patrimônio da casa em <span className="text-emerald-400">harmonia total.</span></h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-2xl">O Plano Família permite que todos os moradores adicionem notas fiscais e fotos de vistoria no mesmo cofre, garantindo que em caso de sinistro, as provas estejam prontas para todos.</p>
              <Button variant="ghost" className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase h-12 border border-white/10 px-8 rounded-2xl">Gerar Relatório Familiar</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
