import { SKILLS, INTERESTS, type Skill, type SkillLevel, type Interest, type EventFormat } from '@/types';

export const SKILL_OPTIONS: Skill[] = [...SKILLS];
export const SKILL_LEVEL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
export const INTEREST_OPTIONS: Interest[] = [...INTERESTS];

// Same values as SKILLS, just grouped for display in CategorizedTagPicker.
// If a category's list and SKILLS ever drift, TS will flag it — each
// entry here has to be a valid Skill.
export const SKILL_CATEGORIES: Record<string, Skill[]> = {
  'Programming & Development': [
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
  ],
  'Design & Creative': [
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
  ],
  'Content & Communication': [
    'Presentation',
    'Copywriting',
    'Public Speaking',
    'Content Writing',
    'Social Media',
    'Translation',
  ],
  'Business & Management': ['Marketing', 'Analytics', 'Project Management', 'Sales', 'Finance', 'Event Organizing', 'Fundraising'],
  'Research & Science': ['Research', 'Statistics'],
};

export const EVENT_FORMAT_OPTIONS: { value: EventFormat; label: string }[] = [
  { value: 'offline', label: 'Offline' },
  { value: 'online', label: 'Online' },
  { value: 'hybrid', label: 'Hybrid' },
];

// Same values as INTERESTS, just grouped for display in CategorizedTagPicker.
// If a category's list and INTERESTS ever drift, TS will flag it — each
// entry here has to be a valid Interest.
export const INTEREST_CATEGORIES: Record<string, Interest[]> = {
  'Technology & Programming': [
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
  ],
  'Robotics & Engineering': ['Robotics', 'Electronics', 'Mechanical Engineering', '3D Printing'],
  'Design & Creative': [
    'UI/UX Design',
    'Graphic Design',
    'Animation',
    '3D Modeling',
    'Video Editing',
    'Photography',
    'Branding',
    'Illustration',
  ],
  'Business & Entrepreneurship': ['Startups', 'Marketing', 'Finance', 'Product Management', 'E-commerce', 'Sales', 'Investing'],
  'Science & Research': ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'Environmental Science', 'Neuroscience', 'Space & Astronomy'],
  'Academic Competitions': ['Olympiads', 'Hackathons', 'Case Competitions', 'Model UN', 'Science Fairs', 'Debate'],
  'Social & Community': ['Volunteering', 'Education', 'Mentorship', 'Non-profit', 'Social Impact', 'Public Speaking'],
  'Arts & Media': ['Music', 'Writing', 'Filmmaking', 'Journalism', 'Podcasting', 'Theatre'],
  'Sports & Games': ['Esports', 'Chess', 'Football', 'Basketball', 'Fitness', 'Outdoor Adventures'],
  'Languages & Culture': ['Language Exchange', 'Travel', 'Cultural Exchange'],
};

export const GRADE_OPTIONS = [9, 10, 11, 12] as const;

export const PROJECT_TYPE_OPTIONS = [
  { value: 'event', label: 'Event (has a deadline)' },
  { value: 'ongoing', label: 'Ongoing' },
] as const;
