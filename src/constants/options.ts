import { SKILLS, INTERESTS, type Skill, type SkillLevel, type Interest } from '@/types';

export const SKILL_OPTIONS: Skill[] = [...SKILLS];
export const SKILL_LEVEL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
export const INTEREST_OPTIONS: Interest[] = [...INTERESTS];

export const GRADE_OPTIONS = [9, 10, 11, 12] as const;

export const PROJECT_TYPE_OPTIONS = [
  { value: 'event', label: 'Event (has a deadline)' },
  { value: 'ongoing', label: 'Ongoing' },
] as const;
