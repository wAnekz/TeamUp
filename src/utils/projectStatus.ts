import type { Application, Project, ProjectDisplayStatus, ProjectRole } from '@/types';
import { isDeadlinePassed } from './dates';

/**
 * Single source of truth for turning (isDraft, status, slots) into the 5
 * statuses a user actually sees. 'full' and 'draft' are never stored in
 * Firestore — they're derived here so we never have to keep them in sync.
 */
export function getDisplayStatus(project: Project): ProjectDisplayStatus {
  if (project.isDraft) return 'draft';
  if (project.status === 'archived') return 'archived';
  if (project.status === 'closed') return 'closed';
  const isFull = project.teamSizeCurrent + 1 >= project.teamSizeMax;
  return isFull ? 'full' : 'open';
}

export const DISPLAY_STATUS_LABEL: Record<ProjectDisplayStatus, string> = {
  draft: 'Draft',
  open: 'Open',
  full: 'Full',
  closed: 'Closed',
  archived: 'Archived',
};

export const DISPLAY_STATUS_TONE: Record<ProjectDisplayStatus, 'accent' | 'gray' | 'green' | 'red' | 'yellow'> = {
  draft: 'gray',
  open: 'green',
  full: 'yellow',
  closed: 'red',
  archived: 'gray',
};

/** teamSizeCurrent only counts accepted role slots; the owner is always +1. */
export function formatMembers(project: Project): string {
  return `${project.teamSizeCurrent + 1}/${project.teamSizeMax}`;
}

/**
 * Instead of just disabling the Apply button, tell the user exactly why they
 * can't apply. Returns null when applying is allowed.
 */
export function getApplyBlockedReason(
  project: Project,
  role: ProjectRole,
  isOwner: boolean,
  alreadyApplied: boolean,
): string | null {
  if (isOwner) return "Author's project";
  if (alreadyApplied) return 'Already applied';
  if (project.status === 'archived') return 'Recruitment closed';
  if (project.status === 'closed') return 'Recruitment closed';
  if (project.deadline && isDeadlinePassed(project.deadline)) return 'Deadline passed';
  if (role.slotsFilled >= role.slotsTotal) return 'Project full';
  return null;
}

export function hasAppliedToRole(applications: Application[] | undefined, roleId: string, uid: string | undefined): boolean {
  if (!applications || !uid) return false;
  return applications.some((a) => a.roleId === roleId && a.applicantId === uid);
}
