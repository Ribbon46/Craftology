import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Per-user write throttling, gated like the Stripe/Supabase config: inert until
// BOTH Upstash REST env vars are present, so the app runs fine without it.
//   UPSTASH_REDIS_REST_URL    e.g. https://your-db.upstash.io
//   UPSTASH_REDIS_REST_TOKEN  the long REST token (NOT the account API key)
// Get both from console.upstash.com → your Redis DB → "REST API".
const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export function isRateLimitConfigured(): boolean {
  return !!url && !!token && url.startsWith('https://');
}

const redis = isRateLimitConfigured() ? new Redis({ url: url!, token: token! }) : null;

// Sliding-window limits per authenticated user.
const limiters = redis
  ? {
      message: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), prefix: 'rl:msg', analytics: false }),
      conversation: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:conv', analytics: false }),
      listing: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'rl:listing', analytics: false }),
      review: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'rl:review', analytics: false }),
      report: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'rl:report', analytics: false }),
    }
  : null;

export type RateLimitAction = 'message' | 'conversation' | 'listing' | 'review' | 'report';

/**
 * Returns { ok: false } when the identifier has exceeded the action's limit.
 * No-op (always ok) when Upstash isn't configured, and fails OPEN on a Redis
 * error so an infra hiccup never blocks legitimate users.
 */
export async function checkRateLimit(action: RateLimitAction, identifier: string): Promise<{ ok: boolean }> {
  if (!limiters) return { ok: true };
  try {
    const { success } = await limiters[action].limit(identifier);
    return { ok: success };
  } catch {
    return { ok: true };
  }
}
