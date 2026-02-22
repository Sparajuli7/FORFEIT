# FORFEIT — Social Media & Calendar Integration Build Prompt

You are working on FORFEIT, a social betting app built with React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + Supabase. Read `CLAUDE.md` in the project root for the full tech stack, project structure, patterns, and conventions before making any changes.

## Context: What Already Exists

The app already has a sharing foundation. Before building anything, read these files to understand the current implementation:

- `src/lib/share.ts` — Core sharing utilities: Web Share API wrapper, Twitter/Facebook intent URLs, `getBetShareText()`, `getOutcomeShareText()`, `getBetShareUrl()`, `copyToClipboard()`
- `src/app/components/ShareSheet.tsx` — UI dialog with X (Twitter), Facebook, and copy-link buttons
- `src/app/screens/OutcomeReveal.tsx` — Has a working "Share Result" button using the share utilities
- `src/app/screens/BetDetail.tsx` — Has a working share button (top right) for sharing bets
- `src/app/screens/PlayerCardScreen.tsx` — Has native Web Share API sharing for the player trading card
- `src/app/components/PunishmentReceipt.tsx` — Visual "receipt" component for punishments (no share yet)
- `index.html` — Has basic OG and Twitter Card meta tags (no `og:image` set)

## Your Task: Build All 6 Phases

Implement the following features in order. After completing everything, produce a comprehensive report (described at the bottom).

---

### Phase 1: Add to Calendar Utility + Buttons

**Goal:** Let users add bet deadlines and competition timeframes to their calendar apps.

**Create `src/lib/utils/calendar.ts`** with the following exports:

- `generateICSFile(event: CalendarEvent): string` — Returns a valid `.ics` file string (RFC 5545 compliant) that can be downloaded. Include VCALENDAR/VEVENT with DTSTART, DTEND, SUMMARY, DESCRIPTION, and a VALARM reminder (1 hour before).
- `getGoogleCalendarUrl(event: CalendarEvent): string` — Returns a Google Calendar event creation URL (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`).
- `getOutlookCalendarUrl(event: CalendarEvent): string` — Returns an Outlook web calendar URL.
- `downloadICSFile(event: CalendarEvent): void` — Creates a Blob from the ICS string and triggers a browser download.

The `CalendarEvent` type should be:
```ts
interface CalendarEvent {
  title: string
  description: string
  startDate: Date
  endDate?: Date // defaults to startDate + 1 hour if not provided
  location?: string
}
```

**Integrate into screens:**

1. **`BetDetail.tsx`** — Add an "Add to Calendar" button or menu near the countdown timer. Build the event from the bet's `deadline`, `title`, and claimant info. The calendar event description should include the bet title, stake, and a link back to the bet.

2. **`CompetitionDetailScreen.tsx`** — Add an "Add to Calendar" button. Use the competition's start and end dates. Description should include competition title, metric, and stake.

For both screens, use a small dropdown/popover (or a sheet on mobile) offering three options: Google Calendar, Apple Calendar (.ics download), Outlook. Use icons from lucide-react (Calendar, Download, ExternalLink).

---

### Phase 2: Expand ShareSheet with WhatsApp and SMS

**Goal:** Add WhatsApp and SMS/iMessage sharing options to the existing ShareSheet.

**Edit `src/lib/share.ts`** — Add:
- `getWhatsAppShareUrl(text: string, url: string): string` — Returns `https://wa.me/?text={encodedTextAndUrl}`
- `getSMSShareUrl(text: string, url: string): string` — Returns `sms:?body={encodedTextAndUrl}` (use `&body=` on Android, `?body=` as default since we can't reliably detect)

**Edit `src/app/components/ShareSheet.tsx`** — Add two new buttons to the share dialog:
- WhatsApp (green icon, use a simple WhatsApp SVG or the MessageCircle icon from lucide-react with WhatsApp branding)
- SMS/Text Message (use the Smartphone or MessageSquare icon from lucide-react)

Place them in the grid alongside the existing X, Facebook, and Copy Link options. Maintain the current visual style and spacing.

---

### Phase 3: Add Share Buttons to Screens That Are Missing Them

**Goal:** Every major content screen should have a share action.

1. **`RecordScreen.tsx` (Hall of Shame / Stats)**
   - Add a share button in the header area that shares the user's stats: "I'm {wins}W-{losses}L on FORFEIT with a {winRate}% win rate. Think you can beat that? 🎯"
   - Also add a share button on individual Hall of Shame posts so users can share specific punishment moments.

2. **`CompetitionDetailScreen.tsx`**
   - Add a share button that shares: "🏆 {title} competition on FORFEIT — I'm ranked #{rank}! Join and compete: {url}"
   - Use the existing ShareSheet component.

3. **`ShameProofSubmission.tsx`**
   - After successful proof submission (the success/completion state), show a "Share to Hall of Shame" prompt that encourages sharing the punishment publicly on social media.
   - Share text: "😂 {loserName} just completed their punishment for losing "{betTitle}" on FORFEIT! Check it out: {url}"

4. **`PunishmentReceipt.tsx`**
   - Add a small share icon button on the receipt itself (top-right corner, subtle but tappable).
   - Share text: "📜 FORFEIT RECEIPT: {loserName} owes {punishment} for losing "{betTitle}". No refunds. 😤"

For all of these, reuse the existing `ShareSheet` component and sharing utilities from `src/lib/share.ts`. Add any new share text builder functions to `share.ts` following the existing pattern (`getXxxShareText()`).

---

### Phase 4: Image Export for Shareable Visual Cards

**Goal:** Let users save/share components as images for Instagram Stories, group chats, etc.

**Install `html-to-image`** (`npm install html-to-image`).

**Create `src/lib/utils/imageExport.ts`** with:
- `captureElementAsImage(element: HTMLElement, options?: CaptureOptions): Promise<Blob>` — Uses `html-to-image`'s `toBlob()` to capture a DOM element as a PNG.
- `downloadImage(blob: Blob, filename: string): void` — Triggers a browser download of the image.
- `shareImage(blob: Blob, filename: string, shareText: string): Promise<boolean>` — Uses the Web Share API with the `files` parameter to share the image directly. Falls back to download if `navigator.canShare({ files })` is not supported.

```ts
interface CaptureOptions {
  scale?: number        // pixel density, default 2 for retina
  backgroundColor?: string  // default to theme bg
  width?: number
  height?: number
}
```

**Integrate into these screens/components:**

1. **`PlayerCardScreen.tsx`** — Add a "Save Card" / "Download" button alongside the existing share button. Wrap the card element in a ref and capture it. Also update the existing share to include the image when possible (Web Share API with files).

2. **`PunishmentReceipt.tsx`** / **`OutcomeReveal.tsx`** — Add a "Save as Image" option. The receipt visual is specifically designed to look like a physical receipt — capturing it as an image is the primary use case for social sharing.

3. **`RecordScreen.tsx`** — Add a "Share Stats Card" feature that captures the stats section as an image. Consider creating a dedicated `StatsCard` sub-component that renders a clean, branded stats summary optimized for image export (include the FORFEIT logo/watermark, user avatar, W/L record, win rate, and top stats).

For Instagram Story optimization, provide an option to render at 1080x1920 (9:16 aspect ratio) with appropriate padding and the FORFEIT branding/watermark at the bottom.

---

### Phase 5: Dynamic OG Images via Vercel OG

**Goal:** When a bet or outcome link is shared on social media, show a rich preview card with dynamic content instead of a generic FORFEIT preview.

**Create `api/og.tsx`** (Vercel Serverless Function with `@vercel/og`):

This is a Vercel API route (NOT a Supabase Edge Function) since the frontend is deployed on Vercel.

- Install `@vercel/og` as a dependency.
- The endpoint should accept query parameters: `type` (bet | outcome | competition | profile), `id`, and optionally `title`, `status`, `claimant`, `stake`, `result`.
- Render a 1200x630 image using `@vercel/og`'s `ImageResponse` with JSX.
- Use the FORFEIT brand colors (dark background, green/coral accents).
- Layout should include:
  - FORFEIT logo/text in the corner
  - Bet title or competition name (large text)
  - Key stats (stake amount, odds, result)
  - Status badge (LIVE, ENDED, WINNER, FORFEIT)
  - Tagline: "Bet on your friends. Face the consequences."

**Fallback approach:** If `@vercel/og` is too complex to set up, create a simpler version that generates OG images using the Supabase Edge Function runtime with `satori` + `resvg-wasm` directly (same underlying tech as `@vercel/og`).

---

### Phase 6: Per-Page OG Meta Tags

**Goal:** Each shared link should have its own title, description, and image preview.

Since this is a client-side React SPA, true per-page OG tags require server-side rendering or a pre-rendering solution. Implement this pragmatically:

**Option A (Recommended): Vercel Edge Middleware**
- Create `middleware.ts` at the project root (Vercel Edge Middleware).
- Detect social media bot user agents (facebookexternalhit, Twitterbot, LinkedInBot, WhatsApp, Slackbot, Discordbot, TelegramBot).
- For bot requests to `/bet/:id`, `/compete/:id`, `/profile/:id`, etc., return a minimal HTML page with the correct OG tags pointing to the dynamic OG image from Phase 5.
- For normal user requests, pass through to the SPA as usual.

**Option B (Simpler fallback): Update share URLs**
- Instead of sharing the SPA URL directly, share URLs that go through the OG image API first (e.g., `https://yourapp.com/api/share/bet/:id` which returns an HTML page with OG tags and a redirect).

**Update `src/lib/share.ts`:**
- Modify `getBetShareUrl()` to include OG-relevant query parameters in the URL so the middleware/API can extract them without a database lookup if possible.

---

## After Implementation: Write a Comprehensive Report

After completing all 6 phases, create a file called `SOCIAL_INTEGRATION_REPORT.md` in the project root with the following sections:

### 1. What Was Built
For each phase, list:
- Every file created or modified (with file paths)
- What the feature does
- Any dependencies added (`npm install`)

### 2. Architecture Decisions
- Why each approach was chosen
- Trade-offs considered
- Any deviations from the plan above and why

### 3. How to Customize & Extend

For each feature, document:
- **How to change share text/copy** — Which functions in `share.ts` to edit, the pattern for adding new share text builders
- **How to add a new social platform** — Where to add the intent URL function, where to add the button in ShareSheet
- **How to add sharing to a new screen** — Step-by-step pattern (import ShareSheet, create share text, add button, wire up)
- **How to add a new calendar provider** — How to add the URL builder in `calendar.ts` and the option in the calendar dropdown
- **How to make a new component exportable as an image** — How to add a ref, call the capture function, and wire up the download/share button
- **How to update the OG image design** — Which file to edit, how the JSX template works, how to add new layouts for new content types
- **How to add OG support for a new route** — Where to add the route pattern in the middleware, what query params to pass

### 4. Testing Checklist
Provide a manual QA checklist:
- [ ] Share to X from BetDetail — verify link preview
- [ ] Share to WhatsApp from OutcomeReveal — verify text and URL
- [ ] Share to Facebook from RecordScreen — verify preview card
- [ ] Copy link from PunishmentReceipt — verify clipboard content
- [ ] Add bet deadline to Google Calendar — verify event details
- [ ] Download .ics file for competition — verify opens in Apple Calendar
- [ ] Save PlayerCard as image — verify image quality and branding
- [ ] Share PlayerCard image to Instagram Stories — verify aspect ratio
- [ ] Save PunishmentReceipt as image — verify receipt visual is captured correctly
- [ ] Share a bet link on Twitter — verify dynamic OG image loads
- [ ] Share a bet link on Discord — verify OG embed shows correctly
- [ ] Test all share buttons on mobile (iOS Safari, Android Chrome)
- [ ] Test all share buttons on desktop (fallback to ShareSheet)
- [ ] Verify .ics download works on iOS and Android

### 5. Environment & Deployment Notes
- Any new environment variables needed
- Vercel configuration changes (if any)
- Supabase configuration changes (if any)
- Build/deploy steps

### 6. Known Limitations & Future Improvements
- What couldn't be done perfectly and why
- Suggestions for future enhancements (e.g., auto-posting to connected accounts, scheduled shares, analytics on shared links)

---

## Important Rules

1. **Read `CLAUDE.md` first** — Follow all conventions (store imports from `@/stores` barrel, Tailwind v4 CSS-based config, Radix/shadcn components, etc.)
2. **Read existing files before editing** — Understand the current code before modifying it.
3. **Match the existing code style** — Same patterns, same naming, same structure. Don't introduce new patterns.
4. **Use existing UI components** — Button, Sheet, Dialog, etc. from `src/app/components/ui/`. Don't create new base components.
5. **Don't break existing functionality** — All current share buttons and features must continue working.
6. **Use lucide-react for icons** — The project already uses it. Don't add a new icon library.
7. **Keep share text concise and engaging** — Under 280 characters for Twitter compatibility. Include emojis sparingly for personality.
8. **Handle errors gracefully** — If Web Share API fails, fall back to ShareSheet. If image capture fails, show a toast. Never crash.
9. **Mobile-first** — All new UI must work well on mobile. Use sheets/drawers instead of modals where appropriate.
10. **Run `npm run build` after all changes** to verify there are no TypeScript or build errors.
