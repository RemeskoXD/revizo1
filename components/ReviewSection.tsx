'use client';

import { useState, useEffect } from 'react';
import { Star, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Hodnocení</h3>
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star key={star} className={cn("w-5 h-5", star <= review.rating ? "text-brand-yellow fill-brand-yellow" : "text-gray-600")} />
          ))}
          <span className="text-sm text-white font-medium ml-2">{review.rating}/5</span>
        </div>
        {review.comment && <p className="text-sm text-gray-400 mt-2">{review.comment}</p>}
        {review.customer?.name && <p className="text-xs text-gray-600 mt-2">– {review.customer.name}</p>}
      </div>
    );
  }

  if (!isCustomer) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;
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
      } else {
        const err = await res.json();
        alert(err.message || 'Chyba');
      }
    } catch { alert('Chyba'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="bg-brand-yellow/5 border border-brand-yellow/20 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-brand-yellow mb-3">Ohodnoťte technika</h3>
      <p className="text-xs text-gray-400 mb-4">Jak jste byli spokojeni s provedenou revizí?</p>
      
      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star className={cn("w-7 h-7 transition-colors",
              star <= (hoverRating || rating) ? "text-brand-yellow fill-brand-yellow" : "text-gray-600"
            )} />
          </button>
        ))}
        {rating > 0 && <span className="text-sm text-white ml-2">{rating}/5</span>}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Volitelný komentář..."
        rows={2}
        className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-brand-yellow outline-none resize-none mb-3"
      />

      <button
        onClick={handleSubmit}
        disabled={submitting || rating === 0}
        className="w-full py-2.5 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send className="w-4 h-4" /> {submitting ? 'Odesílám...' : 'Odeslat hodnocení'}
      </button>
    </div>
  );
}
