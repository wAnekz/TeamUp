import type { UserProfile } from '@/types';
import { getT } from '@/i18n';

export interface ProfileCompleteness {
  percent: number;
  missing: string[];
}

// Weighted checklist of the *optional* richness fields — everything here
// is already skippable at signup (CompleteProfile only hard-requires name/
// age/grade/city), so this is purely a nudge, not a gate. Percent is meant
// to visibly move after one or two quick edits, not demand a perfect
// profile.
export function computeProfileCompleteness(profile: UserProfile): ProfileCompleteness {
  const t = getT().profile.completeness;
  const checks: { label: string; done: boolean }[] = [
    { label: t.photo, done: !!profile.avatarUrl },
    { label: t.bio, done: !!profile.bio && profile.bio.trim().length > 0 },
    { label: t.school, done: !!profile.school },
    { label: t.skills, done: profile.skills.length >= 3 },
    { label: t.interests, done: profile.interests.length >= 3 },
    {
      label: t.contact,
      done: !!(
        profile.contacts?.telegram ||
        profile.contacts?.github ||
        profile.contacts?.portfolio ||
        profile.contacts?.instagram
      ),
    },
  ];
  const done = checks.filter((c) => c.done).length;
  const percent = Math.round((done / checks.length) * 100);
  const missing = checks.filter((c) => !c.done).map((c) => c.label);
  return { percent, missing };
}
