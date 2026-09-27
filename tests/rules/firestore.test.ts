import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

/**
 * Security rules for a platform of 14–18 year olds. Each test is one
 * concrete thing that must never be possible (or must keep working).
 * Run with `npm run test:rules` — needs the Firestore + Storage emulators.
 */

let env: RulesTestEnvironment;

const guest = () => env.unauthenticatedContext().firestore();
const as = (uid: string, verified = true) => env.authenticatedContext(uid, { email_verified: verified }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-teamup',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const user = (uid: string) => ({ uid, name: uid, profileComplete: true, skills: [], interests: [], verified: false });
    await setDoc(doc(db, 'users/alice'), { ...user('alice'), contacts: { telegram: '@alice' } });
    await setDoc(doc(db, 'users/bob'), user('bob'));
    await setDoc(doc(db, 'users/newbie'), { uid: 'newbie', profileComplete: false });
    await setDoc(doc(db, 'users/alice/private/info'), { email: 'alice@example.com' });
    await setDoc(doc(db, 'users/alice/private/telegram'), { chatId: 111, digest: true });
    await setDoc(doc(db, 'config/moderators'), { uids: ['mod'] });
    await setDoc(doc(db, 'users/mod'), user('mod'));
    await setDoc(doc(db, 'projects/p1'), {
      title: 'P1',
      authorId: 'alice',
      authorName: 'Alice',
      isDraft: false,
      status: 'open',
      members: [],
      viewCount: 0,
      roles: [],
    });
    await setDoc(doc(db, 'publicProjects/p1'), { title: 'P1', isDraft: false, status: 'open' });
    await setDoc(doc(db, 'events/e1'), { title: 'Hackathon', isActive: true });
    await setDoc(doc(db, 'stats/schools'), { schools: [] });
    await setDoc(doc(db, 'schools/nis__almaty'), { name: 'NIS', key: 'nis', verified: true });
    await setDoc(doc(db, 'gamification/alice'), { uid: 'alice', xp: 100 });
    await setDoc(doc(db, 'xpEvents/accepted_x'), { uid: 'alice', points: 50 });
    await setDoc(doc(db, 'invites/CODE123456'), { projectId: 'p1', ownerId: 'alice', active: true });
    await setDoc(doc(db, 'eventDrafts/d1'), { title: 'Draft', status: 'pending' });
    await setDoc(doc(db, 'lookingForTeam/l1'), { authorId: 'alice', active: true });
  });
});

describe('guests (signed out)', () => {
  it('can browse the public, anonymized data', async () => {
    await assertSucceeds(getDoc(doc(guest(), 'publicProjects/p1')));
    await assertSucceeds(getDocs(collection(guest(), 'publicProjects')));
    await assertSucceeds(getDoc(doc(guest(), 'events/e1')));
    await assertSucceeds(getDoc(doc(guest(), 'stats/schools')));
    await assertSucceeds(getDocs(collection(guest(), 'schools')));
    await assertSucceeds(getDoc(doc(guest(), 'invites/CODE123456')));
  });

  it('cannot see any student’s identity or activity', async () => {
    await assertFails(getDoc(doc(guest(), 'users/alice')));
    await assertFails(getDoc(doc(guest(), 'projects/p1'))); // has author name
    await assertFails(getDocs(collection(guest(), 'lookingForTeam')));
    await assertFails(getDocs(collection(guest(), 'eventSubscriptions')));
    await assertFails(getDoc(doc(guest(), 'gamification/alice')));
  });

  it('cannot enumerate invite codes', async () => {
    await assertFails(getDocs(collection(guest(), 'invites')));
  });
});

describe('private data', () => {
  it('email and Telegram link are owner-only', async () => {
    await assertFails(getDoc(doc(as('bob'), 'users/alice/private/info')));
    await assertFails(getDoc(doc(as('bob'), 'users/alice/private/telegram')));
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice/private/info')));
  });

  it('a user cannot point the bot at someone else’s chat', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice/private/telegram'), { chatId: 999 }));
    await assertFails(setDoc(doc(as('bob'), 'users/bob/private/telegram'), { chatId: 111 }));
    // …but can disconnect and toggle the digest.
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice/private/telegram'), { chatId: null }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice/private/telegram'), { digest: false }));
  });

  it('nobody edits someone else’s profile; only moderators may ban', async () => {
    await assertFails(updateDoc(doc(as('bob'), 'users/alice'), { name: 'hacked' }));
    await assertFails(updateDoc(doc(as('bob'), 'users/alice'), { banned: true }));
    await assertSucceeds(updateDoc(doc(as('mod'), 'users/alice'), { banned: true, updatedAt: serverTimestamp() }));
  });
});

describe('XP cannot be self-granted', () => {
  it('gamification and the XP ledger are server-only', async () => {
    await assertFails(setDoc(doc(as('bob'), 'gamification/bob'), { uid: 'bob', xp: 99999 }));
    await assertFails(updateDoc(doc(as('alice'), 'gamification/alice'), { xp: 99999 }));
    await assertFails(setDoc(doc(as('bob'), 'xpEvents/fake'), { uid: 'bob', points: 1000 }));
  });

  it('you can read only your own ledger', async () => {
    await assertSucceeds(getDocs(query(collection(as('alice'), 'xpEvents'), where('uid', '==', 'alice'))));
    await assertFails(getDocs(query(collection(as('bob'), 'xpEvents'), where('uid', '==', 'alice'))));
  });

  it('a student cannot forge a team-confirmed achievement', async () => {
    const base = { uid: 'bob', title: 'Won everything', type: 'hackathon' };
    await assertFails(setDoc(doc(as('bob'), 'users/bob/achievements/team_p1'), { ...base, fromProjectId: 'p1' }));
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob/achievements/a1'), base));
    await assertFails(setDoc(doc(as('bob'), 'users/alice/achievements/a1'), { ...base, uid: 'alice' }));
  });
});

describe('teams and applications', () => {
  it('only the owner edits a project; anyone signed in may bump views', async () => {
    await assertFails(updateDoc(doc(as('bob'), 'projects/p1'), { title: 'mine now' }));
    await assertFails(updateDoc(doc(as('bob'), 'projects/p1'), { members: ['bob'] }));
    await assertSucceeds(updateDoc(doc(as('bob'), 'projects/p1'), { viewCount: 1 }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'projects/p1'), { result: { text: '1st', eventName: 'X' } }));
  });

  it('an application cannot pretend to come from an invite link', async () => {
    const app = {
      projectId: 'p1',
      roleId: 'r1',
      applicantId: 'bob',
      ownerId: 'alice',
      status: 'pending',
      message: 'hi',
    };
    await assertFails(setDoc(doc(as('bob'), 'applications/p1_r1_bob'), { ...app, viaInvite: true }));
    await assertSucceeds(setDoc(doc(as('bob'), 'applications/p1_r1_bob'), app));
  });

  it('applying needs a verified email and a finished profile', async () => {
    const app = { projectId: 'p1', roleId: 'r1', ownerId: 'alice', status: 'pending', message: 'hi' };
    await assertFails(setDoc(doc(as('bob', false), 'applications/p1_r1_bob'), { ...app, applicantId: 'bob' }));
    await assertFails(setDoc(doc(as('newbie'), 'applications/p1_r1_newbie'), { ...app, applicantId: 'newbie' }));
  });

  it('only a project owner can create an invite for it', async () => {
    const invite = { projectId: 'p1', ownerId: 'bob', active: true };
    await assertFails(setDoc(doc(as('bob'), 'invites/BOBCODE1234'), invite));
    await assertSucceeds(setDoc(doc(as('alice'), 'invites/ALICECODE12'), { ...invite, ownerId: 'alice' }));
    await assertFails(updateDoc(doc(as('bob'), 'invites/CODE123456'), { active: false }));
  });
});

describe('events', () => {
  it('interest subscriptions are yours only and can’t fake reminder state', async () => {
    const sub = { uid: 'bob', eventId: 'e1', userName: 'Bob', userAvatarUrl: null, lookingForTeam: true, createdAt: serverTimestamp() };
    await assertFails(setDoc(doc(as('bob'), 'eventSubscriptions/alice_e1'), { ...sub, uid: 'alice' }));
    await assertFails(setDoc(doc(as('bob'), 'eventSubscriptions/wrongid'), sub));
    await assertSucceeds(setDoc(doc(as('bob'), 'eventSubscriptions/bob_e1'), sub));
    await assertFails(updateDoc(doc(as('bob'), 'eventSubscriptions/bob_e1'), { remindersSent: ['reg7'] }));
    await assertSucceeds(updateDoc(doc(as('bob'), 'eventSubscriptions/bob_e1'), { lookingForTeam: false }));
    await assertFails(deleteDoc(doc(as('alice'), 'eventSubscriptions/bob_e1')));
  });

  it('students cannot publish events or see the drafts queue; moderators can', async () => {
    await assertFails(setDoc(doc(as('bob'), 'events/e2'), { title: 'Fake', isActive: true }));
    await assertFails(getDoc(doc(as('bob'), 'eventDrafts/d1')));
    await assertSucceeds(getDoc(doc(as('mod'), 'eventDrafts/d1')));
    await assertSucceeds(updateDoc(doc(as('mod'), 'eventDrafts/d1'), { status: 'approved' }));
    await assertFails(updateDoc(doc(as('mod'), 'eventDrafts/d1'), { title: 'renamed' }));
  });
});

describe('schools directory', () => {
  const school = (createdBy: string) => ({
    name: 'Школа №1',
    city: 'Алматы',
    key: 'школа 1',
    aliases: [],
    verified: false,
    createdBy,
    createdAt: serverTimestamp(),
  });

  it('students can add a school, even mid-onboarding', async () => {
    await assertSucceeds(setDoc(doc(as('newbie'), 'schools/s1'), school('newbie')));
  });

  it('but cannot mark it verified, impersonate the creator, or overwrite one', async () => {
    await assertFails(setDoc(doc(as('bob'), 'schools/s2'), { ...school('bob'), verified: true }));
    await assertFails(setDoc(doc(as('bob'), 'schools/s3'), school('alice')));
    await assertFails(setDoc(doc(as('bob'), 'schools/nis__almaty'), school('bob')));
  });
});

describe('telegram link tokens', () => {
  it('can be created for yourself only and never read back', async () => {
    const token = 'x'.repeat(24);
    await assertSucceeds(setDoc(doc(as('bob'), `telegramLinks/${token}`), { uid: 'bob', createdAt: serverTimestamp() }));
    await assertFails(setDoc(doc(as('bob'), `telegramLinks/${'y'.repeat(24)}`), { uid: 'alice', createdAt: serverTimestamp() }));
    await assertFails(getDoc(doc(as('bob'), `telegramLinks/${token}`)));
  });
});

describe('storage: achievement files', () => {
  const pdf = new Uint8Array([37, 80, 68, 70]);

  it('students upload only into their own folder, images/PDF only', async () => {
    const bob = env.authenticatedContext('bob').storage();
    await assertSucceeds(uploadBytes(ref(bob, 'achievements/bob/diploma.pdf'), pdf, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(bob, 'achievements/alice/diploma.pdf'), pdf, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(bob, 'achievements/bob/run.exe'), pdf, { contentType: 'application/octet-stream' }));
  });

  it('rejects files over 10MB', async () => {
    const bob = env.authenticatedContext('bob').storage();
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    await assertFails(uploadBytes(ref(bob, 'achievements/bob/huge.pdf'), big, { contentType: 'application/pdf' }));
  });

  it('guests cannot upload', async () => {
    const g = env.unauthenticatedContext().storage();
    await assertFails(uploadBytes(ref(g, 'achievements/bob/x.pdf'), pdf, { contentType: 'application/pdf' }));
  });
});
