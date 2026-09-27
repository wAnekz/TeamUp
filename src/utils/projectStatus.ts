import type { Application, Project, ProjectDisplayStatus, ProjectRole } from '@/types';
import { isDeadlinePassed } from './dates';
import { getT } from '@/i18n';

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

/** Status label in the current UI language. */
export function displayStatusLabel(status: ProjectDisplayStatus): string {
  return getT().status[status];
}

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
  const t = getT().applyBlocked;
  if (isOwner) return t.own;
  if (alreadyApplied) return t.applied;
  if (project.status === 'archived' || project.status === 'closed') return t.closed;
  if (project.deadline && isDeadlinePassed(project.deadline)) return t.deadline;
  if (role.slotsFilled >= role.slotsTotal) return t.full;
  return null;
}

export function hasAppliedToRole(applications: Application[] | undefined, roleId: string, uid: string | undefined): boolean {
  if (!applications || !uid) return false;
  return applications.some((a) => a.roleId === roleId && a.applicantId === uid);
}
