'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Plus, Trash2, FileText, CheckCircle2, AlertTriangle,
  XCircle, Save, Eye, Printer, Loader2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Checkpoint = { name: string; result: 'ok' | 'fail' | 'na'; note: string };
type Measurement = { name: string; value: string; unit: string; limit: string; ok: boolean };
type Defect = { description: string; severity: 'low' | 'medium' | 'high'; fixed: boolean };

const DEFAULT_CHECKPOINTS: Record<string, string[]> = {
  'Elektro': [
    'Stav rozvaděče', 'Jistící prvky', 'Proudové chrániče (RCD)', 'Izolační odpor vodičů',
    'Ochranné pospojování', 'Uzemnění', 'Stav kabeláže', 'Zásuvky a spínače',
    'Osvětlení', 'Přepěťová ochrana',
  ],
  'Plyn': [
    'Hlavní uzávěr plynu', 'Plynové rozvody – těsnost', 'Plynový kotel/spotřebič', 'Odvod spalin',
    'Ventilace místnosti', 'Detektor CO', 'Stav armatur', 'Tlaková zkouška',
  ],
  'Hromosvod': [
    'Jímací soustava', 'Svody', 'Uzemnění – odpor', 'Spoje a svorky',
    'Ochrana proti přepětí', 'Stav izolátorů',
  ],
  'Požární': [
    'Únikové cesty', 'Požární dveře', 'Nouzové osvětlení', 'Hasicí přístroje',
    'Hydranty', 'Požární signalizace (EPS)', 'Značení', 'Větrání',
  ],
  'Obecné': [
    'Vizuální kontrola', 'Funkční zkouška', 'Stav zařízení', 'Bezpečnostní prvky',
    'Dokumentace', 'Značení a štítky',
  ],
};

function guessCategory(serviceType: string): string {
  const s = serviceType.toLowerCase();
  if (s.includes('elektro') || s.includes('elektřin')) return 'Elektro';
  if (s.includes('plyn')) return 'Plyn';
  if (s.includes('hromosvod')) return 'Hromosvod';
  if (s.includes('požár') || s.includes('hasic') || s.includes('komín')) return 'Požární';
  return 'Obecné';
}

export default function ReportFormClient({ order }: { order: any }) {
  const router = useRouter();
  const category = guessCategory(order.serviceType);
  const defaultCps = DEFAULT_CHECKPOINTS[category] || DEFAULT_CHECKPOINTS['Obecné'];

  const [techCert, setTechCert] = useState('');
  const [standards, setStandards] = useState(category === 'Elektro' ? 'ČSN 33 1500, ČSN 33 2000-6' : category === 'Plyn' ? 'TPG 704 01' : 'dle platné legislativy');
  const [revisionDate, setRevisionDate] = useState(new Date().toISOString().slice(0, 10));
  const [nextRevisionDate, setNextRevisionDate] = useState('');
  const [result, setResult] = useState<'PASS' | 'PASS_WITH_NOTES' | 'FAIL'>('PASS');
  const [notes, setNotes] = useState('');
  const [conclusion, setConclusion] = useState('');

  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(
    defaultCps.map(name => ({ name, result: 'ok', note: '' }))
  );
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [defects, setDefects] = useState<Defect[]>([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const addCheckpoint = () => setCheckpoints([...checkpoints, { name: '', result: 'ok', note: '' }]);
  const removeCheckpoint = (i: number) => setCheckpoints(checkpoints.filter((_, idx) => idx !== i));
  const updateCheckpoint = (i: number, field: keyof Checkpoint, value: string) => {
    const updated = [...checkpoints];
    (updated[i] as any)[field] = value;
    setCheckpoints(updated);
  };

  const addMeasurement = () => setMeasurements([...measurements, { name: '', value: '', unit: 'MΩ', limit: '', ok: true }]);
  const removeMeasurement = (i: number) => setMeasurements(measurements.filter((_, idx) => idx !== i));
  const updateMeasurement = (i: number, field: keyof Measurement, value: any) => {
    const updated = [...measurements];
    (updated[i] as any)[field] = value;
    setMeasurements(updated);
  };

  const addDefect = () => setDefects([...defects, { description: '', severity: 'medium', fixed: false }]);
  const removeDefect = (i: number) => setDefects(defects.filter((_, idx) => idx !== i));
  const updateDefect = (i: number, field: keyof Defect, value: any) => {
    const updated = [...defects];
    (updated[i] as any)[field] = value;
    setDefects(updated);
  };

  const buildPayload = () => ({
    technicianName: order.technicianName,
    technicianCert: techCert,
    technicianPhone: order.technicianPhone,
    revisionDate: new Date(revisionDate).toLocaleDateString('cs-CZ'),
    nextRevisionDate: nextRevisionDate ? new Date(nextRevisionDate).toLocaleDateString('cs-CZ') : 'Dle legislativy',
    result,
    standards,
    checkpoints: checkpoints.filter(cp => cp.name),
    measurements: measurements.filter(m => m.name),
    defects: defects.filter(d => d.description),
    notes,
    conclusion,
  });

  const handlePreview = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/orders/${order.readableId}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewHtml(data.html);
      }
    } catch { alert('Chyba při generování náhledu.'); }
    finally { setIsGenerating(false); }
  };

  const handlePrint = () => {
    if (!previewHtml) return;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(previewHtml);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  };

  const handleSubmitReport = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${order.readableId}/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) { alert('Chyba.'); return; }
      const { html } = await res.json();

      const htmlBase64 = `data:text/html;base64,${btoa(unescape(encodeURIComponent(html)))}`;

      const completeRes = await fetch(`/api/orders/${order.readableId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportFile: htmlBase64,
          revisionResult: result,
          revisionNotes: notes || conclusion,
          nextRevisionDate: nextRevisionDate || null,
        }),
      });

      if (completeRes.ok) {
        router.push(`/technician/job/${order.readableId}`);
      } else {
        const err = await completeRes.json();
        alert(err.message || 'Chyba při odesílání.');
      }
    } catch { alert('Chyba.'); }
    finally { setIsSubmitting(false); }
  };

  const inputClass = "w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-yellow outline-none transition-all";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/technician/job/${order.readableId}`} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Revizní zpráva</h1>
          <p className="text-gray-500 text-sm">#{order.readableId} · {order.serviceType} · {order.address}</p>
        </div>
      </div>

      {/* Technician info */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Údaje technika</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Číslo oprávnění / certifikátu</label>
            <input type="text" value={techCert} onChange={e => setTechCert(e.target.value)} placeholder="Např. E2A/1234" className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Datum provedení revize</label>
            <input type="date" value={revisionDate} onChange={e => setRevisionDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Použité normy</label>
            <input type="text" value={standards} onChange={e => setStandards(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Datum příští revize</label>
            <input type="date" value={nextRevisionDate} onChange={e => setNextRevisionDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Výsledek revize</label>
            <div className="grid grid-cols-3 gap-2">
              {([['PASS', 'Bez závad', 'border-green-500', 'bg-green-500/10', 'text-green-500'], ['PASS_WITH_NOTES', 'S výhradami', 'border-orange-500', 'bg-orange-500/10', 'text-orange-500'], ['FAIL', 'Nevyhovuje', 'border-red-500', 'bg-red-500/10', 'text-red-500']] as const).map(([val, label, bc, bg, tc]) => (
                <button key={val} type="button" onClick={() => setResult(val as any)}
                  className={cn("p-2 rounded-lg border text-xs font-semibold transition-all", result === val ? `${bc} ${bg} ${tc}` : "border-white/10 text-gray-400")}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Checkpoints */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Kontrolní body</h3>
          <button onClick={addCheckpoint} className="text-xs text-brand-yellow hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Přidat</button>
        </div>
        <div className="space-y-2">
          {checkpoints.map((cp, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-[#111] rounded-lg border border-white/5">
              <input type="text" value={cp.name} onChange={e => updateCheckpoint(i, 'name', e.target.value)} placeholder="Název kontrolního bodu"
                className="flex-1 bg-transparent border-none text-sm text-white outline-none placeholder-gray-600" />
              <select value={cp.result} onChange={e => updateCheckpoint(i, 'result', e.target.value)}
                className={cn("bg-transparent border border-white/10 rounded px-2 py-1 text-xs font-semibold outline-none",
                  cp.result === 'ok' ? "text-green-500" : cp.result === 'fail' ? "text-red-500" : "text-gray-500"
                )}>
                <option value="ok">✓ OK</option>
                <option value="fail">✗ Závada</option>
                <option value="na">— N/A</option>
              </select>
              <input type="text" value={cp.note} onChange={e => updateCheckpoint(i, 'note', e.target.value)} placeholder="Poznámka"
                className="w-40 bg-transparent border border-white/5 rounded px-2 py-1 text-xs text-gray-400 outline-none placeholder-gray-700" />
              <button onClick={() => removeCheckpoint(i)} className="p-1 text-gray-600 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Measurements */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Naměřené hodnoty</h3>
          <button onClick={addMeasurement} className="text-xs text-brand-yellow hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Přidat</button>
        </div>
        {measurements.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">Klikněte na „Přidat“ pro přidání měření</p>
        ) : (
          <div className="space-y-2">
            {measurements.map((m, i) => (
              <div key={i} className="flex items-center gap-2 p-3 bg-[#111] rounded-lg border border-white/5">
                <input type="text" value={m.name} onChange={e => updateMeasurement(i, 'name', e.target.value)} placeholder="Veličina"
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600" />
                <input type="text" value={m.value} onChange={e => updateMeasurement(i, 'value', e.target.value)} placeholder="Hodnota"
                  className="w-20 bg-transparent border border-white/10 rounded px-2 py-1 text-sm text-white outline-none text-center" />
                <select value={m.unit} onChange={e => updateMeasurement(i, 'unit', e.target.value)}
                  className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-gray-400 outline-none">
                  <option value="MΩ">MΩ</option><option value="Ω">Ω</option><option value="V">V</option>
                  <option value="A">A</option><option value="mA">mA</option><option value="kPa">kPa</option>
                  <option value="°C">°C</option><option value="s">s</option><option value="">—</option>
                </select>
                <input type="text" value={m.limit} onChange={e => updateMeasurement(i, 'limit', e.target.value)} placeholder="Limit"
                  className="w-20 bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-gray-400 outline-none text-center" />
                <button onClick={() => updateMeasurement(i, 'ok', !m.ok)}
                  className={cn("px-2 py-1 rounded text-xs font-bold", m.ok ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                  {m.ok ? '✓' : '✗'}
                </button>
                <button onClick={() => removeMeasurement(i)} className="p-1 text-gray-600 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Defects */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" /> Zjištěné závady
          </h3>
          <button onClick={addDefect} className="text-xs text-brand-yellow hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Přidat</button>
        </div>
        {defects.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">Žádné závady – skvělé!</p>
        ) : (
          <div className="space-y-2">
            {defects.map((d, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-[#111] rounded-lg border border-white/5">
                <textarea value={d.description} onChange={e => updateDefect(i, 'description', e.target.value)} placeholder="Popis závady"
                  className="flex-1 bg-transparent text-sm text-white outline-none placeholder-gray-600 resize-none" rows={1} />
                <select value={d.severity} onChange={e => updateDefect(i, 'severity', e.target.value)}
                  className={cn("bg-transparent border border-white/10 rounded px-2 py-1 text-xs font-semibold outline-none",
                    d.severity === 'high' ? "text-red-500" : d.severity === 'medium' ? "text-orange-500" : "text-yellow-500"
                  )}>
                  <option value="low">Nízká</option><option value="medium">Střední</option><option value="high">Vysoká</option>
                </select>
                <button onClick={() => updateDefect(i, 'fixed', !d.fixed)}
                  className={cn("px-2 py-1 rounded text-xs font-bold whitespace-nowrap", d.fixed ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>
                  {d.fixed ? '✓ Odstraněno' : '✗ Neodstraněno'}
                </button>
                <button onClick={() => removeDefect(i)} className="p-1 text-gray-600 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes & Conclusion */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Poznámky a závěr</h3>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Poznámky technika</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Doplňující informace, doporučení..."
            className={cn(inputClass, "resize-y")} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Závěr (nepovinné – vygeneruje se automaticky)</label>
          <textarea value={conclusion} onChange={e => setConclusion(e.target.value)} rows={2} placeholder="Vlastní závěrečné hodnocení..."
            className={cn(inputClass, "resize-y")} />
        </div>
      </div>

      {/* Preview */}
      {previewHtml && (
        <div className="bg-white rounded-xl overflow-hidden border border-white/10">
          <div className="flex items-center justify-between p-4 bg-[#1A1A1A] border-b border-white/10">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Eye className="w-4 h-4" /> Náhled</h3>
            <button onClick={handlePrint} className="text-xs text-brand-yellow hover:underline flex items-center gap-1"><Printer className="w-3 h-3" /> Tisknout / Uložit PDF</button>
          </div>
          <iframe srcDoc={previewHtml} className="w-full h-[600px] border-0" title="Náhled revizní zprávy" />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 bg-[#111]/95 backdrop-blur-sm p-4 rounded-xl border border-white/10">
        <button onClick={handlePreview} disabled={isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/5 text-white font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10 disabled:opacity-50">
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Náhled zprávy
        </button>
        <button onClick={handleSubmitReport} disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-yellow text-black font-bold rounded-lg hover:bg-brand-yellow-hover transition-colors shadow-lg shadow-brand-yellow/10 disabled:opacity-50">
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Dokončit revizi a odeslat
        </button>
      </div>
    </div>
  );
}
