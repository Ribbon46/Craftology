# Changelog

All notable changes to this project will be documented in this file.

## [2026-06-02] - Project Initialization
- Initialized Next.js app with TypeScript, Tailwind CSS, ESLint, App Router
- Installed production dependencies: @supabase/supabase-js, @supabase/ssr, lucide-react, zod
- Initialized shadcn/ui with Nova preset (Lucide/Geist)
- Added shadcn components: button, dialog, input, dropdown-menu, card, tabs, badge, textarea
- Created application structure with Romanian language support
- Implemented core pages: Home, Search, Sell, Messages, Profile
- Implemented product detail page with carousel
- Created database schema with Row Level Security (RLS) for PostgreSQL/Supabase
- Created Supabase client configuration and utility hooks
- Added navigation components (TopNav with Vinted-style category chips, BottomNav with 5 items)
- Added authentication modal with login/register form
- Configured environment variables for Supabase connection
- Build passes successfully with no errors

## [2026-06-02] - Phase 2: Autonomous Exhaustive Development
- Updated globals.css with mobile-first utilities, safe area padding, touch-friendly styles
- Added `@tanstack/react-query` for infinite scroll and data fetching
- Created Zod schemas for form validation in `src/schemas/listing.ts`
- Created server actions for listings: createListing, deleteListing, updateListingStatus
- Created server actions for messages: createConversation, createMessage, getMessages, getConversations
- Created Dropzone component for image uploads with validation
- Implemented Vinted-style feed with infinite scroll and category filtering
- Added mock data fallback for development without Supabase
- Added QueryClientProvider to layout for React Query
- Mobile-first container with max-w-md, safe area padding (top: env(safe-area-inset-top))
- Bottom nav with safe area bottom padding
- Touch-friendly active states with scale-[0.98] transition
- All UI text in Romanian (Bijuterii, Haine, Lumânări, Accesorii, Frumusețe, Toate, etc.)

## [2026-06-02] - Phase 3: Chat & Profile Interface
- Added @tanstack/react-query and @tanstack/react-query-devtools for data fetching
- Implemented WhatsApp-like chat interface in Messages page
- Chat header with back navigation, buyer info, and menu
- Message bubbles with sender styling (me: dark gray, them: white)
- Read receipt icons (Check/CheckCheck)
- Typing indicator animation
- Conversation list with unread badge count and last message preview
- Implemented Profile page with tab navigation (Produse, Recenzii, Tranzacții)
- Added shadcn/ui components: tabs, avatar
- Profile stats grid (Active, Sold, Views)
- User card with rating and sales stats
- Tab content: listings grid, reviews with star ratings, transaction history
- Build passes successfully with no errors

## [2026-06-02] - Phase 4: Data-Layer Hardening (Claude Code handoff)
- **Fixed broken identity model:** `profiles.id` now references `auth.users(id)` directly (was a standalone generated UUID with a separate `user_id`). Previously every listing/message insert failed its FK and every `auth.uid() = seller_id` RLS check could never match.
- Removed the orphaned `user_id` column from `profiles` (schema + `src/lib/supabase/types.ts`); `profiles.id` is now required on insert.
- Added `handle_new_user()` trigger (SECURITY DEFINER) on `auth.users` to auto-create a `profiles` row on signup so seller/buyer/sender FKs resolve.
- Added profile INSERT/UPDATE RLS policies (own row) and a missing listings DELETE policy (owner) — `deleteListing` was previously blocked by RLS.
- Made `listings` and `profiles` SELECT world-readable so the feed/seller cards work for anonymous browsers (matches the public-browsing spec); conversations/messages remain participant-only. Hardened the messages INSERT policy to also require conversation membership.
- Added `listings_images` storage bucket creation + storage.objects RLS policies (public read; owner-scoped insert/update/delete on `listings/<uid>/...`) to `schema.sql`.
- Fixed `deleteListing` storage bug: parsed key dropped the `listings/` prefix so images were never deleted (orphaned in storage). Now derives the bucket-relative key from the public URL, removes all images in a single call, and reads `seller_id`+`image_urls` in one query.

## [2026-06-02] - Phase 5: Fully-Working App (demo-now, live-on-keys)
- **Graceful Supabase degradation:** added `src/lib/supabase/config.ts` (`isSupabaseConfigured()` — validates URL format, not just presence) and `src/lib/supabase/mock-client.ts`. `client.ts` and `server.ts` now return a safe mock client when credentials are placeholders/missing, so the app runs as a full demo without the previous invalid-URL crashes. Removed the custom `__Secure-` cookie override (broke sessions on http://localhost); standard @supabase/ssr cookie handling now.
- **Real auth wired:** `AuthModal` is now globally controlled (`src/lib/auth-modal.tsx` context, mounted once in `src/app/providers.tsx`) and performs real `signInWithPassword`/`signUp` with loading/error states; degrades to a clear "not configured" message in demo mode. +Vinde gate, profile, and "Trimite mesaj" all open it.
- **Root layout** converted to a Server Component (Next 16 convention) with `Providers` client wrapper, real `metadata`, and `viewport-fit=cover` for safe areas / Capacitor. Removed the dead `pt-16` gap.
- **Shared data layer:** `src/lib/mock.ts` (single mock dataset) + `src/lib/data/listings.ts` (`fetchListingsPage`/`fetchListingById`/`searchListings` — reads Supabase when configured, mock otherwise). Home, search, and listing detail now use it and are mutually consistent (a clicked card opens the matching product).
- **Listing detail** rewritten to use `useParams()` (fixes the Next-16 async-params build issue), fetch by id, real image carousel, working "Trimite mesaj" (auth-gated → `createConversation`) and Urmărește/Partajează.
- **Messages** wired to `getConversations`/`getMessages`/`createMessage` with current-user context and sender attribution, with a guaranteed mock-demo fallback.
- **messages.ts** correctness: FK-hinted buyer/seller embeds in `getConversations`, fixed malformed `.or()` in `createConversation` (now `and(...)`/`or(...)`), `createMessage` derives the sender from `auth.uid()` server-side, and `markMessagesAsRead` is implemented against a new `messages.read` column.
- **Nav/UX:** TopNav is now a clean branded header (removed the duplicate, no-op category chips); profile buttons all route; added `/terms`, `/privacy`, `/profile/settings` (with sign-out); fixed the broken avatar placeholder URL.
- **Verified:** `tsc --noEmit` clean, `next build` passes (11 routes), `next dev` serves every route 200 with zero runtime errors in the log.

## [2026-06-02] - Phase 6: Connected to Supabase project
- Wired real project `xpyfnxnhewmjwblwlcwg`. `config.ts` now reads the modern `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (sb_publishable_…), falling back to the legacy anon key. `.env.local` populated with the live URL + publishable key.
- Added `src/middleware.ts` for Supabase session refresh on each request (no-op in demo mode).
- Verified connectivity: publishable key authenticates (auth health 200). Schema NOT yet applied — REST returns `PGRST205` for `listings`/`profiles`, so `supabase/schema.sql` still needs to run in the SQL editor. Until then the app stays on graceful mock fallback.

## [2026-06-03] - Phase 7: Schema applied + live smoke test PASSED
- Applied the full schema to project `xpyfnxnhewmjwblwlcwg` via the Supabase MCP (`apply_migration`): 4 tables (RLS enabled on all), `handle_new_user` trigger, `messages.read`, and the public `listings_images` bucket + 4 storage policies. Verified: 11 public RLS policies, FKs intact.
- Hardening: revoked public/anon/authenticated EXECUTE on `handle_new_user()` (it's a trigger, not an RPC) — clears the security advisor. Remaining advisors are a benign public-bucket-listing note (acceptable for public product images) and a Supabase-internal `rls_auto_enable` function (platform-managed).
- End-to-end smoke test (live DB, then fully cleaned up): signup → `handle_new_user` auto-creates a profile with `id = auth.users.id` ✓; owner can insert a listing, buyer can open a conversation + send a message (RLS `WITH CHECK` all pass) ✓; participant reads their conversation/messages while an unrelated user and anon are blocked (RLS SELECT) ✓; anon reads public listings ✓; the app's FK-hinted embeds (`profiles!listings_seller_id_fkey`, `conversations` buyer/seller/listing) resolve and return the correct nested shape ✓.
- NOTE: live tables are empty, so the feed now shows the real empty state (mock demo data only appears when Supabase is unconfigured). Seed real listings (or sample data) to populate it.

## [2026-06-03] - Phase 8: UI polish (desktop + phone)
- Verified the rendered UI at phone (390/412) and desktop (1440) widths via headless Chrome screenshots (mock mode, so the feed was populated for assessment).
- **Desktop framing:** body backdrop is now `bg-slate-100` and the phone-width app column has `md:border-x md:shadow-2xl`, so on desktop it reads as an intentional centered "app preview" instead of a white-on-white floating strip.
- **Bottom nav alignment:** `BottomNav` is now constrained to the app column (`left-1/2 -translate-x-1/2 max-w-md`) instead of spanning the full desktop width.
- **Responsive card fix:** home + search cards clipped the seller avatar/rating on narrow phones (flex `min-width:auto` overflow). Added `min-w-0` + `truncate`/`flex-shrink-0` so content reflows and the seller block stays visible.
- Removed the dead `pt-16` gap under the sticky TopNav; metadata + `viewport-fit=cover` already in place for notches/Capacitor.
- Production build green (11 routes + middleware) with real Supabase env restored.

## [2026-06-03] - Phase 9: "Atelier" rebrand, real content, Capacitor scaffold
- **Distinctive redesign (Atelier theme):** replaced the generic slate/shadcn look with a warm artisanal identity — cream/espresso/terracotta-clay/sage/gold palette, **Fraunces** (display) + **Hanken Grotesk** (body) via `next/font` with `latin-ext` for RO diacritics, paper-grain texture, warm soft shadows. All shadcn tokens remapped + every screen reskinned (slate→ink/clay/cream sweep).
- Home feed is now the **two-column photo-forward grid** (per original spec) with staggered fade-up reveals; BottomNav has a raised clay "+ Vinde" center action; TopNav is a serif "Craftology / by Deco Kubik" wordmark; listing detail is an editorial layout. Verified beautiful + responsive on true iPhone-13 emulation (Playwright).
- **Seeded live content:** created the `deco_kubik` brand seller + 8 on-brand listings (mărgele, lumânări, etc., warm placeholder imagery) so the live feed is populated.
- **Playwright** added (dev dependency) with `scripts/shots.mjs` for device-emulated screenshots (iPhone/desktop).
- **Capacitor** installed + `android/` project scaffolded (`appId: ro.decokubik.craftology`); uses the `server.url` pattern (the native shell loads the hosted Vercel site, since Server Actions need a Node host). See `DEPLOY.md` for the Vercel + APK steps (account/tooling-gated).

## [2026-06-03] - Phase 10: LIVE on Vercel
- **Deployed to production: https://craftology-peach.vercel.app** — reads the live Supabase DB (seeded Deco Kubik listings) in the Atelier design; verified on phone + desktop.
- Code pushed to GitHub `Ribbon46/Craftology`; Vercel project `ribbon46s-projects/craftology` linked + deployed.
- **Env-var workaround:** `vercel env add` stores blank values in a non-interactive shell, so the production env is injected at deploy time via `--build-env`/`--env`. Added `scripts/deploy.mjs` + **`npm run deploy`** (reads `.env.local`, injects the `NEXT_PUBLIC_SUPABASE_*` values) so every deploy stays live without relying on the Vercel env store. For git-push auto-deploy, the two vars must also be stored in the Vercel dashboard.
- Capacitor `server.url` pointed at the live URL + `npx cap sync` (Android project ready to build once an Android SDK is installed).

## [2026-06-03] - Phase 11: Android APK on device + Stripe checkout
- Built the debug APK and **installed + launched it on a Samsung S25+** over adb. Confirmed env persistence: a stored-env-only deploy serves live data (the dashboard vars are "Sensitive", which is why `vercel env pull` reads them blank). Git-push auto-deploy is now live-data.
- **Stripe Checkout** added (single-account → the shop's Stripe account; Stripe Connect for seller-direct payouts is the future multi-seller step):
  - `src/lib/stripe.ts` (gated like Supabase — app runs without keys), `createCheckoutSession` server action (`src/actions/checkout.ts`), a **"Cumpără · X lei"** button on the listing detail (redirects to Stripe-hosted Checkout), `/checkout/success` page, and `/api/webhooks/stripe` which marks a listing `sold` on `checkout.session.completed` (uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS).
  - Inert until `STRIPE_SECRET_KEY` is set (button reports "not configured"). Env placeholders in `.env.local`; activation steps in `DEPLOY.md`.
- Build green: 13 routes.

## [2026-06-03] - Phase 12: Adaptive desktop UI + PWA + native polish
- **Adaptive shell** (`SiteHeader` + `SiteFooter`, replacing the phone-column wrapper): phone keeps the app column + bottom tab bar; **desktop (lg+) is a full storefront** — top nav (brand · links · search · Vinde), an editorial Fraunces hero, a 2→3→4→5-col product grid, a **2-column listing detail** (sticky gallery), and a footer. Content pages get desktop max-widths; search grid widened. Verified at 360 / 390 / 768 / 1440. Removed dead `TopNav`.
- **PWA**: `manifest.ts` + icons (192/512/maskable) + apple-touch-icon + appleWebApp metadata → installable on iPhone (Add to Home Screen) and Android, no App Store.
- **Branding**: generated a clay-"C" launcher icon + splash (`@capacitor/assets`) + web favicon; rebuilt + installed on the S25+.
- **Android Back** navigates in-app history instead of exiting (`@capacitor/app` + `BackButtonHandler`).
- Note: native **iOS App Store** app requires a Mac (Xcode) — scaffolding documented; the PWA covers iPhone users now.

## [2026-06-03] - Phase 13: Dark theme, header auth button, pull-to-refresh, modal fix
- **Dark theme ("Atelier Nocturne"):** refactored the brand palette in `globals.css` so each `@theme inline` color points at a switchable `var(--cream)`/`var(--ink)`/… defined in `:root` (light) and overridden in `.dark` (warm espresso night). One class on `<html>` re-skins the entire app. New `src/lib/theme.tsx` (provider + `useTheme`) + a pre-paint inline script in `layout.tsx` (no flash). **Defaults to the device's system dark toggle** when the user hasn't chosen, remembers an explicit pick in `localStorage`, and keeps following the system until then. Toggle in the header (CSS-driven sun/moon, no hydration flash) and in `profile/settings`. `themeColor` is now per-scheme. Fixed `text-white`-on-`bg-ink` pairs (→ `text-paper`) and gave photo overlays fixed `bg-black/*`.
- **Dedicated auth button:** `SiteHeader` now shows a **"Conectează-te"** button (opens the login/sign-up modal) when signed out, and an account avatar linking to `/profile` when signed in — on phone *and* desktop.
- **Pull-to-refresh** (`src/components/PullToRefresh.tsx`): Chrome-mobile-style gesture — at the top of the home feed, pulling down reveals a spinner and refetches listings. Touch-only (inert with a mouse). Browser's native pull-to-refresh suppressed via `overscroll-behavior-y: contain`.
- **AuthModal boundaries fixed:** the legal footer was a broken `flex` of `<p>`/`<Link>` siblings that collided on narrow widths; it's now one flowing, centered paragraph (wraps cleanly on phone). Roomier modal padding.
- Verified light + dark at phone (Pixel 7) and desktop (1440) via Playwright (`scripts/verify-theme.mjs`); production build green (17 routes).
- **Desktop nav "liquid glass" indicator:** replaced the static per-link underline with a single frosted, clay-tinted pill (`backdrop-blur` + ring + soft glow) that slides and stretches between Acasă/Caută/Mesaje/Profil as the route changes (measured from the live DOM, re-measured on resize + webfont swap, springy cubic-bezier). Verified placement across routes in both themes (`scripts/verify-nav.mjs`).

## [2026-06-03] - Phase 14: Pre-launch security audit + hardening
Ran a multi-agent security audit (6 dimensions × two-lens adversarial verification — exploitability + already-mitigated): **19 raw findings → 11 confirmed, 6 likely, 2 refuted**. Fixed the real ones:
- **Messaging authz (HIGH):** `createConversation` no longer trusts client ids — the buyer is always the authenticated caller, the seller is derived from the listing, and self-conversations are rejected. Signature is now `createConversation(listingId)`. Matching DB defense-in-depth: the conversations INSERT policy now requires `auth.uid() = buyer_id AND buyer <> seller AND the seller owns the listing` (was a permissive `buyer OR seller`, which let a user forge a thread naming a victim as the other party and then message them).
- **Payment integrity (HIGH):** the Stripe webhook marks a listing `sold` only when `session.payment_status === 'paid'` — async/delayed methods complete the session as `unpaid` and can fail later, which would otherwise lock an item that's never paid for.
- **Upload hardening (MED):** `createListing` enforces the 5-image cap server-side and whitelists MIME→extension (jpg/png/webp/gif), deriving the stored extension from the whitelist (not the client filename) and setting `contentType` — closes an SVG/HTML-served-from-the-public-bucket stored-XSS vector.
- **Rating integrity (MED):** `profiles` UPDATE is now column-scoped (`REVOKE UPDATE … GRANT UPDATE(username, full_name, avatar_url)`) so a seller can't self-inflate `rating`.
- **Read receipts (prod bug):** `messages` had RLS enabled but no UPDATE policy, so `markMessagesAsRead` silently affected 0 rows in live mode. Added a participant-scoped UPDATE policy + `GRANT UPDATE(read)` only (message text stays tamper-proof).
- **Defense-in-depth (LOW):** `getMessages` now requires an authenticated participant in code (not just RLS); `updateListingStatus` validates the status enum; `createMessage` caps text at 2000 chars; listing `category` is a Zod enum; checkout returns a generic error (logs the raw Stripe error server-side); `src/lib/stripe.ts` got `import 'server-only'` (compile-time guard against ever bundling the secret).
- RLS changes applied to the live DB via migration `harden_rls_conversations_messages_profiles`, mirrored into `supabase/schema.sql`, and verified against `pg_policies` + column grants. Build green (17 routes). Audit tooling: `scripts/format-audit.mjs`.
- **Deferred (noted, non-blocking):** per-user rate limiting on writes (needs Redis/Upstash — finding #8); atomic reservation to prevent concurrent double-sale (#9, a status-machine change); and dropping seller `full_name` from public embeds once third-party sellers exist (currently intentional single-shop branding).

## [2026-06-04] - Phase 15: Liquid-glass indicators everywhere + perf/a11y pass
**Liquid glass (the user's "fine details"):** extracted the sliding active-indicator into a reusable hook `src/lib/use-sliding-indicator.tsx` (measures the active item, re-measures on resize/container-resize/webfont swap, scrolls active into view). Applied it to: the **desktop nav** (refactored off the inline version), the **phone bottom tab bar** (frosted pill slides between Acasă/Căutare/Mesaje/Profil), and a new **`CategoryChips`** component used on **Acasă + Caută** (the active category chip gets the same sliding glass; chips are now transparent outlines so the pill is visible gliding behind them).

Ran a **performance + accessibility audit** (5 finders × two-lens verification): 17 raw → 5 confirmed, 1 likely, 11 refuted. Fixed:
- **Images → `next/image` (HIGH, biggest mobile win):** feed/search/detail/profile product images now use `next/image` with `fill` + responsive `sizes`, so phones get resized AVIF/WebP + srcset instead of full-resolution originals. Added `images.remotePatterns` for the only hosts in use (`**.supabase.co`, `placehold.co`, `ui-avatars.com`). The seed/placeholder host serves **SVG**, which the optimizer rejects by default → enabled `dangerouslyAllowSVG` but neutralized the script risk with `contentDispositionType: 'attachment'` + a no-script sandbox CSP (real uploads stay raster-only per the Phase-14 upload whitelist). Verified every `/_next/image` request returns 200 across phone/desktop, light/dark.
- **Pinch-zoom (HIGH, WCAG 1.4.4):** removed `maximumScale: 1` from the viewport so low-vision users can zoom; `themeColor` per scheme retained.
- **Contrast (MED, WCAG 1.4.3):** darkened light `--ink-faint` (#9c8f7f→#7d6f5e) and lightened dark `--ink-faint` (#877a68→#9b8d79) to clear 4.5:1; bottom-nav inactive labels now use `ink-soft`.
- **React Query (MED):** set `staleTime 60s / gcTime 5m / refetchOnWindowFocus false / retry 1` so the slow-moving catalog isn't refetched on every mount/focus.
- Build green (17 routes). Verification tooling: `scripts/verify-final.mjs`.
- **Deferred (bigger, follow-up):** server-rendering the home feed + listing detail with ISR (audit #2/#4 — a real LCP/SEO win but an architectural refactor of the client pages, deserves its own focused pass); plus loading/error boundaries, per-listing `generateMetadata`/OG tags, and `notFound()` for bad ids.

## [2026-06-04] - Phase 16: SSR + ISR for the feed and product pages
Completed the deferred perf refactor (audit #2/#4) — the two most important pages now server-render with caching:
- **Home feed:** `page.tsx` is a Server Component (`revalidate = 60`) that fetches the first "all" page server-side and hands it to a new `HomeFeed` client island seeded via React Query `initialData`. The grid ships in the initial HTML (8 cards verified) for fast LCP + SEO; infinite scroll, category switching, and pull-to-refresh stay client-side. Removed the vestigial `force-dynamic`.
- **Listing detail:** split into a Server Component `page.tsx` (`revalidate = 300`) + a `ListingDetailClient` island. Adds `generateMetadata` → real **Open Graph / Twitter cards** (a shared product link now shows image + title + price on WhatsApp/Facebook), server-rendered content for SEO/LCP, and a proper **404** (`notFound()`) for bad/deleted ids (previously a soft 200).
- New server-only data module `src/lib/data/listings.server.ts` using a **cookieless anon client** — public reads need no session, and not calling `cookies()` keeps the pages statically cacheable/ISR instead of forced-dynamic; `fetchListingByIdServer` is wrapped in React `cache()` to dedupe the metadata + page queries.
- Verified: build (`/` Static w/ 1m revalidate, detail server-rendered), raw HTML contains the cards + OG tags, bad id → 404, category switch filters live (8→2), Buy button intact, **zero hydration/JS errors** (`scripts/verify-ssr.mjs`).
- Minor follow-up (acceptable ISR staleness): mutations call `revalidatePath('/')`; a sold/deleted listing's own detail page can stay cached up to 5 min — add `revalidatePath('/listings/<id>')` to the mutation actions + Stripe webhook if instant freshness is wanted.

## [2026-06-04] - Phase 17: E2E tests + rate limiting
- **E2E suite (Playwright):** `@playwright/test` + `playwright.config.ts` (mobile Pixel 7 + desktop projects, dev-server `webServer`, `npm run test:e2e`). Specs in `e2e/`: home feed renders SSR + category filter; listing detail opens with Buy/Message actions; **bad id → real 404**; shared product link carries **Open Graph** tags; search empty state; header auth modal opens + switches to sign-up; **dark theme toggles + persists across reload**. **16/16 pass** (8 specs × mobile/desktop). The run also surfaced an LCP advisory → added `priority` to the first 4 above-the-fold feed images.
- **Rate limiting (`src/lib/ratelimit.ts`):** per-user sliding-window throttle on the write actions — 20 messages/min, 10 new conversations/min, 10 listings/hour — wired into `createMessage`/`createConversation`/`createListing`. Gated like Stripe/Supabase: **inert until both `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` are set**, and fails **open** on a Redis error so an infra hiccup never blocks legitimate users. (Note: the Upstash *account API key* — a UUID — is not these; the Redis DB's REST URL + token are needed, from console.upstash.com → DB → REST API. See `DEPLOY.md` §4.) Probe: `scripts/verify-ratelimit.mjs` (verified live: 5 allowed → 3 blocked).

## [2026-06-04] - Phase 18: Phase-2 design doc, iOS guide, deeper E2E, ISR polish
- **`docs/PLAN-MARKETPLACE-RO.md`** — a **Romanian** design + decision document for the owner covering the verified-seller marketplace: Stripe Connect (Express), **10% commission**, the seller verification/approval flow (3 options w/ a recommended one), payouts, and legal/fiscal notes — with a *"Ce trebuie să decizi"* checklist (defaults pre-filled) so she can approve quickly before we build. Also copied to her Downloads.
- **`IOS.md`** — shipping the Capacitor iOS app via **Codemagic** (cloud Macs, no local Mac): platform scaffold, a `codemagic.yaml`, the $99 Apple Developer gate, and the Guideline 4.2 thin-wrapper rejection caveat (PWA covers iPhone meanwhile).
- **Deeper E2E:** `e2e/gates.spec.ts` (always-run — logged-out "Trimite mesaj" → auth modal; `/sell` → "Autentificare necesară") + `e2e/write-flow.spec.ts` (opt-in, **skipped** without `TEST_USER_EMAIL`/`TEST_USER_PASSWORD`: log in → create a listing → "Produs adăugat!", with service-role cleanup; best pointed at a staging Supabase). Suite now **20 passed, 2 skipped**.
- **ISR freshness:** `updateListingStatus`/`deleteListing` and the Stripe webhook now also `revalidatePath('/listings/<id>')` so a just-sold/deleted product's own page updates immediately instead of waiting out the 300s cache.

## [2026-06-04] - Phase 19: Launch-polish bundle (messaging · profile · SEO) + small wins
- **Messaging:** `getConversations` enriches each thread with a last-message preview + real unread count (one batched, RLS-scoped query); the inbox renders them, and opening a thread marks it read (via the Phase-14 UPDATE policy) and clears the badge.
- **Profile editing:** new `/profile/edit` screen + `updateProfile` action (username, full_name, optional avatar upload) — Setări → "Editează profilul" is now live. Backed by the column-scoped RLS from Phase 14; duplicate-username errors surfaced cleanly.
- **SEO / discoverability:** `sitemap.ts` (static routes + all active listings), `robots.ts` (allows public, disallows account areas + points to the sitemap), a branded `opengraph-image.tsx` (next/og) so homepage shares show a real card, **Product JSON-LD** on listing pages (rich Google results w/ price + availability), and `metadataBase` = production origin so OG image URLs resolve absolutely.
- **Small wins:** branded `error.tsx` + `not-found.tsx`; **image downscaling on upload** (sharp → longest edge ~1600px, EXIF-rotated, fail-safe to original); **Vercel Analytics + Speed Insights** in the layout.
- **Gotcha fixed:** a root `loading.tsx` made every route stream (200 committed early), turning `notFound()` into a soft-404 (200 + 404 UI). Removed it to keep real HTTP 404s for bad/deleted listing ids. Verified: bad id → **404**, good id → 200.
- Verified: SEO endpoints (`/robots.txt`, `/sitemap.xml` w/ 8 listings, `/opengraph-image` 200 png), Product JSON-LD present, OG image renders on-brand; build green (21 routes); **E2E 20 passed / 2 skipped**.
