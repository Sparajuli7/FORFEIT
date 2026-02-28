# LYNK App — Project Audit

**Date**: 2026-02-18
**Source**: Figma Make export (https://www.figma.com/design/Z81HG1fSQfAejobibVAGuV/FORFEIT-Mobile-App-Mockup)
**Stack**: React 18 + Vite 6 + TypeScript + Tailwind CSS v4 + Radix UI + Framer Motion (motion) + react-router v7

---

## 1. Directory Structure

```
LYNK Mobile App Mockup (1)/
├── src/
│   ├── main.tsx                        # Entry point — mounts App
│   ├── app/
│   │   ├── App.tsx                     # Root component — manual screen router + dark mode
│   │   ├── index.tsx                   # Re-exports App
│   │   ├── screens/                    # 20 screen components (see §2)
│   │   └── components/
│   │       ├── ui/                     # 70+ Radix UI wrappers (see §3b)
│   │       ├── figma/                  # Figma-generated layout helpers
│   │       └── [custom components]    # See §3a
│   └── styles/
│       ├── index.css                   # Imports fonts, tailwind, theme
│       ├── tailwind.css                # Tailwind v4 directives + @theme block
│       ├── theme.css                   # CSS custom property tokens
│       └── fonts.css                  # Inter font imports
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── package.json
├── README.md
└── ATTRIBUTIONS.md
```

---

## 2. Screen / Page Components (`src/app/screens/`)

20 screen files total. The active set used in App.tsx is marked **[ACTIVE]**; others exist as variants or alternates.

| # | File | Screen Name | What it represents |
|---|------|-------------|-------------------|
| 1 | `Splash.tsx` | Splash | **[ACTIVE]** Splash screen with LYNK wordmark, tagline pills (🤝 Ride · 💀 Doubt · 🔥 Forfeit), Enter/Log in buttons, scrolling ticker |
| 2 | `Onboarding.tsx` | Onboarding | **[ACTIVE]** Tutorial cards explaining "Riders vs Doubters" concept with illustrated steps |
| 3 | `TheBoard.tsx` | The Board (Home) | **[ACTIVE]** Main feed of active bets with filter tabs, live indicator, notification bell, BetCard list, FAB |
| 4 | `BetCreationStakes.tsx` | Bet Creation — Stakes | **[ACTIVE]** Step in bet creation: money tab (chip selector $5–$50), punishment tab (stacked PlayingCard components), combined Both tab |
| 5 | `ProofSubmission.tsx` | Proof Submission | **[ACTIVE]** Dual-mode proof uploader — Camera mode (BeReal-style countdown) and Upload mode (photo/screenshot/video/doc) |
| 6 | `OutcomeWin.tsx` | Outcome — Win | **[ACTIVE]** Victory screen: WINNER banner, avatar with crown, confetti, collected amount, loser list |
| 7 | `OutcomeForfeit.tsx` | Outcome — Forfeit | **[ACTIVE]** Loss screen: red gradient, crack illustration, PunishmentReceipt, dispute button |
| 8 | `HallOfShame.tsx` | Hall of Shame | **[ACTIVE]** Punishment leaderboard: TOP 3 podium (Sam/Jordan/Alex), shame cards with proof images, emoji reactions (😭💀🔥), group stats |
| 9 | `BetDetail.tsx` | Bet Detail | **[ACTIVE]** Individual bet view: countdown timer, riders/doubters lists, join buttons, activity feed |
| 10 | `ProfileScreen.tsx` | Profile | **[ACTIVE]** User profile: avatar, stats grid (Total Bets/Win Rate/Best Streak/Punishments), rivalries ("Your Beef Board"), recent bets list |
| 11 | `HomeFeed.tsx` | Home Feed (variant) | Alternate home feed with filter chips (All/Active/Deciding/Completed) and bet card list |
| 12 | `BetCreation.tsx` | Bet Creation (step 1) | First step of bet creation flow (challenge text entry) |
| 13 | `Competitions.tsx` | Competitions | Placeholder/stub for group competition mode |
| 14 | `HeadToHead.tsx` | Head-to-Head | H2H betting mode screen |
| 15 | `HallOfShameRevamped.tsx` | Hall of Shame (v2) | Alternate Hall of Shame layout |
| 16 | `OnboardingScreen.tsx` | Onboarding (variant) | Alternate onboarding variant |
| 17 | `OutcomeReveal.tsx` | Outcome Reveal | Alternate outcome reveal screen |
| 18 | `ProfileSportsbook.tsx` | Profile — Sportsbook | Sportsbook-themed profile variant |
| 19 | `SplashScreen.tsx` | Splash (variant) | Alternate splash variant |
| 20 | `SplashScreenSportsbook.tsx` | Splash — Sportsbook | Sportsbook-themed splash variant |

**Active navigation flow in App.tsx:**
```
splash → onboarding → home (TheBoard)
                           ↓ [Quick Bet FAB]
                        creation (BetCreationStakes)
                           ↓
                        proof (ProofSubmission)
                           ↓
                        forfeit (OutcomeForfeit)
                           ↓
                        shame (HallOfShame)

home → win (OutcomeWin)   [also reachable from home]
```

---

## 3. Components

### 3a. Custom Shared Components (`src/app/components/`)

| File | What it does |
|------|-------------|
| `BetCard.tsx` | Card displaying a single bet: group name, category tag, countdown, claimant avatar, odds bar, stake, status badge (active/proof/completed/disputed), "JOIN →" CTA |
| `BottomNav.tsx` | 5-tab bottom navigation bar with emoji icons (📊🏋️⚔️🏆💀👤), active dot + label indicator |
| `BottomNavBar.tsx` | Alternate bottom nav variant |
| `OddsBar.tsx` | RIDERS % vs DOUBTERS % two-column layout with proportional colored bar and count text |
| `OddsDisplay.tsx` | Alternative odds visualization (likely simpler/different layout) |
| `PlayingCardPunishment.tsx` | Playing-card-styled punishment display: suit/rank, punishment text, difficulty badge (mild/medium/savage), completion stats |
| `PunishmentReceipt.tsx` | Receipt-styled component with dashed border, bet info, loser name, punishment, winners list, signature line |
| `REPBadge.tsx` | Circular badge showing reputation %; color-coded: ≥90% gold, ≥70% green, else coral |
| `PrimaryButton.tsx` | Button wrapper with variants: primary / ghost / danger |
| `SportsbookButton.tsx` | Sportsbook-themed button variant |
| `SportsbookBetCard.tsx` | Sportsbook-styled bet card variant |
| `ImageWithFallback.tsx` | `<img>` with SVG fallback on error |

### 3b. Radix UI Wrappers (`src/app/components/ui/`)

70+ thin wrappers over shadcn/ui + Radix UI primitives. All follow the shadcn pattern (CVA variants, cn() helper). Key ones:

`accordion` · `alert-dialog` · `alert` · `aspect-ratio` · `avatar` · `badge` · `breadcrumb` · `button` · `calendar` · `card` · `carousel` · `chart` · `checkbox` · `collapsible` · `command` · `context-menu` · `dialog` · `drawer` · `dropdown-menu` · `form` · `hover-card` · `input-otp` · `input` · `label` · `menubar` · `navigation-menu` · `pagination` · `popover` · `progress` · `radio-group` · `resizable` · `scroll-area` · `select` · `separator` · `sheet` · `sidebar` · `skeleton` · `slider` · `sonner` · `switch` · `table` · `tabs` · `textarea` · `toggle` · `toggle-group` · `tooltip` · `use-mobile` · `utils`

---

## 4. Routing — react-router Status

**react-router v7.13.0 is installed but NOT used.**

Navigation is implemented as manual `useState` in `App.tsx`:

```tsx
// App.tsx
const [screen, setScreen] = useState<Screen>('splash');

// All screens rendered conditionally:
{screen === 'splash' && <Splash onEnter={() => setScreen('onboarding')} />}
{screen === 'onboarding' && <Onboarding onNext={() => setScreen('home')} />}
// etc.
```

There are 11 named screen states: `splash`, `onboarding`, `home`, `h2h`, `compete`, `shame`, `profile`, `creation`, `proof`, `win`, `forfeit`.

**No `<BrowserRouter>`, `<Routes>`, `<Route>`, or `createBrowserRouter` exists anywhere in the codebase.**

All inter-screen navigation is prop-drilled via callbacks (`onNavigate`, `onNext`, `onBack`, `onSubmit`, `onShare`, `onDispute`).

---

## 5. State Management

**No dedicated state management library is configured.**

Current state lives in:
- `App.tsx` — `screen` (current view) + `darkMode` (boolean, toggles `.dark` CSS class on root div)
- Individual screen components — local `useState` for UI state (e.g., selected tab, camera countdown, selected dollar amount)

Notable local states per screen:
- `BetCreationStakes.tsx` — `activeTab` ('money'|'punishment'|'both'), `selectedAmount`
- `ProofSubmission.tsx` — `mode` ('camera'|'upload'), `countdown` (3→0 timer), `captureState`
- `TheBoard.tsx` — `activeFilter`, notification count
- `BetDetail.tsx` — join status per side

**Installed but unused**: next-themes (theme management), no Zustand/Redux/Context stores found.

**No persistence**: No localStorage, sessionStorage, or cookie usage detected.

---

## 6. Tailwind Config & CSS Setup (v4)

Tailwind v4 does **not** use `tailwind.config.js` for theme. Theme is defined in CSS.

### Entry point: `src/styles/index.css`
```css
@import './fonts.css';
@import './tailwind.css';
@import './theme.css';
```

### `src/styles/tailwind.css` — Tailwind v4 directives
```css
@import "tailwindcss";
@source "../app";
@import "./theme.css";
```

Uses `@source` to tell Tailwind where to scan for class names (v4 pattern, replaces `content` array).

### `src/styles/theme.css` — CSS custom property tokens

**Light mode (`:root`):**
```css
--bg-primary:    #F4F4F8
--bg-card:       #FFFFFF
--bg-elevated:   #EEEEF5
--accent-green:  #00C853
--accent-coral:  #FF3D57
--gold:          #F59E0B
--purple:        #7B61FF
--text-primary:  #0A0A0F
--text-muted:    #6B7280
--border-subtle: #E2E2EE
--live-indicator:#FF3D57
```

**Dark mode (`.dark`):**
```css
--bg-primary:    #0A0A0F
--bg-card:       #13131A
--bg-elevated:   #1C1C27
--accent-green:  #00E676    /* brighter */
--gold:          #FFB800    /* brighter */
--text-primary:  #FFFFFF
--border-subtle: #252533
```

### Custom utility classes defined in CSS:

| Class | Purpose |
|-------|---------|
| `.diagonal-grid` | Diagonal stripe pattern (betting-slip aesthetic) |
| `.grain-texture` | SVG fractal noise overlay for premium texture |
| `.glitch-text` | Pseudo-element glitch offset effect |
| `.pulse-live` | 1.5s pulsing animation for live indicators |
| `.flash` | 1s flashing for "proof dropped" badge |
| `.animate-marquee` | 25s horizontal scrolling ticker |
| `.btn-pressed` | Active state: `scale(0.97)` + `brightness(0.85)` |
| `.glow-green` | Green box-shadow glow: `0 0 24px rgba(0,230,118,0.35)` |
| `.border-l-status` | 3px left border: active (green) / proof (gold) / completed (muted) / disputed (coral) |
| `.no-scrollbar` | Hides scrollbar on mobile |
| `.pb-safe` | Safe area bottom padding (notch support) |
| `.receipt-border` | Dashed border for PunishmentReceipt |
| `.perforated-bottom` | Radial gradient perforated bottom edge |
| `.card-suit` | Playing card suit glyph styling |
| `.rotate-slight` | `-1deg` rotation for receipt realism |
| `.scoreboard-digit` | Bold tabular numbers with letter-spacing |
| `.card-shadow-light` | Subtle card elevation shadow |

### `tailwind.config.ts`
A `tailwind.config.ts` file exists at root but is likely vestigial from a v3 setup. In v4, configuration lives in CSS. Verify if it conflicts.

---

## 7. Hardcoded Mock Data

All data below is hardcoded in component files and will need to be replaced with real API/database data.

### `Splash.tsx`
```
Scrolling ticker: "Mike · Lost · Owes $20 · Sarah · Won streak 4 · The Boys · 3 active bets"
```

### `TheBoard.tsx`
```js
// Filter categories
['All', '🏋️ Fitness', '💰 Money', '🎭 Social', '⚔️ H2H', '🏆 Compete', 'Wildcard 🎲']

// BetCard instances (hardcoded JSX props):
{ claimant: "Jordan", claim: "Hit the gym 5 days this week", riderPct: 67, doubterPct: 33, stake: "$20", status: "active" }
{ claimant: "Alex",   claim: "No drinking for 30 days",       riderPct: 40, doubterPct: 60, stake: "$15 + punishment" }
{ claimant: "Sam",    claim: "Clean apartment before Sunday",  riderPct: 75, doubterPct: 25, stake: "punishment only" }

// Ticker
"Mike · Lost · Owes $20 · Sarah · Won streak 4 · The Boys · 3 active bets"
```

### `BetCreationStakes.tsx`
```js
// Money presets
[5, 10, 20, 50]  // dollars

// Punishment cards
[
  { text: "Post an embarrassing throwback to your main story", difficulty: "medium", completionRate: 71, timesAssigned: 43 },
  { text: "Wear your shirt backwards all day",                 difficulty: "mild" },
  { text: "Post a cringe TikTok dance",                       difficulty: "medium" },
]
```

### `BetDetail.tsx`
```js
claimant: "Jordan"
claim: "I'll hit the gym 5 days this week"
countdown: { days: 2, hours: 14, minutes: 32 }
riders: ['Alex', 'Sam', 'Taylor', 'Morgan']
doubters: ['Casey', 'Riley']
activity: [
  { user: 'Alex', action: 'joined as Rider', time: '2h ago' },
  { user: 'Casey', action: 'joined as Doubter', time: '3h ago' },
  { user: 'Jordan', action: 'created the bet', time: '5h ago' },
]
// Avatar from Unsplash CDN
```

### `HallOfShame.tsx`
```js
leaderboard: [
  { name: 'Sam',    rank: 1, punishments: 12, completionRate: 43 },
  { name: 'Jordan', rank: 2, punishments: 8,  completionRate: 71 },
  { name: 'Alex',   rank: 3, punishments: 7,  completionRate: 29 },
]

shameCards: [
  { user: 'Sam', bet: '...', punishment: '...', frontImg: unsplash_url, backImg: unsplash_url, reactions: { '😭': 12, '💀': 8, '🔥': 5 } },
  { user: 'Jordan', ... }
]

groupStats: { issued: 34, confirmed: 24, confirmedPct: 71, disputedPct: 21, pendingPct: 8 }
ticker: "47 punishments executed this week · 71% completion rate · The Boys lead all groups"
```

### `ProfileScreen.tsx`
```js
stats: { totalBets: 24, winRate: 58, bestStreak: 3, punishments: 7 }

rivalries: [
  { name: 'Sam',    wins: 7, losses: 3 },
  { name: 'Alex',   wins: 4, losses: 6 },
  { name: 'Jordan', wins: 5, losses: 5 },
]

recentBets: [
  { title: 'Hit the gym 5 days', result: 'won', amount: '+$20', time: '2 days ago' },
  { title: 'No drinking 30 days', result: 'lost', punishment: 'TikTok dance', time: '1 week ago' },
  { title: 'Cold shower streak', result: 'won', amount: '+$15', time: '2 weeks ago' },
]
```

### `OutcomeWin.tsx`
```
winner: "Jordan"
collected: "$25"
losers: ["Mike", "Sarah", "Alex"]
confetti: 30 random-colored dots (gold/green/white) — positions randomized on mount
```

### `OutcomeForfeit.tsx`
```
bet: "Hit the gym 5 days this week"
loser: "Jordan"
punishment: "Post an embarrassing throwback to your main story"
winners: ["Mike", "Sarah", "Alex"]
date: "Feb 17, 2026"
```

### `BottomNav.tsx`
```js
navItems: [
  { icon: '📊', label: 'Home',    screen: 'home' },
  { icon: '🏋️', label: 'H2H',    screen: 'h2h' },
  { icon: '⚔️', label: 'Compete', screen: 'compete', boost: true },
  { icon: '💀', label: 'Shame',   screen: 'shame' },
  { icon: '👤', label: 'Profile', screen: 'profile' },
]
```

### External image assets (hardcoded Unsplash URLs)
Used as mock user avatars and proof images throughout `BetDetail.tsx`, `HallOfShame.tsx`, `ProfileScreen.tsx`. Must be replaced with a real media/CDN solution.

---

## 8. Dependencies (`package.json`)

### Core
| Package | Version | Notes |
|---------|---------|-------|
| react + react-dom | (peer) | |
| vite | 6.3.5 | |
| @vitejs/plugin-react | 4.7.0 | |
| typescript | — | |

### Routing
| Package | Version | Notes |
|---------|---------|-------|
| react-router | 7.13.0 | **Installed, not wired up** |

### Styling
| Package | Version | Notes |
|---------|---------|-------|
| tailwindcss | 4.1.12 | v4 — CSS-based config |
| @tailwindcss/vite | 4.1.12 | Vite plugin for v4 |
| clsx | 2.1.1 | |
| tailwind-merge | 3.2.0 | |
| tw-animate-css | 1.3.8 | |
| class-variance-authority | 0.7.1 | CVA for shadcn |

### UI Primitives
| Package | Version | Notes |
|---------|---------|-------|
| @radix-ui/* | various | 36 packages |
| lucide-react | 0.487.0 | Icons |
| @mui/material | 7.3.5 | **Installed; usage scope unclear** |
| @mui/icons-material | 7.3.5 | |
| @emotion/react | 11.14.0 | MUI peer dep |
| @emotion/styled | 11.14.1 | MUI peer dep |
| sonner | 2.0.3 | Toast notifications (wired in ui/sonner.tsx, not yet used in screens) |
| vaul | 1.1.2 | Drawer primitive |
| next-themes | 0.4.6 | **Installed; dark mode done manually via useState instead** |

### Animation
| Package | Version | Notes |
|---------|---------|-------|
| motion | 12.23.24 | Framer Motion (new package name) |

### Forms
| Package | Version | Notes |
|---------|---------|-------|
| react-hook-form | 7.55.0 | Installed; no forms implemented yet |
| input-otp | 1.4.2 | OTP input |

### Data / Charts
| Package | Version | Notes |
|---------|---------|-------|
| recharts | 2.15.2 | Chart library (ui/chart.tsx wrapper exists) |
| date-fns | 3.6.0 | Date formatting |
| react-day-picker | 8.10.1 | |

### Layout
| Package | Version | Notes |
|---------|---------|-------|
| embla-carousel-react | 8.6.0 | Carousel |
| react-responsive-masonry | 2.7.1 | Masonry grid |
| react-resizable-panels | 2.1.7 | |
| react-dnd | 16.0.1 | Drag and drop |
| react-dnd-html5-backend | 16.0.1 | |
| react-slick | 0.31.0 | Slider |
| @popperjs/core | 2.11.8 | Positioning |
| react-popper | 2.3.0 | |

---

## 9. Summary of Gaps / What Needs to Be Built

| Area | Current State | What's Needed |
|------|--------------|---------------|
| **Routing** | Manual `useState` in App.tsx | Wire up react-router v7 with proper routes/layouts |
| **State management** | Local useState only | Decide on global state (Zustand, Context, or react-router loaders) |
| **Dark mode** | Manual `darkMode` useState + `.dark` class | Replace with `next-themes` (already installed) |
| **Authentication** | Not implemented | Auth screens + session management |
| **Real data** | All hardcoded (see §7) | API integration for bets, users, punishments, leaderboards |
| **Bet creation flow** | Only stakes step is active | Wire up multi-step flow: details → stakes → review → publish |
| **Proof submission** | UI only, no upload logic | File upload, media storage, proof review workflow |
| **Dispute flow** | Button exists in OutcomeForfeit, no screens | Dispute screens + resolution workflow |
| **H2H / Competitions** | Placeholder screens | Full implementation |
| **Notifications** | Bell icon in TheBoard, no functionality | Notification system |
| **Image avatars** | Hardcoded Unsplash URLs | User avatar upload + CDN |
| **Real-time updates** | Static mock data | WebSocket or polling for live feed, countdown timers |
| **Payments** | "$20" strings only | Payment integration |
| **Unused packages** | MUI, next-themes, react-dnd, react-hook-form, recharts, etc. | Either integrate or remove to reduce bundle size |
| **variant screens** | 9 non-active screen variants | Decide which to keep, merge, or delete |
