import { getT } from '@/i18n';

// Display side of functions/src/gamification.ts — keep LEVELS thresholds,
// badge ids and XP amounts in sync with it. The server is the only thing
// that grants XP; this file just explains it. Names/descriptions live in
// src/i18n (gamification.levels / badgeNames / rules).

export const LEVELS = [
  { level: 1, name: 'Newbie', minXp: 0 },
  { level: 2, name: 'Teammate', minXp: 100 },
  { level: 3, name: 'Builder', minXp: 300 },
  { level: 4, name: 'Captain', minXp: 700 },
  { level: 5, name: 'Legend', minXp: 1500 },
] as const;

export function levelInfo(xp: number) {
  let index = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.minXp) index = i;
  });
  const current = LEVELS[index];
  const next = LEVELS[index + 1] ?? null;
  const progress = next ? (xp - current.minXp) / (next.minXp - current.minXp) : 1;
  return { current, next, progress: Math.min(1, Math.max(0, progress)) };
}

export const LEVEL_STYLE: Record<number, string> = {
  1: 'bg-surface-100 text-surface-600',
  2: 'bg-sky-50 text-sky-700',
  3: 'bg-emerald-50 text-emerald-700',
  4: 'bg-violet-50 text-violet-700',
  5: 'bg-amber-50 text-amber-700',
};

// Same order as gamification.rules in the dictionaries.
export const XP_RULE_POINTS = [50, 40, 30, 20, 20, 5];

/** Level display name in the current language. */
export function levelName(level: number) {
  return getT().gamification.levels[level - 1] ?? `${level}`;
}

export interface BadgeDef {
  id: string;
  emoji: string;
  name: string;
  description: string;
}

const BADGE_EMOJI: Record<string, string> = {
  first_team: '🤝',
  team_player: '🧩',
  first_captain: '🚩',
  captain_3: '👑',
  full_squad: '✅',
  portfolio: '📁',
  olympiad: '🥇',
  recruiter: '📣',
  explorer: '🧭',
};

export const BADGE_IDS = Object.keys(BADGE_EMOJI);

/** Handles both fixed badges and dynamic "champion:<season>" ones, in the current language. */
export function badgeFor(id: string): BadgeDef | null {
  const t = getT().gamification;
  if (id.startsWith('champion:')) {
    const season = formatSeason(id.slice('champion:'.length));
    return { id, emoji: '🏆', name: t.champion(season), description: t.championDesc(season) };
  }
  const text = t.badgeNames[id];
  if (!text || !BADGE_EMOJI[id]) return null;
  return { id, emoji: BADGE_EMOJI[id], name: text[0], description: text[1] };
}

/** "2026-Q3" → "Q3 2026" */
export function formatSeason(season: string) {
  const [year, q] = season.split('-');
  return q && year ? `${q} ${year}` : season;
}

/** Same rule as seasonId() in functions: calendar quarter, Almaty time (UTC+5). */
export function currentSeason(date = new Date()) {
  const local = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-Q${Math.floor(local.getUTCMonth() / 3) + 1}`;
}

export function daysLeftInSeason(date = new Date()) {
  const local = new Date(date.getTime() + 5 * 60 * 60 * 1000);
  const endMonth = Math.floor(local.getUTCMonth() / 3) * 3 + 3;
  const end = Date.UTC(local.getUTCFullYear(), endMonth, 1) - 5 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((end - date.getTime()) / (24 * 60 * 60 * 1000)));
}
