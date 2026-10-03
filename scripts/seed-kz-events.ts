/**
 * Seeds the Kazakhstani events from scripts/kz-events.ts into Firestore.
 *
 *   npm run seed:kz            # dry run: prints what would be written
 *   npm run seed:kz -- --write # writes (merge) to events/{id}
 *
 * Writing signs in as a moderator (firestore.rules let only moderators write
 * events), with SEED_MOD_EMAIL / SEED_MOD_PASSWORD from the environment and
 * the VITE_FIREBASE_* values from .env. Nothing secret lives in this file.
 */
import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getFirestore, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { KZ_EVENTS } from './kz-events';

const write = process.argv.includes('--write');
const day = (d: string) => Timestamp.fromDate(new Date(`${d}T12:00:00+05:00`));

if (KZ_EVENTS.length === 0) {
  console.log('scripts/kz-events.ts is empty: no official dates for this school year yet.');
  process.exit(0);
}

for (const e of KZ_EVENTS) {
  console.log(`${e.date} | ${e.title} | ${e.format}${e.location ? `, ${e.location}` : ''} | ${e.sourceUrl}`);
}
if (!write) {
  console.log(`\nDry run: ${KZ_EVENTS.length} event(s). Re-run with --write to save them.`);
  process.exit(0);
}

const email = process.env.SEED_MOD_EMAIL;
const password = process.env.SEED_MOD_PASSWORD;
if (!email || !password) {
  console.error('Set SEED_MOD_EMAIL and SEED_MOD_PASSWORD (a moderator account) to write.');
  process.exit(1);
}

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
});
await signInWithEmailAndPassword(getAuth(app), email, password);
const db = getFirestore(app);

for (const e of KZ_EVENTS) {
  await setDoc(
    doc(db, 'events', e.id),
    {
      title: e.title,
      description: e.description.ru,
      descriptionI18n: e.description,
      competitionTag: e.title,
      date: day(e.date),
      registrationDeadline: e.registrationDeadline ? day(e.registrationDeadline) : null,
      format: e.format,
      location: e.location ?? null,
      organizer: e.organizer,
      registrationUrl: e.registrationUrl ?? null,
      sourceUrl: e.sourceUrl,
      country: 'KZ',
      hidden: false,
      isActive: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  console.log(`saved events/${e.id}`);
}
process.exit(0);
