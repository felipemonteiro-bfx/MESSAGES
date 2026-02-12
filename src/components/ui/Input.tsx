import { cn } from '@/lib/utils/cn';
import { InputHTMLAttributes, memo } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = memo(({ label, className, ...props }: InputProps) => {
  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>}
      <input
        className={cn(
          'flex h-12 w-full rounded-xl border-2 border-slate-100 bg-white px-4 py-2 text-sm transition-all placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';