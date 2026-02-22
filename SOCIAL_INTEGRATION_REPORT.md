# FORFEIT — Social Integration Report

## 1. What Was Built

### Phase 1: Add to Calendar

**New files:**
- `src/lib/utils/calendar.ts` — Calendar utility functions (ICS generation, Google Calendar URL, Outlook URL)
- `src/app/components/AddToCalendar.tsx` — Reusable calendar dropdown component (Popover-based)

**Modified files:**
- `src/app/screens/BetDetail.tsx` — Added "Add to Calendar" button below countdown timer (visible when deadline hasn't expired)
- `src/app/screens/CompetitionDetailScreen.tsx` — Added "Add to Calendar" button above the competition chat (visible while competition is active)

**What it does:**
- Users can add bet deadlines or competition timeframes to Google Calendar, Apple Calendar (.ics download), or Outlook with one tap
- ICS files include a 1-hour-before reminder (VALARM)
- Calendar events include the bet/competition title, stake info, and a link back to the app

---

### Phase 2: WhatsApp & SMS in ShareSheet

**Modified files:**
- `src/lib/share.ts` — Added `getWhatsAppShareUrl()` and `getSMSShareUrl()` functions
- `src/app/components/ShareSheet.tsx` — Added WhatsApp and SMS/Text Message buttons to the share dialog

**Dependencies added:** None

**What it does:**
- The ShareSheet now has 5 options: X (Twitter), Facebook, WhatsApp, SMS, Copy Link
- WhatsApp opens `wa.me` with pre-filled text
- SMS uses the `sms:?body=` URI scheme for native text message compose

---

### Phase 3: Share Buttons on Missing Screens

**Modified files:**
- `src/app/screens/RecordScreen.tsx` — Added share button in header to share personal stats ("I'm 12W-3L on FORFEIT with a 80% win rate...")
- `src/app/screens/CompetitionDetailScreen.tsx` — Added share button in header and ShareSheet to share competition leaderboard status
- `src/app/screens/ShameProofSubmission.tsx` — Added "Share to Hall of Shame" prompt after successful proof submission (with Skip option)
- `src/app/components/PunishmentReceipt.tsx` — Added share icon button (top-right) on the receipt itself

**New share text builders in `src/lib/share.ts`:**
- `getRecordShareText({ wins, losses, winRate })` — For sharing personal record
- `getCompetitionShareText({ title, rank })` — For sharing competition status
- `getPunishmentShareText({ loserName, punishment, betTitle })` — For sharing punishment receipts
- `getShameShareText({ loserName, betTitle })` — For sharing after shame proof submission
- `getCompetitionShareUrl(compId)` — URL builder for competitions

---

### Phase 4: Image Export

**New file:**
- `src/lib/utils/imageExport.ts` — Image capture utilities (`captureElementAsImage`, `downloadImage`, `shareImage`)

**Dependencies added:**
- `html-to-image` — DOM-to-image capture library

**Modified files:**
- `src/app/screens/PlayerCardScreen.tsx` — Added "Save" button (downloads card as PNG), split action area into Share + Save buttons, added ref to TradingCard wrapper
- `src/app/screens/OutcomeReveal.tsx` — Added "Save Receipt as Image" button on the FORFEIT (loss) outcome screen, captures PunishmentReceipt as PNG
- `src/app/components/PunishmentReceipt.tsx` — Converted to `forwardRef` so parent screens can attach a ref for image capture

**What it does:**
- `captureElementAsImage()` uses `html-to-image`'s `toBlob()` at 2x pixel density
- `shareImage()` tries Web Share API with `files` param first (native sharing with image on mobile), falls back to download
- `downloadImage()` triggers a standard browser download

---

### Phase 5: Dynamic OG Images

**New files:**
- `api/og.tsx` — Vercel Edge Function that generates 1200x630 OG images using `@vercel/og`

**Dependencies added:**
- `@vercel/og` — Vercel's OG image generation library (uses Satori + resvg-wasm)

**Modified files:**
- `vercel.json` — Added `/api/(.*)` rewrite rule before the SPA catch-all
- `index.html` — Added default `og:image` and `twitter:image` meta tags, upgraded `twitter:card` to `summary_large_image`

**What it does:**
- `GET /api/og?type=bet&title=...&status=...&claimant=...&stake=...&result=...` returns a dynamically generated PNG
- FORFEIT branding (dark background, green/coral accents, status badge)
- Supports bet, competition, and profile types

---

### Phase 6: Per-Page OG Meta Tags via Edge Middleware

**New files:**
- `middleware.ts` — Vercel Edge Middleware at project root

**What it does:**
- Detects social media bot user agents (Facebook, Twitter, LinkedIn, WhatsApp, Slack, Discord, Telegram, Google, Bing, Apple)
- For bot requests to `/bet/:id`, `/compete/:id`, `/profile/:id`: returns minimal HTML with correct OG tags + dynamic OG image URL + meta refresh redirect
- Normal users pass through to the SPA unchanged
- The `config.matcher` limits middleware to only relevant routes for performance

---

## 2. Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Popover for calendar options | Better than a Sheet for 3 simple options; less disruptive on mobile |
| `forwardRef` on PunishmentReceipt | Enables parent screens to capture it as an image without wrapper div hacks |
| `html-to-image` over `html2canvas` | Smaller bundle, better CSS support, uses SVG foreignObject approach |
| Vercel Edge Middleware for OG | Fastest option — runs at the edge, no cold starts, no database lookup needed |
| Query params in OG URLs | Allows middleware to embed title/status in the OG image URL without a DB round-trip |
| SMS uses `sms:?body=` scheme | Works on both iOS and Android; `&body=` is Android-specific |
| WhatsApp uses `wa.me` | Universal WhatsApp sharing URL that works on web and mobile |

---

## 3. How to Customize & Extend

### How to change share text/copy

All share text builders are in `src/lib/share.ts`. Each follows the pattern:

```ts
export function getXxxShareText(params: { ... }): string {
  return `emoji text ${params.thing} more text`
}
```

To modify: find the relevant function and edit the template string. Keep under 280 chars for Twitter compatibility.

### How to add a new social platform

1. Add the intent URL builder in `src/lib/share.ts`:
   ```ts
   export function getNewPlatformShareUrl(text: string, url: string): string {
     return `https://platform.com/share?text=${encodeURIComponent(text + ' ' + url)}`
   }
   ```

2. Import it in `src/app/components/ShareSheet.tsx`

3. Add a button in the `<div className="grid gap-2 pt-2">` grid:
   ```tsx
   <button type="button" onClick={handleNewPlatform} className={btnClass}>
     <Icon className="w-5 h-5" />
     Share on Platform
   </button>
   ```

### How to add sharing to a new screen

1. Import the ShareSheet and share utilities:
   ```tsx
   import { ShareSheet } from '@/app/components/ShareSheet'
   import { getXxxShareText, shareWithNative } from '@/lib/share'
   ```

2. Add state: `const [shareOpen, setShareOpen] = useState(false)`

3. Add handler:
   ```tsx
   const handleShare = async () => {
     const text = getXxxShareText({ ... })
     const url = 'https://...'
     const usedNative = await shareWithNative({ title: '...', text, url })
     if (!usedNative) setShareOpen(true)
   }
   ```

4. Add the button and ShareSheet component in JSX.

### How to add a new calendar provider

1. Add the URL builder in `src/lib/utils/calendar.ts`:
   ```ts
   export function getNewCalendarUrl(event: CalendarEvent): string { ... }
   ```

2. Add a button in `src/app/components/AddToCalendar.tsx` inside the PopoverContent.

### How to make a new component exportable as an image

1. Add a `ref` to the element you want to capture:
   ```tsx
   const myRef = useRef<HTMLDivElement>(null)
   ```

2. Import and call the capture function:
   ```tsx
   import { captureElementAsImage, shareImage } from '@/lib/utils/imageExport'

   const handleSave = async () => {
     if (!myRef.current) return
     const blob = await captureElementAsImage(myRef.current, { scale: 2 })
     await shareImage(blob, 'filename.png', 'Share text here')
   }
   ```

3. If the component doesn't accept refs, convert it to `forwardRef`.

### How to update the OG image design

Edit `api/og.tsx`. The JSX template uses inline styles (required by `@vercel/og`). Key areas:
- Top row: FORFEIT branding + status badge
- Center: title + metadata (claimant, stake)
- Bottom: tagline

To add a new content type layout, add a condition based on the `type` query param and return different JSX.

### How to add OG support for a new route

1. In `middleware.ts`, add a pattern to `matchRoute()`:
   ```ts
   m = pathname.match(/^\/newroute\/([a-f0-9-]+)/)
   if (m) return { type: 'newroute', id: m[1] }
   ```

2. Add a handler block in the `middleware()` function for the new type.

3. Update `config.matcher` to include the new route pattern.

---

## 4. Testing Checklist

- [ ] Share to X from BetDetail — verify link preview
- [ ] Share to WhatsApp from OutcomeReveal — verify text and URL
- [ ] Share to Facebook from RecordScreen — verify preview card
- [ ] Send via SMS from ShareSheet — verify native compose opens
- [ ] Copy link from PunishmentReceipt — verify clipboard content
- [ ] Add bet deadline to Google Calendar — verify event details and reminder
- [ ] Download .ics file for competition — verify opens in Apple Calendar / Outlook
- [ ] Add to Outlook calendar — verify web redirect works
- [ ] Save PlayerCard as image — verify image quality and branding
- [ ] Share PlayerCard image via native share (iOS) — verify file sharing works
- [ ] Save PunishmentReceipt as image from OutcomeReveal — verify receipt visual captured
- [ ] Share record stats from RecordScreen header — verify share text includes W/L/winrate
- [ ] Share competition from CompetitionDetailScreen — verify rank included
- [ ] Share after shame proof submission — verify "Share to Hall of Shame" appears
- [ ] PunishmentReceipt inline share button — verify it opens ShareSheet
- [ ] Share a bet link on Twitter/Discord — verify dynamic OG image loads (requires deploy)
- [ ] Test all share buttons on mobile (iOS Safari, Android Chrome)
- [ ] Test all share buttons on desktop (fallback to ShareSheet dialog)
- [ ] Verify .ics download works on iOS and Android
- [ ] Verify build succeeds with `npm run build`

---

## 5. Environment & Deployment Notes

### New dependencies
```
html-to-image    — DOM-to-image capture (client-side)
@vercel/og       — Dynamic OG image generation (server-side, Vercel Edge)
```

### Vercel configuration changes
- `vercel.json` — Added `/api/(.*)` rewrite rule before SPA catch-all
- `middleware.ts` — New Edge Middleware file at project root (auto-detected by Vercel)
- `api/og.tsx` — New Vercel Serverless Function (Edge runtime)

### No new environment variables required

### Build/deploy steps
1. `npm run build` — Builds the SPA as usual (middleware and API routes are handled by Vercel separately)
2. Push to GitHub → Vercel auto-deploys
3. The `api/og.tsx` endpoint and `middleware.ts` are deployed automatically by Vercel's build system

### Important: OG images only work in production
- The `/api/og` endpoint runs on Vercel Edge, not on the local Vite dev server
- To test locally, use `vercel dev` (requires Vercel CLI)
- The middleware bot detection also only runs on Vercel

---

## 6. Known Limitations & Future Improvements

### Limitations
- **OG images are generic**: The middleware doesn't do a database lookup, so it can only include info passed via query params or the URL. For richer previews (showing actual odds, participant avatars), you'd need to add Supabase queries to the middleware or API route.
- **Image export quality**: `html-to-image` can struggle with certain CSS features (animations, complex gradients, external fonts). The PlayerCard has animations disabled during capture by default, but very complex cards may need tweaking.
- **SMS `sms:` scheme**: The body encoding varies slightly between iOS and Android. The current implementation uses `?body=` which works on most devices but some older Android versions may need `&body=`.
- **No Instagram Stories direct share**: Instagram doesn't support Web Share API for Stories. Users need to save the image and share manually.

### Future improvements
- **Connected social accounts**: Add OAuth flows to connect Twitter/Instagram accounts for auto-posting outcomes
- **Share analytics**: Track which share buttons get clicked (add event tracking to share handlers)
- **QR codes**: Generate QR codes for group invite links and bet URLs
- **Animated OG images**: Use video/GIF for more eye-catching social previews
- **Scheduled shares**: Auto-post to connected accounts when bets resolve
- **Rich OG from database**: Add Supabase queries to the middleware to pull real bet titles, odds, and participant info for previews
- **Story-optimized templates**: Create 1080x1920 (9:16) templates specifically for Instagram/TikTok Stories
- **Email sharing**: Add email as a share option with a pre-filled `mailto:` link
