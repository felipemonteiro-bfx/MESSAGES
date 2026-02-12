import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <Loader2 className={cn('animate-spin text-emerald-600', sizeClasses[size])} />
      {text && (
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{text}</p>
      )}
    </div>
  );
}

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 shadow-2xl">
        <LoadingSpinner size="lg" text={text || 'Carregando...'} />
      </div>
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0e1621]">
      <LoadingSpinner size="lg" text="Carregando..." />
    </div>
  );
}
