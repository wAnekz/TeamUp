# TeamUp

A PWA that helps high school students (14–18) in Almaty find teammates for hackathons, olympiads, and research or pet projects — post a project or a role, apply, get accepted, and chat with your team.

**[Live demo →](https://team-up-web.netlify.app/)**

## Features

- Email/password and Google auth, with email verification gating key actions
- Project feed with filters, roles with skill requirements and slot tracking
- Applications with a race-free accept flow (slot counts and status update atomically)
- "Looking for team" posts for people without a project yet
- In-team chat with per-user blocking/muting
- Report queue with a moderator role, plus automated first-pass content screening (Groq) on public posts
- Rate limiting on messages, reports, and applications via Cloud Functions
- Email notifications on new applications and accept/reject decisions
- Push notifications (FCM) on the same events, opt-in from Settings
- Auto-archive for stale or past-deadline projects
- Installable PWA, offline-friendly caching

## Tech stack

React + TypeScript + Vite + Tailwind · Firebase (Auth, Firestore, Cloud Functions) · TanStack Query · React Hook Form + Zod · Framer Motion · ImgBB (avatar hosting)

## Getting started

```bash
npm install
cp .env.example .env        # fill in your Firebase project's web config + an ImgBB key
npm run dev
```

You'll need a Firebase project with **Authentication** (Email/Password + Google) and **Firestore** enabled. Grab the web config from Project Settings → General → Your apps. Get a free ImgBB key at [api.imgbb.com](https://api.imgbb.com/) — avatars go through ImgBB instead of Firebase Storage since Storage now requires the Blaze plan.

Deploy rules, indexes, and functions:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes
cd functions && npm install && npm run deploy   # requires Blaze plan
```

Functions are safe to deploy unconfigured — email and content screening just log a warning and skip until their secrets (`GMAIL_APP_PASSWORD`, `GROQ_API_KEY`) are set:

```bash
firebase functions:secrets:set GMAIL_APP_PASSWORD
firebase functions:secrets:set GROQ_API_KEY
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

## Project structure

```
src/
  types/        Firestore document shapes
  lib/          Firebase SDK init, query client
  contexts/     AuthContext — auth state + profile, in one place
  hooks/        All Firestore reads/writes live here
  components/   ui/ (dumb, reusable), layout/, projects/
  pages/        One file per route
functions/
  src/          Cloud Functions: notifications, moderation, rate limits, auto-archive, content filter
```

## Data model

- **users/{uid}** — profile, skills, interests. Contact info sits in a public profile document but is only surfaced in the UI once an application is accepted — the rules don't gate the fields themselves, since profiles are meant to be discoverable, but nothing in the project/application cards renders contacts until `status === 'accepted'`.
- **users/{uid}/private/{docId}** — email lives here, in its own subdocument, not as a field on `users/{uid}`. `users/{uid}` is readable by any signed-in user by design; Firestore rules can't hide a single field from a whole-document read, so email can never safely live there. Restricted to the owner only — Cloud Functions read it fine regardless, since the Admin SDK bypasses rules.
- **projects/{id}** — roles with slot counts, denormalized `teamSizeCurrent`/`teamSizeMax` so the feed doesn't need sub-reads.
- **applications/{id}** — deterministic doc ID (`projectId_roleId_applicantId`) instead of `addDoc()` + a client-side existence check. A second attempt at the same ID is an `update`, which the rules reject — no race window, no reliance on the client behaving.
- **reports/{id}** — write-only from clients (`allow read: if false`); the queue itself isn't exposed to any client user, only reviewed via a moderator allowlist in `config/moderators`.

Full rules live in `firestore.rules`; moderator workflow is documented in `docs/MODERATION_GUIDE.md`.

## Safety & abuse prevention

The userbase is 14–18, so this got more attention than a typical side project:

- **Automated content screening** (`functions/src/contentFilter.ts`) — every new project and "looking for team" post runs through Groq's `openai/gpt-oss-safeguard-20b` before anyone has to notice and report it. It's a policy-reasoning model, not a fixed keyword list, given a plain-English policy that explicitly calls out `sexual_minors` alongside harassment/violence/self-harm/scam. Anything flagged lands in the same moderation queue as a user report — no separate UI to learn. Team chat is deliberately *not* screened (teammates already got accepted onto a project together; rate limits cover spam there instead).
- **Rate limiting** (`functions/src/moderation.ts`) — client-side throttling only covers the well-behaved-app case. The actual backstop is three Cloud Functions that count how many docs a user created in a trailing window and delete the newest one if they're over the limit — this can't be expressed in Firestore rules alone, since rules have no concept of "how many docs has this user created recently."
- **Manual moderation** — report queue + moderator role, documented for a non-technical moderator in `docs/MODERATION_GUIDE.md`. The automated screen is a first line of defense, not a replacement: it can't verify age or identity and won't catch a patient bad actor who never trips the policy.
- **Auto-archive** (`functions/src/autoArchive.ts`) — daily job that archives event-type projects past their deadline, and any project (event or ongoing) untouched for 60 days, so the feed doesn't fill with dead posts.

## Known gaps

- No self-serve account deletion yet (manual request to the developer — see `PrivacyPolicy.tsx` §7)

## Push notifications setup

Push (`functions/src/notifications.ts` → `sendPush`, `src/lib/messaging.ts`) reuses the same Firebase project as everything else, but needs two things filled in that aren't provided by `npm install`:

1. **VAPID key** — Firebase console → Project settings → Cloud Messaging → Web configuration → "Generate key pair". Put it in `.env` as `VITE_FIREBASE_VAPID_KEY`. Without it, the "Enable" button in Settings silently does nothing (checked in `useNotifications`/`requestPushPermission`).
2. **`public/firebase-messaging-sw.js`** hardcodes the same `firebaseConfig` values as `.env`, because it's a static file (not built by Vite, can't read `import.meta.env`) that has to run inside the service worker. If the Firebase project ever changes, update both places.

No Cloud Functions config changes needed — `sendPush` reads device tokens straight from `users/{uid}/private/notifications.tokens`, written client-side when someone taps "Enable".

## License

MIT
