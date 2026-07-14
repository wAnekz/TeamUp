import type { Timestamp } from 'firebase/firestore';

// ---------- Shared enums / constants ----------

export const SKILLS = [
  'Frontend',
  'Backend',
  'Flutter',
  'React',
  'Python',
  'Java',
  'UI/UX',
  'Design',
  'Video Editing',
  'Presentation',
  'Marketing',
  'Analytics',
] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const INTERESTS = [
  'AI',
  'Robotics',
  'Olympiads',
  'Startups',
  'Web',
  'Mobile',
  'Cybersecurity',
  'Game Development',
] as const;
export type Interest = (typeof INTERESTS)[number];

export type Grade = 9 | 10 | 11 | 12;

export type ActivityStatus = 'online' | 'today' | 'stale';

// ---------- User ----------

export interface UserSkill {
  skill: Skill;
  level: SkillLevel;
}

export interface UserContacts {
  telegram?: string | null;
  github?: string | null;
  portfolio?: string | null;
  instagram?: string | null;
}

export interface UserProfile {
  uid: string;
  // NOT stored on the users/{uid} doc itself (that doc is readable by any
  // signed-in user — see firestore.rules). Lives in users/{uid}/private/info
  // instead, and AuthContext.loadProfile merges it into this object
  // in-memory, only for the signed-in user's own profile. Never present on
  // profiles fetched via usePublicProfile.
  email?: string | null;
  name: string;
  age: number;
  grade: Grade;
  city: string;
  school?: string | null;
  avatarUrl?: string;
  bio?: string; // max 200 chars
  skills: UserSkill[];
  interests: Interest[];
  contacts?: UserContacts;
  verified: boolean;
  isStudentConfirmed: boolean; // derived from age/grade at profile completion, no longer a UI checkbox
  profileComplete: boolean;
  // Set only via the moderator "Ban user" action (see firestore.rules —
  // moderators may update only this + updatedAt on someone else's doc).
  // Blocks app access client-side (see guards.tsx); doesn't touch Firebase
  // Auth itself, so it's reversible by flipping the field back, no console
  // needed either way.
  banned?: boolean;
  lastActiveAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------- Projects ----------

export type ProjectType = 'event' | 'ongoing';
// Stored status. 'draft' is NOT stored here — it's represented by isDraft=true
// on the project doc instead. 'full' is never stored either; it's derived at
// display time from teamSizeCurrent >= teamSizeMax. See utils/projectStatus.ts
// for the single source of truth that turns (isDraft, status, slots) into the
// 5 statuses a user actually sees: Draft / Open / Full / Closed / Archived.
export type ProjectStatus = 'open' | 'closed' | 'archived';
export type ProjectDisplayStatus = 'draft' | 'open' | 'full' | 'closed' | 'archived';

export interface ProjectRole {
  id: string;
  title: string;
  requiredSkills: Skill[];
  slotsTotal: number;
  slotsFilled: number;
}

export interface Project {
  id: string;
  title: string;
  description: string; // max 500 chars
  additionalRequirements?: string; // free-text, max 300 chars — anything the tag pickers don't cover
  type: ProjectType;
  deadline?: Timestamp; // required if type === 'event'
  roles: ProjectRole[];
  teamSizeMax: number; // sum of slotsTotal, denormalized for display
  teamSizeCurrent: number; // sum of slotsFilled + owner
  interests: Interest[];
  skills: Skill[]; // denormalized union of roles[].requiredSkills, kept in sync by useCreateProject/useUpdateProject — powers the feed's skills filter
  members: string[]; // uids of accepted applicants, denormalized by useReviewApplication — powers team-chat access without querying `applications` from security rules
  status: ProjectStatus;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  isDraft: boolean;
  viewCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------- Team chat ----------

export interface ChatMessage {
  id: string;
  projectId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  text: string; // max 1000 chars
  createdAt: Timestamp;
}

// ---------- Saved projects (favorites) ----------

export interface SavedProject {
  id: string; // `${uid}_${projectId}`
  uid: string;
  projectId: string;
  createdAt: Timestamp;
}

// ---------- Applications ----------

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface Application {
  id: string;
  projectId: string;
  projectTitle: string;
  roleId: string;
  roleTitle: string;
  applicantId: string;
  applicantName: string;
  applicantAvatarUrl?: string;
  ownerId: string; // project owner, denormalized for security rules + queries
  message: string; // max 200 chars
  status: ApplicationStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------- Looking for team ----------

export interface LookingForTeamPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string | null;
  description: string;
  skills: UserSkill[];
  desiredCompetitions: string[];
  interests: Interest[];
  active: boolean;
  availableUntil?: Timestamp; // optional self-declared "still looking" deadline
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------- Reports ----------

export type ReportTargetType = 'profile' | 'project';

export interface Feedback {
  id: string;
  reporterId: string;
  message: string;
  page: string;
  createdAt: Timestamp;
}

export interface Report {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reporterId: string;
  reason: string;
  createdAt: Timestamp;
  status: 'open' | 'reviewed';
}

// ---------- Filters (feed) ----------

export interface ProjectFilters {
  skills: Skill[];
  interests: Interest[];
  type?: ProjectType;
  deadlineBefore?: Date;
  onlyOpenSlots?: boolean;
  search?: string;
}

// ---------- Feed view mode ----------

export type FeedView = 'all' | 'recommended' | 'saved';