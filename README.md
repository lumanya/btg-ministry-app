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
| Sermons (search, filters, featured, list) | `src/app/(tabs)/sermons.tsx` | Done, sample content |
| Sermon detail | `src/app/sermon/[id].tsx` | Done; video opens on YouTube for now |
| Live (player, prayer request, service reminders) | `src/app/(tabs)/live.tsx` | Done; stream opens on YouTube for now |
| Podcast (series, episodes, mini player) | `src/app/(tabs)/podcast.tsx` | Screens done; audio not connected yet |
| Now playing | `src/app/player.tsx` | Screens done; audio not connected yet |
| Daily devotional (week strip, series, archive) | `src/app/(tabs)/devotional.tsx` | Done, sample content |
| Devotional reader (text size, bookmark, mark as read) | `src/app/devotional/[id].tsx` | Done; full text comes from the website later |
| Give (M-Pesa and CRDB with copy buttons) | `src/app/give.tsx` | Done |

All sample content lives in one file, `src/content/sample.ts`. Values in `[SQUARE BRACKETS]` (service times, venue) still need to be filled in by the ministry.

## Project layout

```
src/
  app/            screens (every file is a route)
    (tabs)/       the five tabs: home, sermons, live, podcast, devotional
  components/     icon.tsx, ui.tsx (buttons, text, cards), art.tsx (arch artwork, scroll)
  constants/      theme.ts: brand colours, fonts, spacing
  content/        sample.ts: temporary content until live sources are connected
  state/          player.tsx: shared "now playing" state
assets/images/    app icon, splash, eagle emblem, full logo
```

## Brand

- Colours from the logo: ivory `#FCFAF6`, brown `#704828`, deep brown `#3A2413`, cream `#F8EFE0`.
- Type: **Cormorant Garamond** for titles, **Instrument Sans** for everything else (both free Google Fonts, bundled with the app).

## Next steps

1. **YouTube connection** — fetch the latest streams, titles and thumbnails from the channel (`UC0wRGjSLCWbmVqMfvX3PIiw`) through a small server function, show "Live now" automatically, and play videos inside the app.
2. **Podcast audio** — real playback with `expo-audio`: background play, lock-screen controls, speed and sleep timer.
3. **Devotionals feed** — load devotionals from the website so they are published once.
4. **Accounts and backend** (Supabase) — reading streaks, saved items, prayer requests, reminders.
5. **Notifications** — "We're live", the daily devotional and service reminders.
6. **Publishing** — build with EAS (`npx eas-cli build`) and submit to the Play Store and App Store.

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
```
