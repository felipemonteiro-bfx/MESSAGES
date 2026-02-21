'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Lock, Loader2, ArrowRight, User } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';
import { DEFAULT_AVATAR_URL } from '@/lib/constants';

interface AuthFormProps {
  type: 'login' | 'signup';
  onSuccess?: () => void;
  onSwitchMode?: () => void;
}

export const AuthForm = ({ type, onSuccess, onSwitchMode }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (type === 'signup') {
        // Validar nickname antes de criar conta
        const cleanNickname = nickname.toLowerCase().replace(/\s+/g, '_');
        if (!cleanNickname || cleanNickname.length < 3 || cleanNickname.length > 20) {
          throw new Error('Nickname deve ter entre 3 e 20 caracteres');
        }
        if (!/^[a-z0-9_]+$/.test(cleanNickname)) {
          throw new Error('Nickname deve conter apenas letras minúsculas, números e underscore');
        }

        // Verificar se nickname já existe ANTES de criar conta
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('nickname', cleanNickname)
          .single();
        
        if (existingProfile) {
          throw new Error('Este nickname já está em uso. Escolha outro.');
        }

        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            emailRedirectTo: undefined,
            data: { nickname: cleanNickname }
          },
        });
        if (error) throw error;

        if (signUpData.user) {
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            nickname: cleanNickname,
            avatar_url: `${DEFAULT_AVATAR_URL}?u=${signUpData.user.id}`,
          }, { onConflict: 'id' });
          
          if (profileError) {
            logger.error('Failed to create profile', profileError);
            if (profileError.code === '23505' || profileError.message?.includes('unique')) {
              throw new Error('Este nickname já está em uso. Escolha outro.');
            }
            throw profileError;
          }
          
          logger.info('Profile created successfully', { userId: signUpData.user.id, nickname: cleanNickname });
        }

        toast.success('Conta criada! Configure seu PIN de acesso.');
        if (onSuccess) {
          // Aguardar sessão ser estabelecida
          await new Promise(resolve => setTimeout(resolve, 500));
          onSuccess();
          router.refresh();
        } else {
          router.push('/');
          router.refresh();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        logger.info('User logged in successfully', { email });
        if (onSuccess) {
          onSuccess();
          router.refresh();
        } else {
          router.push('/');
          router.refresh();
        }
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
          {type === 'login' ? 'Bem-vindo de Volta' : 'Criar Conta'}
        </CardTitle>
        <p className="text-sm text-slate-500 font-medium">
          {type === 'signup'
            ? 'E-mail e nickname servem para outros usuários te encontrarem para conversar.'
            : 'Proteja suas comunicações com inteligência.'}
        </p>
      </CardHeader>
      <CardContent className="px-10 pb-12 space-y-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {type === 'signup' && (
            <Input 
              label="Nickname" 
              placeholder="Ex: shadow_runner" 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              required
              autoComplete="username"
              id="nickname-input"
            />
          )}
          <Input 
            label="E-mail" 
            type="email" 
            placeholder="seu@email.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            autoComplete={type === 'signup' ? 'email' : 'username'}
            id="email-input"
          />
          <Input 
            label="Senha" 
            type="password" 
            placeholder="••••••••" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            autoComplete={type === 'signup' ? 'new-password' : 'current-password'}
            id="password-input"
          />
          
          <Button type="submit" disabled={loading} className="w-full h-16 rounded-[24px] text-lg font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 group">
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (type === 'login' ? 'Entrar no Sistema' : 'Finalizar Cadastro')}
            {!loading && <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-all" />}
          </Button>
        </form>

        <footer className="text-center pt-4">
          <p className="text-xs text-slate-500 font-medium">
            {type === 'login' ? 'Ainda não tem conta?' : 'Já possui cadastro?'}
            {onSwitchMode ? (
              <button type="button" onClick={onSwitchMode} className="ml-2 text-emerald-600 font-black uppercase hover:underline">
                {type === 'login' ? 'Criar agora' : 'Fazer Login'}
              </button>
            ) : (
              <Link href={type === 'login' ? '/signup' : '/login'} className="ml-2 text-emerald-600 font-black uppercase hover:underline">
                {type === 'login' ? 'Criar agora' : 'Fazer Login'}
              </Link>
            )}
          </p>
        </footer>
      </CardContent>
    </Card>
  );
};
