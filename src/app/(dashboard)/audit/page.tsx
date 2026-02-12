'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { History, ShieldCheck, FileText, Search, Filter, Loader2, ArrowLeft, Zap, Landmark, Clock, CheckCircle2, AlertCircle, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function AuditTrailPage() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([
    { id: 1, action: 'Selo de Integridade Gerado', item: 'Macbook Pro M3', type: 'security', date: '2026-02-10T09:45:00Z' },
    { id: 2, action: 'Dossiê Jurídico Exportado', item: 'iPhone 15 Pro', type: 'doc', date: '2026-02-09T14:20:00Z' },
    { id: 3, action: 'Nova Nota Fiscal Auditada', item: 'Geladeira Samsung', type: 'create', date: '2026-02-08T11:10:00Z' },
    { id: 4, action: 'Sincronização com Google Drive', item: 'Cofre Global', type: 'cloud', date: '2026-02-07T08:00:00Z' },
    { id: 5, action: 'Transferência de Propriedade', item: 'iPad Air', type: 'security', date: '2026-02-05T16:30:00Z' },
  ]);
  const supabase = createClient();

  useEffect(() => {
    // Em produção, carregaríamos da tabela system_logs
    setTimeout(() => setLoading(false), 1000);
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white uppercase tracking-tighter">Diário de <span className="text-emerald-600">Auditoria</span></h1>
          <p className="text-slate-500 font-medium">Rastro completo de segurança e integridade do seu patrimônio.</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-slate-900/20">
          <ShieldCheck className="h-4 w-4 text-emerald-400" /> Histórico Imutável
        </div>
      </header>

      {/* Overview de Atividade */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-1.5 bg-emerald-500" />
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Ações Monitoradas</p>
          <div className="text-4xl font-black text-slate-900 dark:text-white">128</div>
          <p className="text-[9px] text-emerald-600 font-bold uppercase mt-2 italic flex items-center gap-1"><Zap className="h-3 w-3" /> Auditadas por IA</p>
        </Card>
        <Card className="border-none shadow-xl bg-slate-900 text-white p-8 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700"><Fingerprint className="h-32 w-32" /></div>
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Selo de Integridade</p>
          <div className="text-4xl font-black">Ativo</div>
          <p className="text-[9px] text-emerald-400 font-bold uppercase mt-2">Segurança de ponta a ponta</p>
        </Card>
        <Card className="border-none shadow-xl bg-white dark:bg-slate-900 p-8 flex flex-col justify-center relative overflow-hidden">
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Tempo de Custódia</p>
          <div className="text-4xl font-black text-slate-900 dark:text-white">1.2 anos</div>
          <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 italic">Desde o primeiro registro</p>
        </Card>
      </div>

      <Card className="border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
        <CardHeader className="bg-slate-50 dark:bg-slate-800/50 p-8 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-black uppercase text-slate-400 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" /> Linha do Tempo de Segurança
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input type="text" placeholder="Filtrar eventos..." className="h-9 pl-10 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold focus:outline-none focus:border-emerald-500 transition-all" />
          </div>
        </CardHeader>
        <div className="p-0">
          <div className="divide-y divide-slate-50 dark:divide-white/5">
                        {logs.map((log) => (
                          <motion.div key={log.id} whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }} className="p-8 flex items-center justify-between gap-6 group">
                            <div className="flex items-start gap-6">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                    log.type === 'security' ? 'bg-red-50 text-red-600' :
                    log.type === 'doc' ? 'bg-cyan-50 text-cyan-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    {log.type === 'security' ? <ShieldCheck className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">{log.action}</h4>
                    <p className="text-slate-500 text-xs font-medium">Relacionado a: <span className="text-slate-700 dark:text-slate-300 font-bold uppercase text-[10px]">{log.item}</span></p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(log.date).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50">Ver Detalhes</Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Card>

      <footer className="text-center pt-6">
        <p className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.4em]">Certificado de Integridade Blockchain Ready v1.0</p>
      </footer>
    </div>
  );
}
