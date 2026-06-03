# Craftology Project Guide

## Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Styling:** Tailwind CSS (v4), shadcn/ui — **"Atelier" theme** (warm cream/espresso/clay/sage/gold). Fonts: **Fraunces** (display, via `--font-fraunces`) + **Hanken Grotesk** (body, `--font-hanken`), `next/font` w/ `latin-ext`. Brand color utilities: `bg-clay text-ink border-line bg-cream bg-surface text-gold` etc. (defined in `globals.css` `@theme`). Paper-grain via `.paper-grain`; cards via `.atelier-card`; chips via `.chip`.
- **Theming (light/dark):** Each brand color in `@theme inline` is `var(--cream)` / `var(--ink)` / … — those switchable vars are set in `:root` (light Atelier) and overridden in `.dark` (nocturne). Flipping the `.dark` class on `<html>` re-skins the whole app (utilities *and* `.chip`/`.atelier-card` CSS) with no per-component dark classes. `src/lib/theme.tsx` owns state: defaults to the device's `prefers-color-scheme` when the user hasn't chosen, remembers an explicit pick in `localStorage['craftology-theme']`, and follows the system until then. A pre-paint inline script in `layout.tsx` (`THEME_INIT`) sets the class before first frame (no flash) — **keep it in sync with `theme.tsx`**. Toggle lives in `SiteHeader` (CSS-driven icons, no hydration flash) and `profile/settings`. Don't pair `text-white` with `bg-ink` (ink inverts to cream) — use `text-paper`; media overlays over photos use fixed `bg-black/*`.
- **Native:** Capacitor (`android/` scaffolded, `appId ro.decokubik.craftology`) — loads hosted site via `server.url`. See `DEPLOY.md`.
- **Icons:** lucide-react
- **Data Fetching:** @tanstack/react-query (infinite scroll)
- **Backend:** Supabase (PostgreSQL with RLS enabled)
- **Auth:** @supabase/ssr (Server-Side Rendering cookie management)
- **Validation:** Zod (form schemas)
- **UI Components:** button, dialog, input, dropdown-menu, card, tabs, badge, textarea, Dropzone

## Current Routing Structure
```
src/app/
├── layout.tsx          # Root layout with QueryClientProvider, mobile container
├── page.tsx            # Home page (Vinted-style feed with infinite scroll)
├── search/page.tsx     # Search page with filters
├── sell/page.tsx       # Product listing form with dropzone
├── messages/page.tsx   # Messages/inbox
├── profile/page.tsx    # User profile with tabs
└── listings/[id]/page.tsx  # Product detail with carousel
```

## Component Hierarchy
- `components/ui/`: shadcn components + Dropzone (image upload)
- `components/navigation/`: **SiteHeader** (adaptive: phone brand bar / desktop full nav), **SiteFooter** (desktop only), **BottomNav** (mobile only, `lg:hidden`)
- `components/auth/`: AuthModal
- `actions/`: Server actions for listings, messages
- `schemas/`: Zod validation schemas
- `config/app.ts`: Application configuration, Romanian constants

## Responsive / Adaptive Design
- **Adapts by width:** phone = app column + bottom tab bar; **desktop (`lg`+) = full-width storefront** (top nav, editorial Fraunces hero, 2→3→4→5-col grid, 2-col listing detail, footer). Tablet/landscape sits between. No global phone-column wrapper — `<main>` is full-width; each page sets its own desktop `max-w-*`. The Capacitor Android app + iPhone PWA load the live site, so they inherit all of this.
- Mobile-first base:
- Max-width container (640px) with mx-auto centering
- Safe area padding (top: env(safe-area-inset-top))
- Bottom nav with safe area bottom padding (env(safe-area-inset-bottom))
- Touch-friendly active states (active:scale-[0.98])
- Ripple effect animations
- Category chips are scrollable (Vinted-style)
- Image aspect ratio 4:5 or 1:1 for listings

## Romanian Language
All UI text is in Romanian:
- Categories: Bijuterii, Haine, Lumânări, Accesorii, Frumusețe
- Navigation: Acasă, Căutare, + Vinde, Mesaje, Profil
- Labels: Titlu, Descriere, Preț în RON, Categorie
- Messages: "Se încarcă produse...", "Vă rugăm să vă autentificați", etc.

## Database Schema
See `supabase/schema.sql` for profiles, listings, conversations, messages tables with RLS.
- **Identity invariant:** `profiles.id` **IS** the `auth.users.id` (1:1, no separate `user_id`). All RLS compares `auth.uid()` directly to `seller_id` / `buyer_id` / `sender_id`.
- A `handle_new_user()` trigger auto-creates a `profiles` row on signup (username = email local part + short id suffix; user can rename later).
- **Hardened writes (Phase 14 audit):** `conversations` INSERT requires `auth.uid() = buyer_id AND buyer <> seller AND the seller owns the listing` (server actions derive ids from the session/listing — never trust client ids). `messages` UPDATE is participant-scoped with a column grant limited to `read`. `profiles` UPDATE is column-scoped to `username/full_name/avatar_url` (rating is server-controlled). Keep these invariants when touching the schema.
- `listings` & `profiles` are world-readable (public browsing). Conversations/messages are participant-only.
- Storage bucket `listings_images` (public) + policies are created by `schema.sql`; object paths are `listings/<auth.uid()>/<uuid>.<ext>`.

## Server Actions
- `createListing` - Upload images and create listing
- `deleteListing` - Remove listing and storage
- `updateListingStatus` - Mark as sold
- `createConversation` - Initiate chat
- `createMessage` - Send message
- `getMessages` - Fetch conversation
- `getConversations` - Fetch inbox
- `createCheckoutSession` - Stripe Checkout for a listing (`src/actions/checkout.ts`)

## Payments (Stripe)
- `src/lib/stripe.ts` (`isStripeConfigured()` gate, like Supabase), `createCheckoutSession` action, "Cumpără" button on listing detail, `/checkout/success`, webhook `/api/webhooks/stripe` (marks listing sold; needs `SUPABASE_SERVICE_ROLE_KEY`). Single-account → shop's Stripe; Connect = future. Inert until `STRIPE_SECRET_KEY` set. See `DEPLOY.md`.

## Demo vs Live Mode
The app runs fully on mock data until valid Supabase keys exist. `isSupabaseConfigured()` (`src/lib/supabase/config.ts`) is the switch; `src/lib/data/listings.ts` and the message actions read live data when configured and fall back to mock otherwise. Mock data lives in `src/lib/mock.ts`; the mock Supabase client in `src/lib/supabase/mock-client.ts`.

## Next Steps (to go live)
1. Paste real Supabase credentials into `.env.local` (currently placeholders) — the app auto-switches from demo to live.
2. Run `supabase/schema.sql` in the Supabase SQL editor — creates tables, RLS, the new-user trigger, the `messages.read` column, and the `listings_images` bucket + policies in one pass.
3. Smoke-test end to end: sign up → create a listing (image upload) → message a seller.
4. Enhancements: per-conversation unread counts + last-message preview in `getConversations`; profile reading the real `profiles` row + listings; profile edit screen.
5. Roadmap (per HANDOFF): deploy to Vercel → wrap with Capacitor for the Android `.apk` → later add direct Stripe checkout.
