import { createHash } from 'node:crypto';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';

/**
 * Collects hackathons/olympiads once a day. Devpost listings are structured
 * and always online hackathons, so they go straight to events/. Telegram
 * posts are noisy free text and many aren't open to school students, so
 * they land in eventDrafts/{id} for a moderator to approve on
 * /moderation/events.
 *
 * Sources (configurable by moderators in eventSources/config):
 *   - Devpost's public listing API — online hackathons worldwide.
 *   - Public Telegram channels via their t.me/s/<channel> web preview —
 *     where Kazakhstani organizers actually announce things. Posts are free
 *     text in RU/KZ/EN, so a Groq LLM pulls out title/dates/links and says
 *     whether it's a competition school students can enter at all.
 *   - Organizer websites (moderator-listed page URLs). Every site is laid
 *     out differently, so the page is flattened to text (links kept) and
 *     the same LLM lists the upcoming events on it. Also drafts only.
 *
 * Uses the same GROQ_API_KEY secret as contentFilter.ts. Without it, the
 * Telegram and website halves are skipped (Devpost still works — it's structured already).
 */

const GROQ_API_KEY = defineSecret('GROQ_API_KEY');

const DEFAULT_TELEGRAM_CHANNELS = ['astana_hub'];
const MAX_POST_AGE_DAYS = 21;
const MAX_LLM_CALLS_PER_RUN = 40;
const MAX_DEVPOST_PER_RUN = 15;
const MAX_WEBSITES = 20;
const MAX_PAGE_TEXT = 12_000; // keeps one page well under the Groq per-call token budget
const MAX_EVENTS_PER_PAGE = 10;
const MIN_DAYS_LEFT = 5; // not worth a moderator's time if it closes this week

// Cheap pre-filter so the LLM only sees posts that might be competitions.
const EVENT_KEYWORDS =
  /хакатон|hackathon|олимпиад|olympiad|конкурс|competition|чемпионат|championship|турнир|tournament|кейс|challenge|байқау|жарыс|челлендж|contest|жоба|грант/i;

export interface DescriptionI18n {
  ru: string;
  kz: string;
  en: string;
}

interface DraftFields {
  source: 'devpost' | 'telegram' | 'website';
  sourceUrl: string;
  sourceText?: string | null;
  title: string;
  description: string;
  descriptionI18n?: DescriptionI18n | null;
  // ISO country code when the event is tied to one (Telegram sources are
  // Kazakhstani channels); null for worldwide online events.
  country?: string | null;
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

// ---------------- audience (Devpost) ----------------

/**
 * TeamUp is for 14-18 year olds in Kazakhstan, but Devpost lists mostly
 * adult and corporate hackathons. Each hackathon page has a "Who can
 * participate" block ("Ages 13+ only", "Above legal age of majority...",
 * "Only specific countries/territories included"). Only keep events that
 * explicitly let someone under 18 in and don't shut Kazakhstan out; no
 * block, no publish, since we can't tell.
 */
export function devpostAudience(eligibility: string | null): { ok: boolean; reason: string } {
  if (!eligibility) return { ok: false, reason: 'no eligibility info on the page' };
  const e = eligibility.toLowerCase();
  if (/legal age of majority|ages? 1[89]\+|ages? 2\d\+/.test(e)) return { ok: false, reason: 'adults only (18+)' };
  if (/professionals|post ?grads|college students only|university students only/.test(e)) {
    return { ok: false, reason: 'not open to school students' };
  }
  if (/only specific countries/.test(e) && !e.includes('kazakhstan')) return { ok: false, reason: 'Kazakhstan not eligible' };
  if (/specific countries\/territories excluded/.test(e) && e.includes('kazakhstan')) {
    return { ok: false, reason: 'Kazakhstan excluded' };
  }
  const range = e.match(/ages? (\d{1,2})(?:\+| to (\d{1,2}))/);
  if (!range) return { ok: false, reason: 'age not stated' };
  const min = Number(range[1]);
  const max = range[2] ? Number(range[2]) : 99;
  if (min > 17 || max < 14) return { ok: false, reason: `ages ${min}-${max === 99 ? '' : max}` };
  return { ok: true, reason: `ages ${min}${max === 99 ? '+' : `-${max}`}` };
}

/** "Who can participate" block and the tagline from a hackathon's page. */
export function parseDevpostPage(html: string): { eligibility: string | null; tagline: string | null } {
  // Tags become spaces so "<li>Ages 13+</li><li>Students only</li>" doesn't glue words together.
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const text = decodeHtml(body).replace(/\s+/g, ' ');
  const eligibility = text.match(/Who can participate(.*?)View full rules/i)?.[1]?.trim().slice(0, 600) ?? null;
  const meta =
    html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]*)"/i)?.[1] ??
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1] ??
    null;
  return { eligibility, tagline: meta ? decodeHtml(meta).slice(0, 600) : null };
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';

async function fetchDevpostPage(url: string) {
  const res = await fetch(url, { headers: { 'User-Agent': BROWSER_UA } });
  if (!res.ok) throw new Error(`Devpost page ${url} returned ${res.status}`);
  return parseDevpostPage(await res.text());
}

// ---------------- RU/KZ/EN blurbs ----------------

const SUMMARY_PROMPT = `You write event blurbs for TeamUp, an app where school students in Kazakhstan
(ages 14-18) find teammates for hackathons and olympiads.
From the event info below, write 1-2 short, plain sentences: what the event is and who can join.
Friendly and concrete, no hype, no emojis, no em dashes. Don't invent prizes, dates or rules that aren't given.
Write the same blurb in Russian ("ru"), Kazakh ("kz") and English ("en").
Respond with ONLY a JSON object: {"ru": string, "kz": string, "en": string}`;

export async function summarizeEvent(info: string, apiKey: string): Promise<DescriptionI18n | null> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: info.slice(0, 3000) },
      ],
    }),
  });
  if (!res.ok) {
    logger.warn(`Groq summary returned ${res.status}`, await res.text());
    return null;
  }
  const data = (await res.json()) as { choices: [{ message: { content: string } }] };
  try {
    return toI18n(JSON.parse(data.choices[0]?.message?.content ?? '{}'));
  } catch {
    return null;
  }
}

function toI18n(v: unknown): DescriptionI18n | null {
  const o = v as Record<string, unknown> | null;
  const ok = (x: unknown) => typeof x === 'string' && x.trim().length > 0;
  if (!o || !ok(o.ru) || !ok(o.kz) || !ok(o.en)) return null;
  const clean = (x: unknown) => String(x).replace(/\u2014|\u2013/g, '-').trim().slice(0, 400);
  return { ru: clean(o.ru), kz: clean(o.kz), en: clean(o.en) };
}

function devpostInfo(d: { title: string; organizer: string | null; themes?: string; dates?: string; tagline: string | null; eligibility: string | null }) {
  return [
    `Title: ${d.title}`,
    d.organizer && `Organizer: ${d.organizer}`,
    d.themes && `Themes: ${d.themes}`,
    d.dates && `Submission period: ${d.dates}`,
    'Format: online (Devpost)',
    d.tagline && `Tagline: ${d.tagline}`,
    d.eligibility && `Who can participate: ${d.eligibility}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export interface DevpostCandidate extends DraftFields {
  themes: string;
  dates: string;
}

export async function collectDevpost(): Promise<DevpostCandidate[]> {
  const out: DevpostCandidate[] = [];
  for (let page = 1; page <= 3 && out.length < MAX_DEVPOST_PER_RUN; page++) {
    const res = await fetch(`https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&page=${page}`, {
      // Devpost's bot protection answers 403 to unknown agents from cloud IPs.
      headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
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
        country: null,
        themes,
        dates: h.submission_period_dates ?? '',
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
  "description": {"ru": string, "kz": string, "en": string}, // 1-2 plain sentences each: what it is, who can join. No hype, no em dashes
  "date": "YYYY-MM-DD" | null,    // when the event itself happens (first day)
  "registrationDeadline": "YYYY-MM-DD" | null,
  "format": "online" | "offline" | "hybrid",
  "location": string | null,      // city/venue for offline
  "organizer": string | null,
  "registrationUrl": string | null, // registration/application link from the post, if any
  "prizePool": string | null
}
Resolve relative dates ("до 15 октября") using the post date given below. Never invent links or dates.`;

// Shared by the Telegram and website extractors. Returns the parsed JSON,
// or 'retry' when the call itself failed (so the source isn't marked seen).
async function askGroq(system: string, user: string, apiKey: string): Promise<Record<string, unknown> | null | 'retry'> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-120b',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) {
    logger.warn(`Groq extraction returned ${res.status}`, await res.text());
    return 'retry';
  }
  const data = (await res.json()) as { choices: [{ message: { content: string } }] };
  try {
    return JSON.parse(data.choices[0]?.message?.content ?? '{}');
  } catch {
    return null;
  }
}

type DraftBase = Pick<DraftFields, 'source' | 'sourceUrl' | 'sourceText' | 'imageUrl' | 'country'>;

// One event object from the LLM → a draft, or null if it isn't an upcoming
// event (already over, no title).
export function draftFromLlm(parsed: Record<string, unknown>, base: DraftBase): DraftFields | null {
  if (typeof parsed.title !== 'string' || !parsed.title.trim()) return null;

  const date = parseDate(parsed.date);
  const registrationDeadline = parseDate(parsed.registrationDeadline);
  const closesAt = (registrationDeadline ?? date)?.toMillis();
  if (closesAt && closesAt < Date.now()) return null; // already over

  const format = ['online', 'offline', 'hybrid'].includes(parsed.format as string)
    ? (parsed.format as DraftFields['format'])
    : 'offline';
  const regUrl = typeof parsed.registrationUrl === 'string' && /^https?:\/\//.test(parsed.registrationUrl) ? parsed.registrationUrl : null;
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 200) : null);

  const descriptionI18n = toI18n(parsed.description);
  return {
    ...base,
    title: parsed.title.trim().slice(0, 120),
    description: (descriptionI18n?.ru ?? (str(parsed.description) ? String(parsed.description) : base.sourceText ?? '')).slice(0, 800),
    descriptionI18n,
    date,
    registrationDeadline,
    format,
    location: str(parsed.location),
    organizer: str(parsed.organizer),
    registrationUrl: regUrl,
    prizePool: str(parsed.prizePool),
    forSchoolStudents: typeof parsed.forSchoolStudents === 'boolean' ? parsed.forSchoolStudents : null,
  };
}

// null = looked at it, not an event. 'retry' = the call itself failed, so
// don't mark it seen — try again tomorrow.
export async function extractWithLlm(post: TelegramPost, apiKey: string): Promise<DraftFields | null | 'retry'> {
  const parsed = await askGroq(
    EXTRACT_PROMPT,
    `POST DATE: ${post.date.toISOString().slice(0, 10)}\nPOST:\n${post.text.slice(0, 3500)}`,
    apiKey,
  );
  if (parsed === 'retry') return 'retry';
  if (!parsed || parsed.isEvent !== true) return null;
  return draftFromLlm(parsed, {
    source: 'telegram',
    sourceUrl: post.url,
    sourceText: post.text.slice(0, 2000),
    // The configured channels are Kazakhstani organizers.
    country: 'KZ',
    imageUrl: post.imageUrl,
  });
}

// ---------------- websites ----------------

/**
 * Flattens an organizer's page to plain text for the LLM. Links are kept as
 * "text [absolute url]" so it can return registration links that really
 * are on the page; nav/header/footer are dropped so menus don't eat the
 * text budget.
 */
export function pageToText(html: string, pageUrl: string): string {
  const abs = (href: string) => {
    try {
      const u = new URL(href.replace(/&amp;/g, '&'), pageUrl);
      if (!/^https?:$/.test(u.protocol)) return null;
      // Readable Cyrillic paths, so the LLM copies them back exactly.
      try {
        return decodeURI(u.href);
      } catch {
        return u.href;
      }
    } catch {
      return null;
    }
  };
  const body = html
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<(script|style|noscript|svg|nav|header|footer|form|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const url = abs(href);
      if (!text) return ' ';
      return url && !href.startsWith('#') ? ` ${text} [${url}] ` : ` ${text} `;
    })
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|table|ul|ol)>/gi, '\n');
  return decodeHtml(body)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

export async function fetchPageText(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TeamUpEventCollector/1.0)', 'Accept-Language': 'ru,kk;q=0.9,en;q=0.8' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    logger.warn(`Website ${url} returned ${res.status}`);
    return null;
  }
  if (!(res.headers.get('content-type') ?? '').includes('html')) {
    logger.warn(`Website ${url} is not an HTML page`);
    return null;
  }
  const html = (await res.text()).slice(0, 3_000_000);
  return pageToText(html, res.url || url);
}

const SITE_PROMPT = `You read the text of an organizer's website (Russian, Kazakh or English) for TeamUp,
an app where high school students in Kazakhstan (grades 9-12, ages 14-18) find teammates.
List every UPCOMING competition on the page a team or student can still register for:
hackathon, olympiad, case championship, science fair, startup contest, challenge.
Past events, results, winners, news, courses, meetups, vacancies and ads are NOT events.
Links in the text look like "label [https://...]".

Respond with ONLY a JSON object: {"events": [ ... ]} (empty array if there are none, at most ${MAX_EVENTS_PER_PAGE}).
Each event:
{
  "title": string,
  "forSchoolStudents": boolean,   // true if school students can take part (or no age limit is stated), false if only university students/adults
  "description": {"ru": string, "kz": string, "en": string}, // 1-2 plain sentences each: what it is, who can join. No hype, no em dashes
  "excerpt": string,              // the page's own words about this event, copied verbatim, up to 500 characters
  "url": string | null,           // link to this event's own page, copied from the text
  "date": "YYYY-MM-DD" | null,    // when the event itself happens (first day)
  "registrationDeadline": "YYYY-MM-DD" | null,
  "format": "online" | "offline" | "hybrid",
  "location": string | null,
  "organizer": string | null,
  "registrationUrl": string | null, // registration link copied from the text
  "prizePool": string | null,
  "inKazakhstan": boolean         // held in Kazakhstan or specifically for Kazakhstani students
}
Use TODAY below to resolve dates without a year. Never invent links or dates: only use URLs that appear in the text.`;

// Every link the LLM returns must have been on the page; anything else is
// dropped rather than trusted.
function linkOnPage(value: unknown, text: string): string | null {
  return typeof value === 'string' && /^https?:\/\//.test(value) && text.includes(value) ? value : null;
}

export function draftsFromSite(parsed: Record<string, unknown>, pageUrl: string, text: string): DraftFields[] {
  const events = Array.isArray(parsed.events) ? parsed.events.slice(0, MAX_EVENTS_PER_PAGE) : [];
  const out: DraftFields[] = [];
  for (const raw of events) {
    if (!raw || typeof raw !== 'object') continue;
    const ev = raw as Record<string, unknown>;
    const ownUrl = linkOnPage(ev.url, text);
    const registrationUrl = linkOnPage(ev.registrationUrl, text);
    const title = typeof ev.title === 'string' ? ev.title.trim() : '';
    // Dedupe key: the event's own page, else its registration link, else
    // page + title (one listing page can hold several events).
    const sourceUrl = ownUrl ?? registrationUrl ?? `${pageUrl}#${encodeURIComponent(title.toLowerCase().slice(0, 80))}`;
    const draft = draftFromLlm(
      { ...ev, registrationUrl },
      {
        source: 'website',
        sourceUrl,
        sourceText: typeof ev.excerpt === 'string' ? ev.excerpt.slice(0, 2000) : null,
        country: ev.inKazakhstan === true ? 'KZ' : null,
        imageUrl: null,
      },
    );
    if (draft) out.push(draft);
  }
  return out;
}

// ---------------- scheduler ----------------

export const collectEvents = onSchedule(
  { schedule: 'every day 07:00', timeZone: 'Asia/Almaty', secrets: [GROQ_API_KEY], timeoutSeconds: 540 },
  async () => {
    const db = getFirestore();
    const config = (await db.doc('eventSources/config').get()).data();
    const channels: string[] = config?.telegramChannels ?? DEFAULT_TELEGRAM_CHANNELS;
    const useDevpost = config?.devpost !== false;
    const websites: string[] = (Array.isArray(config?.websites) ? config.websites : [])
      .filter((u: unknown): u is string => typeof u === 'string' && /^https?:\/\//.test(u))
      .slice(0, MAX_WEBSITES);

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

    // Same shape the moderator form writes (useCreateEvent / draftToInput).
    const publish = async (draft: DraftFields, audience: string | null = null) => {
      await db.doc(`events/${keyFor(draft.sourceUrl)}`).set({
        title: draft.title,
        description: draft.description,
        descriptionI18n: draft.descriptionI18n ?? null,
        sourceText: draft.sourceText ?? null,
        country: draft.country ?? null,
        audience,
        hidden: false,
        screenedAt: FieldValue.serverTimestamp(),
        competitionTag: draft.title,
        date: draft.date,
        format: draft.format,
        location: draft.location,
        organizer: draft.organizer,
        registrationUrl: draft.registrationUrl,
        registrationDeadline: draft.registrationDeadline,
        prizePool: draft.prizePool,
        teamSizeHint: null,
        imageUrl: draft.imageUrl,
        resources: [],
        sourceUrl: draft.sourceUrl,
        interestedCount: 0,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await markSeen(draft.sourceUrl, true);
    };

    let queued = 0;
    let published = 0;
    let llmCalls = 0;
    const apiKey = GROQ_API_KEY.value();
    const blurb = async (info: string) => {
      if (!apiKey || llmCalls >= MAX_LLM_CALLS_PER_RUN) return null;
      llmCalls++;
      return summarizeEvent(info, apiKey);
    };

    // Devpost events published before the audience filter existed: run them
    // through the same check once. Failing ones are hidden (not deleted) so
    // a moderator can still review them; passing ones get RU/KZ/EN blurbs.
    try {
      const existing = await db.collection('events').where('isActive', '==', true).get();
      for (const d of existing.docs) {
        const ev = d.data();
        if (ev.screenedAt || typeof ev.sourceUrl !== 'string' || !ev.sourceUrl.includes('devpost.com')) continue;
        const page = await fetchDevpostPage(ev.sourceUrl).catch((err) => {
          logger.warn('collectEvents: rescreen fetch failed', err);
          return null;
        });
        if (!page) continue;
        const audience = devpostAudience(page.eligibility);
        const descriptionI18n = audience.ok
          ? await blurb(devpostInfo({ title: ev.title, organizer: ev.organizer ?? null, tagline: page.tagline, eligibility: page.eligibility }))
          : null;
        await d.ref.update({
          hidden: !audience.ok,
          audience: audience.reason,
          sourceText: page.tagline ?? ev.description ?? null,
          ...(descriptionI18n ? { descriptionI18n, description: descriptionI18n.ru } : {}),
          country: null,
          screenedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } catch (err) {
      logger.error('collectEvents: rescreen failed', err);
    }

    if (useDevpost) {
      try {
        // Devpost drafts queued before auto-publishing existed. Not published
        // from here: anything still open comes back through the listing
        // below and has to pass the audience check like everything else.
        const backlog = await db.collection('eventDrafts').where('source', '==', 'devpost').where('status', '==', 'pending').get();
        for (const d of backlog.docs) await d.ref.update({ status: 'rejected' });
        for (const draft of await collectDevpost()) {
          if (await isSeen(draft.sourceUrl)) continue;
          const page = await fetchDevpostPage(draft.sourceUrl).catch(() => null);
          if (!page) continue; // try again tomorrow
          const audience = devpostAudience(page.eligibility);
          if (!audience.ok) {
            await markSeen(draft.sourceUrl, false);
            continue;
          }
          const descriptionI18n = await blurb(
            devpostInfo({ ...draft, themes: draft.themes, dates: draft.dates, tagline: page.tagline, eligibility: page.eligibility }),
          );
          await publish(
            {
              ...draft,
              sourceText: page.tagline,
              descriptionI18n,
              description: descriptionI18n?.ru ?? draft.description,
            },
            audience.reason,
          );
          published++;
        }
      } catch (err) {
        logger.error('collectEvents: Devpost failed', err);
      }
    }

    if (!apiKey) {
      logger.warn('collectEvents: GROQ_API_KEY not set — skipping Telegram sources');
    } else {
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

    if (apiKey) {
      for (const site of websites) {
        if (llmCalls >= MAX_LLM_CALLS_PER_RUN) break;
        try {
          const text = await fetchPageText(site);
          if (!text || text.length < 200) {
            logger.warn(`collectEvents: ${site} has almost no text (probably rendered by JavaScript)`);
            continue;
          }
          const pageText = text.slice(0, MAX_PAGE_TEXT);
          // Only ask the LLM again when the page actually changed.
          const pageKey = `collectorSeen/${keyFor(`page:${site}`)}`;
          const hash = createHash('sha1').update(pageText).digest('hex');
          if ((await db.doc(pageKey).get()).data()?.hash === hash) continue;
          llmCalls++;
          const parsed = await askGroq(SITE_PROMPT, `TODAY: ${new Date().toISOString().slice(0, 10)}\nPAGE: ${site}\nTEXT:\n${pageText}`, apiKey);
          if (parsed === 'retry') continue;
          for (const draft of parsed ? draftsFromSite(parsed, site, pageText) : []) {
            if (await isSeen(draft.sourceUrl)) continue;
            await saveDraft(draft);
            queued++;
          }
          await db.doc(pageKey).set({ url: site, hash, seenAt: FieldValue.serverTimestamp() });
        } catch (err) {
          logger.error(`collectEvents: website ${site} failed`, err);
        }
      }
    }

    logger.info(`collectEvents: published ${published} Devpost event(s), queued ${queued} draft(s) for review`);
  },
);
