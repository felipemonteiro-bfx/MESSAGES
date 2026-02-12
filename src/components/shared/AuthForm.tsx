'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Mail, Lock, Loader2, ArrowRight, Chrome, Github, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

export const AuthForm = ({ type }: { type: 'login' | 'signup' }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setSocialLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      logger.info('Google OAuth initiated');
    } catch (err) {
      const appError = normalizeError(err);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
      setSocialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (type === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            data: { 
              full_name: fullName,
              nickname: nickname.toLowerCase().replace(/\s+/g, '_')
            } 
          },
        });
        if (error) throw error;
        toast.success('Conta criada! Verifique seu e-mail.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        logger.info('User logged in successfully', { email });
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      const appError = normalizeError(err);
      logError(appError);
      toast.error(getUserFriendlyMessage(appError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-none shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[40px] overflow-hidden">
      <div className="h-2 w-full bg-emerald-600" />
      <CardHeader className="pt-10 pb-6 text-center space-y-2">
        <CardTitle className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase">
          {type === 'login' ? 'Bem-vindo de Volta' : 'Criar Conta Elite'}
        </CardTitle>
        <p className="text-sm text-slate-500 font-medium">Proteja suas comunicações com inteligência.</p>
      </CardHeader>
      <CardContent className="px-10 pb-12 space-y-8">
        
        <div className="space-y-3">
          <Button 
            onClick={handleGoogleLogin} 
            disabled={socialLoading}
            variant="outline" 
            className="w-full h-14 rounded-2xl border-2 border-slate-100 dark:border-white/5 font-bold gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
          >
            {socialLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Chrome className="h-5 w-5 text-red-500" />}
            Continuar com Google
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100 dark:border-white/5" /></div>
          <div className="relative flex justify-center text-[10px] font-black uppercase"><span className="bg-white dark:bg-slate-900 px-4 text-slate-400">Ou use seu e-mail</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {type === 'signup' && (
            <>
              <Input 
                label="Nome Completo" 
                placeholder="Ex: Felipe Monteiro" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
              />
              <Input 
                label="Nickname Secreto" 
                placeholder="Ex: shadow_runner" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                required 
              />
            </>
          )}
          <Input 
            label="E-mail" 
            type="email" 
            placeholder="seu@email.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
          <Input 
            label="Senha" 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          
          <Button type="submit" disabled={loading} className="w-full h-16 rounded-[24px] text-lg font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 group">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (type === 'login' ? 'Entrar no Sistema' : 'Finalizar Cadastro')}
            {!loading && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-all" />}
          </Button>
        </form>

        <footer className="text-center pt-4">
          <p className="text-xs text-slate-500 font-medium">
            {type === 'login' ? 'Ainda não tem conta?' : 'Já possui cadastro?'}
            <Link href={type === 'login' ? '/signup' : '/login'} className="ml-2 text-emerald-600 font-black uppercase hover:underline">
              {type === 'login' ? 'Criar agora' : 'Fazer Login'}
            </Link>
          </p>
        </footer>
      </CardContent>
    </Card>
  );
};
