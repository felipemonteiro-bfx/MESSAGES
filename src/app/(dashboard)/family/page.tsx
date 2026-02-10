'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, UserPlus, ShieldCheck, Mail, Crown, Trash2, Loader2, Star, CheckCircle2, FolderOpen, Share2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function FamilyHubPage() {
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [shares, setShares] = useState<any[]>([]);
  const [newShare, setNewShare] = useState({ email: '', folder: 'Casa' });
  const supabase = createClient();

  const folders = ['Pessoal', 'Trabalho', 'Casa', 'Veículo', 'Eletrônicos', 'Outros'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(profileData);
      
      const { data: shareData } = await supabase
        .from('folder_shares')
        .select('*')
        .eq('owner_id', user.id);
      setShares(shareData || []);
    }
    setLoading(false);
  };

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.is_premium) {
      toast.error('Compartilhamento de pastas é exclusivo do Plano Família!');
      return;
    }
    setSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('folder_shares').insert({
        owner_id: user?.id,
        folder_name: newShare.folder,
        shared_with_email: newShare.email.toLowerCase(),
      });

      if (error) throw error;
      toast.success(`Pasta ${newShare.folder} compartilhada com ${newShare.email}`);
      setNewShare({ email: '', folder: 'Casa' });
      fetchData();
    } catch (err: any) {
      toast.error('Erro ao compartilhar. Verifique os dados.');
    } finally {
      setSharing(false);
    }
  };

  const revokeShare = async (id: string) => {
    const { error } = await supabase.from('folder_shares').delete().eq('id', id);
    if (!error) {
      toast.success('Acesso revogado com sucesso.');
      fetchData();
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  if (!profile?.is_premium) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200">
          <Users className="h-12 w-12 text-emerald-600" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Gestão <span className="text-emerald-600">Familiar</span></h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto font-medium">Compartilhe pastas inteiras com sua família e gerencie o patrimônio de forma colaborativa. Recurso exclusivo Pro/Família.</p>
        </div>
        <Link href="/plans"><Button size="lg" className="h-16 px-12 text-lg shadow-xl shadow-emerald-500/20">Ativar Plano Família</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Centro <span className="text-emerald-600">Familiar</span></h1>
          <p className="text-slate-500 font-medium text-sm">Gerencie quem pode acessar suas pastas de notas fiscais.</p>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Formulário de Novo Compartilhamento */}
        <Card className="lg:col-span-1 border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden h-fit">
          <div className="h-1.5 w-full bg-emerald-500" />
          <CardHeader className="p-8 pb-4"><CardTitle className="text-lg font-black flex items-center gap-2 text-slate-900 dark:text-white"><Share2 className="h-5 w-5 text-emerald-600" /> Compartilhar Pasta</CardTitle></CardHeader>
          <CardContent className="p-8 pt-0">
            <form onSubmit={handleCreateShare} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail do Membro</label>
                <Input placeholder="exemplo@email.com" type="email" value={newShare.email} onChange={(e) => setNewShare({...newShare, email: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pasta para Liberar</label>
                <select 
                  value={newShare.folder}
                  onChange={(e) => setNewShare({...newShare, folder: e.target.value})}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-800 border-2 border-teal-50 dark:border-white/5 rounded-xl focus:outline-none focus:border-emerald-500 text-sm font-bold text-slate-700 dark:text-slate-200"
                >
                  {folders.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <Button type="submit" disabled={sharing} className="w-full h-14 font-black uppercase text-xs tracking-widest gap-2">
                {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Enviar Convite
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Acessos Ativos */}
        <Card className="lg:col-span-2 border-none shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
          <CardHeader className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-white/5">
            <CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Acessos Ativos no seu Cofre
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-white/5">
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Membro</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Pasta Compartilhada</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Data</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {shares.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic text-sm">Nenhuma pasta compartilhada ainda.</td>
                  </tr>
                ) : (
                  shares.map((share) => (
                    <tr key={share.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-8 py-6 font-bold text-slate-900 dark:text-slate-200 text-sm">{share.shared_with_email}</td>
                      <td className="px-8 py-6">
                        <span className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                          {share.folder_name}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-slate-400 text-xs">{new Date(share.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-8 py-6 text-right">
                        <Button 
                          variant="ghost" 
                          onClick={() => revokeShare(share.id)}
                          className="h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="p-10 glass rounded-[40px] bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group shadow-2xl">
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10 group-hover:scale-110 transition-transform duration-1000"><Star className="h-48 w-48 text-emerald-500" /></div>
        <div className="flex items-center gap-6 relative z-10">
          <div className="h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/20"><Crown className="h-8 w-8 text-white" /></div>
          <div className="space-y-1">
            <h3 className="text-2xl font-black uppercase tracking-tighter">Privilégios de Administrador</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-lg">Você possui controle total. Somente o administrador do plano pode criar novos compartilhamentos ou revogar acessos críticos.</p>
          </div>
        </div>
        <Button variant="ghost" className="bg-white/10 hover:bg-white/20 text-white font-black text-[10px] uppercase tracking-widest px-8 h-14 rounded-2xl border border-white/10 relative z-10">Ver Relatório de Acessos</Button>
      </div>
    </div>
  );
}