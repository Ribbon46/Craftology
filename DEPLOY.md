# Craftology — Deployment Guide

> **STATUS: LIVE** → https://craftology-peach.vercel.app (production, real Supabase data).
> Redeploy anytime with **`npm run deploy`** (injects the Supabase env from `.env.local`
> so the deployment always uses live data — see note below).

The app is production-ready and connected to Supabase. The remaining items below need
**your accounts / local tooling** (env persistence for git auto-deploy, custom domain,
Android SDK for the APK).

---

## 1. Deploy the web app to Vercel

The app uses **Server Actions** + `@supabase/ssr`, so it must run on a Node host
(Vercel), not as a static export.

1. **Push to GitHub** (no remote is configured yet):
   ```bash
   gh repo create craftology --private --source=. --push
   # or: git remote add origin <your-repo-url> && git push -u origin master
   ```
2. **Import to Vercel** → https://vercel.com/new → pick the repo. Framework
   auto-detects as Next.js; no build config needed.
3. **Add environment variables** in Vercel → Project → Settings → Environment
   Variables (same values as `.env.local`):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xpyfnxnhewmjwblwlcwg.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_…
   ```
4. **Deploy.** Note the production URL (e.g. `https://craftology.vercel.app`).
5. **Tell Supabase about the domain** → Supabase dashboard → Authentication →
   URL Configuration → set **Site URL** + **Redirect URLs** to your Vercel domain
   (so email-confirmation / auth redirects land back in the app).

> Email rate limits: the built-in Supabase email sender is throttled. For real
> signups at volume, configure a custom SMTP provider in Supabase → Auth → Emails.

---

## 2. Android APK via Capacitor

Capacitor is already installed and the `android/` project is scaffolded
(`appId: ro.decokubik.craftology`). The native shell loads the live site via
`server.url` (set in `capacitor.config.ts`).

**One-time local tooling:** install **Android Studio** (bundles the Android SDK)
and **JDK 17**.

1. Set the production URL in `capacitor.config.ts`:
   ```ts
   server: { url: 'https://YOUR-VERCEL-URL.vercel.app', cleartext: false }
   ```
2. Sync it into the native project:
   ```bash
   npx cap sync android
   ```
3. (Optional) Generate icons/splash from a logo:
   ```bash
   npm i -D @capacitor/assets
   # put a 1024x1024 logo at resources/icon.png, then:
   npx @capacitor/assets generate --android
   ```
4. Open in Android Studio and run / build:
   ```bash
   npx cap open android
   ```
   - **Debug APK:** `cd android && ./gradlew assembleDebug`
     → `android/app/build/outputs/apk/debug/app-debug.apk`
   - **Play Store (signed):** create a keystore, then
     `./gradlew bundleRelease` → upload the `.aab` to Google Play Console.

> Because the shell loads the hosted site, every Vercel deploy updates the app
> instantly — no re-publish needed for content/UI changes. Re-publish the APK
> only when native config (icons, plugins, appId, server.url) changes.

---

## 3. Stripe checkout (optional — scaffolded, add keys to activate)

The "Cumpără" button + webhook are built but **inert until you add Stripe keys**.
Payments go to the shop's own Stripe account (single-seller MVP).

1. Stripe dashboard → Developers → API keys → copy the **Secret key** (`sk_test_…` to test).
2. Add to `.env.local` (local) **and** Vercel env (production):
   ```
   STRIPE_SECRET_KEY=sk_test_…
   ```
3. (Optional, to auto-mark items sold) Add a webhook in Stripe → Developers → Webhooks:
   - Endpoint: `https://craftology-peach.vercel.app/api/webhooks/stripe`
   - Event: `checkout.session.completed`
   - Copy the signing secret → set `STRIPE_WEBHOOK_SECRET=whsec_…`
   - Also set `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API) so the webhook can update the listing.
4. Redeploy (`npm run deploy`). Now "Cumpără" opens Stripe Checkout in RON.

> Multi-seller payouts (money straight to each seller) = **Stripe Connect** with
> destination charges — a future upgrade once there are independent sellers.

---

## 4. Rate limiting (optional — built, add Upstash keys to activate)

Per-user throttling on the write actions (messages, conversations, listings) is
wired in `src/lib/ratelimit.ts` but **inert until both Upstash REST vars are set**.

> ⚠️ The Upstash **account/management API key** (a UUID) is NOT what's needed here.
> `@upstash/ratelimit` needs a specific Redis database's REST credentials.

1. console.upstash.com → create a **Redis** database (free tier is plenty).
2. Open it → **REST API** section → copy both values:
   ```
   UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
   UPSTASH_REDIS_REST_TOKEN=AX…   # long token, not the account UUID
   ```
3. Add both to `.env.local` (local) **and** Vercel env (production), then redeploy.

Limits (sliding window, per user): 20 messages/min, 10 new conversations/min,
10 listings/hour. Fails **open** on a Redis error so a hiccup never blocks users.

## Testing

End-to-end tests (Playwright) cover the critical paths — feed render + category
filter, listing detail + actions, real 404 for bad ids, Open Graph tags on shared
links, search empty state, the auth modal, and the dark-theme toggle/persistence.

```bash
npm run test:e2e          # spins up a dev server, runs mobile + desktop projects
```

## Future
- **Stripe Connect** for seller-direct payouts.
- Per-conversation unread counts + last-message preview in `getConversations`.
- Replace seeded sample listings with real Deco Kubik products.
