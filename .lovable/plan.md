## Delight Lingua — Build Plan

A polished translation workspace with text, voice, and image translation, history, favorites, authentication, and a premium subscription tier.

### Design Foundation
Apply the **Precision Swiss Minimal** direction tokens verbatim to `src/styles.css`:
- Brand: indigo `#6366f1`, surface `#fff`, UI bg `#f8fafc`, slate text scale
- Fonts: Instrument Serif (display, italic) + Inter (sans)
- Soft borders, subtle shadows, generous whitespace
- Layout: left sidebar (history + favorites + upgrade card) + main workspace (top nav, mode switcher, dual-pane translator)

### Backend (Lovable Cloud + Lovable AI)
Enable Lovable Cloud + Lovable AI Gateway. Schemas:
- `profiles` (id → auth.users, display_name, is_premium, daily_count, count_reset_at)
- `translations` (id, user_id, source_lang, target_lang, source_text, translated_text, mode, created_at, is_favorite)
- RLS so users only see their own rows; auto-create profile via trigger on signup

Edge functions (server routes under `src/routes/api/`):
- `translate` — calls Lovable AI (`google/gemini-3-flash-preview`) for text translation + language detection; enforces 500/day free-tier cap unless `is_premium`
- `transcribe` — Whisper-style via Gemini multimodal for voice input
- `ocr-translate` — multimodal image → text + translation
- `tts` — return audio (Gemini TTS or browser SpeechSynthesis fallback in client)
- `stripe-checkout` + `stripe-webhook` for premium upgrade

### Routes (TanStack file-based)
```
src/routes/
  __root.tsx          (QueryClient, auth context, toaster)
  index.tsx           (landing: hero, features, pricing teaser, CTAs)
  login.tsx           (email/password + Google)
  signup.tsx
  pricing.tsx
  _authenticated.tsx  (auth gate via beforeLoad)
  _authenticated/app.tsx           (main workspace — sidebar layout)
  _authenticated/history.tsx
  _authenticated/favorites.tsx
  _authenticated/settings.tsx
  api/translate.ts, api/transcribe.ts, api/ocr-translate.ts
  api/stripe-checkout.ts, api/public/stripe-webhook.ts
```

### Components
- `AppSidebar` — brand, recent history list, saved phrases, Pro upgrade card
- `TopNav` — section tabs, support link, user avatar/menu
- `ModeSwitcher` — Text / Voice / Image segmented control
- `LanguagePicker` — searchable select, 50+ languages, swap button
- `TextMode` — dual textarea panes, copy/speak/favorite/clear actions, char counter
- `VoiceMode` — mic record (MediaRecorder), waveform, transcribe → translate → playback
- `ImageMode` — drag-drop / camera capture, preview, OCR overlay with translated text
- `HistoryList` / `FavoritesList` — searchable, deletable rows
- `UpgradeDialog` — Stripe checkout entry

### Key UX details from the chosen direction (preserve exactly)
- Left 320px white sidebar with bordered Recent History rows showing language pair label + truncated text, amber-dot Saved Phrases below, indigo Pro card at bottom
- Top nav with pill-shaped active tab (`bg-slate-900 text-white`) + avatar
- Centered pill mode switcher with white-card active state
- 2-col language selector with circular swap button overlapping between cards
- Dual translation cards: white input / `slate-50/50` output; output text uses Instrument Serif italic in brand indigo
- Bottom row: small camera image (1/3) + feature description card (2/3) with chip tags including a "Premium" indigo chip

### Free vs Premium
- Free: 500 translations/day, text only, basic languages
- Premium: unlimited, voice + image, history export, ad-free (no ads anyway, but cleaner UI)
- Daily counter resets via DB function checked in `translate` edge function

### Technical Notes
- AI calls go through edge functions only; never expose `LOVABLE_API_KEY` to client
- Use `useSuspenseQuery` + loader `ensureQueryData` for history/favorites
- Auth: Supabase email/password + Google OAuth, `onAuthStateChange` listener at root, `_authenticated` layout `beforeLoad` redirects to `/login`
- Stripe: store `stripe_customer_id` + `stripe_subscription_id` on profile; webhook flips `is_premium`
- SEO: per-route `head()` with unique title/description for `/`, `/pricing`, `/login`
- `/llms.txt` listing public routes only

### Build Order
1. Enable Lovable Cloud + AI Gateway, create schemas + RLS + trigger
2. Apply design tokens to `styles.css`, set up fonts
3. Auth (login, signup, `_authenticated` guard, profile creation)
4. Translate edge function + Text mode workspace
5. History + Favorites (sidebar + dedicated pages)
6. Voice mode (transcribe + TTS)
7. Image mode (OCR)
8. Landing page + Pricing page
9. Stripe checkout + webhook + premium gating
10. Polish, SEO meta, llms.txt

After implementation I'll need you to: enter a Stripe email when prompted, and confirm Google OAuth provider in Cloud settings.