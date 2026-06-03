// Deploy to Vercel production with the Supabase env injected from .env.local.
//
// Why: `vercel env add` can't capture values in a non-interactive shell, so the
// project env store may be empty. This script passes the NEXT_PUBLIC_* values
// directly on the deploy command (--build-env for client inlining, --env for
// the server/middleware runtime), guaranteeing the deployment is live-data.
//
// Usage: `npm run deploy`  (reads .env.local, which is gitignored)
import fs from 'fs';
import { spawnSync } from 'child_process';

const KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

let env = {};
try {
  env = Object.fromEntries(
    fs
      .readFileSync('.env.local', 'utf8')
      .split(/\r?\n/)
      .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
      .map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
      }),
  );
} catch {
  console.error('Could not read .env.local — create it with the NEXT_PUBLIC_SUPABASE_* values.');
  process.exit(1);
}

const args = ['deploy', '--prod', '--yes'];
for (const k of KEYS) {
  if (!env[k]) {
    console.error(`Missing ${k} in .env.local`);
    process.exit(1);
  }
  args.push('--build-env', `${k}=${env[k]}`, '--env', `${k}=${env[k]}`);
}

console.log('▲ Deploying to Vercel production with Supabase env injected…');
const r = spawnSync('vercel', args, { stdio: 'inherit', shell: true });
process.exit(r.status ?? 0);
