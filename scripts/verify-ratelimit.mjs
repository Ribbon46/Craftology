// Probe the configured Upstash Redis: confirms connectivity + that the sliding
// window actually blocks past the limit. Reads creds from the environment
// (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) — never hardcode them here.
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error('Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN in env.');
  process.exit(1);
}

const redis = new Redis({ url, token });
const rl = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '10 s'), prefix: 'rl:verify' });

const id = 'probe-' + Math.floor(Math.random() * 1e9);
let allowed = 0;
let blocked = 0;
for (let i = 1; i <= 8; i++) {
  const { success, remaining } = await rl.limit(id);
  console.log(`#${i}: success=${success} remaining=${remaining}`);
  success ? allowed++ : blocked++;
}
console.log(`\nallowed=${allowed} blocked=${blocked}  (expect 5 allowed, 3 blocked)`);
console.log(allowed === 5 && blocked === 3 ? 'PASS ✓ Redis reachable + limiting works' : 'UNEXPECTED — check creds/network');
