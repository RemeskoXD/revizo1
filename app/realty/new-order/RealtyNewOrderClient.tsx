'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Check, ChevronRight, Home, Zap, FileText, Calendar, User, Phone,
  MapPin, Info, ArrowLeft, Loader2, CheckCircle2, Plus, UploadCloud, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPriceCzk } from '@/lib/order-pricing';
import Link from 'next/link';
import SubscriptionPricingBanner from '@/components/marketing/SubscriptionPricingBanner';
import UploadOwnRevisionForm from '@/components/revisions/UploadOwnRevisionForm';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

type PropertyOption = {
  id: string;
  name: string;
  address: string | null;
};

const DEFAULT_SERVICE_TYPES = [
  { id: 'elektro_byt', label: 'Elektroinstalace – Byt', desc: 'Revize elektroinstalace v bytové jednotce', price: 'od 2 500 Kč', priceValue: 2500, group: 'Elektro' },
  { id: 'elektro_dum', label: 'Elektroinstalace – Dům', desc: 'Kompletní revize elektro v rodinném domě', price: 'od 3 500 Kč', priceValue: 3500, group: 'Elektro' },
  { id: 'elektro_spolecne', label: 'Elektro – Společné prostory', desc: 'Revize společných prostor bytového domu', price: 'od 4 000 Kč', priceValue: 4000, group: 'Elektro' },
  { id: 'plyn', label: 'Plynové zařízení', desc: 'Kontrola plynových spotřebičů a rozvodů', price: 'od 1 800 Kč', priceValue: 1800, group: 'Plyn' },
  { id: 'hromosvod', label: 'Hromosvod', desc: 'Revize systému ochrany před bleskem', price: 'od 3 000 Kč', priceValue: 3000, group: 'Elektro' },
  { id: 'kominy', label: 'Komíny a spalinové cesty', desc: 'Kontrola a čištění komínů', price: 'od 1 200 Kč', priceValue: 1200, group: 'Požární' },
  { id: 'hasici_pristroje', label: 'Hasicí přístroje', desc: 'Kontrola a revize hasicích přístrojů', price: 'od 500 Kč/ks', priceValue: 500, group: 'Požární' },
  { id: 'pozarni', label: 'Požární bezpečnost', desc: 'Požární revize objektu (PBŘ, únikové cesty)', price: 'od 3 500 Kč', priceValue: 3500, group: 'Požární' },
  { id: 'vytahy', label: 'Výtahy', desc: 'Odborná zkouška a provozní prohlídka výtahů', price: 'od 5 000 Kč', priceValue: 5000, group: 'Technická' },
  { id: 'tlakove', label: 'Tlaková zařízení', desc: 'Revize tlakových nádob a zařízení', price: 'od 2 500 Kč', priceValue: 2500, group: 'Technická' },
  { id: 'komplexni', label: 'Komplexní revize objektu', desc: 'Kompletní revizní audit celé nemovitosti', price: 'Individuální', priceValue: 5000, group: 'Komplex' },
];

const steps = [
  { id: 1, name: 'Typ revize', icon: Zap },
  { id: 2, name: 'Nemovitost', icon: Home },
  { id: 3, name: 'Kontakt', icon: User },
  { id: 4, name: 'Termín', icon: Calendar },
  { id: 5, name: 'Shrnutí', icon: FileText },
];

export default function RealtyNewOrderClient({ properties }: { properties: PropertyOption[] }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [orderMode, setOrderMode] = useState<'TECHNICIAN' | 'UPLOAD'>('TECHNICIAN');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [reportFile, setReportFile] = useState<string | null>(null);
  const [revisionCategories, setRevisionCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  const [serviceTypes, setServiceTypes] = useState<any[]>(DEFAULT_SERVICE_TYPES);
  const [urgentSurchargeCzk, setUrgentSurchargeCzk] = useState(2000);

  const [serviceType, setServiceType] = useState(DEFAULT_SERVICE_TYPES[0].id);
  const [selectedProperty, setSelectedProperty] = useState(properties[0]?.id || '');
  const [address, setAddress] = useState(properties[0]?.address || properties[0]?.name || '');
  const [floor, setFloor] = useState('');
  const [area, setArea] = useState('');
  const [accessInfo, setAccessInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [isFirstRevision, setIsFirstRevision] = useState(false);
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');

  const getMinDate = () => {
    const d = new Date();
    if (urgency === 'normal') {
      // min 4 dny
      d.setDate(d.getDate() + 4);
    }
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    const minD = getMinDate();
    if (minD && preferredDate && preferredDate < minD) {
      setPreferredDate('');
    }
  }, [urgency, serviceType]);

  useEffect(() => {
    fetch('/api/pricing').then(r => r.json()).then(data => {
      if (data.urgentSurcharge !== undefined) setUrgentSurchargeCzk(data.urgentSurcharge);
    }).catch(() => {});

    fetch('/api/packages').then(r => r.json()).then(data => {
      if (data.packages && data.packages.length > 0) {
        const dbPackages = data.packages.map((p: any) => ({
          id: p.id,
          label: p.name,
          desc: p.description,
          price: p.approximatePrice ? `od ${p.approximatePrice.toLocaleString('cs-CZ')} Kč` : 'Individuální',
          priceValue: p.approximatePrice || 2500,
          group: 'Revize'
        }));
        setServiceTypes([
          ...dbPackages,
          ...DEFAULT_SERVICE_TYPES.filter(d => !dbPackages.some((bp: any) => bp.label.toLowerCase() === d.label.toLowerCase()))
        ]);
      }
    }).catch(() => {});

    fetch('/api/revisions').then(r => r.json()).then(setRevisionCategories).catch(() => {});

    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const type = sp.get('serviceType');
      const mode = sp.get('mode');
      if (type === 'vlastni_revize' || mode === 'upload') {
        setOrderMode('UPLOAD');
      } else if (type) {
        setServiceType(type);
      }
      const propId = sp.get('propertyId');
      if (propId) {
        const found = properties.find(p => p.id === propId);
        if (found) {
          setSelectedProperty(found.id);
          setAddress(found.address || found.name);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (session?.user) {
      setContactName(session.user.name || '');
      setContactEmail(session.user.email || '');
    }
  }, [session]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        toast.error('Soubor je příliš velký (maximum je 15 MB). Zvolte prosím menší soubor.');
        return;
      }
      const { compressImage, fileToBase64 } = await import('@/lib/client-compress');
      const compressed = await compressImage(file, { maxSizeMB: 4, maxWidthOrHeight: 3000 });
      const b64 = await fileToBase64(compressed);
      setReportFile(b64);
      toast.success('Revizní zpráva připravena k nahrání');
    }
  };

  const selectedService = serviceTypes.find(s => s.id === serviceType);
  const basePriceOnly = selectedService?.priceValue ?? 2500;
  
  let estimatedPrice = basePriceOnly;
  if (serviceType !== 'vlastni_revize' && urgency === 'urgent') {
      estimatedPrice += urgentSurchargeCzk;
  }
  if (serviceType === 'vlastni_revize') estimatedPrice = 0;

  const canProceed = () => {
    if (currentStep === 1) return !!serviceType;
    if (currentStep === 2) return !!selectedProperty;
    if (currentStep === 3) return contactName.length >= 2 && contactPhone.length >= 6;
    if (currentStep === 4) {
      if (preferredDate) {
        const minDate = getMinDate();
        if (minDate && preferredDate < minDate) {
          return false;
        }
      }
    }
    return true;
  };

  const nextStep = () => {
    if (canProceed()) setCurrentStep(prev => Math.min(prev + 1, steps.length));
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const onSubmit = async () => {
    if (!selectedProperty) {
      toast.error('Chyba: Nebyla vybrána žádná nemovitost.');
      return;
    }
    setIsSubmitting(true);
    try {
      const formattedNotes = [
        notes,
        floor ? `Podlaží: ${floor}` : '',
        area ? `Plocha: ${area} m²` : '',
        accessInfo ? `Přístup: ${accessInfo}` : '',
        isFirstRevision ? 'Typ: Výchozí (první) revize' : '',
        `Kontakt: ${contactName}, tel: ${contactPhone}, e-mail: ${contactEmail}`,
      ].filter(Boolean).join('\n');

      const res = await fetch(`/api/properties/${selectedProperty}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType: selectedService?.label || serviceType,
          serviceTypeId: serviceType,
          propertyType: 'Byt',
          address,
          notes: formattedNotes,
          preferredDate: preferredDate || null,
          isUrgent: serviceType !== 'vlastni_revize' && urgency === 'urgent',
          reportFile: serviceType === 'vlastni_revize' ? reportFile : null,
          revisionCategoryId: selectedCategoryId || null,
        }),
      });

      if (res.ok) {
        setIsSuccess(true);
        toast.success('Poptávka revize byla úspěšně odeslána!');
        setTimeout(() => {
          router.push(`/realty/properties/${selectedProperty}`);
        }, 1500);
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.message || 'Došlo k chybě při odesílání objednávky.');
      }
    } catch {
      toast.error('Došlo k chybě při odesílání objednávky.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (properties.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/realty" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 group">
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Nová objednávka</h1>
        </div>
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-12 text-center">
          <Home className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nejdříve přidejte nemovitost</h3>
          <p className="text-gray-500 mb-6">Pro objednání revize musíte mít alespoň jednu nemovitost ve svém portfoliu.</p>
          <Link href="/realty/properties" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors">
            <Plus className="w-5 h-5" /> Přidat nemovitost
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="mx-auto mt-8 max-w-2xl space-y-6 px-3 text-center sm:mt-12 sm:px-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/10">
          <Check className="h-10 w-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">Objednávka odeslána!</h2>
        <p className="text-gray-400">Přesměrovávám vás zpět...</p>
      </div>
    );
  }

  if (orderMode === 'UPLOAD') {
    return (
      <div className="mx-auto max-w-4xl px-3 pb-8 sm:px-4">
        <div className="mb-6 flex items-start gap-3 sm:mb-8 sm:items-center sm:gap-4">
          <Link href="/realty" className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-white sm:text-2xl">Nahrát vlastní revizi do trezoru</h1>
            <p className="text-sm text-gray-400 sm:text-base">Máte již vyhotovenou revizi od technika? Zde ji můžete bezplatně archivovat a nastavit automatické hlídání lhůt.</p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="mb-6 rounded-2xl bg-[#141414] p-1.5 border border-white/10 flex gap-1">
          <button
            type="button"
            onClick={() => setOrderMode('TECHNICIAN')}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 min-h-[44px]"
          >
            <Zap className="w-4 h-4 shrink-0 text-brand-yellow" />
            <span>Objednat revizi u technika</span>
          </button>
          <button
            type="button"
            onClick={() => setOrderMode('UPLOAD')}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-white text-black shadow-md min-h-[44px]"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 text-black" />
            <span>Nahrát vlastní revizi (Zdarma)</span>
          </button>
        </div>

        <UploadOwnRevisionForm
          properties={properties}
          defaultPropertyId={selectedProperty}
          role="REALTOR"
          onSuccessRedirect={`/realty/properties/${selectedProperty || (properties[0]?.id ?? '')}`}
          onSwitchToOrder={() => setOrderMode('TECHNICIAN')}
        />
      </div>
    );
  }

  const selectedPropertyDetails = properties.find(p => p.id === selectedProperty);

  return (
    <div className="mx-auto max-w-4xl px-3 pb-8 sm:px-4">
      <div className="mb-6 flex items-start gap-3 sm:mb-8 sm:items-center sm:gap-4">
        <Link href="/realty" className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Nová objednávka revize</h1>
          <p className="text-sm text-gray-400 sm:text-base">Vyberte si nemovitost ze svého portfolia.</p>
        </div>
      </div>

      <div className="mb-6">
        <SubscriptionPricingBanner />
      </div>

      {/* Mode Switcher */}
      <div className="mb-6 rounded-2xl bg-[#141414] p-1.5 border border-white/10 flex gap-1">
        <button
          type="button"
          onClick={() => setOrderMode('TECHNICIAN')}
          className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-brand-yellow text-black shadow-md shadow-brand-yellow/10 min-h-[44px]"
        >
          <Zap className="w-4 h-4 shrink-0 text-black" />
          <span>Objednat revizi u technika</span>
        </button>
        <button
          type="button"
          onClick={() => setOrderMode('UPLOAD')}
          className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-white/5 min-h-[44px]"
        >
          <ShieldCheck className="w-4 h-4 shrink-0 text-gray-400" />
          <span>Nahrát vlastní revizi (Zdarma)</span>
        </button>
      </div>

      {/* Progress Tracker */}
      <div className="table-scroll -mx-3 mb-8 px-3 pb-2 sm:mx-0 sm:mb-10 sm:px-0">
        <div className="relative flex w-full min-w-[320px] max-w-full items-center justify-between sm:min-w-[500px]">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#1A1A1A] -z-10" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-yellow -z-10 transition-all duration-500" style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }} />
          {steps.map(step => (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-[#111111] px-2">
              <div className={cn("w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                currentStep >= step.id ? "border-brand-yellow bg-brand-yellow text-black" : "border-[#333] bg-[#1A1A1A] text-gray-500"
              )}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={cn("text-xs font-medium transition-colors whitespace-nowrap", currentStep >= step.id ? "text-brand-yellow" : "text-gray-500")}>{step.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Multi-Step Modal-styled Container */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#1A1A1A] p-4 shadow-xl sm:p-6 md:p-8">
        <AnimatePresence mode="wait">
          
          {/* Step 1: Service Type */}
          {currentStep === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
              <h3 className="text-xl font-semibold text-white">O jakou revizi máte zájem?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {serviceTypes.map(type => (
                  <label key={type.id} className={cn(
                    "relative flex flex-col p-4 cursor-pointer rounded-xl border-2 transition-all hover:bg-white/5",
                    serviceType === type.id ? "border-brand-yellow bg-brand-yellow/5" : "border-white/10"
                  )}>
                    <input type="radio" value={type.id} checked={serviceType === type.id} onChange={() => setServiceType(type.id)} className="sr-only" />
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn("font-semibold text-sm", serviceType === type.id ? "text-brand-yellow" : "text-white")}>{type.label}</span>
                      {serviceType === type.id && <Check className="w-4 h-4 text-brand-yellow shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{type.desc}</p>
                    <span className="text-xs font-mono text-gray-600 mt-auto">{type.price}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Property Selection/Input */}
          {currentStep === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
              <h3 className="text-xl font-semibold text-white">Kde bude revize probíhat?</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5 font-semibold">Vyberte nemovitost z portfolia *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 stylish-scrollbar">
                  {properties.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProperty(p.id);
                        setAddress(p.address || p.name);
                      }}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all",
                        selectedProperty === p.id
                          ? 'bg-brand-yellow/10 border-brand-yellow/30 ring-1 ring-brand-yellow/20'
                          : 'bg-[#111] border-white/10 hover:border-white/20'
                      )}
                    >
                      <p className={cn("text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1")}>Moje Nemovitost</p>
                      <p className={cn("text-sm font-bold truncate", selectedProperty === p.id ? 'text-brand-yellow' : 'text-white')}>{p.name}</p>
                      {p.address && <p className="text-xs text-gray-500 mt-1 truncate"><MapPin className="w-3 h-3 inline mr-1" />{p.address}</p>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Podlaží / patro (nepovinné)</label>
                  <input type="text" value={floor} onChange={e => setFloor(e.target.value)} placeholder="Např. 4. patro, byt č. 14"
                    className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Plocha m² (nepovinné)</label>
                  <input type="number" value={area} onChange={e => setArea(e.target.value)} placeholder="Např. 75"
                    className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Informace o přístupu a klíčích (nepovinné)</label>
                <textarea value={accessInfo} onChange={e => setAccessInfo(e.target.value)} rows={2}
                  placeholder="Klíče na recepci, kód od schránky, nájemník Jiří mobil..."
                  className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none transition-all resize-none" />
              </div>

              <label className="flex items-center gap-3 p-3 bg-[#111] border border-white/10 rounded-lg cursor-pointer hover:border-white/20 transition-colors">
                <input type="checkbox" checked={isFirstRevision} onChange={e => setIsFirstRevision(e.target.checked)} className="w-4 h-4 rounded" />
                <div>
                  <span className="text-sm text-white font-medium">Výchozí (první) revize zařízení</span>
                  <p className="text-xs text-gray-500">Jedná se o první/výchozí revizi pro toto zařízení</p>
                </div>
              </label>

              {serviceType === 'vlastni_revize' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Nahrát hotovou revizi (PDF, JPG)</label>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange}
                    className="w-full bg-[#111] border border-white/10 rounded-lg p-2 text-white focus:border-brand-yellow outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-yellow file:text-black hover:file:bg-brand-yellow-hover" />
                  {reportFile && <p className="text-sm text-green-500 mt-2">Zpráva byla úspěšně nahrána do zařazení.</p>}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Contact */}
          {currentStep === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
              <h3 className="text-xl font-semibold text-white">Na koho se má technik obrátit?</h3>
              <p className="text-sm text-gray-400">Kontaktní osoba, která bude přítomna u revize (makléř, majitel, nájemce atp.).</p>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Jméno kontaktní osoby *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Zadejte jméno kontaktu"
                    className="w-full bg-[#111] border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-yellow outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Telefonní číslo *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+420 777 123 456"
                    className="w-full bg-[#111] border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:border-brand-yellow outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">E-mail</label>
                <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="makler@reality.cz"
                  className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none transition-all" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Poznámka pro revizního technika</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Uveďte další podrobnosti nahlášené od nájemníků..."
                  className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none transition-all resize-none" />
              </div>
            </motion.div>
          )}

          {/* Step 4: Scheduling */}
          {currentStep === 4 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-5">
              {serviceType === 'vlastni_revize' ? (
                <>
                  <h3 className="text-xl font-semibold text-white">Platnost vaší revize</h3>
                  <p className="text-sm text-gray-400">Zadejte datum, do kdy revize platí. Včas vás upozorníme na nutnost zadání nové objednávky.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Platnost do (nepovinné)</label>
                    <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
                      className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none transition-all" />
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-white">Kdy se vám to hodí?</h3>
                  <p className="text-sm text-gray-400">
                    <strong className="text-gray-300">Standardní:</strong> technik naplánuje konkrétní termín dle domluvy.
                    {' '}
                    <strong className="text-gray-300">Urgentní:</strong> přednostní zařazení do kalendáře do několika dní pro hladký proces prodeje/pronájmu (+ {formatPriceCzk(urgentSurchargeCzk)}).
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Preferované datum (orientační)</label>
                    <input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
                      min={getMinDate()}
                      className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none transition-all" />
                    <p className="text-xs text-gray-600 mt-1.5">
                      {urgency === 'normal' ? 'Pro standardní objednávku lze vybrat termín nejdříve za 4 dny.' : 'U urgentní žádosti vyberte nejbližší možný termín.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2 font-semibold font-medium text-gray-300">Priorita termínu</label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button type="button" onClick={() => setUrgency('normal')}
                        className={cn("p-4 rounded-lg border text-left transition-all",
                          urgency === 'normal' ? "border-brand-yellow bg-brand-yellow/10 animate" : "border-white/10 hover:border-white/20"
                        )}>
                        <p className={cn("font-semibold text-sm", urgency === 'normal' ? "text-brand-yellow" : "text-white")}>Standardní</p>
                        <p className="text-xs text-gray-500 mt-1">Dle standardních kapacit a telefonického kontaktu technika</p>
                      </button>
                      <button type="button" onClick={() => setUrgency('urgent')}
                        className={cn("p-4 rounded-lg border text-left transition-all",
                          urgency === 'urgent' ? "border-red-500 bg-red-500/10" : "border-white/10 hover:border-white/20"
                        )}>
                        <p className={cn("font-semibold text-sm", urgency === 'urgent' ? "text-red-400" : "text-white")}>Urgentní</p>
                        <p className="text-xs text-gray-500 mt-1">+ {formatPriceCzk(urgentSurchargeCzk)} prioritní termín na klíč</p>
                      </button>
                    </div>
                  </div>

                  {revisionCategories.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-1.5">Kategorie revize</label>
                      <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white focus:border-brand-yellow outline-none">
                        <option value="">Vyberte typ prostředí...</option>
                        {Object.entries(
                          revisionCategories.reduce((acc: Record<string, any[]>, cat: any) => {
                            if (!acc[cat.group]) acc[cat.group] = [];
                            acc[cat.group].push(cat);
                            return acc;
                          }, {})
                        ).map(([group, cats]) => (
                          <optgroup key={group} label={group}>
                            {(cats as any[]).map((cat: any) => (
                              <option key={cat.id} value={cat.id}>{cat.name} ({cat.intervalMonths} měs.)</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Step 5: Summary */}
          {currentStep === 5 && (
            <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }} className="space-y-6">
              <h3 className="text-xl font-semibold text-white">Kontrola a odeslání objednávky</h3>

              <div className="bg-[#111] rounded-xl p-6 space-y-4 border border-white/5">
                {[
                  { label: 'Vybraná nemovitost', value: selectedPropertyDetails?.name },
                  { label: 'Typ revize', value: selectedService?.label || serviceType },
                  { label: 'Adresa nemovitosti', value: address },
                  floor ? { label: 'Upřesnění podlaží', value: floor } : null,
                  area ? { label: 'Plocha rozlohy', value: `${area} m²` } : null,
                  { label: 'Kontakt u revize', value: `${contactName}, ${contactPhone}` },
                  { label: serviceType === 'vlastni_revize' ? 'Datum platnosti do' : 'Preferovaný termín', value: preferredDate ? new Date(preferredDate).toLocaleDateString('cs-CZ') : 'Dle domluvy' },
                  serviceType !== 'vlastni_revize'
                    ? {
                        label: 'Zvolená urgence',
                        value:
                          urgency === 'urgent'
                            ? `Urgentní (+ ${formatPriceCzk(urgentSurchargeCzk)})`
                            : 'Standardní',
                      }
                    : null,
                ].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex flex-col gap-1 border-b border-white/5 py-2 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <span className="shrink-0 text-sm text-gray-400">{item!.label}</span>
                    <span className="min-w-0 break-words text-right text-sm font-semibold text-white">{item!.value}</span>
                  </div>
                ))}

                {serviceType !== 'vlastni_revize' && (
                  <div className="space-y-2 border-t border-brand-yellow/20 pt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Základní cena revize</span>
                      <span className="text-gray-300 font-semibold">{formatPriceCzk(basePriceOnly)}</span>
                    </div>
                    {urgency === 'urgent' && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium font-semibold text-red-400">Příplatek za urgentní termín</span>
                        <span className="text-red-400/90 font-bold">+ {formatPriceCzk(urgentSurchargeCzk)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1">
                      <span className="font-semibold text-gray-300">Předpokládaná cena celkem</span>
                      <span className="font-bold text-brand-yellow text-lg">{formatPriceCzk(estimatedPrice)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-lg">
                <Info className="w-4 h-4 text-brand-yellow mt-0.5 shrink-0" />
                <p className="text-xs text-gray-400">
                  Potvrzením odešlete objednávku revize. Zakázka bude zařazena do systému a předána certifikovanému technikovi k potvrzení termínu.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons Section */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-8">
          <button type="button" onClick={prevStep} disabled={currentStep === 1}
            className={cn("rounded-lg px-4 py-2.5 text-sm font-medium transition-colors sm:px-6",
              currentStep === 1 ? "cursor-not-allowed text-gray-600" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}>
            Zpět
          </button>

          {currentStep < steps.length ? (
            <button type="button" onClick={nextStep} disabled={!canProceed()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow px-6 py-2.5 text-sm font-semibold text-black shadow-lg shadow-brand-yellow/10 transition-colors hover:bg-brand-yellow-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              Pokračovat <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={onSubmit} disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow px-6 py-2.5 text-sm font-semibold text-black shadow-lg shadow-brand-yellow/10 transition-colors hover:bg-brand-yellow-hover disabled:opacity-50 sm:w-auto sm:px-8">
              {isSubmitting ? 'Odesílání...' : 'Závazně objednat revizi'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
