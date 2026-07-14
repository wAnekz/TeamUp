import { z } from 'zod';
import { SKILLS, SKILL_LEVELS, INTERESTS } from '@/types';

export const profileSchema = z
  .object({
    name: z.string().min(2, 'Name is too short').max(60),
    age: z.coerce.number().int().min(13, 'Must be 13+').max(19, 'This platform is for high schoolers'),
    grade: z.coerce.number().int().min(9).max(12),
    city: z.string().min(2, 'City is required').max(60),
    school: z.string().max(100).optional().or(z.literal('')),
    bio: z.string().max(200, 'Max 200 characters').optional().or(z.literal('')),
    skills: z
      .array(z.object({ skill: z.enum(SKILLS), level: z.enum(SKILL_LEVELS) }))
      .min(1, 'Add at least one skill'),
    interests: z.array(z.enum(INTERESTS)).min(1, 'Pick at least one interest'),
    telegram: z.string().max(60).optional().or(z.literal('')),
    github: z.string().max(60).optional().or(z.literal('')),
    portfolio: z.string().max(120).optional().or(z.literal('')),
    instagram: z.string().max(60).optional().or(z.literal('')),
  })
  .refine((data) => !!(data.telegram || data.github || data.portfolio || data.instagram), {
    // Contacts are how teammates actually reach you once an application is
    // accepted — without at least one, acceptance has nowhere to go.
    message: 'Add at least one way to reach you (Telegram, GitHub, portfolio, or Instagram)',
    path: ['telegram'],
  });
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const roleSchema = z.object({
  title: z.string().min(2).max(60),
  requiredSkills: z.array(z.enum(SKILLS)).min(1, 'Pick at least one skill'),
  slotsTotal: z.coerce.number().int().min(1).max(20),
});

export const projectSchema = z
  .object({
    title: z.string().min(3, 'Title is too short').max(80),
    description: z.string().min(10, 'Tell people more about the project').max(500),
    additionalRequirements: z.string().max(300, 'Max 300 characters').optional().or(z.literal('')),
    type: z.enum(['event', 'ongoing']),
    deadline: z.string().optional(),
    interests: z.array(z.enum(INTERESTS)).min(1, 'Pick at least one interest'),
    roles: z.array(roleSchema).min(1, 'Add at least one role'),
  })
  .refine((data) => data.type !== 'event' || !!data.deadline, {
    message: 'Deadline is required for events',
    path: ['deadline'],
  });
export type ProjectFormValues = z.infer<typeof projectSchema>;

export const applicationSchema = z.object({
  message: z.string().min(1, 'Say something about why you fit').max(200),
});
export type ApplicationFormValues = z.infer<typeof applicationSchema>;

export const lookingForTeamSchema = z.object({
  description: z.string().min(10).max(400),
  skills: z
    .array(z.object({ skill: z.enum(SKILLS), level: z.enum(SKILL_LEVELS) }))
    .min(1, 'Add at least one skill'),
  desiredCompetitions: z.array(z.string().min(1)).min(1, 'Add at least one competition you want to join'),
  interests: z.array(z.enum(INTERESTS)).min(1),
  availableUntil: z.string().optional(),
});
export type LookingForTeamFormValues = z.infer<typeof lookingForTeamSchema>;

export const authSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'At least 6 characters'),
});
export type AuthFormValues = z.infer<typeof authSchema>;
