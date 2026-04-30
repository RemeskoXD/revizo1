'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const TYPE_CONFIG = {
  info: { icon: Info, bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400' },
  warning: { icon: AlertTriangle, bg: 'bg-orange-500/10 border-orange-500/20', text: 'text-orange-400' },
  error: { icon: XCircle, bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400' },
};

export function GlobalBanner() {
  const [banner, setBanner] = useState<{ message: string; type: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch('/api/banner')
      .then(r => r.json())
      .then(data => {
        if (data.message) setBanner(data);
      })
      .catch(() => {});
  }, []);

  if (!banner?.message || dismissed) return null;

  const config = TYPE_CONFIG[banner.type as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.info;
  const Icon = config.icon;

  return (
    <div className={cn("border-b px-4 py-2.5 flex items-center gap-3", config.bg)}>
      <Icon className={cn("w-4 h-4 shrink-0", config.text)} />
      <p className={cn("text-sm flex-1", config.text)}>{banner.message}</p>
      <button onClick={() => setDismissed(true)} className="text-gray-500 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
