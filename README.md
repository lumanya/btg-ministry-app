# BTG Ministry App

The mobile app for **Building the Temple of God Ministry**: sermons, livestream, podcast and the daily devotional, for Android and iPhone from one codebase.

Built with [Expo](https://expo.dev) (SDK 58), React Native and TypeScript, using Expo Router for navigation.

## Try it on your phone

1. Install **Node.js** (version 20 or newer) on your computer.
2. Install the **Expo Go** app on your phone from the Play Store or App Store.
3. In this folder, run:

   ```bash
   npm install
   npm start
   ```

4. Scan the QR code that appears: with the Camera app on iPhone, or with Expo Go on Android. Your phone and computer must be on the same Wi-Fi.

To preview in a web browser instead, run `npm run web`.

## What is in this first version

| Screen | File | Status |
|---|---|---|
| Welcome | `src/app/index.tsx` | Done |
| Home (live card, today's devotional, streak, continue listening, latest sermons, word for today) | `src/app/(tabs)/home.tsx` | Done, sample content |
| Sermons (search, filters, featured, list) | `src/app/(tabs)/sermons.tsx` | Done; reads the YouTube feed |
| Sermon detail | `src/app/sermon/[id].tsx` | Done; plays inside the app |
| Live (player, prayer request, service reminders) | `src/app/(tabs)/live.tsx` | Done; shows "Live now" or the next stream automatically |
| Podcast (series, episodes, mini player) | `src/app/(tabs)/podcast.tsx` | Screens done; audio not connected yet |
| Now playing | `src/app/player.tsx` | Screens done; audio not connected yet |
| Daily devotional (week strip, series, archive) | `src/app/(tabs)/devotional.tsx` | Done, sample content |
| Devotional reader (text size, bookmark, mark as read) | `src/app/devotional/[id].tsx` | Done; full text comes from the website later |
| Give (M-Pesa and CRDB with copy buttons) | `src/app/give.tsx` | Done |

All sample content lives in one file, `src/content/sample.ts`. Values in `[SQUARE BRACKETS]` (service times, venue) still need to be filled in by the ministry.

## Connect the YouTube channel

Sermons and the livestream come from the channel through a small server function, `supabase/functions/youtube-feed`. It keeps the YouTube API key off the phones, checks the channel every few minutes, and tells the app what is live, what is coming up, and the past livestreams and videos. Until it is set up, the app shows the sample videos.

**1. Get a YouTube API key**

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and create a project (for example "BTG Ministry").
2. Open **APIs & Services → Library**, search for **YouTube Data API v3** and click **Enable**.
3. Open **APIs & Services → Credentials → Create credentials → API key**.
4. Click the new key, and under **API restrictions** choose **Restrict key** and tick only **YouTube Data API v3**. Save.

Keep the key private: don't paste it into chats, code or GitHub.

**2. Create the Supabase project**

1. Sign up at [supabase.com](https://supabase.com) and create a new project (the free plan is enough).
2. Note the **project reference**: the part before `.supabase.co` in the project URL.

**3. Deploy the function** (from this folder, on your computer)

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set YOUTUBE_API_KEY=<your-key>
npx supabase functions deploy youtube-feed --no-verify-jwt
```

Check it works by opening `https://<your-project-ref>.supabase.co/functions/v1/youtube-feed` in a browser. You should see the channel's videos as text.

**4. Point the app at it**

Copy `.env.example` to `.env` and set:

```
EXPO_PUBLIC_YOUTUBE_FEED_URL=https://<your-project-ref>.supabase.co/functions/v1/youtube-feed
```

Restart `npm start`. The Home, Sermons and Live screens now show the real channel, and pulling down on them refreshes.

**How it behaves**

- Each refresh costs 2 of YouTube's 10,000 free daily quota units. The function caches for 5 minutes, or 1 minute while a stream is live or starting soon.
- Videos under 75 seconds (Shorts) are left out of the sermon list.
- A scheduled stream appears under **Coming up** on the Live tab, and the Live tab switches to the player by itself when the stream starts.
- Videos play inside the app through YouTube's own player, as YouTube's terms require.

To test the function's logic: `npm run test:feed`.

## Project layout

```
src/
  app/            screens (every file is a route)
    (tabs)/       the five tabs: home, sermons, live, podcast, devotional
  components/     icon.tsx, ui.tsx (buttons, text, cards), art.tsx (arch artwork, scroll)
  constants/      theme.ts: brand colours, fonts, spacing
  content/        sample.ts: temporary content until live sources are connected
  lib/            video.ts: date and label helpers for videos
  state/          feed.tsx: the YouTube feed; player.tsx: shared "now playing" state
assets/images/    app icon, splash, eagle emblem, full logo
supabase/
  functions/youtube-feed/   server function that reads the YouTube channel
```

## Brand

- Colours from the logo: ivory `#FCFAF6`, brown `#704828`, deep brown `#3A2413`, cream `#F8EFE0`.
- Type: **Cormorant Garamond** for titles, **Instrument Sans** for everything else (both free Google Fonts, bundled with the app).

## Next steps

1. **YouTube connection** — built; follow "Connect the YouTube channel" above to switch it on.
2. **Podcast audio** — real playback with `expo-audio`: background play, lock-screen controls, speed and sleep timer.
3. **Devotionals feed** — load devotionals from the website so they are published once.
4. **Accounts and backend** (Supabase) — reading streaks, saved items, prayer requests, reminders.
5. **Notifications** — "We're live", the daily devotional and service reminders.
6. **Publishing** — build with EAS (`npx eas-cli build`) and submit to the Play Store and App Store.

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run test:feed   # YouTube feed logic
```
