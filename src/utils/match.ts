import type { Project, UserProfile } from '@/types';

export interface MatchResult {
  score: number; // 0-100
  matchedSkills: string[];
  matchedInterests: string[];
}

/**
 * Simple, explainable matching — no ML, just weighted overlap. Skills count
 * for more than interests because a required skill is a harder constraint
 * for a team than a shared topic of interest.
 */
export function computeMatch(profile: UserProfile, project: Project): MatchResult {
  const projectSkills = new Set(project.roles.flatMap((r) => r.requiredSkills));
  const profileSkillNames = new Set(profile.skills.map((s) => s.skill));

  const matchedSkills = [...projectSkills].filter((s) => profileSkillNames.has(s));
  const matchedInterests = project.interests.filter((i) => profile.interests.includes(i));

  const skillPool = projectSkills.size;
  const interestPool = project.interests.length;

  // Weight skills 2x interests. If a category has nothing to match against,
  // it's excluded from the denominator instead of counting against the score.
  const skillWeight = skillPool > 0 ? 2 : 0;
  const interestWeight = interestPool > 0 ? 1 : 0;
  const totalWeight = skillWeight + interestWeight;

  if (totalWeight === 0) return { score: 0, matchedSkills, matchedInterests };

  const skillFraction = skillPool > 0 ? matchedSkills.length / skillPool : 0;
  const interestFraction = interestPool > 0 ? matchedInterests.length / interestPool : 0;

  const score = Math.round(((skillFraction * skillWeight + interestFraction * interestWeight) / totalWeight) * 100);

  return { score, matchedSkills, matchedInterests };
}

/** Top N projects for a profile, sorted by match score, score > 0 only. */
export function rankByMatch(profile: UserProfile, projects: Project[], limit = 3) {
  return projects
    .map((project) => ({ project, match: computeMatch(profile, project) }))
    .filter((r) => r.match.score > 0)
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, limit);
}
