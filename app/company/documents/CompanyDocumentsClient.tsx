'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Loader2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X as XIcon,
  Trash2,
  Edit3,
  Download,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type DocState = 'NO_DATE' | 'VALID' | 'EXPIRES_SOON' | 'EXPIRED';

type Doc = {
  id: string;
  title: string;
  category: string | null;
  fileMimeType: string | null;
  fileName: string | null;
  validUntil: string | null;
  notes: string | null;
  subjectName: string | null;
  subjectUserId: string | null;
  createdAt: string;
  updatedAt: string;
  state: DocState;
  daysLeft: number | null;
  hasFile: boolean;
};

const STATE_BADGE: Record<DocState, { label: string; cls: string; Icon: any }> = {
  NO_DATE: { label: 'Bez data', cls: 'bg-gray-500/10 text-gray-300', Icon: Clock },
  VALID: { label: 'Platné', cls: 'bg-emerald-500/10 text-emerald-300', Icon: CheckCircle2 },
  EXPIRES_SOON: { label: 'Brzy vyprší', cls: 'bg-amber-500/10 text-amber-300', Icon: AlertTriangle },
  EXPIRED: { label: 'Vypršelo', cls: 'bg-red-500/10 text-red-300', Icon: AlertTriangle },
};

export default function CompanyDocumentsClient() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company/documents', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setDocs(data.documents || []);
      else toast.error(data?.message || 'Načtení selhalo');
    } catch {
      toast.error('Načtení selhalo');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (id: string) => {
    if (!confirm('Smazat tento dokument? Akce je nevratná.')) return;
    try {
      const res = await fetch(`/api/company/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Smazáno');
        load();
      } else {
        toast.error('Smazání selhalo');
      }
    } catch {
      toast.error('Smazání selhalo');
    }
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';

  const expiringSoon = docs.filter((d) => d.state === 'EXPIRES_SOON').length;
  const expired = docs.filter((d) => d.state === 'EXPIRED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <FileText className="h-6 w-6 text-brand-yellow" />
            Hlídané dokumenty
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Svářečské průkazy, zdravotní prohlídky, certifikace, …. Pro každý dokument
            zadejte datum platnosti – systém vás včas upozorní.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover"
        >
          <Plus className="h-4 w-4" />
          Přidat dokument
        </button>
      </div>

      {(expiringSoon > 0 || expired > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {expired > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="text-xs text-red-400/80">Vypršené dokumenty</div>
              <div className="mt-1 text-2xl font-bold text-red-300">{expired}</div>
              <div className="text-xs text-red-400/60">vyžadují akci</div>
            </div>
          )}
          {expiringSoon > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="text-xs text-amber-400/80">Brzy vyprší (do 30 dní)</div>
              <div className="mt-1 text-2xl font-bold text-amber-300">{expiringSoon}</div>
              <div className="text-xs text-amber-400/60">naplánujte obnovu</div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#111]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-3 py-3 sm:px-4">Dokument</th>
                <th className="px-3 py-3 sm:px-4">Subjekt</th>
                <th className="px-3 py-3 sm:px-4">Platnost</th>
                <th className="px-3 py-3 sm:px-4">Stav</th>
                <th className="px-3 py-3 sm:px-4">Soubor</th>
                <th className="px-3 py-3 sm:px-4">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-yellow" />
                  </td>
                </tr>
              ) : docs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-sm text-gray-500">
                    Zatím nemáte žádné hlídané dokumenty. Přidejte první přes „Přidat dokument“.
                  </td>
                </tr>
              ) : (
                docs.map((d) => {
                  const badge = STATE_BADGE[d.state];
                  const StateIcon = badge.Icon;
                  return (
                    <tr key={d.id} className="text-gray-200">
                      <td className="px-3 py-3 sm:px-4">
                        <div className="font-medium text-white">{d.title}</div>
                        {d.category && <div className="text-xs text-gray-500">{d.category}</div>}
                        {d.notes && (
                          <div className="mt-1 max-w-md truncate text-[11px] text-gray-500" title={d.notes}>
                            {d.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs sm:px-4">
                        {d.subjectName ? (
                          <span className="text-gray-300">{d.subjectName}</span>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-300 sm:px-4">{fmtDate(d.validUntil)}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          <StateIcon className="h-3 w-3" />
                          {badge.label}
                          {d.daysLeft !== null && d.state !== 'NO_DATE' && (
                            <span className="ml-1 opacity-70">({d.daysLeft >= 0 ? `+${d.daysLeft}` : d.daysLeft} dní)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        {d.fileName ? (
                          <a
                            href={`/api/company/documents/${d.id}?file=1`}
                            className="inline-flex items-center gap-1 text-xs text-brand-yellow hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="h-3 w-3" />
                            {d.fileName}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingDoc(d)}
                            className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
                            title="Upravit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(d.id)}
                            className="rounded-md p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-300"
                            title="Smazat"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <DocumentModal
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={load}
        />
      )}

      {editingDoc && (
        <DocumentModal
          mode="edit"
          doc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function DocumentModal({
  mode,
  doc,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  doc?: Doc;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(doc?.title || '');
  const [category, setCategory] = useState(doc?.category || '');
  const [validUntil, setValidUntil] = useState(
    doc?.validUntil ? doc.validUntil.slice(0, 10) : '',
  );
  const [subjectName, setSubjectName] = useState(doc?.subjectName || '');
  const [notes, setNotes] = useState(doc?.notes || '');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(doc?.fileName || null);
  const [saving, setSaving] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) {
      setFileBase64(null);
      setFileMime(null);
      setFileName(null);
      return;
    }
    if (f.size > 4 * 1024 * 1024) {
      toast.error('Soubor je příliš velký (max. 4 MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setFileBase64(result);
      setFileMime(f.type || 'application/octet-stream');
      setFileName(f.name);
    };
    reader.readAsDataURL(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (mode === 'create') {
        const res = await fetch('/api/company/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            category: category || null,
            validUntil: validUntil || null,
            subjectName: subjectName || null,
            notes: notes || null,
            fileBase64: fileBase64 || undefined,
            fileMimeType: fileMime || undefined,
            fileName: fileName || undefined,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success('Dokument byl uložen');
          onSaved();
          onClose();
        } else {
          toast.error(data?.message || 'Uložení selhalo');
        }
      } else if (doc) {
        const res = await fetch(`/api/company/documents/${doc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            category: category || null,
            validUntil: validUntil || null,
            subjectName: subjectName || null,
            notes: notes || null,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success('Změny uloženy');
          onSaved();
          onClose();
        } else {
          toast.error(data?.message || 'Uložení selhalo');
        }
      }
    } catch {
      toast.error('Uložení selhalo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4">
      <form
        onSubmit={submit}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#111] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">
            {mode === 'create' ? 'Nový dokument' : 'Upravit dokument'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Zavřít"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-xs text-gray-400">Název</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
              placeholder="Např. Svářečský průkaz – Jan Novák"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-gray-400">Kategorie</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={80}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
                placeholder="Např. svářečský průkaz"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">Subjekt / osoba</label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                maxLength={160}
                className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
                placeholder="Např. Jan Novák"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400">Platnost do</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Manuální zadání data platnosti. (Automatické vyčtení z PDF je v přípravě.)
            </p>
          </div>
          {mode === 'create' && (
            <div>
              <label className="text-xs text-gray-400">Soubor (PDF / obrázek, max. 4 MB)</label>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={onFileChange}
                className="mt-1 w-full text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"
              />
              {fileName && (
                <p className="mt-1 text-[11px] text-brand-yellow">Vybráno: {fileName}</p>
              )}
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400">Poznámka</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
              placeholder="Volitelné…"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
          >
            {saving ? 'Ukládám…' : mode === 'create' ? 'Vytvořit' : 'Uložit'}
          </button>
        </div>
      </form>
    </div>
  );
}
