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
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

/**
 * Security rules for a platform of 14–18 year olds. Each test is one
 * concrete thing that must never be possible (or must keep working).
 * Run with `npm run test:rules` — needs the Firestore + Storage emulators.
 */

let env: RulesTestEnvironment;

const guest = () => env.unauthenticatedContext().firestore();
const as = (uid: string, verified = true) =>
  env.authenticatedContext(uid, { email_verified: verified, email: `${uid}@example.com` }).firestore();

// The emulators can reset the first connection right after they report
// "ready" (seen on macOS), so probe both services until they answer.
async function waitForEmulator(host: string, label: string) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://${host}/`);
      if (res.status >= 200 && res.status < 600) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} emulator did not become ready on ${host}`);
}

beforeAll(async () => {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';

  await Promise.all([
    waitForEmulator(process.env.FIRESTORE_EMULATOR_HOST, 'Firestore'),
    waitForEmulator(process.env.FIREBASE_STORAGE_EMULATOR_HOST, 'Storage'),
  ]);

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
    await setDoc(doc(db, 'users/alice'), user('alice'));
    await setDoc(doc(db, 'users/legacy'), { ...user('legacy'), contacts: { telegram: '@old' } });
    await setDoc(doc(db, 'users/bob'), user('bob'));
    await setDoc(doc(db, 'users/newbie'), { uid: 'newbie', profileComplete: false });
    await setDoc(doc(db, 'users/mallory'), { ...user('mallory'), banned: true });
    await setDoc(doc(db, 'projects/pm'), { title: 'PM', authorId: 'mallory', isDraft: false, status: 'open', members: [], roles: [] });
    await setDoc(doc(db, 'users/alice/private/info'), { email: 'alice@example.com' });
    await setDoc(doc(db, 'users/alice/private/telegram'), { chatId: 111, digest: true });
    await setDoc(doc(db, 'users/alice/private/contacts'), { contacts: { telegram: '@alice' }, visibleTo: ['carol'] });
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

  it('a banned student cannot lift their own ban', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'users/bob'), { banned: true }));
    await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { banned: false }));
    await assertFails(setDoc(doc(as('bob'), 'users/bob'), { banned: false }, { merge: true }));
    await assertSucceeds(updateDoc(doc(as('bob'), 'users/bob'), { name: 'Bob B' }));
    await assertFails(setDoc(doc(as('fresh'), 'users/fresh'), { uid: 'fresh', banned: false }));
    await assertSucceeds(setDoc(doc(as('fresh'), 'users/fresh'), { uid: 'fresh' }));
  });
});

describe('contacts', () => {
  it('are readable only by the student and their teammates', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice/private/contacts')));
    await assertSucceeds(getDoc(doc(as('carol'), 'users/alice/private/contacts'))); // shares a team
    await assertFails(getDoc(doc(as('bob'), 'users/alice/private/contacts')));
    await assertFails(getDoc(doc(guest(), 'users/alice/private/contacts')));
  });

  it('a student cannot grant themselves or others access', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice/private/contacts'), { visibleTo: ['bob'] }));
    await assertFails(setDoc(doc(as('bob'), 'users/bob/private/contacts'), { contacts: {}, visibleTo: ['x'] }));
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob/private/contacts'), { contacts: { telegram: '@bob' } }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'users/alice/private/contacts'), { contacts: { telegram: '@new' } }));
  });

  it('can no longer be put on the public profile, only removed from it', async () => {
    await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { contacts: { telegram: '@bob' } }));
    await assertSucceeds(updateDoc(doc(as('legacy'), 'users/legacy'), { contacts: deleteField() }));
    await assertSucceeds(updateDoc(doc(as('legacy'), 'users/legacy'), { name: 'Still works' }));
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

describe('team membership (it unlocks contacts)', () => {
  const app = { projectId: 'p1', roleId: 'r1', applicantId: 'bob', ownerId: 'alice', status: 'pending', message: 'hi' };

  it('a new project cannot come with a prefilled team', async () => {
    const p = { title: 'P2', authorId: 'bob', status: 'open', isDraft: false };
    await assertFails(setDoc(doc(as('bob'), 'projects/p2'), { ...p, members: ['alice'] }));
    await assertSucceeds(setDoc(doc(as('bob'), 'projects/p2'), { ...p, members: [] }));
  });

  it('only the acceptApplication function changes the team, never the client', async () => {
    await assertSucceeds(setDoc(doc(as('bob'), 'applications/p1_r1_bob'), app));
    const db = as('alice');
    const batch = writeBatch(db);
    batch.update(doc(db, 'applications/p1_r1_bob'), { status: 'accepted', updatedAt: serverTimestamp() });
    batch.update(doc(db, 'projects/p1'), { members: arrayUnion('bob'), acceptedApplicationId: 'p1_r1_bob' });
    await assertFails(batch.commit());
    await assertFails(updateDoc(doc(as('alice'), 'applications/p1_r1_bob'), { status: 'accepted' }));
    await assertFails(updateDoc(doc(as('alice'), 'projects/p1'), { members: ['bob'] }));
    await assertFails(updateDoc(doc(as('alice'), 'projects/p1'), { memberRoles: { bob: 'Dev' } }));
  });

  it('the owner cannot remove members client-side or hand the project over', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'projects/p1'), { members: ['bob', 'carol'] }));
    await assertFails(updateDoc(doc(as('alice'), 'projects/p1'), { members: ['carol'] }));
    await assertFails(updateDoc(doc(as('alice'), 'projects/p1'), { authorId: 'bob' }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'projects/p1'), { title: 'Renamed' }));
  });
});

describe('applications and posts keep their owners', () => {
  const app = { projectId: 'p1', roleId: 'r1', applicantId: 'bob', ownerId: 'alice', status: 'pending', message: 'hi' };

  it('an application must go to the real project owner', async () => {
    await assertFails(setDoc(doc(as('bob'), 'applications/p1_r1_bob'), { ...app, ownerId: 'carol' }));
  });

  it('the owner may only reject client-side', async () => {
    await assertSucceeds(setDoc(doc(as('bob'), 'applications/p1_r1_bob'), app));
    await assertFails(updateDoc(doc(as('alice'), 'applications/p1_r1_bob'), { ownerId: 'carol' }));
    await assertFails(updateDoc(doc(as('alice'), 'applications/p1_r1_bob'), { message: 'edited' }));
    await assertFails(updateDoc(doc(as('alice'), 'applications/p1_r1_bob'), { status: 'whatever' }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'applications/p1_r1_bob'), { status: 'rejected', updatedAt: serverTimestamp() }));
  });

  it('a looking-for-team post cannot be handed to someone else', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'lookingForTeam/l1'), { authorId: 'bob' }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'lookingForTeam/l1'), { active: false }));
  });
});

describe('moderation-owned profile fields', () => {
  it('a student cannot verify, confirm or complete their own profile', async () => {
    await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { verified: true }));
    await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { isStudentConfirmed: true }));
    await assertFails(updateDoc(doc(as('newbie'), 'users/newbie'), { profileComplete: true }));
    await assertFails(setDoc(doc(as('newbie'), 'users/newbie'), { profileComplete: true }, { merge: true }));
    await assertSucceeds(updateDoc(doc(as('newbie'), 'users/newbie'), { name: 'New Kid', city: 'Almaty' }));
  });

  it('a new profile starts unverified and incomplete', async () => {
    const base = { uid: 'fresh', name: '', skills: [], interests: [] };
    await assertFails(setDoc(doc(as('fresh'), 'users/fresh'), { ...base, profileComplete: true }));
    await assertFails(setDoc(doc(as('fresh'), 'users/fresh'), { ...base, verified: true }));
    await assertFails(setDoc(doc(as('fresh'), 'users/fresh'), { ...base, isStudentConfirmed: true }));
    await assertSucceeds(
      setDoc(doc(as('fresh'), 'users/fresh'), { ...base, verified: false, isStudentConfirmed: false, profileComplete: false }),
    );
  });
});

describe('banned students cannot post anything', () => {
  it('no projects, applications, chat messages or team posts', async () => {
    await assertFails(setDoc(doc(as('mallory'), 'projects/pm2'), { title: 'x', authorId: 'mallory', status: 'open', members: [] }));
    await assertFails(
      setDoc(doc(as('mallory'), 'applications/p1_r1_mallory'), {
        projectId: 'p1', roleId: 'r1', applicantId: 'mallory', ownerId: 'alice', status: 'pending', message: 'hi',
      }),
    );
    await assertFails(
      setDoc(doc(as('mallory'), 'projects/pm/messages/m1'), { projectId: 'pm', authorId: 'mallory', text: 'hello' }),
    );
    await assertFails(setDoc(doc(as('mallory'), 'lookingForTeam/lm'), { authorId: 'mallory', active: true }));
    // …while the same writes work for someone in good standing.
    await assertSucceeds(setDoc(doc(as('alice'), 'projects/p1/messages/m1'), { projectId: 'p1', authorId: 'alice', text: 'hello' }));
    await assertSucceeds(setDoc(doc(as('bob'), 'lookingForTeam/lb'), { authorId: 'bob', active: true }));
  });

  it('and cannot edit what they already published', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'lookingForTeam/lm'), { authorId: 'mallory', active: false }));
    await assertFails(updateDoc(doc(as('mallory'), 'projects/pm'), { title: 'spam' }));
    await assertFails(updateDoc(doc(as('mallory'), 'lookingForTeam/lm'), { active: true }));
  });
});

describe('links are http(s) only', () => {
  const evil = 'javascript:alert(1)';

  it('achievements', async () => {
    const base = { uid: 'bob', title: 'Won', type: 'hackathon' };
    await assertFails(setDoc(doc(as('bob'), 'users/bob/achievements/a1'), { ...base, link: evil }));
    await assertFails(setDoc(doc(as('bob'), 'users/bob/achievements/a2'), { ...base, fileUrl: evil }));
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob/achievements/a3'), { ...base, link: 'https://devpost.com/x', fileUrl: null }));
  });

  it('team results', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'projects/p1'), { result: { text: '1st', eventName: 'X', link: evil } }));
    await assertSucceeds(updateDoc(doc(as('alice'), 'projects/p1'), { result: { text: '1st', eventName: 'X', link: 'https://x.kz' } }));
  });

  it('portfolio contact and avatar', async () => {
    await assertFails(setDoc(doc(as('bob'), 'users/bob/private/contacts'), { contacts: { portfolio: evil } }));
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob/private/contacts'), { contacts: { portfolio: 'https://bob.dev' } }));
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob/private/contacts'), { contacts: { portfolio: 'Https://bob.dev' } }));
    await assertFails(updateDoc(doc(as('bob'), 'users/bob'), { avatarUrl: evil }));
    await assertSucceeds(updateDoc(doc(as('bob'), 'users/bob'), { avatarUrl: 'https://firebasestorage.googleapis.com/a.png' }));
  });
});

describe('identity on public lists and emails', () => {
  const sub = { uid: 'bob', eventId: 'e1', lookingForTeam: true, createdAt: serverTimestamp() };

  it('an interest subscription shows your own name and avatar only', async () => {
    await assertFails(setDoc(doc(as('bob'), 'eventSubscriptions/bob_e1'), { ...sub, userName: 'alice', userAvatarUrl: null }));
    await assertFails(
      setDoc(doc(as('bob'), 'eventSubscriptions/bob_e1'), { ...sub, userName: 'bob', userAvatarUrl: 'https://evil.example/x.png' }),
    );
    await assertSucceeds(setDoc(doc(as('bob'), 'eventSubscriptions/bob_e1'), { ...sub, userName: 'bob', userAvatarUrl: null }));
  });

  it('notification email is your sign-in email', async () => {
    await assertFails(setDoc(doc(as('bob'), 'users/bob/private/info'), { email: 'victim@example.com' }));
    await assertSucceeds(setDoc(doc(as('bob'), 'users/bob/private/info'), { email: 'bob@example.com' }));
    await assertFails(updateDoc(doc(as('alice'), 'users/alice/private/info'), { email: 'victim@example.com' }));
  });
});

describe('events', () => {
  it('interest subscriptions are yours only and can’t fake reminder state', async () => {
    const sub = { uid: 'bob', eventId: 'e1', userName: 'bob', userAvatarUrl: null, lookingForTeam: true, createdAt: serverTimestamp() };
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
