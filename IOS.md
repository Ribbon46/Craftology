# Native iOS app (Codemagic — no Mac required)

The Android app is a Capacitor shell that loads the live site via `server.url`.
iOS works the same way — the only blocker is that **building an iOS app requires
Xcode, which only runs on macOS**. Rather than buy/rent a Mac, use **Codemagic**:
a cloud CI that owns the Macs, natively supports Capacitor, builds + signs the
`.ipa`, and uploads it to TestFlight / the App Store. Free tier (~500 build-min/mo)
is plenty.

> **Before you invest in this:** the iPhone PWA ("Add to Home Screen") already
> gives users an app icon + full-screen launch today, for free, with zero review.
> Only go native when you need something a PWA can't do on iOS (e.g. push
> notifications). See the "Will Apple approve it?" caveat at the bottom — a pure
> web wrapper is at real risk of rejection under Apple's Guideline 4.2.

---

## Prerequisites (one-time)

1. **Apple Developer Program** — $99/year (apple.com/developer). Required to ship
   to TestFlight or the App Store. This is the iOS equivalent of the Play Store's
   $25 fee, so it's the same "wait for the green light" decision.
2. A **Codemagic** account (codemagic.io) — sign in with the GitHub that hosts the repo.

---

## 1. Add the iOS platform (local, no Mac needed to scaffold)

```bash
npm i @capacitor/ios
npx cap add ios
npx cap sync ios
```

`capacitor.config.ts` already points `server.url` at the live Vercel site, so the
iOS shell loads the same hosted app as Android — no separate build of the web app.
Commit the generated `ios/` folder.

> Generating the app icon/splash also works cross-platform:
> `npx @capacitor/assets generate --ios` (uses the same `resources/icon.png`).

## 2. Create the app in App Store Connect

- App Store Connect → **My Apps → +** → New App.
- **Bundle ID:** `ro.decokubik.craftology` (must match `capacitor.config.ts`).
- Create an **App Store Connect API key** (Users and Access → Integrations → App
  Store Connect API). Codemagic uses this for automatic code signing + publishing,
  so you never manage certificates/provisioning profiles by hand.

## 3. Configure the Codemagic workflow

Connect the repo in Codemagic and use the **Capacitor / Ionic iOS** workflow, or
commit a `codemagic.yaml` like this:

```yaml
workflows:
  ios-capacitor:
    name: Craftology iOS
    instance_type: mac_mini_m2
    integrations:
      app_store_connect: <your-ASC-API-key-name>
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: ro.decokubik.craftology
      node: 20
      xcode: latest
    scripts:
      - npm ci
      - npx cap sync ios
      - name: Set up signing
        script: xcode-project use-profiles
      - name: Build ipa
        script: |
          xcode-project build-ipa \
            --workspace ios/App/App.xcworkspace \
            --scheme App
    artifacts:
      - build/ios/ipa/*.ipa
    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
```

## 4. Build & ship

- Push to GitHub → Codemagic builds, signs, and uploads to **TestFlight**.
- Test on your iPhone via the TestFlight app.
- When ready, submit for App Store review from App Store Connect.

> Like Android, because the shell loads the hosted site, **content/UI updates ship
> instantly** via your normal Vercel deploy — you only re-publish the iOS app when
> native config changes (icons, plugins, bundle id, `server.url`).

---

## ⚠️ Will Apple approve it?

Apple's **Guideline 4.2 (Minimum Functionality)** frequently rejects apps that are
"just a repackaged website." A pure `WKWebView` pointing at a URL is the classic
rejection. Android/Play Store is far more lenient; Apple is strict.

To pass review, add genuine native value before submitting, e.g.:
- **Push notifications** (`@capacitor/push-notifications`) — new message / order alerts.
- **Native share** (`@capacitor/share`) — already partly used on the web via the Web Share API.
- Offline handling, native image picker for selling, biometric login, etc.

Until there's a concrete reason to go native on iOS, the **PWA is the pragmatic
choice** and covers iPhone users with no fee, no Mac, and no review.
