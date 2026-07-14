# TeamUp

[![CI](https://github.com/wAnekz/TeamUp/actions/workflows/ci.yml/badge.svg)](https://github.com/wAnekz/TeamUp/actions/workflows/ci.yml)

A PWA where high school students (14–18) find teammates or join teams for hackathons, olympiads, research and pet projects.

React + TypeScript + Vite + Tailwind + Firebase (Auth, Firestore) + ImgBB (avatar uploads) + TanStack Query + React Hook Form + Zod.

## Quick start

```bash
npm install
cp .env.example .env        # fill in your Firebase project's web config
npm run dev
```

You'll need a Firebase project with **Authentication** (Email/Password + Google providers enabled) and **Firestore** turned on. Get the web config from Project Settings → General → Your apps, and paste the values into `.env`.

Avatar uploads go through [ImgBB](https://api.imgbb.com/) instead of Firebase Storage, since Firebase now requires the paid Blaze billing plan just to provision a Storage bucket. Get a free API key at https://api.imgbb.com/ and set `VITE_IMGBB_API_KEY` in `.env`. (If you'd rather use Firebase Storage, the old implementation is straightforward to restore — see the comment in `src/lib/firebase.ts`.)

Deploy security rules, indexes, and Cloud Functions:

```bash
npm install -g firebase-tools   # if you don't have it
firebase login
firebase use --add              # link this folder to your Firebase project
firebase deploy --only firestore:rules,firestore:indexes
cd functions && npm install && npm run deploy && cd ..   # requires Blaze plan
```

The functions are safe to deploy unconfigured — email (`GMAIL_APP_PASSWORD`)
and content screening (`GROQ_API_KEY`) just log a warning and skip until
their secrets are set (see "Email notifications" and "Automated content
screening" below); rate-limiting and auto-archive need no extra setup at
all.

Seed sample data (points at whatever project `.env` is configured for — **use a dev project, not production**):

```bash
npm run seed
```

Build & deploy hosting:

```bash
npm run build
firebase deploy --only hosting
```

## Project structure

```
src/
  types/          Firestore document shapes, shared everywhere
  lib/             firebase.ts (SDK init), queryClient.ts
  constants/       Skill/interest/grade option lists for pickers
  contexts/        AuthContext — auth state + profile doc, in one place
  hooks/           useProjects, useApplications, useLookingForTeam, useProfile
                   (all Firestore reads/writes live here, nowhere else)
  utils/           zod schemas, date formatting, cn(), id generator
  components/
    ui/            Button, Input, Modal, TagPicker, Card/Badge/Avatar — dumb, reusable
    layout/        AppShell, Navbar (desktop top bar + mobile bottom tabs), route guards
    projects/      ProjectCard, ProjectFilterPanel, ApplyModal
  pages/           One file per route; dashboard/ holds the four dashboard tabs
  seed/            Sample data script (src/seed/run.ts)
```

Routing lives in `src/App.tsx`. Two guards in `components/layout/guards.tsx`:
`RequireAuth` (redirects to `/login`, then to `/complete-profile` if the profile
isn't finished yet) and `RequireGuest` (keeps signed-in users off `/login`).

## Firestore schema

**users/{uid}** — profile fields, `skills: [{skill, level}]`, `interests[]`,
`contacts` (only meaningfully useful to the other side once an application is
accepted — the UI doesn't gate the fields themselves, since profiles are
public by design, but nothing surfaces contacts in project/application cards
until `status === 'accepted'`).

**projects/{id}** — `roles: [{id, title, requiredSkills, slotsTotal, slotsFilled}]`,
`teamSizeMax`/`teamSizeCurrent` (denormalized so feed cards don't need a roles
sub-read), `isDraft`, `status`.

**applications/{id}** — `ownerId` is denormalized from the project at
creation time specifically so security rules can check "is this me" without
an extra read. Accepting an application is one Firestore transaction
(`useReviewApplication`) that bumps `roles[].slotsFilled` and flips the
application status together, so slot counts can't drift from reality.

**lookingForTeam/{id}** — standalone "I'm looking for a team" posts, separate
from projects/roles.

**reports/{id}** — write-only from the client (`allow read: if false`). Build
a small admin tool with the Admin SDK, or a Cloud Function trigger, to
actually triage these — the rules intentionally don't expose the queue to
any client user.

## What's stubbed / next steps

This is a real, running MVP — not a mockup — but a couple of things from the
brief are intentionally left as follow-ups rather than fully wired, so you
can prioritize:

- **Push notifications** — brief marks this "later."
- **Account self-deletion** — right now deleting an account is a manual
  request to the developer (see `PrivacyPolicy.tsx` §7), not a button in
  the app.

## Auto-archive

`functions/src/autoArchive.ts` runs once a day (`onSchedule('every 24 hours')`)
and flips `status: 'archived'` on any project that's:

- an `event`-type project whose `deadline` has passed, or
- any non-draft project (event or ongoing) that hasn't been updated in
  60 days, regardless of deadline — covers ongoing/pet projects, which
  don't have a deadline to key off of.

Drafts are never touched. Writes are batched (400 per batch, under
Firestore's 500-write cap) so a single run can archive a few hundred
projects at once without extra round trips. Deploy it like any other
function: `cd functions && npm install && npm run deploy` — no secrets
needed, it only needs Firestore access via the Admin SDK. The two composite
indexes it depends on (`type/status/isDraft/deadline` and
`status/isDraft/updatedAt` on `projects`) are already in
`firestore.indexes.json`; deploy those before the function actually gets
traffic (`firebase deploy --only firestore:indexes`), and give them a
minute or two to finish building in the Firebase console before relying on
the schedule.

To test without waiting a day, trigger it manually from the Firebase
console (Functions → `autoArchiveProjects` → "Run now") or
`firebase functions:shell`.

## Blocking / muting

`useBlockedUsers.ts` + `users/{uid}/blocks/{blockedUid}` let a user hide
someone's messages in team chat (`TeamChat.tsx` — hover a message, click the
user icon) without needing a moderator. This is deliberately lightweight and
**client-side only**: it filters what renders for the blocker, it doesn't
stop the blocked person from writing to a chat they're still a member of,
and it doesn't notify anyone. Anything that needs the person actually
removed or sanctioned still goes through `ReportButton` → the moderation
queue described below. Firestore rules restrict a block list to its owner
(read and write), same allowlist-per-user pattern as everything else
permission-gated in this file.



`functions/src/notifications.ts` emails people at the two moments that
actually need a nudge outside the app: a new application (→ the project
owner) and an accept/reject decision (→ the applicant). It sends via
**Gmail SMTP** (nodemailer + a Gmail App Password) — no custom domain
required, works from a plain `@gmail.com` address, ~500 emails/day which is
far more than this app needs.

Setup:

1. Turn on 2-Step Verification on the sending Gmail account, then generate
   an App Password at myaccount.google.com → Security → App passwords.
2. Set the app password as a Cloud Functions secret (never put this in
   `.env` — secrets are stored encrypted, not deployed as plain env vars):
   ```bash
   firebase functions:secrets:set GMAIL_APP_PASSWORD
   ```
3. Set the sending address and your deployed app URL in `functions/.env`
   (these two are fine as plain vars, neither is sensitive):
   ```
   GMAIL_USER=you@gmail.com
   APP_URL=https://your-app.web.app
   ```
4. Deploy: `cd functions && npm install && npm run deploy`.

Until step 2 is done, the functions log a warning and skip sending instead
of failing — so it's safe to deploy before Gmail is configured.

### Email verification

Since notifications now depend on the address being real, signup
(email/password only — Google accounts are pre-verified) sends a Firebase
verification email via `sendEmailVerification`. Unverified users see a
banner (`EmailVerificationBanner.tsx`) on every page with resend / "I
verified, check again" buttons — it's a nudge, not a lockout, except for
the three actions that actually trigger a notification email: creating a
project, posting to "looking for team", and applying to a role.
`firestore.rules` enforces that server-side (`isEmailVerified()`, checked
against the `email_verified` claim Firebase already puts on the ID token —
no extra Firestore read needed), so it can't be bypassed by skipping the
banner in devtools.

By default it sends from Resend's shared sandbox address
(`onboarding@resend.dev`), which reliably delivers only to the email your
Resend account itself is registered with. Once you verify your own domain
in Resend (a few DNS records, takes minutes), change `FROM_EMAIL` in
`notifications.ts` to something like `notifications@teamup.yourdomain.com`
so it can actually reach students, not just you.

Each student's email is denormalized at signup into `users/{uid}/private/info`
(a separate doc, not a field on `users/{uid}` itself) specifically so these
functions don't need an Admin Auth call. It's split into its own doc because
`users/{uid}` is readable by any signed-in user (profiles are meant to be
discoverable), and Firestore rules can't hide a single field from a
whole-document read — so email can never safely live there. `firestore.rules`
restricts `users/{uid}/private/{docId}` to the owner only; the functions
above read it fine regardless since the Admin SDK bypasses rules.

## Moderation

Report buttons live on profile and project pages (`ReportButton.tsx`);
reports go to the `reports` collection, write-only for regular users.

To review reports, a user's uid needs to be listed in `config/moderators`
(`{ uids: string[] }`) — there's no Admin SDK/custom-claims setup yet, so add
uids by hand in the Firebase console. Anyone listed gets a shield icon in
the navbar linking to `/moderation/reports`, where they can view open
reports and mark them reviewed. `firestore.rules` gates all of this — the
UI only shows/hides the link, it isn't the actual security boundary.

## Automated content screening

`functions/src/contentFilter.ts` screens new project posts and "looking for
team" posts through [Groq](https://console.groq.com), running
`openai/gpt-oss-safeguard-20b` — a "bring your own policy" safety-reasoning
model — the moment they're created, before anyone has to notice and click
"Report". It's a first line of defense, not a replacement for human
moderation: anything it flags lands straight in the existing
`/moderation/reports` queue, exactly like a user-submitted report, so
there's no new UI to learn.

Team chat is deliberately **not** screened — it's between teammates who
already got accepted onto a project, exchanging contact info there is
normal, and the existing rate limits (`rateLimitMessages` in
`moderation.ts`) already cover spam/abuse volume in chat. This only runs on
public-facing posts: project descriptions and "looking for team" posts.

Unlike a fixed-taxonomy classifier, the model reads a policy written in
plain English (in `contentFilter.ts`) and reasons about whether the content
violates it. The policy calls out `sexual_minors`, `self_harm`,
`harassment`, `violence`, and `scam` explicitly — `sexual_minors` matters
more than generic profanity on a platform whose entire userbase is 14–18
year olds.

Setup:

1. Create a free account at console.groq.com, generate an API key.
2. Set it as a Cloud Functions secret:
   ```bash
   firebase functions:secrets:set GROQ_API_KEY
   ```
3. Deploy: `cd functions && npm install && npm run deploy`.

Until step 2 is done, screening is skipped (logged as a warning) rather than
blocking posts — same safe-to-deploy-unconfigured pattern as email.

**What this doesn't do:** it can't verify anyone's age or identity, doesn't
look at chat at all, and won't reliably catch a patient bad actor who never
trips the policy. Read `docs/MODERATION_GUIDE.md` — a human still needs to
actually check the queue.

## Abuse prevention

Client-side throttling (chat send cooldown, duplicate-application checks)
covers the well-behaved-app case. The real backstop against someone hitting
the Firestore API directly is `functions/src/moderation.ts` — three Cloud
Functions (`rateLimitMessages`, `rateLimitReports`, `rateLimitApplications`)
that count how many docs a user created in a trailing window and delete the
newest one if they're over the limit. Firestore security rules can't express
"how many docs has this user created recently," so this genuinely needs
Cloud Functions — deploy with `cd functions && npm install && npm run
deploy` once you're on the Blaze plan. The composite indexes these functions
need are already in `firestore.indexes.json`.

Applications also got a hard, race-free duplicate-prevention fix: instead of
`addDoc()` + a client-side existence check, `useApplyToRole` now writes to
the deterministic id `${projectId}_${roleId}_${applicantId}`, and
`firestore.rules` only allows a `create` at that path (a second attempt is
an `update`, which the rule rejects). No race window, no reliance on the
client behaving.

## Design tokens

White / gray (`surface-*` in `tailwind.config.js`) / indigo (`accent-*`)
accent scale, Inter everywhere, `rounded-xl`/`2xl` corners, soft/card shadows
instead of borders-as-decoration, no blur anywhere. Motion is opacity +
transform only (see `tailwind.config.js` keyframes and the two Framer Motion
usages in `Modal.tsx`), and `prefers-reduced-motion` is respected globally in
`index.css`.