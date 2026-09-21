'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Check, ChevronRight, Home, Zap, FileText, Calendar, User, Phone,
  MapPin, Info, ArrowLeft, AlertTriangle, UploadCloud, ShieldCheck, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPriceCzk } from '@/lib/order-pricing';
import Link from 'next/link';
import SubscriptionPricingBanner from '@/components/marketing/SubscriptionPricingBanner';
import UploadOwnRevisionForm from '@/components/revisions/UploadOwnRevisionForm';
import { motion, AnimatePresence } from 'motion/react';

interface ServiceItem {
  id: string;
  label: string;
  desc: string;
  price: string;
  priceValue: number;
  group: string;
}

const DEFAULT_TECHNICIAN_SERVICES: ServiceItem[] = [
  { id: 'elektro_byt', label: 'Elektroinstalace – Byt', desc: 'Revize elektroinstalace v bytové jednotce včetně rozvaděče', price: 'od 2 500 Kč', priceValue: 2500, group: 'Elektro' },
  { id: 'elektro_dum', label: 'Elektroinstalace – Dům', desc: 'Kompletní revize elektroinstalace v rodinném domě', price: 'od 3 500 Kč', priceValue: 3500, group: 'Elektro' },
  { id: 'elektro_spolecne', label: 'Elektro – Společné prostory', desc: 'Revize společných prostor bytového domu a chodeb', price: 'od 4 000 Kč', priceValue: 4000, group: 'Elektro' },
  { id: 'plyn', label: 'Plynové zařízení a rozvody', desc: 'Odborná kontrola plynových spotřebičů, kotle a rozvodů', price: 'od 1 800 Kč', priceValue: 1800, group: 'Plyn' },
  { id: 'hromosvod', label: 'Hromosvody a bleskosvody', desc: 'Revize vnějšího systému ochrany před bleskem (LPS)', price: 'od 3 000 Kč', priceValue: 3000, group: 'Elektro' },
  { id: 'kominy', label: 'Komíny a spalinové cesty', desc: 'Pravidelná kontrola a revize spalinových cest dle vyhlášky', price: 'od 1 200 Kč', priceValue: 1200, group: 'Spalinové cesty' },
  { id: 'hasici_pristroje', label: 'Hasicí přístroje a hydranty', desc: 'Periodická kontrola hasicích přístrojů a vnitřních hydrantů', price: 'od 500 Kč/ks', priceValue: 500, group: 'Požární' },
  { id: 'pozarni', label: 'Požární bezpečnost objektu', desc: 'Komplexní požární revize (únikové cesty, PBŘ, požární uzávěry)', price: 'od 3 500 Kč', priceValue: 3500, group: 'Požární' },
  { id: 'vytahy', label: 'Výtahy a zdvihací zařízení', desc: 'Odborná zkouška a inspekční prohlídka výtahů', price: 'od 5 000 Kč', priceValue: 5000, group: 'Technická' },
  { id: 'tlakove', label: 'Tlaková zařízení a kotelny', desc: 'Výchozí a provozní revize tlakových nádob a kotlů', price: 'od 2 500 Kč', priceValue: 2500, group: 'Technická' },
  { id: 'komplexni', label: 'Komplexní revizní audit objektu', desc: 'Kompletní revizní prověření všech instalací nemovitosti', price: 'od 5 000 Kč', priceValue: 5000, group: 'Komplexní' },
];

const UPLOAD_CATEGORIES = [
  { id: 'elektro', label: 'Elektroinstalace a bleskosvody' },
  { id: 'plyn', label: 'Plynová zařízení a kotle' },
  { id: 'kominy', label: 'Komíny a spalinové cesty' },
  { id: 'pozarni', label: 'Požární bezpečnost a hasicí přístroje' },
  { id: 'tlakove', label: 'Tlaková zařízení' },
  { id: 'vytahy', label: 'Výtahy' },
  { id: 'jine', label: 'Ostatní revize' },
];

const PROPERTY_TYPES = [
  { id: 'byt', label: 'Byt' },
  { id: 'dum', label: 'Rodinný dům' },
  { id: 'bytovy_dum', label: 'Bytový dům / SVJ' },
  { id: 'kancelare', label: 'Kancelářské prostory' },
  { id: 'prumysl', label: 'Průmyslový objekt' },
  { id: 'obchod', label: 'Obchod / Provozovna' },
  { id: 'sklad', label: 'Sklad' },
  { id: 'jine', label: 'Jiné' },
];

const steps = [
  { id: 1, name: 'Typ revize', icon: Zap },
  { id: 2, name: 'Nemovitost', icon: Home },
  { id: 3, name: 'Kontakt', icon: User },
  { id: 4, name: 'Termín', icon: Calendar },
  { id: 5, name: 'Shrnutí a cena', icon: FileText },
];

export default function NewOrderPage() {
  const { data: session } = useSession();
  const [orderMode, setOrderMode] = useState<'TECHNICIAN' | 'UPLOAD'>('TECHNICIAN');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdCount, setCreatedCount] = useState(1);
  const [reportFile, setReportFile] = useState<string | null>(null);
  const [reportFileName, setReportFileName] = useState<string | null>(null);
  const [revisionCategories, setRevisionCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [uploadCategory, setUploadCategory] = useState('elektro');

  const [technicianServices, setTechnicianServices] = useState<ServiceItem[]>(DEFAULT_TECHNICIAN_SERVICES);
  const [urgentSurchargeCzk, setUrgentSurchargeCzk] = useState(2000);

  const [serviceTypeIds, setServiceTypeIds] = useState<string[]>(['elektro_byt']);
  const [propertyType, setPropertyType] = useState('byt');
  const [address, setAddress] = useState('');
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
  const [profileData, setProfileData] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    ordersCount?: number;
    objectLimitExtraPaid?: number;
    role?: string;
    existingAddresses?: string[];
    uniqueAddressesCount?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizeAddr = (addr: string) =>
    addr.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[,\.\-\/]+/g, ' ').replace(/\s+/g, ' ').trim();

  const isAddressExisting = () => {
    if (!address.trim() || !profileData?.existingAddresses) return false;
    const cleanCurrent = normalizeAddr(address);
    return profileData.existingAddresses.some(
      ea => normalizeAddr(ea) === cleanCurrent
    );
  };

  const isCustomerNewObjectOverLimit = () => {
    if (profileData?.role !== 'CUSTOMER') return false;
    if (!address.trim() || address.trim().length < 5) return false;
    if (isAddressExisting()) return false;
    const allowed = 1 + (profileData?.objectLimitExtraPaid || 0);
    const currentCount = profileData?.uniqueAddressesCount ?? (profileData?.existingAddresses?.length || 0);
    return currentCount >= allowed;
  };

  const getMinDate = () => {
    if (orderMode === 'UPLOAD') return undefined;
    const d = new Date();
    if (urgency === 'normal') {
      d.setDate(d.getDate() + 4);
    }
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    const minD = getMinDate();
    if (minD && preferredDate && preferredDate < minD) {
      setPreferredDate('');
    }
  }, [urgency, orderMode]);

  useEffect(() => {
    fetch('/api/pricing').then(r => r.json()).then(data => {
      if (data.urgentSurcharge !== undefined) setUrgentSurchargeCzk(data.urgentSurcharge);
    }).catch(() => {});
    
    fetch('/api/packages').then(r => r.json()).then(data => {
      if (data.packages && data.packages.length > 0) {
        const pkgs: ServiceItem[] = data.packages.map((p: any) => ({
          id: p.id,
          label: p.name,
          desc: p.description || '',
          price: p.approximatePrice ? `od ${p.approximatePrice.toLocaleString('cs-CZ')} Kč` : 'Individuální',
          priceValue: p.approximatePrice || 2500,
          group: p.category || 'Revize'
        }));
        setTechnicianServices(pkgs);
      }
    }).catch(() => {});

    fetch('/api/revisions').then(r => r.json()).then(setRevisionCategories).catch(() => {});

    if (typeof window !== 'undefined') {
      const type = new URLSearchParams(window.location.search).get('serviceType');
      const mode = new URLSearchParams(window.location.search).get('mode');
      if (type === 'vlastni_revize' || mode === 'upload') {
        setOrderMode('UPLOAD');
        setServiceTypeIds(['vlastni_revize']);
      } else if (type) {
        setOrderMode('TECHNICIAN');
        setServiceTypeIds([type]);
      }
    }
    
    fetch('/api/user/profile').then(r => r.json()).then(data => {
      setProfileData(data);
      if (data.name) setContactName(data.name);
      if (data.email) setContactEmail(data.email);
      if (data.phone) setContactPhone(data.phone);
      if (data.address) {
        setAddress(data.address);
      } else if (data.existingAddresses && data.existingAddresses.length > 0) {
        setAddress(data.existingAddresses[0]);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (session?.user && !contactName) {
      setContactName(session.user.name || '');
      setContactEmail(session.user.email || '');
    }
  }, [session, contactName]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReportFileName(file.name);
      const { compressImage, fileToBase64 } = await import('@/lib/client-compress');
      const compressed = await compressImage(file, { maxSizeMB: 4, maxWidthOrHeight: 3000 });
      const b64 = await fileToBase64(compressed);
      setReportFile(b64);
    }
  };

  const handleModeChange = (newMode: 'TECHNICIAN' | 'UPLOAD') => {
    setOrderMode(newMode);
    setError(null);
    if (newMode === 'UPLOAD') {
      setServiceTypeIds(['vlastni_revize']);
    } else {
      if (serviceTypeIds.includes('vlastni_revize') || serviceTypeIds.length === 0) {
        setServiceTypeIds(['elektro_byt']);
      }
    }
  };

  const toggleService = (id: string) => {
    setServiceTypeIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        return next.length === 0 ? [id] : next;
      } else {
        return [...prev.filter(x => x !== 'vlastni_revize'), id];
      }
    });
  };

  // Rychlé balíčky
  const selectHouseBundle = () => {
    setOrderMode('TECHNICIAN');
    const houseIds = ['elektro_dum', 'plyn', 'kominy'].filter(id => 
      technicianServices.some(s => s.id === id)
    );
    setServiceTypeIds(houseIds.length > 0 ? houseIds : ['elektro_dum', 'plyn']);
  };

  const selectFlatBundle = () => {
    setOrderMode('TECHNICIAN');
    const flatIds = ['elektro_byt', 'plyn'].filter(id => 
      technicianServices.some(s => s.id === id)
    );
    setServiceTypeIds(flatIds.length > 0 ? flatIds : ['elektro_byt']);
  };

  const selectAllServices = () => {
    setOrderMode('TECHNICIAN');
    setServiceTypeIds(technicianServices.map(s => s.id));
  };

  const clearServices = () => {
    if (technicianServices.length > 0) {
      setServiceTypeIds([technicianServices[0].id]);
    }
  };

  const selectedServices = orderMode === 'UPLOAD'
    ? []
    : technicianServices.filter(s => serviceTypeIds.includes(s.id));

  const basePriceOnly = selectedServices.reduce((sum, s) => sum + (s.priceValue || 0), 0);
  
  let estimatedPrice = basePriceOnly;
  if (orderMode === 'TECHNICIAN' && urgency === 'urgent') {
    estimatedPrice += urgentSurchargeCzk;
  }
  if (orderMode === 'UPLOAD') {
    estimatedPrice = 0;
  }

  const canProceed = () => {
    if (currentStep === 1) {
      if (orderMode === 'UPLOAD') return true;
      return serviceTypeIds.filter(id => id !== 'vlastni_revize').length > 0;
    }
    if (currentStep === 2) {
      if (address.trim().length < 5) return false;
      return true;
    }
    if (currentStep === 3) {
      return contactName.trim().length >= 2 && contactPhone.trim().length >= 6;
    }
    if (currentStep === 4) {
      if (orderMode === 'TECHNICIAN' && preferredDate) {
        const minDate = getMinDate();
        if (minDate && preferredDate < minDate) {
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const nextStep = () => {
    if (canProceed()) {
      setError(null);
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const onSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const finalServiceIds = orderMode === 'UPLOAD'
      ? ['vlastni_revize']
      : serviceTypeIds.filter(id => id !== 'vlastni_revize');

    if (finalServiceIds.length === 0) {
      setError('Vyberte prosím alespoň jednu revizi.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceTypeIds: finalServiceIds,
          propertyType: PROPERTY_TYPES.find(p => p.id === propertyType)?.label || propertyType,
          address,
          notes: [
            notes,
            floor ? `Podlaží: ${floor}` : '',
            area ? `Plocha: ${area} m²` : '',
            accessInfo ? `Přístup: ${accessInfo}` : '',
            isFirstRevision ? 'Typ: Výchozí (první) revize' : '',
            orderMode === 'UPLOAD' ? `Kategorie vlastní revize: ${UPLOAD_CATEGORIES.find(c => c.id === uploadCategory)?.label || uploadCategory}` : '',
            `Kontakt: ${contactName}, tel: ${contactPhone}, e-mail: ${contactEmail}`,
          ].filter(Boolean).join('\n'),
          preferredDate: preferredDate || null,
          isUrgent: orderMode === 'TECHNICIAN' && urgency === 'urgent',
          reportFile: orderMode === 'UPLOAD' ? reportFile : null,
          revisionCategoryId: selectedCategoryId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreatedCount(data.orders?.length || finalServiceIds.length);
        setIsSuccess(true);
        if (data.url) {
          window.location.href = data.url;
        }
      } else if (res.status === 402) {
        const data = await res.json();
        if (data.checkoutPath) {
          window.location.href = data.checkoutPath;
        } else {
          setError(data.message || 'Pro dokončení objednávky je vyžadována platba.');
        }
      } else {
        const data = await res.json();
        setError(data.message || 'Došlo k chybě při odesílání objednávky.');
      }
    } catch {
      setError('Došlo k chybě při odesílání objednávky.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto mt-8 max-w-2xl space-y-6 px-3 text-center sm:mt-12 sm:px-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <Check className="h-10 w-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          {orderMode === 'UPLOAD' ? 'Revize úspěšně nahrána!' : 'Objednávka úspěšně odeslána!'}
        </h2>
        <p className="text-gray-300 max-w-lg mx-auto">
          {orderMode === 'UPLOAD'
            ? 'Váš revizní protokol byl bezpečně zaevidován. Nyní automaticky hlídáme termíny platnosti a včas vás upozorníme.'
            : `Vaše sdružená objednávka (${createdCount} ${createdCount === 1 ? 'revize' : createdCount < 5 ? 'revize' : 'revizí'}) byla vytvořena. Podrobné shrnutí včetně kalkulace jsme odeslali na váš e-mail.`}
        </p>
        <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-center sm:gap-4">
          <Link href="/dashboard" className="rounded-xl border border-white/10 bg-[#1A1A1A] px-6 py-3 text-white transition-colors hover:bg-[#252525]">
            Zpět na přehled
          </Link>
          <Link href="/dashboard/orders" className="rounded-xl bg-brand-yellow px-6 py-3 font-semibold text-black transition-colors hover:bg-brand-yellow-hover shadow-lg shadow-brand-yellow/10">
            Přejít do seznamu zakázek
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-3 pb-8 sm:px-4">
      {/* Header */}
      <div className="mb-6 flex items-start gap-3 sm:mb-8 sm:items-center sm:gap-4">
        <Link href="/dashboard" className="shrink-0 rounded-xl p-2.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-white border border-white/5">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">
            {orderMode === 'UPLOAD' ? 'Nahrát vlastní revizi do trezoru' : 'Nová objednávka revize'}
          </h1>
          <p className="text-sm text-gray-400 sm:text-base">
            {orderMode === 'UPLOAD'
              ? 'Nahrajte svoji stávající revizi od libovolného technika. Systém ji bezpečně archivuje a automaticky hlídá termíny platnosti.'
              : 'Objednejte certifikovaného technika pro provedení revize na vaší nemovitosti.'}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <SubscriptionPricingBanner />
      </div>

      {/* Mode Switcher (Apple iOS segmented style) */}
      <div className="mb-6 rounded-2xl bg-[#141414] p-1.5 border border-white/10 flex gap-1">
        <button
          type="button"
          onClick={() => handleModeChange('TECHNICIAN')}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 min-h-[44px]",
            orderMode === 'TECHNICIAN'
              ? "bg-brand-yellow text-black shadow-md shadow-brand-yellow/10"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>Objednat revizi u technika</span>
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('UPLOAD')}
          className={cn(
            "flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 min-h-[44px]",
            orderMode === 'UPLOAD'
              ? "bg-white text-black shadow-md"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          <UploadCloud className="w-4 h-4 shrink-0" />
          <span>Nahrát vlastní revizi (Zdarma)</span>
        </button>
      </div>

      {orderMode === 'UPLOAD' ? (
        <UploadOwnRevisionForm
          properties={(profileData?.existingAddresses || []).map((addr: string) => ({
            id: addr,
            name: addr,
            address: addr,
          }))}
          defaultAddress={address || profileData?.address || (profileData?.existingAddresses?.[0] || '')}
          role="CUSTOMER"
          onSuccessRedirect="/dashboard/vault"
          onSwitchToOrder={() => handleModeChange('TECHNICIAN')}
        />
      ) : (
        <>
          {/* Step Progress Bar */}
          <div className="table-scroll -mx-3 mb-8 px-3 pb-2 sm:mx-0 sm:mb-10 sm:px-0">
            <div className="relative flex w-full min-w-[320px] max-w-full items-center justify-between sm:min-w-[500px]">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-[#1A1A1A] -z-10" />
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand-yellow -z-10 transition-all duration-500"
                style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              />
              {steps.map(step => (
                <div key={step.id} className="flex flex-col items-center gap-2 bg-[#111111] px-2">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    currentStep >= step.id ? "border-brand-yellow bg-brand-yellow text-black" : "border-[#333] bg-[#1A1A1A] text-gray-500"
                  )}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={cn(
                    "text-xs font-medium transition-colors whitespace-nowrap",
                    currentStep >= step.id ? "text-brand-yellow" : "text-gray-500"
                  )}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

      {/* Form Container */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#171717] p-4 shadow-2xl sm:p-6 md:p-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Services */}
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-white">Vyberte požadované revize</h3>
                <p className="text-sm text-gray-400 mt-1">
                  Můžete označit více revizí najednou pro jednu nemovitost. Vytvoří se sdružená objednávka se souhrnnou kalkulací.
                </p>
              </div>

                  {/* Quick bundle buttons */}
                  <div className="flex flex-wrap items-center gap-2 p-3 bg-[#111] rounded-xl border border-white/5">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider mr-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-brand-yellow" /> Rychlý výběr:
                    </span>
                    <button
                      type="button"
                      onClick={selectFlatBundle}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-colors"
                    >
                      ⚡ Byt (Elektro + Plyn)
                    </button>
                    <button
                      type="button"
                      onClick={selectHouseBundle}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-colors"
                    >
                      🏡 Rodinný dům (Elektro + Plyn + Komíny)
                    </button>
                    <button
                      type="button"
                      onClick={selectAllServices}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-brand-yellow border border-brand-yellow/30 transition-colors"
                    >
                      ✓ Označit vše
                    </button>
                    <button
                      type="button"
                      onClick={clearServices}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-300 transition-colors ml-auto"
                    >
                      Zrušit výběr
                    </button>
                  </div>

                  {/* Services Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {technicianServices.map(service => {
                      const isSelected = serviceTypeIds.includes(service.id);
                      return (
                        <div
                          key={service.id}
                          onClick={() => toggleService(service.id)}
                          className={cn(
                            "relative flex flex-col p-4 cursor-pointer rounded-xl border-2 transition-all select-none",
                            isSelected
                              ? "border-brand-yellow bg-brand-yellow/10 shadow-md shadow-brand-yellow/5"
                              : "border-white/10 bg-[#121212] hover:border-white/20 hover:bg-[#151515]"
                          )}
                        >
                          <div className="flex justify-between items-start mb-1.5 gap-2">
                            <div>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-yellow bg-brand-yellow/15 px-2 py-0.5 rounded">
                                {service.group}
                              </span>
                              <h4 className={cn("font-semibold text-sm mt-1", isSelected ? "text-brand-yellow" : "text-white")}>
                                {service.label}
                              </h4>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                              isSelected ? "bg-brand-yellow border-brand-yellow text-black" : "border-white/20 bg-black/40"
                            )}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mb-3">{service.desc}</p>
                          <div className="mt-auto flex items-center justify-between pt-2 border-t border-white/5">
                            <span className="text-xs text-gray-500">Základní sazba</span>
                            <span className="text-xs font-mono font-bold text-white bg-white/5 px-2 py-1 rounded">
                              {service.price}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sticky live calculator bar */}
                  <div className="rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-brand-yellow/20 flex items-center justify-center text-brand-yellow">
                        <Zap className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white">
                          Vybráno: {selectedServices.length} {selectedServices.length === 1 ? 'revize' : selectedServices.length < 5 ? 'revize' : 'revizí'}
                        </span>
                        <p className="text-xs text-gray-400">
                          {selectedServices.map(s => s.label).join(' • ')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right sm:shrink-0">
                      <span className="text-xs text-gray-400 block">Orientační základ</span>
                      <span className="text-lg font-bold font-mono text-brand-yellow">
                        od {formatPriceCzk(basePriceOnly)}
                      </span>
                    </div>
                  </div>
            </motion.div>
          )}

          {/* Step 2: Property */}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-xl font-bold text-white">Kde se nemovitost nachází?</h3>
                <p className="text-sm text-gray-400 mt-1">Uveďte přesnou adresu a doplňující informace o objektu.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Typ objektu</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PROPERTY_TYPES.map(pt => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setPropertyType(pt.id)}
                      className={cn(
                        "p-3 rounded-xl border text-sm font-medium transition-all text-left",
                        propertyType === pt.id
                          ? "border-brand-yellow bg-brand-yellow/10 text-brand-yellow"
                          : "border-white/10 bg-[#111] text-gray-300 hover:border-white/20"
                      )}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {profileData?.existingAddresses && profileData.existingAddresses.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Vaše již evidované adresy (bez poplatku za objekt)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {profileData.existingAddresses.map((ea) => {
                      const isSelected = address.trim().toLowerCase() === ea.trim().toLowerCase();
                      return (
                        <button
                          key={ea}
                          type="button"
                          onClick={() => setAddress(ea)}
                          className={cn(
                            "px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all flex items-center gap-1.5",
                            isSelected
                              ? "border-brand-yellow bg-brand-yellow/15 text-brand-yellow shadow-sm"
                              : "border-white/10 bg-[#111] text-gray-300 hover:border-white/20 hover:text-white"
                          )}
                        >
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate max-w-[260px]">{ea}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-brand-yellow shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                  Adresa nemovitosti *
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Např. Václavské náměstí 1, Praha 1, 110 00"
                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
                {isAddressExisting() && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Tato adresa je již ve vaší evidenci. Objednání dalších revizí pro tento objekt je bez poplatku za objekt.</span>
                  </div>
                )}
                {isCustomerNewObjectOverLimit() && (
                  <div className="mt-2 flex items-start gap-2.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-300">Zadáváte nový objekt</p>
                      <p className="text-amber-300/80 mt-0.5">
                        V základním zákaznickém účtu máte evidenci 1 objektu zdarma. Za evidenci dalšího objektu je roční poplatek <strong>100 Kč / rok</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Podlaží / patro (nepovinné)</label>
                  <input
                    type="text"
                    value={floor}
                    onChange={e => setFloor(e.target.value)}
                    placeholder="Např. 3. patro, byt č. 12"
                    className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Plocha m² (nepovinné)</label>
                  <input
                    type="number"
                    value={area}
                    onChange={e => setArea(e.target.value)}
                    placeholder="Např. 85"
                    className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Informace o přístupu (nepovinné)</label>
                <textarea
                  value={accessInfo}
                  onChange={e => setAccessInfo(e.target.value)}
                  rows={2}
                  placeholder="Kód ke vchodu, zvonek, klíče u správce, parkování ve dvoře..."
                  className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white focus:border-brand-yellow outline-none transition-all resize-none text-sm"
                />
              </div>

              {orderMode === 'TECHNICIAN' && (
                <label className="flex items-center gap-3 p-3.5 bg-[#111] border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-colors">
                  <input
                    type="checkbox"
                    checked={isFirstRevision}
                    onChange={e => setIsFirstRevision(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-yellow focus:ring-brand-yellow"
                  />
                  <div>
                    <span className="text-sm text-white font-medium">Výchozí (první) revize po instalaci</span>
                    <p className="text-xs text-gray-400">Zaškrtněte, pokud jde o novostavbu nebo nově instalované zařízení.</p>
                  </div>
                </label>
              )}
            </motion.div>
          )}

          {/* Step 3: Contact */}
          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-xl font-bold text-white">Kontaktní údaje</h3>
                <p className="text-sm text-gray-400 mt-1">Osoba, která bude přítomna u revize nebo zodpovídá za objekt.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Jméno a příjmení *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder="Např. Jan Novák"
                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Telefonní číslo *</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    placeholder="+420 777 123 456"
                    className="w-full bg-[#111] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:border-brand-yellow outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white focus:border-brand-yellow outline-none transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Poznámka pro technika (nepovinné)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Doplňující informace pro technika – stav elektroinstalace, stáří spotřebičů, specifické požadavky..."
                  className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white focus:border-brand-yellow outline-none transition-all resize-none text-sm"
                />
              </div>
            </motion.div>
          )}

          {/* Step 4: Scheduling */}
          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
                  <div>
                    <h3 className="text-xl font-bold text-white">Preferovaný termín návštěvy</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Zvolte orientační termín. Revizní technik vás bude kontaktovat pro odsouhlasení přesného času.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Preferované datum (orientační)</label>
                    <input
                      type="date"
                      value={preferredDate}
                      onChange={e => setPreferredDate(e.target.value)}
                      min={getMinDate()}
                      className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white focus:border-brand-yellow outline-none transition-all text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1.5">
                      {urgency === 'normal'
                        ? 'U standardního termínu lze vybrat nejbližší volné datum od 4 pracovních dnů.'
                        : 'U urgentního termínu vyberte co nejbližší datum pro prioritní obsloužení.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Typ termínu</label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setUrgency('normal')}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          urgency === 'normal'
                            ? "border-brand-yellow bg-brand-yellow/10"
                            : "border-white/10 bg-[#111] hover:border-white/20"
                        )}
                      >
                        <p className={cn("font-semibold text-sm", urgency === 'normal' ? "text-brand-yellow" : "text-white")}>
                          Standardní termín
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Běžné zařazení do plánu technika (v ceně)</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrgency('urgent')}
                        className={cn(
                          "p-4 rounded-xl border text-left transition-all",
                          urgency === 'urgent'
                            ? "border-red-500 bg-red-500/10"
                            : "border-white/10 bg-[#111] hover:border-white/20"
                        )}
                      >
                        <p className={cn("font-semibold text-sm", urgency === 'urgent' ? "text-red-400" : "text-white")}>
                          Urgentní / Expresní (+ {formatPriceCzk(urgentSurchargeCzk)})
                        </p>
                        <p className="text-xs text-gray-400 mt-1">Prioritní obsloužení technika do 24–48 hodin</p>
                      </button>
                    </div>
                  </div>

                  {revisionCategories.length > 0 && (
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Typ prostředí (nepovinné)</label>
                      <select
                        value={selectedCategoryId}
                        onChange={e => setSelectedCategoryId(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-xl p-3 text-white focus:border-brand-yellow outline-none text-sm"
                      >
                        <option value="">Vyberte kategorii prostředí...</option>
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
                      <p className="text-xs text-gray-500 mt-1">Pomůže správně nastavit zákonné intervaly dalších kontrol.</p>
                    </div>
                  )}
            </motion.div>
          )}

          {/* Step 5: Summary and Pricing */}
          {currentStep === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-bold text-white">Kontrola objednávky a cenový rozpad</h3>
                <p className="text-sm text-gray-400 mt-1">Zkontrolujte zadané informace před závazným odesláním.</p>
              </div>

              {/* POLOŽKOVÝ ROZPAD CENY A REVIZÍ */}
              <div className="rounded-2xl border border-brand-yellow/30 bg-[#121212] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                      Položkový rozpis vybraných revizí ({selectedServices.length})
                    </h4>
                    <p className="text-xs text-gray-400">Sdružená objednávka na jedné adrese</p>
                  </div>
                  <span className="text-xs font-semibold text-brand-yellow uppercase tracking-wider bg-brand-yellow/10 px-2.5 py-1 rounded-full border border-brand-yellow/20">
                    Kalkulace balíčku
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex items-center justify-between py-2.5 text-sm">
                      <div className="flex items-center gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-brand-yellow shrink-0"></span>
                        <span className="text-white font-medium">{service.label}</span>
                        <span className="text-xs text-gray-500 hidden sm:inline">({service.group})</span>
                      </div>
                      <span className="text-gray-200 font-mono font-medium">{service.price}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-white/10 pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Základní součet vybraných položek</span>
                    <span className="text-white font-mono font-medium">od {formatPriceCzk(basePriceOnly)}</span>
                  </div>

                  {urgency === 'urgent' && (
                    <div className="flex justify-between text-sm text-red-400">
                      <span>Urgentní příplatek (expresní termín)</span>
                      <span className="font-mono font-medium">+ {formatPriceCzk(urgentSurchargeCzk)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-baseline border-t border-brand-yellow/30 pt-3">
                    <div>
                      <span className="text-base font-bold text-white">Celkový orientační odhad zakázky</span>
                      <p className="text-[11px] text-gray-400">Včetně všech vybraných revizí a DPH</p>
                    </div>
                    <span className="text-xl font-bold font-mono text-brand-yellow">
                      od {formatPriceCzk(estimatedPrice)}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl bg-white/5 p-3.5 text-xs text-gray-300 flex items-start gap-2.5 border border-white/5">
                  <Info className="w-4 h-4 text-brand-yellow shrink-0 mt-0.5" />
                  <span>
                    Uvedená cena je orientačním součtem základních ceníkových sazeb vybraných revizí. Přesnou finální cenu vám revizní technik potvrdí na místě před započetím prací dle skutečného počtu okruhů, spotřebičů nebo podlaží.
                  </span>
                </div>
              </div>

              {/* Informace o nemovitosti a termínu */}
              <div className="bg-[#111] rounded-2xl p-5 space-y-3 border border-white/5">
                {[
                  { label: 'Typ objektu', value: PROPERTY_TYPES.find(p => p.id === propertyType)?.label },
                  { label: 'Adresa nemovitosti', value: address },
                  floor ? { label: 'Podlaží / byt', value: floor } : null,
                  area ? { label: 'Plocha', value: `${area} m²` } : null,
                  { label: 'Kontaktní osoba', value: `${contactName} (${contactPhone})` },
                  contactEmail ? { label: 'E-mail', value: contactEmail } : null,
                  {
                    label: 'Preferovaný termín',
                    value: preferredDate
                      ? `${new Date(preferredDate).toLocaleDateString('cs-CZ')} (${urgency === 'urgent' ? 'Urgentní' : 'Standardní'})`
                      : 'Dle domluvy s technikem',
                  },
                  isFirstRevision ? { label: 'Stav revize', value: 'Výchozí (první) revize po instalaci' } : null,
                ].filter(Boolean).map((item, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-1.5 border-b border-white/5 last:border-0 gap-1">
                    <span className="text-xs text-gray-400">{item!.label}</span>
                    <span className="text-sm font-medium text-white">{item!.value}</span>
                  </div>
                ))}
              </div>

              {notes && (
                <div className="rounded-xl bg-[#111] p-4 border border-white/5">
                  <span className="block text-xs text-gray-400 uppercase tracking-wider mb-1 font-semibold">Poznámka</span>
                  <p className="text-sm text-gray-200">{notes}</p>
                </div>
              )}

              <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-gray-400">
                  Odesláním objednávky souhlasíte se zpracováním osobních údajů a obchodními podmínkami portálu Revizone.
                  Potvrzení objednávky vám dorazí obratem na e-mail.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex flex-col-reverse gap-3 border-t border-white/10 pt-6 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-8">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={cn(
              "rounded-xl px-5 py-3 text-sm font-medium transition-colors",
              currentStep === 1 ? "cursor-not-allowed text-gray-600" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            Zpět
          </button>

          {currentStep < steps.length ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-brand-yellow/10 transition-colors hover:bg-brand-yellow-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Pokračovat <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-8 py-3 text-sm font-semibold text-black shadow-lg shadow-brand-yellow/10 transition-colors hover:bg-brand-yellow-hover disabled:opacity-50 sm:w-auto"
            >
              {isSubmitting
                ? 'Odesílání objednávky...'
                : `Závazně objednat ${selectedServices.length > 1 ? `balíček (${selectedServices.length} revizí)` : 'revizi'}`}
            </button>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
