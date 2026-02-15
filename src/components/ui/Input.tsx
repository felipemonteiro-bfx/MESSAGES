import { cn } from '@/lib/utils/cn';
import { InputHTMLAttributes, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className, id: propId, ...props }, ref) => {
  const generatedId = useId();
  const inputId = propId || generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={errorId}
        className={cn(
          'flex h-12 w-full rounded-xl border-2 bg-white dark:bg-slate-800 px-4 py-2 text-sm transition-all placeholder:text-slate-400 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
            : 'border-slate-100 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/10',
          className
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-500 ml-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
