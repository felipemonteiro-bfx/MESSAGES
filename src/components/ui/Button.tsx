'use client';

import { cn } from '@/lib/utils/cn';
import { ButtonHTMLAttributes, useEffect, useState, memo } from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = memo(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  ...props 
}: ButtonProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const variants = {
    primary: 'bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300',
    secondary: 'bg-cyan-900 text-white hover:bg-cyan-800',
    outline: 'border-2 border-teal-100 hover:border-emerald-600 hover:text-emerald-600 bg-transparent',
    ghost: 'hover:bg-teal-50 text-teal-700',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const classes = cn(
    'inline-flex items-center justify-center rounded-xl font-semibold transition-all focus:outline-none disabled:opacity-50 disabled:pointer-events-none active:scale-95',
    variants[variant],
    sizes[size],
    className
  );

  if (!isMounted) {
    return <button className={classes} {...props} />;
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      className={classes}
      {...(props as any)}
    />
  );
});

Button.displayName = 'Button';