import type { UserProfile } from '@/types';

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
  const checks: { label: string; done: boolean }[] = [
    { label: 'Add a photo', done: !!profile.avatarUrl },
    { label: 'Write a short bio', done: !!profile.bio && profile.bio.trim().length > 0 },
    { label: 'Add your school', done: !!profile.school },
    { label: 'Add at least 3 skills', done: profile.skills.length >= 3 },
    { label: 'Add at least 3 interests', done: profile.interests.length >= 3 },
    {
      label: 'Add a contact link (Telegram, GitHub...)',
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
