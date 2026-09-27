'use client';

import { useState, useEffect } from 'react';
import { Star, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReviewSectionProps {
  orderReadableId: string;
  isCustomer: boolean;
  orderStatus: string;
  hasTechnician: boolean;
}

export function ReviewSection({ orderReadableId, isCustomer, orderStatus, hasTechnician }: ReviewSectionProps) {
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${orderReadableId}/review`)
      .then(r => r.json())
      .then(data => { setReview(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [orderReadableId]);

  if (loading || orderStatus !== 'COMPLETED' || !hasTechnician) return null;

  if (review) {
    return (
      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">Hodnocení technika</h3>
        <div className="flex items-center gap-1.5 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={cn("w-5 h-5", star <= review.rating ? "text-brand-yellow fill-brand-yellow" : "text-neutral-700")} />
          ))}
          <span className="text-sm text-white font-semibold ml-2">{review.rating}/5</span>
        </div>
        {review.comment && <p className="text-sm text-neutral-300 mt-2 bg-white/5 p-3 rounded-xl border border-white/5">{review.comment}</p>}
        {review.customer?.name && <p className="text-xs text-neutral-400 mt-2.5">– {review.customer.name}</p>}
      </div>
    );
  }

  if (!isCustomer) return null;

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Zvolte prosím počet hvězdiček.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/orders/${orderReadableId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      if (res.ok) {
        const data = await res.json();
        setReview(data);
        toast.success('Děkujeme za vaše hodnocení!');
      } else {
        const err = await res.json();
        toast.error(err.message || 'Nepodařilo se odeslat hodnocení.');
      }
    } catch { 
      toast.error('Došlo k chybě při komunikaci se serverem.'); 
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <div className="bg-brand-yellow/5 border border-brand-yellow/20 rounded-2xl p-5 sm:p-6">
      <h3 className="text-base font-semibold text-brand-yellow mb-1">Ohodnoťte technika</h3>
      <p className="text-xs text-neutral-300 mb-4">Jak jste byli spokojeni s průběhem a provedenou revizí?</p>
      
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform active:scale-90"
            aria-label={`${star} hvězdiček`}
          >
            <Star className={cn("w-7 h-7 transition-colors",
              star <= (hoverRating || rating) ? "text-brand-yellow fill-brand-yellow" : "text-neutral-600"
            )} />
          </button>
        ))}
        {rating > 0 && <span className="text-sm font-semibold text-white ml-2">{rating}/5</span>}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Volitelný komentář k návštěvě technika..."
        rows={3}
        className="w-full bg-[#111] border border-white/10 rounded-xl p-3.5 text-sm text-white focus:border-brand-yellow outline-none resize-none mb-3.5 transition"
      />

      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full min-h-[44px] py-3 bg-brand-yellow text-black font-semibold rounded-xl hover:bg-brand-yellow-hover transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.99] text-sm"
      >
        <Send className="w-4 h-4" /> {submitting ? 'Odesílám hodnocení...' : 'Odeslat hodnocení'}
      </button>
    </div>
  );
}
