import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import almatySchools from './data/schools-almaty.json';

/**
 * schools/{id} directory behind the SchoolPicker. Two jobs, both run from
 * computeSchoolStats before ranking:
 *   1. ensureSeedSchools — a starter set of well-known schools, so the
 *      first students already find something when they search.
 *   2. linkFreeTextSchools — profiles from before the picker only have a
 *      typed `school` string; give each a schoolId (creating the directory
 *      entry if needed) so they count on the leaderboard.
 *
 * normalizeSchool / schoolDocId must match src/utils/schoolSearch.ts.
 */

export function normalizeSchool(name: string | null | undefined) {
  return (name ?? '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'.,№#()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function schoolDocId(name: string, city: string | null | undefined) {
  const part = (s: string) => normalizeSchool(s).replace(/[\s/]+/g, '-').slice(0, 90);
  return `${part(name)}__${part(city ?? '') || 'kz'}`;
}

// Every state and private school in Almaty (city education register,
// open-almaty.kz, Oct 2026). Also loaded by the client's SchoolPicker.
const ALMATY_SCHOOLS: { name: string; aliases: string[] }[] = almatySchools;

// Other well-known schools; everything else students add themselves.
const SEED: { name: string; city: string; aliases: string[] }[] = [
  { name: 'НИШ ФМН г. Алматы', city: 'Алматы', aliases: ['NIS PhM Almaty', 'НЗМ ФМБ Алматы', 'Назарбаев Интеллектуальная школа физмат Алматы'] },
  { name: 'НИШ ХБН г. Алматы', city: 'Алматы', aliases: ['NIS ChB Almaty', 'НЗМ ХББ Алматы', 'Назарбаев Интеллектуальная школа химбио Алматы'] },
  { name: 'РФМШ Алматы', city: 'Алматы', aliases: ['RFMSh', 'Республиканская физико-математическая школа'] },
  { name: 'Haileybury Almaty', city: 'Алматы', aliases: ['Хейлибери Алматы'] },
  { name: 'Miras International School Almaty', city: 'Алматы', aliases: ['Мирас', 'Miras'] },
  { name: 'Tamos Education', city: 'Алматы', aliases: ['Тамос'] },
  { name: 'НИШ ФМН г. Астана', city: 'Астана', aliases: ['NIS PhM Astana', 'НЗМ ФМБ Астана'] },
  { name: 'Haileybury Astana', city: 'Астана', aliases: ['Хейлибери Астана'] },
  { name: 'Miras International School Astana', city: 'Астана', aliases: ['Мирас Астана'] },
];

export async function ensureSeedSchools() {
  const db = getFirestore();
  const all = [...SEED, ...ALMATY_SCHOOLS.map((s) => ({ ...s, city: 'Алматы' }))];
  let created = 0;
  let verified = 0;
  for (let i = 0; i < all.length; i += 100) {
    const chunk = all.slice(i, i + 100);
    const refs = chunk.map((s) => db.doc(`schools/${schoolDocId(s.name, s.city)}`));
    const snaps = await db.getAll(...refs);
    const batch = db.batch();
    snaps.forEach((snap, k) => {
      const s = chunk[k];
      if (!snap.exists) {
        batch.set(refs[k], {
          name: s.name,
          city: s.city,
          key: normalizeSchool(s.name),
          aliases: s.aliases,
          verified: true,
          createdBy: 'system',
          createdAt: FieldValue.serverTimestamp(),
        });
        created++;
      } else if (snap.data()?.verified !== true) {
        // A student added it before it was on the official list.
        batch.update(refs[k], { verified: true, aliases: s.aliases });
        verified++;
      }
    });
    await batch.commit();
  }
  if (created || verified) logger.info(`ensureSeedSchools: added ${created}, verified ${verified} school(s)`);
}

export async function linkFreeTextSchools() {
  const db = getFirestore();
  const [users, schools] = await Promise.all([
    db.collection('users').where('profileComplete', '==', true).select('school', 'schoolId', 'city').get(),
    db.collection('schools').select('key', 'aliases', 'city').get(),
  ]);

  // Exact (normalized) match on name or alias; same city preferred.
  const byKey = new Map<string, { id: string; city: string }[]>();
  for (const s of schools.docs) {
    const d = s.data() as { key: string; aliases?: string[]; city?: string };
    for (const k of [d.key, ...(d.aliases ?? []).map(normalizeSchool)]) {
      byKey.set(k, [...(byKey.get(k) ?? []), { id: s.id, city: normalizeSchool(d.city) }]);
    }
  }

  let linked = 0;
  for (const u of users.docs) {
    const { school, schoolId, city } = u.data() as { school?: string | null; schoolId?: string | null; city?: string };
    if (schoolId || !school?.trim()) continue;
    const key = normalizeSchool(school);
    const candidates = byKey.get(key) ?? [];
    let id = (candidates.find((c) => c.city === normalizeSchool(city)) ?? candidates[0])?.id;
    if (!id) {
      id = schoolDocId(school, city);
      await db.doc(`schools/${id}`).set(
        {
          name: school.trim(),
          city: city?.trim() || null,
          key,
          aliases: [],
          verified: false,
          createdBy: u.id,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      byKey.set(key, [{ id, city: normalizeSchool(city) }]);
    }
    await u.ref.update({ schoolId: id });
    linked++;
  }
  if (linked) logger.info(`linkFreeTextSchools: linked ${linked} profile(s)`);
}
