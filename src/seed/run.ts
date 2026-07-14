/**
 * Seeds Firestore with sample data for local development.
 * Run with: npm run seed
 *
 * Requires the same VITE_FIREBASE_* env vars as the app (loaded from .env).
 * Safe to run against the Firestore emulator or a dedicated dev project —
 * do NOT run against production.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import 'dotenv/config';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
});
const db = getFirestore(app);

const now = Timestamp.now();
const inDays = (n: number) => Timestamp.fromDate(new Date(Date.now() + n * 86400000));

const users = [
  {
    uid: 'seed_dana',
    name: 'Дана Ахметова',
    age: 17,
    grade: 11,
    city: 'Almaty',
    school: 'NIS Almaty',
    bio: 'Frontend dev, into design systems and hackathons.',
    skills: [{ skill: 'React', level: 'advanced' }, { skill: 'UI/UX', level: 'intermediate' }],
    interests: ['Web', 'Startups'],
    verified: true,
    isStudentConfirmed: true,
    profileComplete: true,
  },
  {
    uid: 'seed_arman',
    name: 'Арман Сериков',
    age: 16,
    grade: 10,
    city: 'Astana',
    bio: 'Python & ML enthusiast, olympiad regular.',
    skills: [{ skill: 'Python', level: 'advanced' }, { skill: 'Backend', level: 'intermediate' }],
    interests: ['AI', 'Olympiads'],
    verified: false,
    isStudentConfirmed: true,
    profileComplete: true,
  },
  {
    uid: 'seed_aisha',
    name: 'Айша Нурланова',
    age: 17,
    grade: 11,
    city: 'Almaty',
    bio: 'Flutter developer, shipped 2 apps to Play Store.',
    skills: [{ skill: 'Flutter', level: 'advanced' }],
    interests: ['Mobile', 'Startups'],
    verified: true,
    isStudentConfirmed: true,
    profileComplete: true,
  },
];

const projects = [
  {
    id: 'seed_project_hackathon',
    title: 'AI Study Buddy — Almaty AI Hackathon',
    description:
      'Building an AI tutor that generates practice problems from a photo of your homework. Looking for a backend dev and a designer before the hackathon deadline.',
    type: 'event',
    deadline: inDays(21),
    roles: [
      { id: 'role_1', title: 'Backend Developer', requiredSkills: ['Backend', 'Python'], slotsTotal: 2, slotsFilled: 0 },
      { id: 'role_2', title: 'UI/UX Designer', requiredSkills: ['UI/UX', 'Design'], slotsTotal: 1, slotsFilled: 1 },
    ],
    teamSizeMax: 4,
    teamSizeCurrent: 2,
    interests: ['AI', 'Web'],
    skills: ['Backend', 'Python', 'UI/UX', 'Design'],
    status: 'open',
    authorId: 'seed_dana',
    authorName: 'Дана Ахметова',
    isDraft: false,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'seed_project_ongoing',
    title: 'Campus Events App',
    description:
      'An ongoing project to build a mobile app listing school and city events for teens. No fixed deadline — join whenever.',
    type: 'ongoing',
    roles: [
      { id: 'role_1', title: 'Flutter Developer', requiredSkills: ['Flutter'], slotsTotal: 2, slotsFilled: 1 },
      { id: 'role_2', title: 'Marketing', requiredSkills: ['Marketing', 'Presentation'], slotsTotal: 1, slotsFilled: 0 },
    ],
    teamSizeMax: 4,
    teamSizeCurrent: 2,
    interests: ['Mobile', 'Startups'],
    skills: ['Flutter', 'Marketing', 'Presentation'],
    status: 'open',
    authorId: 'seed_aisha',
    authorName: 'Айша Нурланова',
    isDraft: false,
    viewCount: 0,
    createdAt: now,
    updatedAt: now,
  },
];

async function seed() {
  for (const u of users) {
    await setDoc(doc(collection(db, 'users'), u.uid), {
      ...u,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    });
    console.log('Seeded user', u.name);
  }
  for (const p of projects) {
    const { id, ...data } = p;
    await setDoc(doc(collection(db, 'projects'), id), data);
    console.log('Seeded project', p.title);
  }
  console.log('Done.');
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
