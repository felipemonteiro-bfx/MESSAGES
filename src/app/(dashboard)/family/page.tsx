'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Users, UserPlus, ShieldCheck, Mail, Crown, Trash2, Loader2, Star, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function FamilyHubPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [members, setMessages] = useState<any[]>([
    { id: 1, name: 'Você (Titular)', email: '', role: 'Admin', status: 'Ativo', score: 95 },
    { id: 2, name: 'Cônjuge', email: 'ana@exemplo.com', role: 'Editor', status: 'Ativo', score: 88 },
    { id: 3, name: 'Filho(a)', email: 'pedro@exemplo.com', role: 'Visualizador', status: 'Pendente', score: 0 },
  ]);
  const supabase = createClient();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      // Atualizar email do titular na lista fake
      setMessages(prev => prev.map(m => m.id === 1 ? { ...m, email: user.email } : m));
    }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  if (!profile?.is_premium) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-8">
        <div className="h-24 w-24 bg-emerald-100 rounded-[40px] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-200">
          <Users className="h-12 w-12 text-emerald-600" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestão <span className="text-emerald-600">Familiar</span></h1>
          <p className="text-slate-500 max-w-lg mx-auto font-medium">Proteja os bens de toda a sua família em um único painel. O plano Família permite até 5 usuários integrados.</p>
        </div>
        <Link href="/plans">
          <Button size="lg" className="h-16 px-12 text-lg">Conhecer Plano Família</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Centro <span className="text-emerald-600">Familiar</span></h1>
          <p className="text-slate-500 font-medium text-sm">Gerencie o patrimônio e acessos de toda a sua casa.</p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" className="gap-2 font-black text-[10px] uppercase tracking-widest h-12 px-6">
            <UserPlus className="h-4 w-4" /> Convidar Membro
          </Button>
        </div>
      </header>

      {/* Resumo da Família */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-slate-900 text-white border-none p-8 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Saúde da Casa</p>
          <div className="text-4xl font-black text-emerald-400">92%</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Proteção média do grupo</p>
        </Card>
        <Card className="border-teal-50 bg-white shadow-xl p-8 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total de Itens</p>
          <div className="text-4xl font-black text-slate-900">24</div>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Notas somadas do grupo</p>
        </Card>
        <Card className="border-teal-50 bg-white shadow-xl p-8 flex flex-col justify-center">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Vagas Restantes</p>
          <div className="text-4xl font-black text-emerald-600">2 <span className="text-sm text-slate-300">/ 5</span></div>
          <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">No Plano Família atual</p>
        </Card>
      </div>

      <Card className="border-none shadow-xl overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase text-slate-400">Membros da Família</CardTitle>
          <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Grupo Protegido
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-50">
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Nome / E-mail</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Papel</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Score Indiv.</th>
                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {members.map(member => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{member.name}</p>
                        <p className="text-xs font-medium text-slate-400">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                      {member.role}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase ${member.status === 'Ativo' ? 'text-emerald-600' : 'text-amber-500'}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${member.status === 'Ativo' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                      {member.status}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${member.score}%` }} />
                      </div>
                      <span className="text-xs font-black text-slate-700">{member.score}%</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {member.id !== 1 && (
                      <button className="text-slate-300 hover:text-red-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="p-10 glass rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-8 border-2 border-emerald-100 bg-emerald-50/20">
        <div className="flex items-center gap-6 text-left">
          <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-xl shadow-emerald-200">
            <Star className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Privilégios Família</h3>
            <p className="text-sm text-slate-500 font-medium">As notas fiscais compartilhadas por dependentes aparecem automaticamente no seu Balanço Patrimonial consolidado.</p>
          </div>
        </div>
        <Button variant="ghost" className="bg-white text-emerald-700 font-black text-[10px] uppercase tracking-widest px-8 h-12 rounded-xl shadow-sm">Ver Relatório do Grupo</Button>
      </div>
    </div>
  );
}
