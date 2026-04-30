'use client';

export default function SettingsRefreshButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5"
    >
      Zkusit znovu
    </button>
  );
}
