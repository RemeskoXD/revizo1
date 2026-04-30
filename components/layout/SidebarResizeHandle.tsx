'use client';

import { GripVertical } from 'lucide-react';

export function SidebarResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      aria-label="Změnit šířku postranního panelu"
      title="Tažením změníte šířku panelu"
      onMouseDown={onMouseDown}
      className="absolute -right-1 top-0 z-10 hidden h-full w-3 cursor-col-resize items-center justify-center hover:bg-white/5 lg:flex"
    >
      <GripVertical className="h-5 w-5 text-gray-600" />
    </button>
  );
}
