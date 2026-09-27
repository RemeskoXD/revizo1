'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface PhotoSectionProps {
  orderId: string;
  isTechnician: boolean;
}

interface Photo {
  id: string;
  caption: string | null;
  createdAt: string;
}

export function PhotoSection({ orderId, isTechnician }: PhotoSectionProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [viewingData, setViewingData] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/orders/${orderId}/photos`)
      .then(r => r.json())
      .then(setPhotos)
      .catch(() => {});
  }, [orderId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { compressImage, fileToBase64 } = await import('@/lib/client-compress');
      const compressed = await compressImage(file);
      const b64 = await fileToBase64(compressed);
      
      const res = await fetch(`/api/orders/${orderId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: b64,
          caption: file.name.replace(/\.[^/.]+$/, ''),
        }),
      });
      if (res.ok) {
        const photo = await res.json();
        setPhotos(prev => [photo, ...prev]);
        toast.success('Fotografie byla úspěšně nahrána');
      } else {
        toast.error('Chyba při nahrávání fotky.');
      }
    } catch { 
      toast.error('Chyba při zpracování fotky.'); 
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const viewPhoto = async (photoId: string) => {
    setViewingPhoto(photoId);
    try {
      const res = await fetch(`/api/orders/${orderId}/photos/${photoId}`);
      if (res.ok) {
        const data = await res.json();
        setViewingData(data.imageData);
      }
    } catch {}
  };

  return (
    <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3.5">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-brand-yellow" /> Fotodokumentace
        </h4>
        <span className="text-xs text-neutral-400 bg-white/5 px-2 py-0.5 rounded-full">{photos.length} fotek</span>
      </div>

      {isTechnician && (
        <div className="mb-3.5">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] py-2.5 px-4 border-2 border-dashed border-white/15 rounded-xl text-neutral-300 hover:text-brand-yellow hover:border-brand-yellow/40 transition disabled:opacity-50 active:scale-[0.99] text-sm font-medium"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin text-brand-yellow" /> Nahrávání fotografie...</>
            ) : (
              <><Plus className="w-4 h-4 text-brand-yellow" /> Přidat fotku z místa (fotoaparát)</>
            )}
          </button>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="text-xs text-neutral-500 text-center py-4">Zatím nebyla pořízena žádná fotodokumentace.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => viewPhoto(photo.id)}
              className="aspect-square bg-neutral-900 rounded-xl border border-white/10 flex items-center justify-center hover:border-brand-yellow/50 transition-all overflow-hidden active:scale-95 min-h-[44px]"
            >
              <ImageIcon className="w-6 h-6 text-neutral-400" />
            </button>
          ))}
        </div>
      )}

      {viewingPhoto && viewingData && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" 
          onClick={() => { setViewingPhoto(null); setViewingData(null); }}
        >
          <button 
            className="absolute top-4 right-4 min-w-[44px] min-h-[44px] flex items-center justify-center text-white bg-white/10 hover:bg-white/20 rounded-full transition"
            aria-label="Zavřít náhled"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={viewingData} 
            alt="Fotodokumentace" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
          />
        </div>
      )}
    </div>
  );
}
