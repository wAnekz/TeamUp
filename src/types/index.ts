import type { Timestamp } from 'firebase/firestore';

// ---------- Shared enums / constants ----------

// Grouped by category purely for display (see SKILL_CATEGORIES in
// constants/options.ts) — this flat list is still the single source of
// truth for the Skill union and what's actually stored on documents.
// The original 12 values (Frontend, Backend, Flutter, React, Python, Java,
// UI/UX, Design, Video Editing, Presentation, Marketing, Analytics) are
// kept exactly as they were so existing profiles/projects/posts that
// already reference them don't break.
export const SKILLS = [
  // Programming & Development
  'Frontend',
  'Backend',
  'React',
  'Vue',
  'Flutter',
  'React Native',
  'Python',
  'Java',
  'JavaScript',
  'TypeScript',
  'C++',
  'C#',
  'Swift',
  'Kotlin',
  'Go',
  'PHP',
  'SQL & Databases',
  'Node.js',
  'HTML/CSS',
  'API Development',
  'DevOps',
  'Cloud Computing',
  'Cybersecurity',
  'Machine Learning',
  'Data Science',
  'Data Analysis',
  'Blockchain',
  'AR/VR Development',
  // Design & Creative
  'UI/UX',
  'Design',
  'Graphic Design',
  'Figma',
  'Video Editing',
  'Photography',
  'Animation',
  '3D Modeling',
  'Illustration',
  'Branding',
  // Content & Communication
  'Presentation',
  'Copywriting',
  'Public Speaking',
  'Content Writing',
  'Social Media',
  'Translation',
  // Business & Management
  'Marketing',
  'Analytics',
  'Project Management',
  'Sales',
  'Finance',
  'Event Organizing',
  'Fundraising',
  // Research & Science
  'Research',
  'Statistics',
] as const;
export type Skill = (typeof SKILLS)[number];

export const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

// Grouped by category purely for display (see INTEREST_CATEGORIES in
// constants/options.ts) — this flat list is still the single source of
// truth for the Interest union and what's actually stored on documents.
// The original 8 values (AI, Robotics, Olympiads, Startups, Web, Mobile,
// Cybersecurity, Game Development) are kept exactly as they were so
// existing profiles/projects/posts that already reference them don't break.
export const INTERESTS = [
  // Technology & Programming
  'AI',
  'Web',
  'Mobile',
  'Cybersecurity',
  'Game Development',
  'Data Science',
  'Machine Learning',
  'Blockchain',
  'Cloud Computing',
  'DevOps',
  'AR/VR',
  'IoT & Hardware',
  // Robotics & Engineering
  'Robotics',
  'Electronics',
  'Mechanical Engineering',
  '3D Printing',
  // Design & Creative
  'UI/UX Design',
  'Graphic Design',
  'Animation',
  '3D Modeling',
  'Video Editing',
  'Photography',
  'Branding',
  'Illustration',
  // Business & Entrepreneurship
  'Startups',
  'Marketing',
  'Finance',
  'Product Management',
  'E-commerce',
  'Sales',
  'Investing',
  // Science & Research
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Environmental Science',
  'Neuroscience',
  'Space & Astronomy',
  // Academic Competitions
  'Olympiads',
  'Hackathons',
  'Case Competitions',
  'Model UN',
  'Science Fairs',
  'Debate',
  // Social & Community
  'Volunteering',
  'Education',
  'Mentorship',
  'Non-profit',
  'Social Impact',
  'Public Speaking',
  // Arts & Media
  'Music',
  'Writing',
  'Filmmaking',
  'Journalism',
  'Podcasting',
  'Theatre',
  // Sports & Games
  'Esports',
  'Chess',
  'Football',
  'Basketball',
  'Fitness',
  'Outdoor Adventures',
  // Languages & Culture
  'Language Exchange',
  'Travel',
  'Cultural Exchange',
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
  // signed-in user with a confirmed email — see firestore.rules). Lives in users/{uid}/private/info
  // instead, and AuthContext.loadProfile merges it into this object
  // in-memory, only for the signed-in user's own profile. Never present on
  // profiles fetched via usePublicProfile.
  email?: string | null;
  name: string;
  age: number;
  grade: Grade;
  city: string;
  school?: string | null; // display name, copied from schools/{schoolId}
  // Picked from the shared schools directory (SchoolPicker) so the same
  // school isn't spelled five ways on the leaderboard. Older profiles only
  // have free-text `school`; functions/src/schools.ts links those daily.
  schoolId?: string | null;
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

export interface ProjectResult {
  text: string; // "2nd place", "Finalist", "Participated"
  eventName: string;
  date?: Timestamp | null;
  link?: string | null;
  recordedAt?: Timestamp;
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
  // uid → role title, written alongside `members` on accept (and by the
  // joinByInvite function). Lets a public profile show "Backend @ Project X"
  // without reading `applications`, which only the applicant/owner can.
  // Optional: projects accepted before this field existed just omit the role.
  memberRoles?: Record<string, string>;
  // Set when the owner generates a team invite link — see invites/{code}.
  inviteCode?: string | null;
  // Recorded by the team lead after the event; functions/src/teamResults.ts
  // copies it into every member's achievements as a team-confirmed entry.
  result?: ProjectResult | null;
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

// ---------- Events (real-world hackathons/olympiads TeamUp promotes at) ----------
// Curated content, not user-generated — created/edited by moderators only
// (see firestore.rules). The "Find a team" button on the detail page links
// into the existing lookingForTeam feed pre-filtered/pre-tagged by
// `competitionTag`, which matches the free-text `desiredCompetitions` field
// people already fill in on their own posts — no new matching system needed.
export type EventFormat = 'online' | 'offline' | 'hybrid';

export interface EventItem {
  id: string;
  title: string;
  description: string; // longer blurb shown on the detail page, max 800 chars
  competitionTag: string; // matches LookingForTeamPost.desiredCompetitions entries, e.g. "AI Hackathon 2026"
  date: Timestamp;
  format?: EventFormat; // online / offline / hybrid — optional so old events without it still render
  location?: string; // venue/city for offline & hybrid events; irrelevant when format === 'online'
  organizer?: string | null; // who's running it, e.g. "NIS Almaty" or "Astana Hub"
  registrationUrl?: string | null; // external sign-up link, if the event is run outside TeamUp
  registrationDeadline?: Timestamp | null; // can be earlier than `date` itself
  prizePool?: string | null; // free text, e.g. "500 000 KZT" or "Internship offers" — amounts/formats vary too much for a number field
  teamSizeHint?: string | null; // free text, e.g. "Teams of 2-4" — the event's own rules, distinct from any TeamUp project's roles
  imageUrl?: string | null;
  // Prep material moderators attach: past winners, guides, rules docs.
  resources?: EventResource[];
  // Denormalized by the onEventSubscription* functions — events are
  // moderator-write-only, so clients can't bump this themselves.
  interestedCount?: number;
  // Where an auto-collected event came from (see functions/src/eventCollector.ts).
  sourceUrl?: string | null;
  // Original text from the source (Devpost tagline / Telegram post), kept
  // next to the short RU/KZ/EN blurbs written for students.
  sourceText?: string | null;
  descriptionI18n?: DescriptionI18n | null;
  // 'KZ' for events in or for Kazakhstan; null for worldwide online ones.
  country?: string | null;
  // Failed the audience check (adults-only etc.) or hidden by a moderator:
  // left out of every list except for moderators.
  hidden?: boolean;
  audience?: string | null; // why it passed/failed the check, e.g. "ages 13+"
  isActive: boolean; // moderators can hide a past event without deleting it
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DescriptionI18n {
  ru: string;
  kz: string;
  en: string;
}

export interface EventResource {
  title: string;
  url: string;
}

// eventSubscriptions/{uid}_{eventId} — "I'm interested" on an event. Doubles
// as the public "who's going" list on the event page (name/avatar are
// denormalized for that) and as the recipient list for deadline reminders.
export interface EventSubscription {
  id: string;
  uid: string;
  eventId: string;
  userName: string;
  userAvatarUrl?: string | null;
  lookingForTeam: boolean;
  createdAt: Timestamp;
}

// eventDrafts/{id} — written only by the collectEvents scheduled function,
// reviewed on /moderation/events. Approving copies it into `events`.
export type EventDraftStatus = 'pending' | 'approved' | 'rejected';

export interface EventDraft {
  id: string;
  source: 'devpost' | 'telegram' | 'website';
  sourceUrl: string;
  sourceText?: string | null;
  title: string;
  description: string;
  date?: Timestamp | null;
  registrationDeadline?: Timestamp | null;
  format?: EventFormat;
  location?: string | null;
  organizer?: string | null;
  registrationUrl?: string | null;
  prizePool?: string | null;
  imageUrl?: string | null;
  forSchoolStudents?: boolean | null;
  descriptionI18n?: DescriptionI18n | null;
  country?: string | null;
  status: EventDraftStatus;
  createdAt: Timestamp;
}

// ---------- Achievements (portfolio) ----------

export type AchievementType = 'hackathon' | 'olympiad' | 'certificate' | 'project' | 'other';

// users/{uid}/achievements/{id}. `fileUrl` points at Firebase Storage
// (achievements/{uid}/...) — a scan of a diploma, certificate PDF, photo.
export interface Achievement {
  id: string;
  uid: string;
  title: string;
  type: AchievementType;
  result?: string | null; // "1st place", "Finalist", "Gold medal"
  date?: Timestamp | null;
  description?: string | null;
  link?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  storagePath?: string | null;
  // Present on entries created from a team result (id "team_<projectId>"):
  // confirmed by the team lead, not self-reported — so not editable here.
  fromProjectId?: string | null;
  role?: string | null;
  createdAt: Timestamp;
}

// ---------- Invites ----------

// invites/{code} — one per project, created by the owner. Anyone with the
// code can join an open role through the joinByInvite callable function.
export interface Invite {
  code: string;
  projectId: string;
  projectTitle: string;
  ownerId: string;
  active: boolean;
  createdAt: Timestamp;
}

// ---------- Schools directory ----------

// schools/{id}. Seeded with well-known schools, then grown by students
// adding their own (verified: false). id = schoolDocId(name, city).
export interface SchoolItem {
  id: string;
  name: string;
  city?: string | null;
  key: string; // normalizeSchool(name)
  aliases?: string[];
  verified?: boolean;
}

// ---------- School leaderboard ----------

export interface SchoolStat {
  key: string; // schools/{id} doc id, matched against profile.schoolId
  name: string; // most common spelling
  city?: string | null;
  students: number;
  active: number; // students who earned XP this season
  score: number; // sum of students' season XP
  totalXp: number;
}

export interface SchoolStats {
  season: string; // "2026-Q3"
  schools: SchoolStat[];
  updatedAt: Timestamp;
}

export interface SeasonChampion {
  season: string;
  key: string;
  name: string;
  city?: string | null;
  score: number;
}

// ---------- Gamification ----------

// gamification/{uid} — written only by Cloud Functions (functions/src/gamification.ts).
// Missing entirely for someone who hasn't earned anything yet.
export interface Gamification {
  uid: string;
  xp?: number;
  level?: number;
  season?: string;
  seasonXp?: number;
  counters?: Partial<Record<string, number>>;
  badges?: string[]; // ids from BADGES, plus "champion:<season>"
}

// xpEvents/{key} — the ledger behind the XP total, one per grant.
export interface XpEvent {
  id: string;
  uid: string;
  reason: string; // English log line; UI renders a translated one from the id prefix + subject
  subject?: string | null;
  points: number;
  season: string;
  newBadges?: string[];
  createdAt: Timestamp;
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