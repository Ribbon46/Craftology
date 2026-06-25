'use client';

import { useEffect, useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { getFollowState, toggleFollow } from '@/actions/follow';
import { cn } from '@/lib/utils';

/**
 * "Urmărește artizan" toggle. Loads the current follow state on mount (so it
 * reflects reality across reloads), opens the auth modal when a guest taps it,
 * and updates optimistically. Shown on a listing's seller block.
 */
export function FollowButton({ sellerId, className }: { sellerId: string; className?: string }) {
  const { user } = useSession();
  const { setOpen } = useAuthModal();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    getFollowState(sellerId)
      .then((s) => {
        if (active) {
          setFollowing(s.following);
          setCount(s.count);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [sellerId, user?.id]);

  const onClick = () => {
    if (!user) {
      setOpen(true);
      return;
    }
    // Optimistic flip
    const next = !following;
    setFollowing(next);
    setCount((c) => (c == null ? c : c + (next ? 1 : -1)));
    startTransition(async () => {
      const res = await toggleFollow(sellerId);
      if ('error' in res) {
        // revert on failure
        setFollowing(!next);
        setCount((c) => (c == null ? c : c + (next ? -1 : 1)));
      } else {
        setFollowing(res.following);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={following}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60',
        following
          ? 'bg-clay text-paper border-edge'
          : 'border-line-strong text-ink-soft hover:text-clay hover:border-clay/40',
        className,
      )}
    >
      <Heart className={cn('w-3.5 h-3.5', following && 'fill-current')} />
      {following ? 'Urmărit' : 'Urmărește'}
      {count != null && count > 0 && <span className="opacity-70">· {count}</span>}
    </button>
  );
}
