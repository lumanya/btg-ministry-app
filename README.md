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

## Backend and admin dashboard (Supabase)

Everything the ministry posts lives in Supabase and is managed from the **admin dashboard** (`admin/`), a website for staff.

| What | Where in the app | Managed in the dashboard |
|---|---|---|
| Daily devotionals (text, scripture, optional recording) | Home, Devotional tab, reader | Devotionals: write, schedule for a date, publish, save drafts |
| Prayer requests | Live tab → Prayer request | Prayer requests: mark as prayed for, archive |
| Weekly services | Live tab → Coming up | Services |
| M-Pesa and bank details | Give | Giving |
| Series tiles | Devotional tab | Series |
| “Word for today” quotes | Home | Word for today |
| Staff access | — | Staff (admins only) |

Members' reading streaks and saved items are also stored in their account, so they follow them to a new phone. Sermons and the livestream still come from YouTube, and podcast episodes from the podcast's RSS feed.

**Who can do what** is enforced by the database itself (row-level security in `supabase/migrations/`), not by the app or the dashboard: guests and members can only read published content and send prayer requests; members can only see their own streak and saved items; only staff can read prayer requests or change content; only admins can add staff. `npm run test:db` checks these rules.

### Set it up

**1. Create the database tables** (needs the Supabase CLI login from the steps above)

```bash
npx supabase db push
```

Then open **SQL Editor** in the Supabase dashboard, paste the contents of `supabase/seed.sql` and run it. **Easiest without the CLI:** paste `supabase/setup.sql` (all tables, rules and starting content in one file) into a new SQL Editor query and click Run, once. That adds the devotionals, series, giving details and quotes from btgministry.org so the app isn't empty on day one. (No CLI? Paste each file in `supabase/migrations/` into the SQL Editor in date order instead, then the seed.)

**2. Make yourself the first admin.** Create an account in the app with your email, then run this once in the SQL Editor:

```sql
insert into public.staff (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.org';
```

After that, add other staff from the dashboard's **Staff** page. They sign up in the app first, then you add their email as an *editor* (posts content, answers prayer requests) or *admin* (also manages staff).

**3. Run the dashboard**

```bash
cd admin
cp .env.example .env      # paste the same URL and publishable key as the app
npm install
npm run dev               # opens on http://localhost:5173
```

**4. Put the dashboard online** (free on Netlify, Vercel or Cloudflare Pages): connect the GitHub repository, set the base folder to `admin`, the build command to `npm run build` and the output folder to `dist`, and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` as environment variables. A web address such as `admin.btgministry.org` works well.

**Good to know**

- A devotional published for a future date appears automatically at midnight Tanzania time. The Overview page warns when nothing is scheduled for tomorrow.
- Write the devotional with a blank line between paragraphs. Recordings (MP3) uploaded on the devotional page give members a *Listen* button.
- The app keeps a copy of the latest content, so it still works without a connection.
- Prayer requests are limited to 3 an hour per member, and 30 a minute across the app, to stop floods.

## Notifications, series, share cards and events

**Push notifications.** Members turn them on from the card on Home or in Settings, and choose topics: *We're live*, *Daily devotional* (from 06:00), *Service reminders* (30 minutes before), *Events* (the day before and an hour before) and *Announcements*. Staff send or schedule announcements from the dashboard's **Notifications** page. Everything else goes out automatically: the `send-notifications` function runs every 5 minutes, adds what's due to the outbox (each item once) and sends it through Expo's push service.

Setup, once:
1. Run `supabase/migrations/20261114230000_engagement.sql` in the SQL Editor (or `npx supabase db push`).
2. Deploy the functions: `npx supabase functions deploy youtube-feed send-notifications` (JWT verification off for both).
3. Run `supabase/cron.sql` in the SQL Editor to start the 5-minute schedule.
4. Push notifications need the app built with EAS: run `npx eas-cli init` (adds the project ID to `app.json`), then add Android (Firebase FCM) and iOS (Apple push key) credentials with `npx eas-cli credentials`. Until then the app explains that notifications switch on in the store build. They don't work in Expo Go on Android.

**Sermon series.** YouTube playlists appear as series on the Sermons tab, with each teaching in the order arranged on YouTube. The dashboard's **Sermon series** page hides, renames or reorders them. YouTube titles written in capitals with `||` are tidied for display ("FRIDAY SERVICE || 13 TH NOV 2026 || BTG MINISTRY" becomes "Friday Service").

**Share cards.** The quote on Home, the devotional reader and events share as branded images (Ivory, Latte or Night; a square-ish post or a full-screen status), ready for WhatsApp.

**Events.** Staff add conferences and special services on the dashboard's **Events** page (date, place, picture, registration link). The next one shows on Home; members can register, get directions, set a reminder and invite friends with a share card.

## Kiswahili, likes and views, data saver

**Kiswahili.** The whole app is in English and Kiswahili. It follows the phone's language; members can choose under **Settings → Language** (Phone, English or Kiswahili). Screens use `t('English text')` from `src/i18n`; the Kiswahili for each phrase is in `src/i18n/sw.ts` (`npm run test:i18n` lists any phrase that has no Kiswahili yet). Staff add Kiswahili versions of devotionals (the *Kiswahili* switch at the top of the editor), events, quotes, service names and announcements in the dashboard; where there is none, Kiswahili readers see the English. Notifications go out in each phone's language.

**Likes and views.** Members tap the heart on a sermon or devotional; the count is shared by everyone. Signed-in members are counted by account, guests by a random id made on the phone. Devotionals show how many people read them; sermons show YouTube's view count. The dashboard's Overview lists the most loved items of the last 30 days, and the Devotionals list shows likes and reads.

**Data saver.** Under **Settings → Data saver** (Auto, On, Off). On *Auto* it switches on with mobile data: smaller pictures and fewer checks for new content. Podcast episodes can be downloaded (the arrow next to each one) to listen without internet; downloads appear at the top of the Podcast tab and play from the phone. The podcast list is kept for offline use too.

Setup, once: run `supabase/migrations/20261115090000_kiswahili_likes.sql` in the SQL Editor, then redeploy `youtube-feed` and `send-notifications`.

## Seeds (short videos from Instagram)

Iman's Instagram videos and Reels appear as **Seeds** (*Mbegu*): one-minute words, after Luke 8:11 ("the seed is the word of God"). They have their own tab and a row on Today. The Seeds tab plays each one full screen as you swipe up, like Instagram or TikTok. The videos stay on Instagram, so they cost nothing to store.

- **Grow this seed.** A seed linked to a sermon shows *From the full sermon* while it plays. When it ends, a sheet offers the whole sermon, *Watch later* (saves the sermon), or the next seed after a 5-second countdown. Seeds are edited from several parts of a sermon, so the sermon opens from the beginning; staff can set an optional start time on the dashboard when one moment clearly fits.
- After 10 seeds in a row the feed gently suggests a full sermon.
- *Amen* is the like button; watching a seed for 2 seconds counts a view and ticks *Watch a seed* in today's rhythm.
- Instagram captions written in capitals are shown in sentence case (`seedTitle` in `src/lib/clips.ts`).
- `supabase/functions/instagram-feed` reads the account's whole video history: Reels, older feed videos from before Reels, and videos inside carousel posts. The full history is read every 6 hours and kept in `public.instagram_cache`; the newest posts are checked every 15 minutes (Instagram's video links expire). The app loads seeds 40 at a time, newest first, and more as people scroll. Business keys from Meta never expire; Instagram-login keys renew themselves.
- The dashboard's **Seeds** page connects Instagram (paste the access key and the Instagram account ID once), links each seed to its sermon (with an optional start time), renames or hides seeds, and shows Amens and views.
- Instagram doesn't share videos that use music from its audio library; those are listed on the dashboard but don't play in the app.

In code and the database these are still called clips (`clips` table, `instagram-feed` function, `src/state/clips.tsx`); only the name people see changed.

## Today's rhythm, streaks and grace days

- **Tabs:** Today · Seeds · Watch (sermons, with Live at the top) · Word (devotionals) · Listen (podcast). Live is still at `/live`.
- **Today's rhythm** is three small steps: read today's devotional, watch a seed, and a minute of prayer (`/pray`, which can also send a prayer request). Seeds and prayer are tracked on the phone (`src/state/rhythm.tsx`).
- **Grace day.** One missed day each Monday-to-Sunday week doesn't break the reading streak; two missed days in a row do (`src/lib/streak.ts`, with tests).
- **Milestones:** Planted (7 days), Rooted (21), Growing (40), Fruitful (100).
- **Amen — I've read this word** marks today's devotional and opens the streak screen (`/rhythm`), which can share *My week in the Word* as a Status card.
- **Reflect.** Each devotional has a private reflection box. Reflections are saved on the phone only and never sent anywhere.
- **Share to Status** on Today's quote opens the share card in Status shape on the new Ink colour.

## Look and brand (version 1.1)

- **Eagle mark.** `src/components/eagle-mark.tsx` is the eagle traced into one clean vector shape: gold on ink, brown on paper, sharp at any size. The app icon, Android adaptive icon, splash screen and favicon in `assets/images/` are made from it (gold eagle on ink `#17120E`).
- **Welcome** is ink and gold with English / Kiswahili at the top, then *Get started* (create an account, or skip), *I already have an account* and *Look around first*.
- **Daily reminder.** The first time Today opens on a phone, it asks when to send a daily reminder for today's rhythm (06:00 to 20:00, or none). It's scheduled on the phone (`src/lib/reminder.ts`) and can be changed in Settings.
- **Player** is ink and gold, with skip 15/30 seconds, speed, a sleep timer (15, 30 or 60 minutes) and lock-screen controls.
- **Artwork.** Videos without a YouTube picture, series tiles, the podcast cover and empty states use the gold eagle on ink.
- **YouTube thumbnails.** The design canvas has a 1280 × 720 thumbnail template so every sermon looks the same on YouTube and in the app.

Changing the icon or splash screen needs a new build; raise `version` in `app.json` when you do.

## Updating the app without a new build (EAS Update)

Builds made with `expo-updates` (from commit "Over-the-air updates" on) can get new versions of the app's screens and logic without a new APK or a store review.

- The app checks for an update each time it starts, and again when it's reopened after 30 minutes. The update downloads in the background and is used on the next start. Today also shows **A new version is ready · Restart**.
- Each build type listens on its own channel: `preview` (test APKs) and `production` (store builds), set in `eas.json`.

Publish an update (from the project folder, after `git pull`):

```
npx eas-cli@latest update --channel preview --message "What changed"
```

Use `--channel production` for store builds. On Windows PowerShell write `npx.cmd`.

**What can go out as an update:** screens, text, colours, Kiswahili, images bundled with the code and app logic: anything in `src/`.

**What needs a new build:** a new package with native code (for example a new `expo-*` module), the app icon or splash screen, permissions and other native settings in `app.json`. When that happens, raise `version` in `app.json` (1.0.0 → 1.1.0) and build again. Updates only reach builds with the same version (`runtimeVersion` policy `appVersion`), so an update can never land on a build missing the native code it needs.

## Publishing to the App Store and Google Play

Builds are made with EAS (`eas.json`): `preview` makes an Android APK to install directly for testing; `production` makes store builds, with build numbers counted by EAS.

1. Accounts: Apple Developer Program (US$99 a year) and Google Play Console (US$25 once), both in the ministry's name.
2. `npx eas-cli login`, then `npx eas-cli init` (adds the project id to `app.json`).
3. `npx eas-cli build --profile preview --platform android` to try the app on Android phones.
4. `npx eas-cli build --profile production --platform all`, then `npx eas-cli submit --platform ios` and `--platform android`.
5. Store pages: privacy policy, support and account deletion pages are in `admin/public/` and are published with the dashboard (`…/privacy.html`, `…/support.html`, `…/delete-account.html`).

## Light and dark mode

The app follows the phone's light or dark setting. Members can override it under **Settings → Appearance** (Phone, Light or Dark), and the choice is remembered. Colours for both modes are in `src/constants/theme.ts`; screens read them with `useColors()` and `useStyles()` from `src/state/theme.tsx`.

## Reading streak, saved items and the mini player

- **Reading streak.** Marking a devotional as read counts for the day. Today and the Word tab show the current streak and this week's days; the streak stays alive through today, and one grace day a week covers a missed day. Best streak is kept too.
- **Saved.** The bookmark on a devotional and *Save* on a sermon put them in *Saved* (bookmark button on Home, or *Your library* in Settings).
- **Mini player.** Once something has played, a small player sits above the tabs on every tab and opens the full player.
- **Feel.** Sections ease in as a screen opens, placeholders pulse while the feed loads, and buttons give a light tap on phones. Motion is skipped when the phone's *Reduce motion* setting is on.

The streak and saved items are kept on the phone for now (`src/state/library.tsx`). They can move to Supabase later so they follow a member across devices.

## Project layout

```
src/
  app/            screens (every file is a route)
    (tabs)/       the five tabs: home, sermons, live, podcast, devotional
  components/     icon.tsx, ui.tsx (buttons, text, cards), art.tsx (arch artwork, scroll)
  constants/      theme.ts: brand colours, fonts, spacing
  content/        sample.ts: built-in content, shown until Supabase is connected
  i18n/           index.ts: t() and dates in English or Kiswahili; sw.ts: the Kiswahili
  lib/            video.ts, podcast.ts, supabase.ts, content.ts (database rows -> screens), library-sync.ts, streak.ts
  state/          auth.tsx: accounts; content.tsx: devotionals, services, giving, prayer requests;
                  library.tsx: streak and saved items; theme.tsx; feed.tsx: YouTube; player.tsx: audio;
                  language.tsx; data-saver.tsx; engagement.ts: likes and views; downloads.ts: offline podcast
assets/images/    app icon, splash, eagle emblem, full logo
supabase/
  functions/youtube-feed/     reads the YouTube channel
  functions/delete-account/   deletes a member's account on request
  functions/instagram-feed/   reads Iman's Instagram videos (Seeds)
  migrations/                 tables and access rules (profiles, content, prayer, staff, member data)
  seed.sql                    starting content from btgministry.org
  tests/policies.test.mjs     checks the access rules in a local Postgres
  templates/                  emails that send a 6-digit code
admin/                        the staff dashboard (React + Vite website)
```

## Brand

- Light and airy: near-white screens `#FFFDFA`, white cards with soft warm borders `#EFE6DA`, and caramel brown `#8B5A2B` from the logo kept for buttons, selected states and small accents. Artwork tiles use soft latte tones.
- Dark mode uses warm charcoal `#131110` (not brown) with gold `#E2B57A` for links and icons.
- Type: **Cormorant Garamond** for titles, **Instrument Sans** for everything else (both free Google Fonts, bundled with the app).

## Next steps

1. **YouTube connection** — built; follow "Connect the YouTube channel" above to switch it on.
2. **Podcast audio** — built; add the RSS feed as in "Connect the podcast" above.
3. **Backend and dashboard** — built; follow "Backend and admin dashboard" above.
4. **Accounts** — built, with streaks and saved items stored in the account.
5. **Notifications** — built.
6. **Kiswahili, likes and views, data saver** — built.
7. **Publishing** — ready to build; see "Publishing to the App Store and Google Play".

## Checks

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # YouTube feed, podcast reader, sign-in checks, streaks, sync, database access rules, Kiswahili
cd admin && npm run typecheck && npm test   # the dashboard
```
