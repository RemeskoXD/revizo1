'use client';

import { motion } from 'motion/react';
import { ReactNode } from 'react';

interface AnimatedItemProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function AnimatedItem({ children, delay = 0, className = '' }: AnimatedItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
