import { z } from 'zod';
import { SKILLS, SKILL_LEVELS, INTERESTS } from '@/types';
import { normalizeHttpUrl } from '@/utils/safeUrl';

// Messages are keys of `validation` in src/i18n/*.ts — form fields translate
// them (see translateError), so the schemas stay language-agnostic.

export const profileSchema = z
  .object({
    name: z.string().min(2, 'nameShort').max(60),
    age: z.coerce.number().int().min(13, 'age13').max(19, 'ageMax'),
    grade: z.coerce.number().int().min(9).max(12),
    city: z.string().min(2, 'cityRequired').max(60),
    school: z.string().max(100).optional().or(z.literal('')),
    schoolId: z.string().max(200).optional().or(z.literal('')),
    bio: z.string().max(200, 'max200').optional().or(z.literal('')),
    skills: z
      .array(z.object({ skill: z.enum(SKILLS), level: z.enum(SKILL_LEVELS) }))
      .min(1, 'oneSkill'),
    interests: z.array(z.enum(INTERESTS)).min(1, 'oneInterest'),
    telegram: z.string().max(60).optional().or(z.literal('')),
    github: z.string().max(60).optional().or(z.literal('')),
    portfolio: z
      .string()
      .max(120)
      // "mysite.dev" is fine (https:// is added on save); any other scheme is not.
      .refine((v) => !v.trim() || normalizeHttpUrl(v) !== null, 'linkHttps')
      .optional()
      .or(z.literal('')),
    instagram: z.string().max(60).optional().or(z.literal('')),
  })
  .refine((data) => !!(data.telegram || data.github || data.portfolio || data.instagram), {
    // Contacts are how teammates actually reach you once an application is
    // accepted — without at least one, acceptance has nowhere to go.
    message: 'oneContact',
    path: ['telegram'],
  });
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const roleSchema = z.object({
  title: z.string().min(2, 'roleTitle').max(60, 'roleTitle'),
  requiredSkills: z.array(z.enum(SKILLS)).min(1, 'Pick at least one skill'),
  slotsTotal: z.coerce.number().int().min(1, 'slots').max(20, 'slots'),
});

export const projectSchema = z
  .object({
    title: z.string().min(3, 'titleShort').max(80),
    description: z.string().min(10, 'descShort').max(500),
    additionalRequirements: z.string().max(300, 'max300').optional().or(z.literal('')),
    type: z.enum(['event', 'ongoing']),
    deadline: z.string().optional(),
    interests: z.array(z.enum(INTERESTS)).min(1, 'oneInterest'),
    roles: z.array(roleSchema).min(1, 'oneRole'),
  })
  .refine((data) => data.type !== 'event' || !!data.deadline, {
    message: 'deadlineRequired',
    path: ['deadline'],
  });
export type ProjectFormValues = z.infer<typeof projectSchema>;

export const applicationSchema = z.object({
  message: z.string().min(1, 'applyMessage').max(200),
});
export type ApplicationFormValues = z.infer<typeof applicationSchema>;

export const lookingForTeamSchema = z.object({
  description: z.string().min(10, 'lftDesc').max(400),
  skills: z
    .array(z.object({ skill: z.enum(SKILLS), level: z.enum(SKILL_LEVELS) }))
    .min(1, 'oneSkill'),
  desiredCompetitions: z.array(z.string().min(1)).min(1, 'oneCompetition'),
  interests: z.array(z.enum(INTERESTS)).min(1),
  availableUntil: z.string().optional(),
});
export type LookingForTeamFormValues = z.infer<typeof lookingForTeamSchema>;

export const authSchema = z.object({
  email: z.string().email('email'),
  password: z.string().min(6, 'password'),
});
export type AuthFormValues = z.infer<typeof authSchema>;
