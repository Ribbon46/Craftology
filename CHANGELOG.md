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
