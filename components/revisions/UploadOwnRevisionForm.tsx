'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileUp, Check, AlertCircle, Calendar, Home, FileText,
  ShieldCheck, Loader2, Zap, Flame, Wind, Sparkles, Building,
  Trash2, ArrowRight, ArrowLeft, RefreshCw, Info, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export type PropertyItem = {
  id: string;
  name: string;
  address: string | null;
};

interface UploadOwnRevisionFormProps {
  properties?: PropertyItem[];
  defaultPropertyId?: string;
  defaultAddress?: string;
  role?: string;
  onSuccessRedirect?: string;
  onSwitchToOrder?: () => void;
}

export interface RevisionCategoryMeta {
  id: string;
  name: string;
  shortName: string;
  icon: any;
  group: string;
  defaultIntervalYears: number;
  lawNorm: string;
  description: string;
  keywords: string[];
}

export const REVISION_CATEGORIES: RevisionCategoryMeta[] = [
  {
    id: 'elektro',
    name: 'Elektroinstalace a rozvody',
    shortName: 'Elektroinstalace',
    icon: Zap,
    group: 'Elektro',
    defaultIntervalYears: 5,
    lawNorm: 'ČSN 33 1500 (zákonná lhůta 5 let pro obytné prostory)',
    description: 'Rozvaděče, zásuvkové a světelné okruhy, jističe a elektrospotřebiče.',
    keywords: ['elektro', 'proud', 'rozvadec', 'rozvod', 'zasuvk', 'jistic', 'instalace', 'elektrina'],
  },
  {
    id: 'plyn',
    name: 'Plynová zařízení a kotle',
    shortName: 'Plyn a kotle',
    icon: Flame,
    group: 'Plyn',
    defaultIntervalYears: 3,
    lawNorm: 'TPG 704 01 / vyhl. 85/1978 Sb. (3 roky revize rozvodů, 1 rok servis kotle)',
    description: 'Plynové kotle, karmy, sporáky, domovní a bytové plynovody, detektory úniku.',
    keywords: ['plyn', 'kotel', 'protherm', 'vaillant', 'baxi', 'junkers', 'viessmann', 'sporak', 'karma', 'plynoměr'],
  },
  {
    id: 'kominy',
    name: 'Komíny a spalinové cesty',
    shortName: 'Komíny a spalinové cesty',
    icon: Wind,
    group: 'Požární',
    defaultIntervalYears: 1,
    lawNorm: 'Zákon č. 133/1985 Sb. a vyhláška č. 34/2016 Sb. (lhůta 1 rok)',
    description: 'Pravidelná roční kontrola a čištění spalinových cest pro pevná, kapalná i plynná paliva.',
    keywords: ['komin', 'spalin', 'kourovod', 'kominik', 'cisteni', 'odtah'],
  },
  {
    id: 'hromosvod',
    name: 'Hromosvody a ochrana před bleskem',
    shortName: 'Hromosvody (LPS)',
    icon: Sparkles,
    group: 'Elektro',
    defaultIntervalYears: 4,
    lawNorm: 'ČSN EN 62305 / ČSN 34 1390 (lhůta 4 roky pro běžné objekty)',
    description: 'Jímací soustava, svody a zemniče chránící nemovitost před účinky atmosférického blesku.',
    keywords: ['hromosvod', 'blesk', 'lps', 'uzemeni', 'svod', 'jimac'],
  },
  {
    id: 'hasici_pristroje',
    name: 'Požární bezpečnost a hasicí přístroje',
    shortName: 'Hasicí přístroje',
    icon: ShieldCheck,
    group: 'Požární',
    defaultIntervalYears: 1,
    lawNorm: 'Vyhláška MV č. 246/2001 Sb. o požární prevenci (lhůta 1 rok)',
    description: 'Pravidelná roční kontrola provozuschopnosti hasicích přístrojů, hydrantů a klapek.',
    keywords: ['hasic', 'hydrant', 'pozarn', 'hasak', 'klapk', 'hasicak'],
  },
  {
    id: 'tlakove',
    name: 'Tlakové nádoby a zařízení',
    shortName: 'Tlaková zařízení',
    icon: Building,
    group: 'Technická',
    defaultIntervalYears: 1,
    lawNorm: 'ČSN 69 0012 (1 rok provozní revize, 5 let tlaková zkouška)',
    description: 'Expanzní nádoby, tlakové zásobníky vody, kotelny a kompresory.',
    keywords: ['tlak', 'nadoba', 'koteln', 'expanz', 'kompresor'],
  },
  {
    id: 'vytahy',
    name: 'Výtahy a zdvihací zařízení',
    shortName: 'Výtahy',
    icon: Building,
    group: 'Technická',
    defaultIntervalYears: 3,
    lawNorm: 'ČSN 27 4007 (3 roky inspekční prohlídka / 6 měsíců odborná prohlídka)',
    description: 'Osobní a nákladní výtahy v bytových domech a komerčních prostorách.',
    keywords: ['vytah', 'zdvihadl', 'otis', 'kone', 'schindler', 'kabina'],
  },
  {
    id: 'ostatni',
    name: 'Jiné / Všeobecná revize',
    shortName: 'Ostatní revize',
    icon: FileText,
    group: 'Ostatní',
    defaultIntervalYears: 1,
    lawNorm: 'Doporučená standardní lhůta (1 rok)',
    description: 'Klimatizace, tepelná čerpadla, vzduchotechnika nebo individuální revize.',
    keywords: ['klima', 'cerpadl', 'vzt', 'ostatni', 'jine'],
  },
];

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addYearsToDateString(dateStr: string, years: number): string {
  try {
    const base = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(base.getTime())) return '';
    const newDate = new Date(base);
    newDate.setFullYear(base.getFullYear() + years);
    const year = newDate.getFullYear();
    const month = String(newDate.getMonth() + 1).padStart(2, '0');
    const day = String(newDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

function cleanFilenameToTitle(filename: string): string {
  // strip extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  // replace underscores and dashes with spaces
  const withSpaces = withoutExt.replace(/[_\-]+/g, ' ').trim();
  // capitalize first letter
  if (withSpaces.length > 0) {
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  }
  return withSpaces;
}

export default function UploadOwnRevisionForm({
  properties = [],
  defaultPropertyId,
  defaultAddress = '',
  role,
  onSuccessRedirect,
  onSwitchToOrder,
}: UploadOwnRevisionFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Property Selection
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    defaultPropertyId || (properties.length > 0 ? properties[0].id : '')
  );
  const [useCustomAddress, setUseCustomAddress] = useState<boolean>(
    properties.length === 0 || (!defaultPropertyId && !properties[0]?.address && Boolean(defaultAddress))
  );
  const [address, setAddress] = useState<string>(
    defaultAddress || (properties.length > 0 ? (properties[0].address || properties[0].name) : '')
  );
  const [propertyType, setPropertyType] = useState<string>('Byt');
  const [floor, setFloor] = useState<string>('');

  // Category and Metadata
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('elektro');
  const selectedCategory = useMemo(() => {
    return REVISION_CATEGORIES.find(c => c.id === selectedCategoryId) || REVISION_CATEGORIES[0];
  }, [selectedCategoryId]);

  const [revisionName, setRevisionName] = useState<string>('');
  const [protocolNumber, setProtocolNumber] = useState<string>('');
  const [technicianName, setTechnicianName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Dates
  const todayStr = useMemo(() => getTodayString(), []);
  const [issuedDate, setIssuedDate] = useState<string>(todayStr);
  const [validUntil, setValidUntil] = useState<string>(() => {
    return addYearsToDateString(todayStr, 5); // default elektro is 5 years
  });
  const [isManualValidUntil, setIsManualValidUntil] = useState<boolean>(false);

  // File
  const [reportFile, setReportFile] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const [reportFileSize, setReportFileSize] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [autoDetectionNotice, setAutoDetectionNotice] = useState<string | null>(null);

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedRevisionInfo, setSavedRevisionInfo] = useState<any>(null);

  // Synchronize category change with validUntil (if not manually pinned)
  const handleCategoryChange = (catId: string) => {
    setSelectedCategoryId(catId);
    const cat = REVISION_CATEGORIES.find(c => c.id === catId);
    if (cat && !isManualValidUntil) {
      const newValidUntil = addYearsToDateString(issuedDate || todayStr, cat.defaultIntervalYears);
      setValidUntil(newValidUntil);
    }
  };

  // Synchronize issuedDate change with validUntil
  const handleIssuedDateChange = (newIssuedDate: string) => {
    setIssuedDate(newIssuedDate);
    if (!isManualValidUntil) {
      const newValidUntil = addYearsToDateString(newIssuedDate, selectedCategory.defaultIntervalYears);
      setValidUntil(newValidUntil);
    }
  };

  // Quick preset button click
  const handleQuickPresetYears = (years: number) => {
    const base = issuedDate || todayStr;
    const computed = addYearsToDateString(base, years);
    setValidUntil(computed);
    setIsManualValidUntil(true);
  };

  // Reset to legal norm
  const handleResetToLegalNorm = () => {
    const computed = addYearsToDateString(issuedDate || todayStr, selectedCategory.defaultIntervalYears);
    setValidUntil(computed);
    setIsManualValidUntil(false);
  };

  // Property Selection
  const handlePropertyChange = (propId: string) => {
    setSelectedPropertyId(propId);
    setUseCustomAddress(false);
    const p = properties.find(item => item.id === propId);
    if (p) {
      setAddress(p.address || p.name);
    }
  };

  // File Upload and Processing
  const processUploadedFile = async (file: File) => {
    setError(null);
    setAutoDetectionNotice(null);

    if (file.size > 15 * 1024 * 1024) {
      setError('Soubor je příliš velký. Maximální povolená velikost je 15 MB.');
      return;
    }

    try {
      setIsCompressing(true);

      // 1. Client-side image compression for images
      let finalFile = file;
      if (file.type.startsWith('image/')) {
        try {
          const { compressImage } = await import('@/lib/client-compress');
          finalFile = await compressImage(file, { maxSizeMB: 2, maxWidthOrHeight: 2500 });
        } catch (compErr) {
          console.warn('Image compression fallback:', compErr);
          finalFile = file;
        }
      }

      const { fileToBase64 } = await import('@/lib/client-compress');
      const b64 = await fileToBase64(finalFile);

      const sizeFormatted = finalFile.size > 1024 * 1024
        ? `${(finalFile.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(finalFile.size / 1024)} KB`;

      setReportFile(b64);
      setReportFileName(file.name);
      setReportFileSize(sizeFormatted);

      // 2. Intelligent Pre-filling from File Name:
      const cleanTitle = cleanFilenameToTitle(file.name);
      const lowerName = file.name.toLowerCase();

      // Check for category keyword match in filename
      let matchedCategory: RevisionCategoryMeta | null = null;
      for (const cat of REVISION_CATEGORIES) {
        if (cat.keywords.some(kw => lowerName.includes(kw))) {
          matchedCategory = cat;
          break;
        }
      }

      const notices: string[] = [];

      // Auto-prefill revision title if empty or was default
      if (!revisionName.trim() || revisionName === selectedCategory.name) {
        setRevisionName(cleanTitle);
        notices.push(`Název: „${cleanTitle}“`);
      }

      // Auto-switch category if detected from filename
      if (matchedCategory && matchedCategory.id !== selectedCategoryId) {
        setSelectedCategoryId(matchedCategory.id);
        if (!isManualValidUntil) {
          const newValidUntil = addYearsToDateString(issuedDate || todayStr, matchedCategory.defaultIntervalYears);
          setValidUntil(newValidUntil);
        }
        notices.push(`Kategorie: ${matchedCategory.name}`);
      }

      if (notices.length > 0) {
        setAutoDetectionNotice(`Z nahraného souboru jsme předvyplnili ${notices.join(' a ')}. Můžete cokoliv upravit.`);
      }
    } catch (err: any) {
      console.error('Error processing file:', err);
      setError('Nepodařilo se zpracovat vybraný soubor.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setReportFile(null);
    setReportFileName(null);
    setReportFileSize(null);
    setAutoDetectionNotice(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reportFile) {
      setError('Prosím nahrajte soubor revizní zprávy (PDF nebo obrázek).');
      return;
    }

    const finalAddress = useCustomAddress
      ? address.trim()
      : (address.trim() || properties.find(p => p.id === selectedPropertyId)?.name || 'Nemovitost');

    if (!finalAddress) {
      setError('Prosím vyplňte adresu nebo vyberte nemovitost.');
      return;
    }

    if (!validUntil) {
      setError('Prosím zadejte datum platnosti revize (do kdy je revize platná).');
      return;
    }

    const categoryName = selectedCategory.name;
    const customServiceName = revisionName.trim()
      ? `${categoryName} (${revisionName.trim()})`
      : categoryName;

    setIsSubmitting(true);

    try {
      // Build clear, informative notes
      const notesParts: string[] = [];
      if (revisionName.trim()) notesParts.push(`Název/Popis: ${revisionName.trim()}`);
      if (protocolNumber.trim()) notesParts.push(`Číslo protokolu: ${protocolNumber.trim()}`);
      if (technicianName.trim()) notesParts.push(`Revizní technik: ${technicianName.trim()}`);
      if (issuedDate) notesParts.push(`Datum vyhotovení: ${new Date(issuedDate).toLocaleDateString('cs-CZ')}`);
      if (floor.trim()) notesParts.push(`Podlaží/jednotka: ${floor.trim()}`);
      if (notes.trim()) notesParts.push(`Poznámka: ${notes.trim()}`);
      const finalNotes = notesParts.join('\n') || undefined;

      const payload = {
        serviceTypeIds: ['vlastni_revize'],
        serviceType: 'vlastni_revize',
        customServiceName,
        propertyType: propertyType || 'Byt',
        address: finalAddress,
        propertyId: (!useCustomAddress && selectedPropertyId) ? selectedPropertyId : undefined,
        preferredDate: validUntil,
        notes: finalNotes,
        reportFile,
        isUrgent: false,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Uložení revize selhalo.');
      }

      setSavedRevisionInfo({
        categoryName,
        customServiceName,
        address: finalAddress,
        validUntil,
        fileName: reportFileName,
        protocolNumber: protocolNumber.trim() || undefined,
        technicianName: technicianName.trim() || undefined,
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error saving own revision:', err);
      setError(err.message || 'Došlo k chybě při ukládání revize.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    const defaultRedirect = role === 'REALTOR'
      ? '/realty/properties'
      : role === 'SVJ'
      ? '/svj/buildings'
      : '/dashboard/vault';

    const targetRedirect = onSuccessRedirect || defaultRedirect;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-3xl border border-emerald-500/20 bg-[#141414] p-6 sm:p-10 text-white shadow-2xl"
      >
        <div className="mx-auto max-w-lg text-center space-y-6">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-10 w-10" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Revize uložena do trezoru (0 Kč)
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Revize byla úspěšně zaevidována
            </h2>
            <p className="text-sm text-gray-400">
              Dokument je bezpečně archivován. Systém bude automaticky hlídat zákonnou lhůtu a včas vás upozorní e-mailem i SMS.
            </p>
          </div>

          {savedRevisionInfo && (
            <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-5 text-left space-y-3">
              <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                <span className="text-gray-400">Druh revize</span>
                <span className="font-semibold text-white">{savedRevisionInfo.categoryName}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                <span className="text-gray-400">Nemovitost</span>
                <span className="font-medium text-white truncate max-w-[240px] text-right">{savedRevisionInfo.address}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                <span className="text-gray-400">Platnost revize do</span>
                <span className="font-bold text-emerald-400">
                  {new Date(savedRevisionInfo.validUntil).toLocaleDateString('cs-CZ')}
                </span>
              </div>
              {savedRevisionInfo.protocolNumber && (
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2.5">
                  <span className="text-gray-400">Číslo protokolu</span>
                  <span className="font-mono text-white">{savedRevisionInfo.protocolNumber}</span>
                </div>
              )}
              {savedRevisionInfo.fileName && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Uložený soubor</span>
                  <span className="text-xs text-gray-300 font-mono truncate max-w-[200px]">{savedRevisionInfo.fileName}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href={targetRedirect}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-brand-yellow px-6 py-3 font-semibold text-black transition-all hover:bg-brand-yellow-hover shadow-lg shadow-brand-yellow/10"
            >
              Přejít do trezoru revizí
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setIsSuccess(false);
                setReportFile(null);
                setReportFileName(null);
                setReportFileSize(null);
                setRevisionName('');
                setProtocolNumber('');
                setTechnicianName('');
                setNotes('');
                setIsManualValidUntil(false);
                setValidUntil(addYearsToDateString(todayStr, selectedCategory.defaultIntervalYears));
                setAutoDetectionNotice(null);
              }}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Nahrát další revizi
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-[#141414] p-5 sm:p-8 text-white shadow-2xl">
      {/* Header with clear non-order explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Zdarma (Archivace v trezoru)
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Nahrát vlastní revizi do trezoru
          </h2>
          <p className="text-sm text-gray-400 max-w-2xl">
            Máte již platnou revizní zprávu od svého revizního technika? Nahrajte ji sem pro bezpečné uložení a automatické hlídání lhůt platnosti. Žádná objednávka technika se nevytváří.
          </p>
        </div>

        {onSwitchToOrder && (
          <button
            type="button"
            onClick={onSwitchToOrder}
            className="self-start sm:self-center shrink-0 flex items-center gap-2 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 px-4 py-2.5 text-xs font-semibold text-brand-yellow transition-all hover:bg-brand-yellow hover:text-black min-h-[44px]"
          >
            <Zap className="w-4 h-4" />
            Objednat návštěvu technika
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {autoDetectionNotice && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-3 rounded-2xl border border-brand-yellow/30 bg-brand-yellow/10 p-4 text-sm text-brand-yellow"
        >
          <Sparkles className="h-5 w-5 shrink-0 text-brand-yellow" />
          <span>{autoDetectionNotice}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Step 1: Document Upload & Revision Category */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-brand-yellow">
              1
            </span>
            <span>Revizní protokol a kategorie</span>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "rounded-2xl border-2 border-dashed p-6 transition-all",
              isDragOver
                ? "border-brand-yellow bg-brand-yellow/10 scale-[1.01]"
                : "border-white/20 bg-[#1a1a1a]/50 hover:border-brand-yellow/40"
            )}
          >
            {isCompressing ? (
              <div className="text-center py-8 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-brand-yellow mx-auto" />
                <p className="text-sm font-medium text-white">Zpracovávám a optimalizuji soubor...</p>
                <p className="text-xs text-gray-500">Probíhá rychlá příprava pro bezpečné uložení</p>
              </div>
            ) : reportFile ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{reportFileName}</p>
                    <p className="text-xs text-emerald-400/80 font-mono mt-0.5">
                      ✓ Soubor připraven ({reportFileSize})
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-200 transition-colors hover:bg-white/10 hover:text-white min-h-[36px]"
                  >
                    Změnit
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition-colors hover:bg-red-500/20 min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Odstranit soubor"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer text-center py-6 space-y-3"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-brand-yellow transition-transform hover:scale-105">
                  <FileUp className="h-7 w-7" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    Klikněte pro výběr souboru revize nebo jej přetáhněte sem
                  </p>
                  <p className="text-xs text-gray-400">
                    Podporujeme PDF, JPG, PNG do velikosti 15 MB (fotografie z mobilu se automaticky optimalizují)
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors min-h-[44px]"
                >
                  <FileUp className="w-4 h-4 text-brand-yellow" />
                  Vybrat soubor z počítače / telefonu
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Category selection */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Kategorie / Typ revize *
              </label>
              <span className="text-[11px] text-gray-500">
                Zákonná lhůta se automaticky předvyplní
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {REVISION_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategoryChange(cat.id)}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all min-h-[52px]',
                      isSelected
                        ? 'border-brand-yellow bg-brand-yellow/10 ring-1 ring-brand-yellow/30'
                        : 'border-white/10 bg-[#1a1a1a] hover:border-white/20'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                        isSelected
                          ? 'border-brand-yellow/40 bg-brand-yellow/20 text-brand-yellow'
                          : 'border-white/10 bg-white/5 text-gray-400'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-xs font-semibold truncate', isSelected ? 'text-white' : 'text-gray-300')}>
                        {cat.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {cat.defaultIntervalYears === 1 ? '1 rok' : cat.defaultIntervalYears < 5 ? `${cat.defaultIntervalYears} roky` : `${cat.defaultIntervalYears} let`} lhůta
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Revision Name / Protocol Number */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5 flex items-center justify-between">
                <span>Název nebo označení revize (lze přepsat)</span>
                <span className="text-[11px] text-gray-500 lowercase">např. dle protokolu</span>
              </label>
              <input
                type="text"
                value={revisionName}
                onChange={(e) => setRevisionName(e.target.value)}
                placeholder={`Např. Pravidelná revize ${selectedCategory.shortName.toLowerCase()}`}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-brand-yellow min-h-[44px]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Číslo protokolu (volitelné)
              </label>
              <input
                type="text"
                value={protocolNumber}
                onChange={(e) => setProtocolNumber(e.target.value)}
                placeholder="Např. REV-2026/04"
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-brand-yellow min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Validity & Expiration (Automatic Legal Calculations) */}
        <div className="space-y-4 border-t border-white/10 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-brand-yellow">
                2
              </span>
              <span>Platnost revize a automatické hlídání lhůt</span>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Hlídání lhůt zdarma
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 flex items-center justify-between">
                <span>Datum vyhotovení revize</span>
                <span className="text-[11px] text-gray-400">Kdy technik provedl</span>
              </label>
              <input
                type="date"
                value={issuedDate}
                onChange={(e) => handleIssuedDateChange(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-sm text-white outline-none transition-all focus:border-brand-yellow min-h-[44px]"
              />
              <p className="text-[11px] text-gray-500 mt-1.5">
                Datum provedení revize zapsané v protokolu.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Platnost revize do (Příští kontrola) *
                </label>
                {isManualValidUntil && (
                  <button
                    type="button"
                    onClick={handleResetToLegalNorm}
                    className="text-[11px] text-brand-yellow hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Obnovit zákonnou lhůtu
                  </button>
                )}
              </div>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => {
                  setValidUntil(e.target.value);
                  setIsManualValidUntil(true);
                }}
                className="w-full rounded-xl border border-emerald-500/30 bg-[#1a1a1a] p-3 text-sm text-white outline-none transition-all focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 min-h-[44px]"
              />

              {/* Helpful prefill indicator badge */}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span>
                  {isManualValidUntil
                    ? 'Ručně zadané datum platnosti (systém vás včas upozorní).'
                    : `Předvyplněno: +${selectedCategory.defaultIntervalYears} ${selectedCategory.defaultIntervalYears === 1 ? 'rok' : selectedCategory.defaultIntervalYears < 5 ? 'roky' : 'let'} dle ${selectedCategory.lawNorm}.`}
                </span>
              </div>

              {/* Quick shortcut buttons */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="text-[10px] font-semibold text-gray-500 uppercase mr-1">Rychlá volba:</span>
                {[1, 2, 3, 4, 5, 10].map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => handleQuickPresetYears(yr)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors min-h-[28px]",
                      validUntil === addYearsToDateString(issuedDate || todayStr, yr)
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    +{yr} {yr === 1 ? 'rok' : yr < 5 ? 'roky' : 'let'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-3 text-xs text-gray-400 flex items-start gap-2.5 border border-white/5">
            <Info className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />
            <span>
              <strong>Jak funguje hlídání lhůt?</strong> Systém automaticky odešle bezplatné upozornění 30 dní a 7 dní před vypršením platnosti na váš e-mail a SMS, abyste měli jistotu, že vaše nemovitost je vždy kryta pojištěním a v souladu se zákonem.
            </span>
          </div>
        </div>

        {/* Step 3: Property Assignment */}
        <div className="space-y-4 border-t border-white/10 pt-6">
          <div className="flex items-center gap-2 text-base font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-brand-yellow">
              3
            </span>
            <span>Přiřazení nemovitosti a údaje technika</span>
          </div>

          {properties.length > 0 && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Přiřadit k evidované nemovitosti:
              </label>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((p) => {
                  const isSelected = !useCustomAddress && selectedPropertyId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handlePropertyChange(p.id)}
                      className={cn(
                        'rounded-2xl border p-4 text-left transition-all min-h-[52px]',
                        isSelected
                          ? 'border-brand-yellow/50 bg-brand-yellow/10 ring-1 ring-brand-yellow/30'
                          : 'border-white/10 bg-[#1a1a1a] hover:border-white/20'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Nemovitost</p>
                        {isSelected && <Check className="w-3.5 h-3.5 text-brand-yellow" />}
                      </div>
                      <p className={cn('text-sm font-bold truncate mt-0.5', isSelected ? 'text-brand-yellow' : 'text-white')}>
                        {p.name}
                      </p>
                      {p.address && <p className="text-xs text-gray-400 truncate mt-1">{p.address}</p>}
                    </button>
                  );
                })}

                <button
                  type="button"
                  onClick={() => {
                    setUseCustomAddress(true);
                    setSelectedPropertyId('');
                  }}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all min-h-[52px]',
                    useCustomAddress
                      ? 'border-brand-yellow/50 bg-brand-yellow/10 ring-1 ring-brand-yellow/30'
                      : 'border-dashed border-white/20 bg-[#1a1a1a]/50 hover:border-white/30'
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Jiný objekt</p>
                  <p className={cn('text-sm font-bold truncate mt-0.5', useCustomAddress ? 'text-brand-yellow' : 'text-gray-300')}>
                    + Zadat jinou adresu
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-1">Zadání ruční adresy</p>
                </button>
              </div>
            </div>
          )}

          {(useCustomAddress || properties.length === 0) && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Adresa nemovitosti (Ulice, č.p., Město) *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Např. Korunní 124, Praha 2, 120 00"
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-brand-yellow min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Typ objektu
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-sm text-white outline-none transition-all focus:border-brand-yellow min-h-[44px]"
                  >
                    <option value="Byt">Byt (jednotka)</option>
                    <option value="Rodinný dům">Rodinný dům</option>
                    <option value="Bytový dům / SVJ">Bytový dům / SVJ</option>
                    <option value="Komerční prostor">Komerční prostor / Kancelář</option>
                    <option value="Pozemek / Jiné">Jiné zařízení</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-1">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Upřesnění podlaží / bytu (volitelné)
              </label>
              <input
                type="text"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="Např. Byt č. 12, 3. NP"
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-brand-yellow min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Jméno revizního technika (volitelné)
              </label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="Např. Ing. Karel Novák (TIČR)"
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-brand-yellow min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Doplňující poznámka (volitelné)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Např. Zjištěné drobné závady, datum příštího servisu..."
                className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] p-3 text-sm text-white placeholder-gray-600 outline-none transition-all focus:border-brand-yellow min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="border-t border-white/10 pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-white">Cena za uložení:</span>
                <span className="text-xl font-extrabold text-emerald-400">0 Kč (Zdarma)</span>
              </div>
              <p className="text-xs text-gray-400">
                Revize bude uložena do vašeho osobního trezoru. Žádný technik nebude kontaktován ani účtován.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="w-full sm:w-auto min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-brand-yellow px-8 py-3.5 text-base font-bold text-black transition-all hover:bg-brand-yellow-hover shadow-xl shadow-brand-yellow/10 active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ukládání do trezoru...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  Uložit revizi do trezoru (Zdarma)
                </>
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Bezplatná archivace</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Automatické hlídání lhůt platnosti</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Zabezpečené šifrované úložiště</span>
          </div>
        </div>
      </form>
    </div>
  );
}
