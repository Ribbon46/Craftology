'use client';

import { useEffect, useState, useTransition } from 'react';
import { Star } from 'lucide-react';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { getListingReviews, canReview, submitReview, type PublicReview } from '@/actions/reviews';
import { cn } from '@/lib/utils';

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn('inline-flex', className)} aria-label={`${value} din 5 stele`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('w-3.5 h-3.5', n <= value ? 'fill-gold text-gold' : 'text-line-strong')} />
      ))}
    </span>
  );
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Product reviews on a listing: the list of received reviews + a star-picker
 * form shown only to a logged-in buyer who has contacted the seller and hasn't
 * reviewed yet. Aggregate seller rating is recomputed in the DB on submit.
 */
export function ReviewSection({ listingId, sellerId }: { listingId: string; sellerId: string }) {
  const { user } = useSession();
  const { setOpen } = useAuthModal();
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [eligible, setEligible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    Promise.all([getListingReviews(listingId), user ? canReview(sellerId, listingId) : Promise.resolve({ canReview: false, alreadyReviewed: false })])
      .then(([revs, perm]) => {
        if (!active) return;
        setReviews(revs);
        setEligible(perm.canReview);
        setLoaded(true);
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [listingId, sellerId, user?.id]);

  const submit = () => {
    setError(null);
    if (rating < 1) {
      setError('Alege un punctaj.');
      return;
    }
    startTransition(async () => {
      const res = await submitReview({ listingId, rating, comment: comment.trim() || undefined });
      if ('error' in res) {
        setError(res.error);
        return;
      }
      setDone(true);
      setEligible(false);
      const fresh = await getListingReviews(listingId);
      setReviews(fresh);
    });
  };

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-display text-lg text-ink">Recenzii</h3>
        {reviews.length > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-ink-soft">
            <Stars value={Math.round(avg)} />
            {avg.toFixed(1)} · {reviews.length}
          </span>
        )}
      </div>

      {/* Form for an eligible buyer */}
      {loaded && eligible && !done && (
        <div className="rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[4px_4px_0_0_var(--press-soft)] p-4 mb-4">
          <p className="text-sm font-medium text-ink mb-2">Lasă o recenzie</p>
          <div className="flex items-center gap-1 mb-3" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} stele`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
                className="p-0.5"
              >
                <Star className={cn('w-6 h-6 transition-colors', n <= (hover || rating) ? 'fill-gold text-gold' : 'text-line-strong')} />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Cum a fost experiența ta? (opțional)"
            className="w-full rounded-lg border-[1.5px] border-input bg-paper px-3 py-2 text-sm resize-none transition-[border-color,box-shadow] focus:outline-none focus:border-clay focus:shadow-[3px_3px_0_0_var(--focus-press)]"
          />
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="mt-3 rounded-full bg-clay text-paper px-5 py-2 text-sm font-medium border-[1.5px] border-edge shadow-[3px_3px_0_0_var(--press)] transition-all ease-pop hover:-translate-x-px hover:-translate-y-px active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_0_var(--press)] disabled:opacity-60"
          >
            {pending ? 'Se trimite…' : 'Trimite recenzia'}
          </button>
        </div>
      )}

      {done && (
        <p className="text-sm text-sage mb-4">Mulțumim! Recenzia ta a fost adăugată.</p>
      )}

      {/* Prompt guests / non-eligible gently */}
      {loaded && !eligible && !done && reviews.length === 0 && (
        <p className="text-sm text-ink-soft mb-2">
          {user ? (
            'Poți lăsa o recenzie după ce cumperi acest produs.'
          ) : (
            <>
              <button onClick={() => setOpen(true)} className="text-clay underline underline-offset-2">
                Autentifică-te
              </button>{' '}
              pentru a lăsa o recenzie după o achiziție.
            </>
          )}
        </p>
      )}

      {/* The list */}
      <div className="space-y-3">
        {reviews.map((r) => {
          const name = r.reviewer?.full_name || r.reviewer?.username || 'Cumpărător';
          return (
            <div key={r.id} className="rounded-2xl border border-line bg-surface/60 p-3.5">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-ink truncate">{name}</span>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="text-sm text-ink-soft leading-relaxed">{r.comment}</p>}
              <p className="text-[11px] text-ink-faint mt-1">{timeAgo(r.created_at)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
