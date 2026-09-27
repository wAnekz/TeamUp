import { createHash } from 'node:crypto';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';

/**
 * Collects hackathons/olympiads once a day into eventDrafts/{id} for a
 * moderator to approve on /moderation/events. Never publishes directly —
 * sources are noisy and many events aren't open to school students.
 *
 * Sources (configurable by moderators in eventSources/config):
 *   - Devpost's public listing API — online hackathons worldwide.
 *   - Public Telegram channels via their t.me/s/<channel> web preview —
 *     where Kazakhstani organizers actually announce things. Posts are free
 *     text in RU/KZ/EN, so a Groq LLM pulls out title/dates/links and says
 *     whether it's a competition school students can enter at all.
 *
 * Uses the same GROQ_API_KEY secret as contentFilter.ts. Without it, the
 * Telegram half is skipped (Devpost still works — it's structured already).
 */

const GROQ_API_KEY = defineSecret('GROQ_API_KEY');

const DEFAULT_TELEGRAM_CHANNELS = ['astana_hub'];
const MAX_POST_AGE_DAYS = 21;
const MAX_LLM_CALLS_PER_RUN = 40;
const MAX_DEVPOST_PER_RUN = 15;
const MIN_DAYS_LEFT = 5; // not worth a moderator's time if it closes this week

// Cheap pre-filter so the LLM only sees posts that might be competitions.
const EVENT_KEYWORDS =
  /хакатон|hackathon|олимпиад|olympiad|конкурс|competition|чемпионат|championship|турнир|tournament|кейс|challenge|байқау|жарыс|челлендж|contest|жоба|грант/i;

interface DraftFields {
  source: 'devpost' | 'telegram';
  sourceUrl: string;
  sourceText?: string | null;
  title: string;
  description: string;
  date: Timestamp | null;
  registrationDeadline: Timestamp | null;
  format: 'online' | 'offline' | 'hybrid';
  location: string | null;
  organizer: string | null;
  registrationUrl: string | null;
  prizePool: string | null;
  imageUrl: string | null;
  forSchoolStudents: boolean | null;
}

function keyFor(url: string) {
  return createHash('sha1').update(url).digest('hex').slice(0, 24);
}

function parseDate(value: unknown): Timestamp | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
  const d = new Date(`${value.slice(0, 10)}T12:00:00+05:00`);
  return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

function decodeHtml(text: string) {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------- Devpost ----------------

interface DevpostHackathon {
  title: string;
  url: string;
  thumbnail_url?: string;
  displayed_location?: { location?: string };
  submission_period_dates?: string; // "Jul 31 - Oct 01, 2026"
  prize_amount?: string;
  organization_name?: string;
  invite_only?: boolean;
  themes?: { name: string }[];
}

// "Jul 31 - Oct 01, 2026" / "Sep 10 - 12, 2026" → the end date.
export function devpostEndDate(range: string | undefined): Timestamp | null {
  if (!range) return null;
  const year = range.match(/(\d{4})\s*$/)?.[1];
  const end = range.split('-').pop()?.trim() ?? '';
  const startMonth = range.match(/^([A-Za-z]{3})/)?.[1];
  const withMonth = /^[A-Za-z]/.test(end) ? end : `${startMonth} ${end}`;
  const d = new Date(`${withMonth.replace(/,?\s*\d{4}$/, '')} ${year} 23:59:00 UTC`);
  return Number.isNaN(d.getTime()) ? null : Timestamp.fromDate(d);
}

export async function collectDevpost(): Promise<DraftFields[]> {
  const out: DraftFields[] = [];
  for (let page = 1; page <= 3 && out.length < MAX_DEVPOST_PER_RUN; page++) {
    const res = await fetch(`https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&page=${page}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'TeamUpEventCollector/1.0' },
    });
    if (!res.ok) {
      logger.warn(`Devpost returned ${res.status}`);
      break;
    }
    const data = (await res.json()) as { hackathons?: DevpostHackathon[] };
    for (const h of data.hackathons ?? []) {
      if (h.invite_only || h.displayed_location?.location !== 'Online') continue;
      const end = devpostEndDate(h.submission_period_dates);
      if (!end || end.toMillis() < Date.now() + MIN_DAYS_LEFT * 86_400_000) continue;
      const themes = (h.themes ?? []).map((t) => t.name).join(', ');
      out.push({
        source: 'devpost',
        sourceUrl: h.url,
        title: h.title,
        description: `Online hackathon on Devpost${themes ? ` · ${themes}` : ''}. Submissions: ${h.submission_period_dates}. Check the rules page for age requirements.`,
        date: end,
        registrationDeadline: end,
        format: 'online',
        location: null,
        organizer: h.organization_name ?? null,
        registrationUrl: h.url,
        prizePool: h.prize_amount ? decodeHtml(h.prize_amount) : null,
        imageUrl: h.thumbnail_url ? (h.thumbnail_url.startsWith('//') ? `https:${h.thumbnail_url}` : h.thumbnail_url) : null,
        forSchoolStudents: null,
      });
      if (out.length >= MAX_DEVPOST_PER_RUN) break;
    }
  }
  return out;
}

// ---------------- Telegram ----------------

interface TelegramPost {
  url: string;
  text: string;
  date: Date;
  imageUrl: string | null;
}

export async function fetchChannelPosts(channel: string): Promise<TelegramPost[]> {
  const res = await fetch(`https://t.me/s/${encodeURIComponent(channel)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TeamUpEventCollector/1.0)' },
  });
  if (!res.ok) {
    logger.warn(`Telegram channel ${channel} returned ${res.status}`);
    return [];
  }
  const html = await res.text();
  const cutoff = Date.now() - MAX_POST_AGE_DAYS * 86_400_000;
  return html
    .split('tgme_widget_message_wrap')
    .slice(1)
    .map((block): TelegramPost | null => {
      const post = block.match(/data-post="([^"]+)"/)?.[1];
      const textHtml = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1];
      const time = block.match(/<time[^>]*datetime="([^"]+)"/)?.[1];
      if (!post || !textHtml || !time) return null;
      const image = block.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/)?.[1] ?? null;
      return { url: `https://t.me/${post}`, text: decodeHtml(textHtml), date: new Date(time), imageUrl: image };
    })
    .filter((p): p is TelegramPost => !!p && p.date.getTime() > cutoff && p.text.length > 80 && EVENT_KEYWORDS.test(p.text));
}

const EXTRACT_PROMPT = `You read announcements from Kazakhstani Telegram channels (Russian, Kazakh or English)
for TeamUp, an app where high school students (grades 9-12, ages 14-18) find teammates.
Decide if the post announces an UPCOMING competition a team or student can register for:
hackathon, olympiad, case championship, science fair, startup contest, challenge.
News about an event that already happened, results, winners, meetups, courses, vacancies and ads are NOT events.

Respond with ONLY a JSON object:
{
  "isEvent": boolean,
  "forSchoolStudents": boolean,   // true if school students can take part (or no age limit is stated), false if it's only for university students/adults
  "title": string,                // short event name
  "description": string,          // 2-3 sentences in the post's language: what it is, who can join, what you get
  "date": "YYYY-MM-DD" | null,    // when the event itself happens (first day)
  "registrationDeadline": "YYYY-MM-DD" | null,
  "format": "online" | "offline" | "hybrid",
  "location": string | null,      // city/venue for offline
  "organizer": string | null,
  "registrationUrl": string | null, // registration/application link from the post, if any
  "prizePool": string | null
}
Resolve relative dates ("до 15 октября") using the post date given below. Never invent links or dates.`;

// null = looked at it, not an event. 'retry' = the call itself failed, so
// don't mark it seen — try again tomorrow.
export async function extractWithLlm(post: TelegramPost, apiKey: string): Promise<DraftFields | null | 'retry'> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: EXTRACT_PROMPT },
        { role: 'user', content: `POST DATE: ${post.date.toISOString().slice(0, 10)}\nPOST:\n${post.text.slice(0, 3500)}` },
      ],
    }),
  });
  if (!res.ok) {
    logger.warn(`Groq extraction returned ${res.status}`, await res.text());
    return 'retry';
  }
  const data = (await res.json()) as { choices: [{ message: { content: string } }] };
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(data.choices[0]?.message?.content ?? '{}');
  } catch {
    return null;
  }
  if (parsed.isEvent !== true || typeof parsed.title !== 'string') return null;

  const date = parseDate(parsed.date);
  const registrationDeadline = parseDate(parsed.registrationDeadline);
  const closesAt = (registrationDeadline ?? date)?.toMillis();
  if (closesAt && closesAt < Date.now()) return null; // already over

  const format = ['online', 'offline', 'hybrid'].includes(parsed.format as string)
    ? (parsed.format as DraftFields['format'])
    : 'offline';
  const regUrl = typeof parsed.registrationUrl === 'string' && /^https?:\/\//.test(parsed.registrationUrl) ? parsed.registrationUrl : null;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null);

  return {
    source: 'telegram',
    sourceUrl: post.url,
    sourceText: post.text.slice(0, 2000),
    title: parsed.title.slice(0, 120),
    description: (str(parsed.description) ? String(parsed.description) : post.text).slice(0, 800),
    date,
    registrationDeadline,
    format,
    location: str(parsed.location),
    organizer: str(parsed.organizer),
    registrationUrl: regUrl,
    prizePool: str(parsed.prizePool),
    imageUrl: post.imageUrl,
    forSchoolStudents: typeof parsed.forSchoolStudents === 'boolean' ? parsed.forSchoolStudents : null,
  };
}

// ---------------- scheduler ----------------

export const collectEvents = onSchedule(
  { schedule: 'every day 07:00', timeZone: 'Asia/Almaty', secrets: [GROQ_API_KEY], timeoutSeconds: 300 },
  async () => {
    const db = getFirestore();
    const config = (await db.doc('eventSources/config').get()).data();
    const channels: string[] = config?.telegramChannels ?? DEFAULT_TELEGRAM_CHANNELS;
    const useDevpost = config?.devpost !== false;

    // collectorSeen/{key} remembers every source URL already looked at —
    // drafts, rejects and non-events alike — so nothing is re-sent to the
    // LLM or re-queued for a moderator who already said no.
    const isSeen = async (url: string) => (await db.doc(`collectorSeen/${keyFor(url)}`).get()).exists;
    const markSeen = (url: string, isEvent: boolean) =>
      db.doc(`collectorSeen/${keyFor(url)}`).set({ url, isEvent, seenAt: FieldValue.serverTimestamp() });

    const saveDraft = async (draft: DraftFields) => {
      await db.doc(`eventDrafts/${keyFor(draft.sourceUrl)}`).set({
        ...draft,
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
      });
      await markSeen(draft.sourceUrl, true);
    };

    let queued = 0;

    if (useDevpost) {
      try {
        for (const draft of await collectDevpost()) {
          if (await isSeen(draft.sourceUrl)) continue;
          await saveDraft(draft);
          queued++;
        }
      } catch (err) {
        logger.error('collectEvents: Devpost failed', err);
      }
    }

    const apiKey = GROQ_API_KEY.value();
    if (!apiKey) {
      logger.warn('collectEvents: GROQ_API_KEY not set — skipping Telegram sources');
    } else {
      let llmCalls = 0;
      for (const channel of channels) {
        if (llmCalls >= MAX_LLM_CALLS_PER_RUN) break;
        try {
          for (const post of await fetchChannelPosts(channel)) {
            if (llmCalls >= MAX_LLM_CALLS_PER_RUN) break;
            if (await isSeen(post.url)) continue;
            llmCalls++;
            const draft = await extractWithLlm(post, apiKey);
            if (draft === 'retry') continue;
            if (draft) {
              await saveDraft(draft);
              queued++;
            } else {
              await markSeen(post.url, false);
            }
          }
        } catch (err) {
          logger.error(`collectEvents: channel ${channel} failed`, err);
        }
      }
    }

    logger.info(`collectEvents: queued ${queued} draft(s) for review`);
  },
);
