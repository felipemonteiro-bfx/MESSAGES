'use client';

import { cn } from '@/lib/utils/cn';
import { ReactNode, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card = ({ children, className, onClick }: CardProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const classes = cn('glass rounded-2xl overflow-hidden', className);

  if (!isMounted) {
    return <div className={classes} onClick={onClick}>{children}</div>;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={classes}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('p-6 pb-4', className)}>{children}</div>
);

export const CardTitle = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h3 className={cn('text-xl font-bold tracking-tight text-slate-900', className)}>{children}</h3>
);

export const CardContent = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn('p-6 pt-0', className)}>{children}</div>
);
