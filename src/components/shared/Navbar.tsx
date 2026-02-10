'use client';

import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { Plus, LogOut, LayoutDashboard, User, Sparkles, Crown, Bell, X, Check, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const Navbar = () => {
  const router = useRouter();
  const supabase = createClient();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const logoUrl = "https://lh3.googleusercontent.com/gg-dl/AOI_d_9yfHBtXafzC8T3snFo7GdIXq6HQDLrt7Z5UxvjYWabsrwlj0P8aBncqzU2Ovv-1swtO5xi4N4ASTShjz3534eDjmZkVM-5XpKtkgZOgKZCfKpV3R-f4L2vd4ROx6xEZznyzv0oVwwV508ew19R7APwkVR_qqSSXJtDnNWguraFqE-xLQ=s1024-rj";

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('read', false)
        .order('created_at', { ascending: false });
      if (data) setNotifications(data);
    }
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success('Alerta arquivado.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <nav className="sticky top-4 z-50 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl shadow-emerald-500/10">
        <Link href="/dashboard" className="flex items-center gap-2 group">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-lg group-hover:scale-110 transition-transform">
            <Image src={logoUrl} alt="Logo Guardião" fill className="object-cover" unoptimized />
          </div>
          <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-900 to-teal-700">
            Guardião<span className="text-emerald-600 text-2xl">.</span>
          </span>
        </Link>
        
        <div className="flex items-center gap-1 sm:gap-3">
          <Link href="/dashboard" className="hidden md:block">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-slate-600">
              <LayoutDashboard className="h-4 w-4 text-emerald-600" /> Painel
            </Button>
          </Link>
          <Link href="/analytics" className="hidden md:block">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-slate-600">
              <BarChart3 className="h-4 w-4 text-emerald-600" /> Análises
            </Button>
          </Link>
          <Link href="/support" className="hidden md:block">
            <Button variant="ghost" size="sm" className="gap-2 font-bold text-slate-600">
              <Scale className="h-4 w-4 text-emerald-600" /> Suporte
            </Button>
          </Link>
          
          <div className="relative">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative h-10 w-10 p-0 rounded-xl hover:bg-emerald-50"
            >
              <Bell className={`h-5 w-5 ${notifications.length > 0 ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
              )}
            </Button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-4 w-80 glass rounded-3xl shadow-2xl border border-teal-50 overflow-hidden z-50"
                >
                  <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Notificações</span>
                    <button onClick={() => setShowNotifications(false)}><X className="h-4 w-4 text-slate-400" /></button>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-2 space-y-2 no-scrollbar bg-slate-50/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <p className="text-xs font-bold uppercase">Tudo em dia!</p>
                        <p className="text-[10px] mt-1">Nenhum alerta pendente.</p>
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div key={notif.id} className="p-3 bg-white rounded-2xl border border-teal-50 shadow-sm flex items-start justify-between gap-3 group">
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-emerald-600 uppercase">{notif.title}</p>
                            <p className="text-xs font-medium text-slate-600 leading-tight">{notif.message}</p>
                          </div>
                          <button 
                            onClick={() => markAsRead(notif.id)}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-emerald-600 hover:text-white"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link href="/consultant" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl hover:bg-emerald-50">
              <Sparkles className="h-5 w-5 text-emerald-600" />
            </Button>
          </Link>

          <Link href="/plans">
            <Button size="sm" className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hidden sm:flex">
              <Crown className="h-3.5 w-3.5 mr-2" /> Upgrade
            </Button>
          </Link>

          <div className="w-px h-6 bg-teal-100 mx-1 hidden sm:block" />
          
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl text-slate-600 hover:bg-emerald-50">
              <User className="h-5 w-5 text-emerald-600" />
            </Button>
          </Link>
          
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-10 w-10 p-0 rounded-xl text-red-500 hover:bg-red-50">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
};