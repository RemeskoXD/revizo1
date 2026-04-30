'use client';

import { useEffect } from 'react';
import SettingsDbError from '@/components/settings/SettingsDbError';

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Settings route error:', error);
  }, [error]);

  return (
    <div className="py-4">
      <SettingsDbError message={error.message} title="Neočekávaná chyba v nastavení" />
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="text-sm text-brand-yellow underline hover:no-underline"
        >
          Zkusit znovu (obnovit komponentu)
        </button>
      </div>
    </div>
  );
}
