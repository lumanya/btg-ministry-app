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
| Welcome (create account, sign in, continue as guest) | `src/app/index.tsx` | Done |
| Home (live card, today's devotional, streak, continue listening, latest sermons, word for today) | `src/app/(tabs)/home.tsx` | Done, sample content |
| Sermons (search, filters, featured, list) | `src/app/(tabs)/sermons.tsx` | Done; reads the YouTube feed |
| Sermon detail | `src/app/sermon/[id].tsx` | Done; plays inside the app |
| Live (player, prayer request, service reminders) | `src/app/(tabs)/live.tsx` | Done; shows "Live now" or the next stream automatically |
| Podcast (series, episodes, progress, mini player) | `src/app/(tabs)/podcast.tsx` | Done; reads the podcast's RSS feed |
| Now playing (seek bar, skip, speed, sleep timer) | `src/app/player.tsx` | Done; background play and lock-screen controls |
| Daily devotional (week strip, series, archive) | `src/app/(tabs)/devotional.tsx` | Done, sample content |
| Devotional reader (text size, bookmark, mark as read) | `src/app/devotional/[id].tsx` | Done; full text comes from the website later |
| Give (M-Pesa and CRDB with copy buttons) | `src/app/give.tsx` | Done |
| Sign in, create account, email code, forgot password | `src/app/sign-in.tsx`, `sign-up.tsx`, `verify.tsx`, `forgot-password.tsx` | Done; needs Supabase (below) |
| Account and settings (name, appearance, sign out, delete account) | `src/app/profile.tsx` | Done |

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

## Connect the podcast

The Podcast tab plays episodes from the podcast's **RSS feed**, the same feed Spotify and Apple Podcasts read. Any podcast host gives you one when you upload episodes; it usually ends in `.xml` or `/rss`.

Add it to `.env`:

```
EXPO_PUBLIC_PODCAST_FEED_URL=https://<your podcast host>/<your feed>.xml
```

Restart `npm start`. Until then the tab lists sample episodes with no audio.

**What the player does**

- Plays with the screen locked and in silent mode, with play/pause and skip buttons on the lock screen.
- Remembers where each episode stopped, so episodes resume and Home shows **Continue listening** with the time left.
- Speeds 0.75×–2×, a 30-minute sleep timer, and a draggable position bar.
- Groups episodes into series using the feed's season numbers (`itunes:season`).

**Testing on a phone:** episodes play in Expo Go. Background play and lock-screen controls need the app's own build, because they change the app's native settings. Make a test build with `npx eas-cli@latest build --profile development`.

To test the feed reader: `npm run test:podcast`.

## Accounts (sign-in)

Members can create an account with their email and a password, or use the whole app as a guest. Accounts use the same Supabase project as the YouTube feed.

**1. Create the profiles table**

```bash
npx supabase db push
```

This adds a `profiles` table (one row per member, with their name). Members can read and edit only their own row.

**2. Send codes instead of links**

The app confirms new accounts and resets passwords with a 6-digit code from the email, so members never leave the app. In the Supabase dashboard, open **Authentication** and find the **email templates**. Replace:

- **Confirm signup** with the text of `supabase/templates/confirmation.html`
- **Reset password** with the text of `supabase/templates/recovery.html`

Both use `{{ .Token }}`, which Supabase replaces with the code. In the **Email** sign-in provider settings, also check that *Confirm email* is on and the minimum password length is 8.

**3. Deploy the delete-account function**

Apple requires apps that offer sign-up to let people delete their account in the app.

```bash
npx supabase functions deploy delete-account
```

**4. Add the keys to `.env`**

From **Project Settings → API**:

```
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<your publishable (anon) key>
```

These two are safe to put in the app. Never put the **service role** or secret key in the app or in `.env`.

**Sending email:** Supabase's built-in email is meant for testing and sends only a few emails an hour. Before launch, add your own email service in Supabase's **SMTP settings** (under Authentication) so codes arrive reliably.

**What members get:** create an account (name, email, password), confirm with a code, sign in, reset a forgotten password with a code, change their name, choose light or dark mode, sign out, and delete their account. Guests can do everything except keep things across phones. Until the keys are set, the sign-in screens say accounts aren't switched on yet.

## Light and dark mode

The app follows the phone's light or dark setting. Members can override it under **Settings → Appearance** (Phone, Light or Dark), and the choice is remembered. Colours for both modes are in `src/constants/theme.ts`; screens read them with `useColors()` and `useStyles()` from `src/state/theme.tsx`.

## Project layout

```
src/
  app/            screens (every file is a route)
    (tabs)/       the five tabs: home, sermons, live, podcast, devotional
  components/     icon.tsx, ui.tsx (buttons, text, cards), art.tsx (arch artwork, scroll)
  constants/      theme.ts: brand colours, fonts, spacing
  content/        sample.ts: temporary content until live sources are connected
  lib/            video.ts, podcast.ts, supabase.ts, auth-messages.ts (form checks and error wording)
  state/          auth.tsx: accounts; theme.tsx: light/dark; feed.tsx: YouTube; player.tsx: podcast audio
assets/images/    app icon, splash, eagle emblem, full logo
supabase/
  functions/youtube-feed/     reads the YouTube channel
  functions/delete-account/   deletes a member's account on request
  migrations/                 the profiles table
  templates/                  emails that send a 6-digit code
```

## Brand

- Colours from the logo: ivory `#FCFAF6`, brown `#704828`, deep brown `#3A2413`, cream `#F8EFE0`. Dark mode uses warm near-black `#16100B` with gold `#E2B57A` for links and icons.
- Type: **Cormorant Garamond** for titles, **Instrument Sans** for everything else (both free Google Fonts, bundled with the app).

## Next steps

1. **YouTube connection** — built; follow "Connect the YouTube channel" above to switch it on.
2. **Podcast audio** — built; add the RSS feed as in "Connect the podcast" above.
3. **Devotionals feed** — load devotionals from the website so they are published once.
4. **Accounts** — built; follow "Accounts (sign-in)" above. Next: save reading streaks, saved items and prayer requests to the account.
5. **Notifications** — "We're live", the daily devotional and service reminders.
6. **Publishing** — build with EAS (`npx eas-cli build`) and submit to the Play Store and App Store.

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # YouTube feed, podcast reader, sign-in form checks
```
