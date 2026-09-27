import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import { computeMatch, suggestTeammates } from '@/utils/match';
import { getApplyBlockedReason, getDisplayStatus } from '@/utils/projectStatus';
import { currentSeason, daysLeftInSeason, levelInfo, XP_RULE_POINTS, BADGE_IDS } from '@/constants/gamification';
import { ruPlural } from '@/i18n/plural';
import { levelFor, LEVELS as SERVER_LEVELS, seasonId, XP } from '../../functions/src/gamification';
import { pickNudge } from '../../functions/src/reengagement';
import { devpostEndDate } from '../../functions/src/eventCollector';
import { LEVELS } from '@/constants/gamification';
import type { LookingForTeamPost, Project, ProjectRole, UserProfile } from '@/types';

const ts = (d: string) => Timestamp.fromDate(new Date(d));

function project(over: Partial<Project> = {}): Project {
  const roles: ProjectRole[] = over.roles ?? [
    { id: 'r1', title: 'Backend', requiredSkills: ['Python', 'SQL & Databases'], slotsTotal: 2, slotsFilled: 0 },
    { id: 'r2', title: 'Design', requiredSkills: ['Figma'], slotsTotal: 1, slotsFilled: 1 },
  ];
  return {
    id: 'p1',
    title: 'Test',
    description: 'd',
    type: 'ongoing',
    roles,
    teamSizeMax: roles.reduce((s, r) => s + r.slotsTotal, 0) + 1,
    teamSizeCurrent: roles.reduce((s, r) => s + r.slotsFilled, 0),
    interests: ['AI'],
    skills: [],
    members: [],
    status: 'open',
    authorId: 'owner',
    authorName: 'Owner',
    isDraft: false,
    viewCount: 0,
    createdAt: ts('2026-09-01'),
    updatedAt: ts('2026-09-01'),
    ...over,
  };
}

describe('project status', () => {
  it('derives full / draft / closed', () => {
    expect(getDisplayStatus(project())).toBe('open');
    expect(getDisplayStatus(project({ isDraft: true }))).toBe('draft');
    expect(getDisplayStatus(project({ status: 'closed' }))).toBe('closed');
    const full = project({
      roles: [{ id: 'r', title: 'x', requiredSkills: ['Python'], slotsTotal: 1, slotsFilled: 1 }],
    });
    expect(getDisplayStatus(full)).toBe('full');
  });

  it('explains why you cannot apply', () => {
    const p = project();
    expect(getApplyBlockedReason(p, p.roles[0], false, false)).toBeNull();
    expect(getApplyBlockedReason(p, p.roles[1], false, false)).not.toBeNull(); // role full
    expect(getApplyBlockedReason(p, p.roles[0], true, false)).not.toBeNull(); // own project
    expect(getApplyBlockedReason(project({ type: 'event', deadline: ts('2020-01-01') }), p.roles[0], false, false)).not.toBeNull();
  });
});

describe('matching', () => {
  const profile = { skills: [{ skill: 'Python', level: 'advanced' }], interests: ['AI'] } as unknown as UserProfile;

  it('weights skills over interests', () => {
    const m = computeMatch(profile, project());
    expect(m.matchedSkills).toEqual(['Python']);
    expect(m.score).toBeGreaterThan(0);
    expect(m.score).toBeLessThanOrEqual(100);
  });

  it('suggests only people who fit an open role, excluding the team', () => {
    const post = (authorId: string, skills: string[]) =>
      ({ id: authorId, authorId, authorName: authorId, description: '', skills: skills.map((skill) => ({ skill, level: 'beginner' })), interests: [], desiredCompetitions: [], active: true }) as unknown as LookingForTeamPost;
    const posts = [post('a', ['Python']), post('b', ['Figma']), post('owner', ['Python']), post('c', ['Cooking'])];
    const res = suggestTeammates(project(), posts, new Set(['owner']));
    // Figma role is full, "Cooking" fits nothing, the owner is excluded.
    expect(res.map((r) => r.post.authorId)).toEqual(['a']);
    expect(res[0].role.id).toBe('r1');
  });
});

describe('gamification', () => {
  it('client and server agree on level thresholds', () => {
    expect(LEVELS.map((l) => l.minXp)).toEqual(SERVER_LEVELS.map((l) => l.minXp));
    for (const xp of [0, 99, 100, 299, 300, 699, 700, 1499, 1500, 99999]) {
      expect(levelInfo(xp).current.level).toBe(levelFor(xp));
    }
  });

  it('shows the XP rules the server actually pays', () => {
    expect([...XP_RULE_POINTS].sort()).toEqual(
      [XP.acceptedOntoTeam, XP.achievementWithFile, XP.teamComplete, XP.firstMemberRecruited, XP.friendJoinedViaInvite, XP.eventInterestDaily].sort(),
    );
  });

  it('computes level progress', () => {
    const info = levelInfo(350);
    expect(info.current.level).toBe(3);
    expect(info.next?.level).toBe(4);
    expect(info.progress).toBeCloseTo(0.125);
    expect(levelInfo(5000).next).toBeNull();
  });

  it('switches seasons at Almaty midnight on both sides', () => {
    const before = new Date('2026-09-30T18:59:00Z');
    const after = new Date('2026-09-30T19:01:00Z');
    expect(seasonId(before)).toBe('2026-Q3');
    expect(seasonId(after)).toBe('2026-Q4');
    expect(currentSeason(before)).toBe(seasonId(before));
    expect(currentSeason(after)).toBe(seasonId(after));
    expect(daysLeftInSeason(new Date('2026-09-26T12:00:00Z'))).toBe(5);
  });

  it('has an emoji and translation for every badge', async () => {
    const { ru } = await import('@/i18n/ru');
    const { kz } = await import('@/i18n/kz');
    for (const id of BADGE_IDS) {
      expect(ru.gamification.badgeNames[id]).toHaveLength(2);
      expect(kz.gamification.badgeNames[id]).toHaveLength(2);
    }
  });
});

describe('re-engagement nudges', () => {
  const base = { firstName: 'Аня', pendingApplications: 0, matchingProjects: [], newEvents: [] };

  it('sends nothing when there is no concrete reason', () => {
    expect(pickNudge(base)).toBeNull();
  });

  it('puts waiting applicants first — someone else is blocked', () => {
    const n = pickNudge({ ...base, pendingApplications: 2, newEvents: [{ title: 'X' }] });
    expect(n?.kind).toBe('applications');
    expect(n?.body).toContain('2 заявки');
  });

  it('then matching teams, then new events', () => {
    expect(pickNudge({ ...base, matchingProjects: [{ title: 'AI', skill: 'Python' }], newEvents: [{ title: 'X' }] })?.kind).toBe('projects');
    expect(pickNudge({ ...base, newEvents: [{ title: 'X' }, { title: 'Y' }] })?.kind).toBe('events');
  });

  it('uses correct Russian plurals', () => {
    expect(pickNudge({ ...base, pendingApplications: 1 })?.body).toContain('1 заявка');
    expect(pickNudge({ ...base, pendingApplications: 5 })?.body).toContain('5 заявок');
    expect(pickNudge({ ...base, pendingApplications: 21 })?.body).toContain('21 заявка');
  });
});

describe('ruPlural', () => {
  it.each([
    [1, 'заявка'],
    [2, 'заявки'],
    [5, 'заявок'],
    [11, 'заявок'],
    [12, 'заявок'],
    [21, 'заявка'],
    [22, 'заявки'],
    [111, 'заявок'],
  ])('%i → %s', (n, word) => {
    expect(ruPlural(n, 'заявка', 'заявки', 'заявок')).toBe(word);
  });
});

describe('Devpost date parsing', () => {
  it('reads the submission end date from both range formats', () => {
    expect(devpostEndDate('Jul 31 - Oct 01, 2026')?.toDate().toISOString().slice(0, 10)).toBe('2026-10-01');
    expect(devpostEndDate('Sep 10 - 12, 2026')?.toDate().toISOString().slice(0, 10)).toBe('2026-09-12');
    expect(devpostEndDate(undefined)).toBeNull();
  });
});
