'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

export function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/login' })} 
      className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
    >
      <LogOut className="w-5 h-5" />
      Odhlásit se
    </button>
  );
}
