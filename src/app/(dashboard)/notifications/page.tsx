'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bell, Check, Trash2, ShieldAlert, Info, Zap, Loader2, ArrowLeft, Filter, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const supabase = createClient();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      toast.success('Alerta marcado como lido.');
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Alerta removido.');
    }
  };

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (!error) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast.success('Todos os alertas marcados como lidos.');
      }
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-emerald-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 px-4 md:px-0">
      <header className="flex flex-col md:flex-row justify-between items-start gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-slate-900">Central de <span className="text-emerald-600">Alertas</span></h1>
          <p className="text-slate-500 font-medium">Fique por dentro de cada atualização do seu patrimônio.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={markAllRead} className="gap-2 border-emerald-100 text-emerald-700 font-bold">
            <CheckCircle2 className="h-4 w-4" /> Marcar tudo como lido
          </Button>
        </div>
      </header>

      {/* Filtros Rápidos */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-teal-50 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 text-teal-600 font-black text-[10px] whitespace-nowrap uppercase tracking-tighter">
          <Filter className="h-3.5 w-3.5" /> Filtrar:
        </div>
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap uppercase ${filter === 'all' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          Todos ({notifications.length})
        </button>
        <button 
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap uppercase ${filter === 'unread' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
        >
          Não Lidos ({notifications.filter(n => !n.read).length})
        </button>
      </div>

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-20 text-center space-y-4 glass rounded-[40px] border-2 border-dashed border-teal-100">
              <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Bell className="h-8 w-8" />
              </div>
              <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhum alerta encontrado</p>
            </motion.div>
          ) : (
            filteredNotifications.map((notif) => (
              <motion.div 
                key={notif.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className={`border-none shadow-md overflow-hidden group transition-all ${notif.read ? 'opacity-60 bg-white/50' : 'bg-white shadow-emerald-500/5 border-l-4 border-l-emerald-500'}`}>
                  <CardContent className="p-6 flex items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        notif.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                        notif.type === 'critical' ? 'bg-red-50 text-red-600' :
                        'bg-emerald-50 text-emerald-600'
                      }`}>
                        {notif.type === 'warning' ? <ShieldAlert className="h-6 w-6" /> : <Info className="h-6 w-6" />}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight leading-none">{notif.title}</h4>
                        <p className="text-slate-600 text-sm font-medium leading-relaxed">{notif.message}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(notif.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!notif.read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => markAsRead(notif.id)}
                          className="h-10 w-10 p-0 rounded-xl text-emerald-600 hover:bg-emerald-50"
                          title="Marcar como lido"
                        >
                          <Check className="h-5 w-5" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteNotification(notif.id)}
                        className="h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50"
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Footer Motivacional */}
      <footer className="text-center pt-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-[9px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20">
          <Zap className="h-3.5 w-3.5 text-emerald-400" /> O Guardião está sempre atento por você
        </div>
      </footer>
    </div>
  );
}
