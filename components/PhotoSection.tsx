'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, X, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

    if (file.size > 10 * 1024 * 1024) {
      alert('Maximální velikost fotky je 10 MB.');
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const res = await fetch(`/api/orders/${orderId}/photos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: reader.result as string,
            caption: file.name.replace(/\.[^/.]+$/, ''),
          }),
        });
        if (res.ok) {
          const photo = await res.json();
          setPhotos(prev => [photo, ...prev]);
        } else {
          alert('Chyba při nahrávání fotky.');
        }
        setUploading(false);
      };
      reader.onerror = () => { alert('Chyba při čtení souboru.'); setUploading(false); };
    } catch { alert('Chyba.'); setUploading(false); }

    if (fileRef.current) fileRef.current.value = '';
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
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-brand-yellow" /> Fotodokumentace
        </h4>
        <span className="text-xs text-gray-500">{photos.length} fotek</span>
      </div>

      {isTechnician && (
        <div className="mb-3">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-white/10 rounded-lg text-gray-400 hover:text-brand-yellow hover:border-brand-yellow/30 transition-colors disabled:opacity-50"
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Nahrávání...</> : <><Plus className="w-4 h-4" /> Přidat fotku</>}
          </button>
        </div>
      )}

      {photos.length === 0 ? (
        <p className="text-xs text-gray-600 text-center py-3">Žádné fotky.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => viewPhoto(photo.id)}
              className="aspect-square bg-[#111] rounded-lg border border-white/5 flex items-center justify-center hover:border-brand-yellow/30 transition-colors overflow-hidden"
            >
              <ImageIcon className="w-6 h-6 text-gray-600" />
            </button>
          ))}
        </div>
      )}

      {viewingPhoto && viewingData && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => { setViewingPhoto(null); setViewingData(null); }}>
          <button className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full"><X className="w-6 h-6" /></button>
          <img src={viewingData} alt="Photo" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}
