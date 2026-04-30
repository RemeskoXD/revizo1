'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  ClipboardCheck,
  Droplets,
  Flame,
  HardHat,
  Home,
  Shield,
  Wrench,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PAIRS: LucideIcon[] = [Wrench, Home, Zap, Shield, Flame, Droplets, HardHat, ClipboardCheck];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type CardSlot = {
  pairId: number;
  Icon: LucideIcon;
  flipped: boolean;
  matched: boolean;
};

function buildDeck(): CardSlot[] {
  const flat: { pairId: number; Icon: LucideIcon }[] = [];
  PAIRS.forEach((Icon, pairId) => {
    flat.push({ pairId, Icon });
    flat.push({ pairId, Icon });
  });
  return shuffle(flat).map((c) => ({ ...c, flipped: false, matched: false }));
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PexesoMemoryGame({ open, onClose }: Props) {
  const [cards, setCards] = useState<CardSlot[]>([]);
  const selectedRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!open) {
      setCards([]);
      selectedRef.current = null;
      busyRef.current = false;
      return;
    }
    setCards(buildDeck());
    selectedRef.current = null;
    busyRef.current = false;
  }, [open]);

  const allMatched = useMemo(
    () => cards.length > 0 && cards.every((c) => c.matched),
    [cards]
  );

  useEffect(() => {
    if (!open || !allMatched) return;
    const t = setTimeout(() => onClose(), 1400);
    return () => clearTimeout(t);
  }, [open, allMatched, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  function handleCardClick(index: number) {
    if (busyRef.current) return;

    setCards((prev) => {
      const c = prev[index];
      if (!c || c.matched || c.flipped) return prev;

      if (selectedRef.current === null) {
        selectedRef.current = index;
        return prev.map((x, i) => (i === index ? { ...x, flipped: true } : x));
      }

      const first = selectedRef.current;
      if (first === index) return prev;

      const c1 = prev[first];
      const c2 = c;
      if (!c1) return prev;

      const next = prev.map((x, i) => (i === index ? { ...x, flipped: true } : x));
      selectedRef.current = null;

      if (c1.pairId === c2.pairId) {
        busyRef.current = true;
        setTimeout(() => {
          setCards((p) =>
            p.map((x, i) => (i === first || i === index ? { ...x, matched: true, flipped: true } : x))
          );
          busyRef.current = false;
        }, 450);
      } else {
        busyRef.current = true;
        setTimeout(() => {
          setCards((p) =>
            p.map((x, i) => (i === first || i === index ? { ...x, flipped: false } : x))
          );
          busyRef.current = false;
        }, 800);
      }

      return next;
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pexeso-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#141414] p-4 shadow-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Zavřít"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="pexeso-title" className="mb-1 pr-10 text-lg font-semibold text-white">
          Pexeso
        </h2>
        <p className="mb-4 text-xs text-gray-500">Najdi všechny páry ikon. Šťastní lidé hrají i v Revizone.</p>

        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {cards.map((card, i) => {
            const Icon = card.Icon;
            const show = card.flipped || card.matched;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleCardClick(i)}
                disabled={card.matched}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-xl border text-white transition-all',
                  card.matched
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : show
                      ? 'border-brand-yellow/40 bg-brand-yellow/10'
                      : 'border-white/10 bg-[#1a1a1a] hover:border-brand-yellow/30 hover:bg-white/5'
                )}
              >
                {show ? (
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.75} />
                ) : (
                  <span className="text-lg font-bold text-gray-600">?</span>
                )}
              </button>
            );
          })}
        </div>

        {allMatched && (
          <p className="mt-4 text-center text-sm font-medium text-emerald-400">Hotovo — páry nalezeny!</p>
        )}
      </div>
    </div>
  );
}
