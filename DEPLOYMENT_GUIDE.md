# FORFEIT — iOS & Android App Store Deployment Guide

> Complete step-by-step guide for deploying the FORFEIT React web app to both the Apple App Store and Google Play Store using Capacitor.

---

## Table of Contents

1. [Overview & Strategy](#1-overview--strategy)
2. [Prerequisites & Accounts](#2-prerequisites--accounts)
3. [Code Changes Required](#3-code-changes-required)
4. [Capacitor Setup](#4-capacitor-setup)
5. [Native Plugin Integration](#5-native-plugin-integration)
6. [Auth Flow Adjustments](#6-auth-flow-adjustments)
7. [App Icons & Splash Screens](#7-app-icons--splash-screens)
8. [iOS Build & Submission](#8-ios-build--submission)
9. [Android Build & Submission](#9-android-build--submission)
10. [App Store Review Considerations](#10-app-store-review-considerations)
11. [Post-Launch](#11-post-launch)

---

## 1. Overview & Strategy

**Current state:** FORFEIT is a React 18 + TypeScript + Vite SPA with PWA support, deployed on Vercel.

**Strategy:** Use [Capacitor](https://capacitorjs.com/docs) (by Ionic) to wrap the existing web app in native iOS and Android shells. This preserves ~95% of the existing codebase while gaining native API access (push notifications, camera, haptics, deep links).

**Why Capacitor over alternatives:**
- Keeps all existing React/Vite code as-is
- First-class TypeScript support
- Access to native APIs via official plugins
- Active maintenance by the Ionic team
- No lock-in — you can eject to fully native if needed later

---

## 2. Prerequisites & Accounts

### Developer Accounts

| Account | Cost | Link | Notes |
|---------|------|------|-------|
| **Apple Developer Program** | $99/year | [developer.apple.com/programs](https://developer.apple.com/programs/) | Required for App Store. Enrollment takes 24–48h. You need an Apple ID. |
| **Google Play Console** | $25 one-time | [play.google.com/console](https://play.google.com/console/signup) | Required for Play Store. Instant access after payment. |

### Required Software

| Tool | Version | Link | Purpose |
|------|---------|------|---------|
| **Xcode** | 15+ | [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835) | iOS builds. macOS only. ~12GB download. |
| **Android Studio** | Latest | [developer.android.com/studio](https://developer.android.com/studio) | Android builds. Install Android SDK 34+ during setup. |
| **CocoaPods** | Latest | `sudo gem install cocoapods` | iOS dependency manager (Capacitor uses it). |
| **Java JDK** | 17 | [adoptium.net](https://adoptium.net/) | Required by Android Gradle. `brew install --cask temurin@17` |
| **Node.js** | 18+ | Already installed | You have this. |

### Accounts You'll Need Later

| Service | Purpose | Link |
|---------|---------|------|
| **Firebase** (optional) | Push notifications on Android (FCM) | [console.firebase.google.com](https://console.firebase.google.com/) |
| **Apple Push Notification service** | Push notifications on iOS | Configured in Apple Developer portal |

---

## 3. Code Changes Required

These changes are made to the existing web codebase before adding Capacitor:

### 3a. Remove iPhone Bezel Mockup (App.tsx)

The current `App.tsx` renders a hardcoded 390x844 iPhone frame for dev preview. This must be removed so the app renders at full screen on real devices.

**Before:**
```tsx
// Hardcoded phone bezel wrapping the app
<div className="bg-black rounded-[3rem] shadow-2xl overflow-hidden border-8..." style={{ width: '390px', height: '844px' }}>
```

**After:**
```tsx
// Full-screen rendering for all devices
<div className="size-full bg-bg-primary">
  <AppRouter />
  <Toaster position="top-center" richColors />
</div>
```

### 3b. Add Safe Area Padding

iOS devices with notches/Dynamic Island need safe area insets so content doesn't render behind the status bar or home indicator.

Add to your CSS:
```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
}
```

Update `index.html` viewport:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

### 3c. Fix Auth Redirect URLs

The Google OAuth redirect currently uses `window.location.origin` which will be `capacitor://localhost` (iOS) or `http://localhost` (Android) inside Capacitor. Supabase needs these added as allowed redirect URLs.

---

## 4. Capacitor Setup

### 4a. Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli
npx cap init FORFEIT com.forfeit.app --web-dir dist
```

- **App name:** `FORFEIT`
- **App ID:** `com.forfeit.app` (reverse domain — change if you own a different domain)
- **Web directory:** `dist` (Vite's output directory)

Docs: [capacitorjs.com/docs/getting-started](https://capacitorjs.com/docs/getting-started)

### 4b. Add Platform Projects

```bash
# Build the web app first
npm run build

# Add native platforms
npx cap add ios
npx cap add android
```

This creates `ios/` and `android/` directories with native Xcode/Android Studio projects.

### 4c. Create capacitor.config.ts

```typescript
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.forfeit.app',
  appName: 'FORFEIT',
  webDir: 'dist',
  server: {
    // For development — remove for production builds
    // url: 'http://YOUR_LOCAL_IP:5173',
    // cleartext: true,
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#0A0A0F',
  },
  android: {
    backgroundColor: '#0A0A0F',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#0A0A0F',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0A0F',
    },
  },
}

export default config
```

### 4d. Add NPM Scripts

Add to `package.json`:
```json
{
  "scripts": {
    "build": "vite build",
    "dev": "vite",
    "cap:sync": "npm run build && npx cap sync",
    "cap:ios": "npm run build && npx cap sync ios && npx cap open ios",
    "cap:android": "npm run build && npx cap sync android && npx cap open android"
  }
}
```

### 4e. Sync and Open

```bash
# Sync web build to native projects
npx cap sync

# Open in Xcode
npx cap open ios

# Open in Android Studio
npx cap open android
```

Docs: [capacitorjs.com/docs/basics/workflow](https://capacitorjs.com/docs/basics/workflow)

---

## 5. Native Plugin Integration

### 5a. Install Core Plugins

```bash
npm install @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard @capacitor/haptics @capacitor/share @capacitor/app @capacitor/browser
npx cap sync
```

| Plugin | Purpose | Docs |
|--------|---------|------|
| `@capacitor/status-bar` | Control status bar appearance | [capacitorjs.com/docs/apis/status-bar](https://capacitorjs.com/docs/apis/status-bar) |
| `@capacitor/splash-screen` | Native launch screen | [capacitorjs.com/docs/apis/splash-screen](https://capacitorjs.com/docs/apis/splash-screen) |
| `@capacitor/keyboard` | Keyboard events + resize behavior | [capacitorjs.com/docs/apis/keyboard](https://capacitorjs.com/docs/apis/keyboard) |
| `@capacitor/haptics` | Vibration feedback on bet actions | [capacitorjs.com/docs/apis/haptics](https://capacitorjs.com/docs/apis/haptics) |
| `@capacitor/share` | Native share sheet for bets | [capacitorjs.com/docs/apis/share](https://capacitorjs.com/docs/apis/share) |
| `@capacitor/app` | App lifecycle, deep links, back button | [capacitorjs.com/docs/apis/app](https://capacitorjs.com/docs/apis/app) |
| `@capacitor/browser` | In-app browser for OAuth | [capacitorjs.com/docs/apis/browser](https://capacitorjs.com/docs/apis/browser) |

### 5b. Push Notifications (Critical)

```bash
npm install @capacitor/push-notifications
npx cap sync
```

Requires platform-specific setup:
- **iOS**: Enable Push Notifications capability in Xcode → Signing & Capabilities
- **Android**: Add Firebase project + `google-services.json` to `android/app/`

Docs: [capacitorjs.com/docs/apis/push-notifications](https://capacitorjs.com/docs/apis/push-notifications)

### 5c. Camera (for Proof Uploads)

```bash
npm install @capacitor/camera
npx cap sync
```

Add to `ios/App/App/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>FORFEIT needs camera access to capture proof of completed challenges</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>FORFEIT needs photo library access to upload proof of completed challenges</string>
```

Docs: [capacitorjs.com/docs/apis/camera](https://capacitorjs.com/docs/apis/camera)

### 5d. Initialize Plugins in App.tsx

```typescript
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Keyboard } from '@capacitor/keyboard'

// In App.tsx useEffect:
if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark })
  StatusBar.setBackgroundColor({ color: '#0A0A0F' })
  SplashScreen.hide()

  Keyboard.addListener('keyboardWillShow', () => { /* adjust UI */ })
  Keyboard.addListener('keyboardWillHide', () => { /* restore UI */ })
}
```

---

## 6. Auth Flow Adjustments

### 6a. Supabase Redirect URLs

In your [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard):

Add these redirect URLs:
```
capacitor://localhost/auth/callback
http://localhost/auth/callback
https://localhost/auth/callback
com.forfeit.app://auth/callback
```

### 6b. Update OAuth to Use In-App Browser

For Google OAuth inside Capacitor, use `@capacitor/browser` to open the OAuth URL externally, then handle the redirect back via deep link:

```typescript
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'

// Listen for deep link callback
CapApp.addListener('appUrlOpen', ({ url }) => {
  if (url.includes('auth/callback')) {
    // Extract tokens from URL and set session
    const params = new URL(url).searchParams
    // Handle auth...
  }
})

// Open OAuth in system browser
const { data } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'com.forfeit.app://auth/callback',
    skipBrowserRedirect: true,
  },
})
if (data.url) {
  await Browser.open({ url: data.url })
}
```

### 6c. Configure Deep Links

**iOS** — Add to `ios/App/App/Info.plist`:
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.forfeit.app</string>
    </array>
  </dict>
</array>
```

**Android** — Add to `android/app/src/main/AndroidManifest.xml` inside `<activity>`:
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="com.forfeit.app" />
</intent-filter>
```

Docs: [capacitorjs.com/docs/guides/deep-links](https://capacitorjs.com/docs/guides/deep-links)

---

## 7. App Icons & Splash Screens

### 7a. Required Assets

You need a single high-resolution source icon (1024x1024 PNG, no transparency for iOS):

| Platform | Sizes Needed | Notes |
|----------|-------------|-------|
| **iOS** | 1024x1024 (App Store), auto-generated smaller sizes | No transparency, no alpha channel |
| **Android** | 512x512 (Play Store), adaptive icon (foreground + background layers) | Use round icon variant |

### 7b. Generate with Capacitor Assets

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#0A0A0F' --splashBackgroundColor '#0A0A0F'
```

Place source files in:
```
resources/
├── icon-only.png          (1024x1024, your app logo centered)
├── icon-foreground.png    (1024x1024, Android adaptive foreground)
├── icon-background.png    (1024x1024, Android adaptive background)
├── splash.png             (2732x2732, splash centered)
└── splash-dark.png        (2732x2732, dark mode splash)
```

Docs: [capacitorjs.com/docs/guides/splash-screens-and-icons](https://capacitorjs.com/docs/guides/splash-screens-and-icons)

---

## 8. iOS Build & Submission

### 8a. Configure Xcode Project

1. Open: `npx cap open ios`
2. Select the **App** target → **Signing & Capabilities**
3. Set your **Team** (Apple Developer account)
4. Set **Bundle Identifier**: `com.forfeit.app`
5. Add capabilities:
   - Push Notifications
   - Associated Domains (for universal links, optional)

### 8b. Test on Device / Simulator

```bash
# Build + sync
npm run build && npx cap sync ios

# Run on simulator
npx cap run ios

# Run on connected device (requires provisioning profile)
npx cap run ios --target YOUR_DEVICE_UUID
```

### 8c. Create Archive for App Store

1. In Xcode: **Product → Archive**
2. Once archived, click **Distribute App → App Store Connect → Upload**
3. Go to [App Store Connect](https://appstoreconnect.apple.com/) to complete the listing

### 8d. App Store Connect Listing

Create your app listing at [appstoreconnect.apple.com](https://appstoreconnect.apple.com/):

| Field | Value |
|-------|-------|
| App Name | FORFEIT |
| Subtitle | Social Bets & Challenges |
| Category | Social Networking (primary), Entertainment (secondary) |
| Age Rating | 17+ (due to betting theme — fill out questionnaire) |
| Price | Free |
| Privacy Policy URL | Required — host at your domain |
| Support URL | Required — email or webpage |

**Screenshots required:**
- 6.7" (iPhone 15 Pro Max): 1290 x 2796 px
- 6.5" (iPhone 14 Plus): 1284 x 2778 px
- 5.5" (iPhone 8 Plus): 1242 x 2208 px — optional but recommended
- iPad Pro 12.9": 2048 x 2732 px — required if you support iPad

Use the iOS Simulator to capture screenshots or tools like [shotbot.io](https://shotbot.io/) or [screenshots.pro](https://screenshots.pro/).

Docs: [developer.apple.com/app-store/submitting](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app)

---

## 9. Android Build & Submission

### 9a. Configure Android Project

1. Open: `npx cap open android`
2. In `android/app/build.gradle`, verify:
   - `applicationId "com.forfeit.app"`
   - `minSdkVersion 22` (or higher)
   - `targetSdkVersion 34`
   - `versionCode 1`
   - `versionName "1.0.0"`

### 9b. Generate Signed APK/AAB

1. In Android Studio: **Build → Generate Signed Bundle / APK**
2. Create a new keystore (save this securely — you need it for all future updates)
3. Select **Android App Bundle (AAB)** — required by Google Play
4. Build release variant

Or via command line:
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 9c. Google Play Console Listing

Create your app at [play.google.com/console](https://play.google.com/console/):

| Field | Value |
|-------|-------|
| App Name | FORFEIT |
| Short Description | Social bets and challenges with friends (max 80 chars) |
| Full Description | Longer description of app features (max 4000 chars) |
| Category | Social |
| Content Rating | Complete the questionnaire (likely Teen or Mature) |
| Privacy Policy URL | Required |

**Graphics required:**
- Feature graphic: 1024 x 500 px
- Screenshots: Min 2, max 8 per device type (phone, tablet)
  - Phone: 16:9 or 9:16 ratio, min 320px, max 3840px per side
- App icon: 512 x 512 px (32-bit PNG)

### 9d. Testing Tracks

1. **Internal testing** (up to 100 testers) — fastest, no review
2. **Closed testing** — invite specific users
3. **Open testing** — anyone can join
4. **Production** — public release (requires review)

Start with Internal Testing to validate the build works.

Docs: [developer.android.com/distribute/console](https://developer.android.com/distribute/console)

---

## 10. App Store Review Considerations

### Critical: Betting/Gambling Classification

Both Apple and Google have strict policies around gambling and betting apps.

**FORFEIT is NOT a gambling app** — no real-money wagering, no house, no payouts. Frame it as:
- A **social challenge app** with friendly stakes
- Similar to dare games, fitness challenges, or habit trackers
- Money stakes (if any) are peer-to-peer social agreements, not processed by the app

**Key language to use in store listings:**
- "Social challenges" not "betting"
- "Stakes" or "consequences" not "wagers"
- "Ride with" / "Doubt" not "bet on"

**Key language to AVOID:**
- "Gambling", "casino", "odds", "bookmaker"
- Any implication the app facilitates real-money gambling

### Apple-Specific Review Guidelines

- [App Store Review Guidelines 5.3 — Gaming, Gambling, and Lotteries](https://developer.apple.com/app-store/review/guidelines/#gaming-gambling-and-lotteries)
- If Apple flags it, you may need to add a disclaimer that no real money is processed through the app
- Ensure all user-generated content (Hall of Shame) has a **Report** button

### Google-Specific Policies

- [Google Play Gambling Policy](https://support.google.com/googleplay/android-developer/answer/9877032)
- Complete the **Data Safety** form (what data you collect, share, store)
- Declare use of location, camera, notifications in the **App Content** section

### Content Moderation (Both Platforms)

Both stores require apps with user-generated content to have:
- Content reporting mechanism
- Content moderation process
- Terms of Service
- Privacy Policy

---

## 11. Post-Launch

### CI/CD (Optional but Recommended)

Set up automated builds with:
- **Fastlane**: [docs.fastlane.tools](https://docs.fastlane.tools/) — automates screenshots, builds, uploads for both platforms
- **GitHub Actions + Fastlane**: Auto-deploy on merge to main

### Updates

With Capacitor, most updates are just web code changes:
- Pure UI/logic changes: Deploy to web (Vercel) and users get updates on next app open
- Native plugin changes: Require new binary submission through the stores

Consider [Capgo](https://capgo.app/) or [Appflow](https://ionic.io/appflow) for live updates without store submission (similar to CodePush).

### Analytics & Crash Reporting

| Service | Link | Notes |
|---------|------|-------|
| Firebase Analytics | [firebase.google.com/products/analytics](https://firebase.google.com/products/analytics) | Free, works on both platforms |
| Sentry | [sentry.io](https://sentry.io/) | Error tracking with source maps |
| Mixpanel | [mixpanel.com](https://mixpanel.com/) | Product analytics |

### Push Notification Backend

Your current service worker handles web push. For native push:
- Use Supabase Edge Functions to send notifications via APNs (iOS) and FCM (Android)
- Or use a service like [OneSignal](https://onesignal.com/) or [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)

---

## Quick Reference: Commands

```bash
# Initial setup
npm install @capacitor/core @capacitor/cli
npx cap init FORFEIT com.forfeit.app --web-dir dist
npm run build
npx cap add ios
npx cap add android

# Install plugins
npm install @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard @capacitor/haptics @capacitor/share @capacitor/app @capacitor/browser @capacitor/camera @capacitor/push-notifications

# Daily workflow
npm run build && npx cap sync       # Sync web changes to native
npx cap open ios                     # Open in Xcode
npx cap open android                 # Open in Android Studio
npx cap run ios                      # Run on iOS simulator
npx cap run android                  # Run on Android emulator

# Generate icons & splash screens
npm install -D @capacitor/assets
npx capacitor-assets generate
```

---

## Estimated Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Account setup | 1–3 days | Apple enrollment can take 48h |
| Code changes + Capacitor setup | 1–2 days | Steps 3–6 of this guide |
| Icons, splash screens, screenshots | 1 day | Need design assets |
| iOS build + TestFlight | 1 day | First build takes longest |
| Android build + internal test | 1 day | Simpler than iOS |
| App Store review (Apple) | 1–7 days | First submission takes longer |
| Play Store review (Google) | 1–3 days | Usually faster than Apple |

**Total: ~1–2 weeks** from start to both stores (assuming accounts are set up).

---

*Generated for the FORFEIT project — February 2026*
