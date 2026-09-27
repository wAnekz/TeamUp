# TeamUp

A PWA that helps high school students (14–18) in Almaty find teammates for hackathons, olympiads, and research or pet projects - post a project or a role, apply, get accepted, and chat with your team.

**[Live demo →](https://team-up-web.netlify.app/)**

## Features

- Email/password and Google auth, with email verification gating key actions
- Project feed with filters, roles with skill requirements and slot tracking
- Applications with a race-free accept flow (slot counts and status update atomically)
- "Looking for team" posts for people without a project yet
- In-team chat with per-user blocking/muting
- Curated Events (hackathons/olympiads) - moderator-managed, with format (online/offline/hybrid), organizer, registration link/deadline, and prize pool; "Find a team for this event" deep-links into Looking for team
- Skills and Interests are both large, categorized taxonomies (CategorizedTagPicker) - skills for what a role needs, interests for a project's topic/domain
- Profile strength progress bar nudging richer (but still optional) profile fields
- Dashboard deadline widget surfacing your own closing event-projects with pending applications, plus upcoming curated events
- Report queue with a moderator role, plus automated first-pass content screening (Groq) on public posts
- Rate limiting on messages, reports, and applications via Cloud Functions
- Email notifications on new applications and accept/reject decisions
- Push notifications (FCM) on applications, accept/reject decisions, and new team chat messages, opt-in from Settings
- Auto-archive for stale or past-deadline projects
- Installable PWA, offline-friendly caching
- Portfolio profile: every team a student led or was accepted onto (with their role, confirmed by the team lead's accept), plus achievements with an attached diploma photo/PDF; "Save as PDF" exports it for university applications
- Automatic event collection: a daily job pulls online hackathons from Devpost and announcements from public Telegram channels (LLM-extracted, RU/KZ/EN) into a moderator review queue at `/moderation/events`
- "I'm interested" on events: public who's-going list (with a "looking for a team" flag), reminders 7 days / 1 day before registration closes and the day before it starts
- Team invite links (`/invite/:code`) that let friends join an open role directly, surviving signup + onboarding
- "People who fit your team" on a project: matches Looking-for-team posts to open roles by skill, one-tap invite via push/Telegram/email
- Telegram bot: account linking, all notifications, `/events`, and a Monday digest of new events
- School leaderboard (`/schools`), recomputed daily
- Prep materials (links) on events
- Russian by default, with Kazakh and English (switcher on landing/login and in Settings). Strings in `src/i18n/` (`en.ts` is the reference shape; `ru.ts`/`kz.ts` are type-checked against it). Server notifications, Telegram bot and emails are in Russian
- Team results: after an event the lead records the placing; it lands in every member's portfolio as a team-confirmed achievement (`functions/src/teamResults.ts`)
- Re-engagement (`functions/src/reengagement.ts`): students inactive 7+ days get one concrete push/Telegram nudge (applications waiting on them > new teams needing their skills > new events), max once a week and three in a row; nothing is sent without a real reason
- Moderator stats page (`/moderation/stats`): nightly funnel and activity numbers in `config/metrics`, aggregates only
- Guest mode: a landing page at `/` plus browsable projects, events and the school leaderboard without an account. Guests read `publicProjects` - an anonymized mirror with no names/avatars/member ids (the privacy policy keeps profiles registered-users-only); any action (apply, save, interested, join) sends them to sign-up and back to the same page afterwards
- First-run "Getting started" checklist on the feed that ticks itself off from real data
- Gamification without a currency: XP only for confirmed actions (accepted onto a team, team filled, achievement with proof, friend joined via your link), 5 levels, badges, XP toasts; quarterly seasons where schools compete on their students' season XP and the winner's students get a champion badge

## Tech stack

React + TypeScript + Vite + Tailwind · Firebase (Auth, Firestore, Cloud Functions) · TanStack Query · React Hook Form + Zod · Framer Motion · ImgBB (avatar hosting)

## Getting started

```bash
npm install
cp .env.example .env        # fill in your Firebase project's web config + an ImgBB key
npm run dev
```

You'll need a Firebase project with **Authentication** (Email/Password + Google) and **Firestore** enabled. Grab the web config from Project Settings → General → Your apps. Get a free ImgBB key at [api.imgbb.com](https://api.imgbb.com/) - avatars go through ImgBB; Firebase Storage is only used for achievement files.

Deploy rules, indexes, and functions:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,storage
cd functions && npm install && npm run deploy   # requires Blaze plan
```

Achievement files use **Firebase Storage** - enable it once in the console (Build → Storage → Get started) before deploying `storage.rules`. Avatars still go through ImgBB.

Every secret a function declares must exist before `firebase deploy` will accept it. Once set, the functions are safe to run unconfigured in the sense that a placeholder value just makes email/Telegram/screening log a warning and skip:

```bash
firebase functions:secrets:set GMAIL_APP_PASSWORD
firebase functions:secrets:set GROQ_API_KEY            # content screening + Telegram event extraction
firebase functions:secrets:set TELEGRAM_BOT_TOKEN      # see "Telegram bot" below
firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET
```

Seed sample data (uses a **dev** project, never production):

```bash
npm run seed
```

Build and deploy hosting:

```bash
npm run build
firebase deploy --only hosting
```

## Tests

```bash
npm test            # unit tests (Vitest): search, matching, levels/seasons, nudges, translations, validation keys
npm run test:rules  # Firestore + Storage security rules against the emulators (needs Java 11+)
```

CI (`.github/workflows/ci.yml`) runs types, lint, unit tests, the build, the functions build and the rules tests on every push to `main` and every PR.

## Project structure

```
src/
  types/        Firestore document shapes
  lib/          Firebase SDK init, query client
  contexts/     AuthContext - auth state + profile, in one place
  hooks/        All Firestore reads/writes live here
  components/   ui/ (dumb, reusable), layout/, projects/
  pages/        One file per route
functions/
  src/          Cloud Functions: notifications, moderation, rate limits, auto-archive, content filter
```

## Data model

- **users/{uid}** - profile, skills, interests, contacts, `schoolId`. Readable by any signed-in user (never by guests). Contacts live here too, so any registered user can see them on a profile page - the privacy policy says so; moving them to an owner/teammate-only doc is listed under Known gaps.
- **users/{uid}/private/{docId}** - email lives here, in its own subdocument, not as a field on `users/{uid}`. `users/{uid}` is readable by any signed-in user by design; Firestore rules can't hide a single field from a whole-document read, so email can never safely live there. Restricted to the owner only - Cloud Functions read it fine regardless, since the Admin SDK bypasses rules.
- **projects/{id}** - roles with slot counts, denormalized `teamSizeCurrent`/`teamSizeMax` so the feed doesn't need sub-reads.
- **applications/{id}** - deterministic doc ID (`projectId_roleId_applicantId`) instead of `addDoc()` + a client-side existence check. A second attempt at the same ID is an `update`, which the rules reject - no race window, no reliance on the client behaving.
- **users/{uid}/achievements/{id}** - portfolio entries; files in Storage under `achievements/{uid}/`.
- **eventSubscriptions/{uid_eventId}** - "I'm interested"; public who's-going list and reminder recipients. `events/{id}.interestedCount` is kept in sync by a function.
- **eventDrafts/{id}** - auto-collected events waiting for a moderator.
- **invites/{code}** - one active invite per project (`projects/{id}.inviteCode`); joining goes through the `joinByInvite` callable.
- **publicProjects/{id}** - guest-readable anonymized copy of published projects, kept in sync by `syncPublicProject` (+ a daily reconcile).
- **stats/schools** - daily leaderboard snapshot (season XP); **stats/seasons** - past champions.
- **gamification/{uid}** + **xpEvents/{key}** - XP totals and the idempotent ledger behind them; function-written only.
- **reports/{id}** - write-only from clients (`allow read: if false`); the queue itself isn't exposed to any client user, only reviewed via a moderator allowlist in `config/moderators`.

Full rules live in `firestore.rules`; moderator workflow is documented in `docs/MODERATION_GUIDE.md`.

## Safety & abuse prevention

The userbase is 14–18, so this got more attention than a typical side project:

- **Automated content screening** (`functions/src/contentFilter.ts`) - every new project and "looking for team" post runs through Groq's `openai/gpt-oss-safeguard-20b` before anyone has to notice and report it. It's a policy-reasoning model, not a fixed keyword list, given a plain-English policy that explicitly calls out `sexual_minors` alongside harassment/violence/self-harm/scam. Anything flagged lands in the same moderation queue as a user report - no separate UI to learn. Team chat is deliberately *not* screened (teammates already got accepted onto a project together; rate limits cover spam there instead).
- **Rate limiting** (`functions/src/moderation.ts`) - client-side throttling only covers the well-behaved-app case. The actual backstop is three Cloud Functions that count how many docs a user created in a trailing window and delete the newest one if they're over the limit - this can't be expressed in Firestore rules alone, since rules have no concept of "how many docs has this user created recently."
- **Manual moderation** - report queue + moderator role, documented for a non-technical moderator in `docs/MODERATION_GUIDE.md`. The automated screen is a first line of defense, not a replacement: it can't verify age or identity and won't catch a patient bad actor who never trips the policy.
- **Auto-archive** (`functions/src/autoArchive.ts`) - daily job that archives event-type projects past their deadline, and any project (event or ongoing) untouched for 60 days, so the feed doesn't fill with dead posts.

## Known gaps

- No self-serve account deletion yet (manual request to the developer - see `PrivacyPolicy.tsx` §7)
- Contacts (Telegram, Instagram...) are on the public-to-registered-users profile doc. For a 14-18 audience they should move to a doc readable only by the owner and their teammates
- Kazakh translations (`src/i18n/kz.ts`) were not written by a native speaker and need a proofread
- The signed-in app was verified by type checks, unit tests and rules tests, not by an end-to-end browser test

## Push notifications setup

Push (`functions/src/notifications.ts` → `sendPush`, `src/lib/messaging.ts`) reuses the same Firebase project as everything else, but needs two things filled in that aren't provided by `npm install`. It fires on new applications, accept/reject decisions, and new team chat messages (chat is push-only, no email - a live chat firing an email per message would be spammy).

1. **VAPID key** - Firebase console → Project settings → Cloud Messaging → Web configuration → "Generate key pair". Put it in `.env` as `VITE_FIREBASE_VAPID_KEY`. Without it, the "Enable" button in Settings silently does nothing (checked in `useNotifications`/`requestPushPermission`).
2. **`public/firebase-messaging-sw.js`** hardcodes the same `firebaseConfig` values as `.env`, because it's a static file (not built by Vite, can't read `import.meta.env`) that has to run inside the service worker. If the Firebase project ever changes, update both places.

No Cloud Functions config changes needed - `sendPush` reads device tokens straight from `users/{uid}/private/notifications.tokens`, written client-side when someone taps "Enable".

## Telegram bot setup

1. Create a bot with [@BotFather](https://t.me/BotFather) (`/newbot`), copy the token.
2. `firebase functions:secrets:set TELEGRAM_BOT_TOKEN` (the token) and `firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET` (any long random string, letters/digits/`_`/`-`).
3. Deploy functions, then point the bot at the webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://us-central1-<PROJECT_ID>.cloudfunctions.net/telegramWebhook&secret_token=<WEBHOOK_SECRET>"
   ```
4. Put the bot's username in `.env` as `VITE_TELEGRAM_BOT_USERNAME` and rebuild - that's what shows the "Connect" row in Settings.

## Event collection

`collectEvents` runs daily at 07:00 Almaty time. Sources are edited by moderators on `/moderation/events` (stored in `eventSources/config`); the default is Devpost + `@astana_hub`. Only public channels with a `t.me/s/<name>` web preview work. Nothing is published automatically - each draft is opened, checked, and published (or rejected) by a moderator, and every source URL is remembered in `collectorSeen` so rejected items don't come back.

## License

MIT
