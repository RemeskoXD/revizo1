'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  SIDEBAR_WIDTH_STORAGE_KEY,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MIN_W,
  SIDEBAR_MAX_W,
} from '@/lib/sidebar-width';

export function useSidebarWidth() {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH);
  const [isLg, setIsLg] = useState(false);
  const widthRef = useRef(SIDEBAR_DEFAULT_WIDTH);
  const dragging = useRef(false);

  useEffect(() => {
    widthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n) && n >= SIDEBAR_MIN_W && n <= SIDEBAR_MAX_W) {
        setSidebarWidth(n);
        widthRef.current = n;
      }
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const fn = () => setIsLg(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    const startX = e.clientX;
    const startW = widthRef.current;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = ev.clientX - startX;
      const next = Math.min(SIDEBAR_MAX_W, Math.max(SIDEBAR_MIN_W, startW + delta));
      setSidebarWidth(next);
      widthRef.current = next;
    };

    const onUp = () => {
      dragging.current = false;
      localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(widthRef.current));
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  return { sidebarWidth, isLg, startResize };
}
