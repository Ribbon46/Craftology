// Supabase environment configuration + a single source of truth for whether
// real Supabase is wired up. The app runs as a fully-navigable demo on mock
// data until valid credentials are present in .env.local — at which point every
// data path automatically switches to the live database.
//
// NEXT_PUBLIC_* vars are inlined at build time, so these constants are safe to
// read on both the server and the client.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

// Supabase's newer "publishable" key (sb_publishable_...) is the browser-safe
// key; fall back to the legacy anon (JWT) key for older projects. Either works.
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

/**
 * True only when the env vars look like a real Supabase project. The default
 * `.env.local` ships with placeholders (e.g. "your-supabase-project-url") which
 * are truthy but invalid — constructing a client with them throws on `new URL()`.
 * Guarding on a real http(s) URL keeps the app in graceful mock mode instead.
 */
export function isSupabaseConfigured(): boolean {
  return /^https?:\/\/.+/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
}
