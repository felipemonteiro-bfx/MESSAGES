'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { normalizeError, getUserFriendlyMessage, logError } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

interface AuthFormProps {
  type: 'login' | 'signup';
  /** Usado em modal: ao ter sucesso, chama callback em vez de redirecionar */
  onSuccess?: () => void;
  /** Em modal: alternar entre signup e login sem navegar */
  onSwitchMode?: () => void;
}

export const AuthForm = ({ type, onSuccess, onSwitchMode }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (type === 'signup') {
        // Signup sem confirmação de email - aceita qualquer email
        // IMPORTANTE: Para não receber emails, desabilite "Enable email confirmations" 
        // no Supabase Dashboard → Authentication → Settings → Email Auth
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: { 
            // Não enviar email de confirmação (mas Supabase ainda pode enviar se configurado no Dashboard)
            emailRedirectTo: undefined,
            // Desabilitar confirmação via opções (pode não funcionar se habilitado no Dashboard)
            email: {
              shouldCreateUser: true,
            },
            data: { 
              nickname: nickname.toLowerCase().replace(/\s+/g, '_')
            } 
          },
        });
        if (error) throw error;

        if (signUpData.user) {
          const cleanNickname = nickname.toLowerCase().replace(/\s+/g, '_');
          
          // Validar nickname antes de criar perfil
          if (!cleanNickname || cleanNickname.length < 3 || cleanNickname.length > 20) {
            throw new Error('Nickname deve ter entre 3 e 20 caracteres');
          }
          
          // Verificar se nickname já existe
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('nickname', cleanNickname)
            .single();
          
          if (existingProfile && existingProfile.id !== signUpData.user.id) {
            throw new Error('Este nickname já está em uso. Escolha outro.');
          }
          
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: signUpData.user.id,
            nickname: cleanNickname,
            avatar_url: `https://i.pravatar.cc/150?u=${signUpData.user.id}`,
          }, { onConflict: 'id' });
          
          if (profileError) {
            logger.error('Failed to create profile', profileError);
            // Se erro de nickname duplicado, informar usuário
            if (profileError.code === '23505' || profileError.message?.includes('unique')) {
              throw new Error('Este nickname já está em uso. Escolha outro.');
            }
            throw profileError;
          }
          
          logger.info('Profile created successfully', { userId: signUpData.user.id, nickname: cleanNickname });
          
          // Aguardar um pouco para garantir que a sessão está estabelecida
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Após cadastro, ir direto para o portal (não para /login)
        toast.success('Conta criada! Configure seu PIN de acesso.');
        if (onSuccess) {
          // Aguardar um pouco mais para garantir que o estado do usuário foi atualizado
          setTimeout(() => {
            onSuccess(); // Modal fecha e mostra PinPad
            router.refresh();
          }, 300);
        } else {
          // Se não for modal, redireciona para portal
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
            />
          )}
          <Input 
            label="E-mail" 
            type="text" 
            placeholder="qualquer@email.com (sem validação)" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            autoComplete="username"
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
