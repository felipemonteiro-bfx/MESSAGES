'use client';

import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  nickname?: string;
}

export default function TypingIndicator({ nickname }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500"
              animate={{ y: [0, -4, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
        {nickname && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
            {nickname} digitando...
          </span>
        )}
      </div>
    </motion.div>
  );
}
