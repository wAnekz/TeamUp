import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';

/**
 * Automatic content screening for the two places students post free text
 * publicly, before a human ever sees it: new project posts and "looking for
 * team" posts. Team chat is deliberately NOT screened here — it's between
 * accepted teammates already, exchanging contacts there is normal and not
 * something worth flagging, and rate-limiting (see moderation.ts) already
 * covers spam/abuse volume in chat.
 *
 * This does NOT replace human moderation (see MODERATION_GUIDE.md) — it's a
 * first line of defense so harmful content doesn't sit live, unreported,
 * for however long it takes someone to notice and click "Report". Anything
 * this flags lands straight in the existing /moderation/reports queue, as
 * if a user had reported it themselves — no new UI needed, moderators
 * already know that screen.
 *
 * Provider: Groq, running `openai/gpt-oss-safeguard-20b` — a "bring your
 * own policy" safety-reasoning model (fast + effectively free at this
 * app's volume). Unlike a fixed-taxonomy classifier, it reads the POLICY
 * text below and reasons about whether the input violates it, so the rules
 * that matter for a minors-only platform (sexual content involving a minor,
 * self-harm, harassment, threats) are spelled out explicitly rather than
 * relying on a generic "toxicity" score.
 *
 * Setup:
 *   1. Create a free account at console.groq.com, generate an API key.
 *   2. firebase functions:secrets:set GROQ_API_KEY
 *   3. cd functions && npm install && npm run deploy
 *
 * Until the secret is set, this logs a warning and skips screening instead
 * of failing — same "safe to deploy before configured" pattern as
 * notifications.ts, so an unconfigured deploy never blocks normal posting.
 */

const GROQ_API_KEY = defineSecret('GROQ_API_KEY');

const POLICY = `You are a content safety classifier for TeamUp, a platform used
exclusively by high school students aged 14-18 to find teammates for
hackathons, olympiads, and school projects. Classify the CONTENT below
against these categories. Flag a violation if the content clearly matches
one, even partially — err toward flagging when unsure, a human moderator
reviews every flag before any action is taken.

Categories:
- sexual_minors: any sexual content, sexualization, or romantic/sexual
  advance directed at a minor. Given the userbase, treat any sexual content
  at all as this category unless it's clearly clinical/educational.
- self_harm: content describing, encouraging, or seeking methods for
  self-harm or suicide.
- harassment: bullying, threats, hate speech, or targeted harassment of a
  person or group.
- violence: graphic violence or credible threats of violence.
- scam: content asking for money, payment details, or personal financial
  information under the guise of a "project" or "opportunity".

Respond with ONLY a JSON object, no other text:
{"violation": true or false, "categories": ["category_name", ...], "rationale": "one short sentence"}`;

interface ModerationResult {
  flagged: boolean;
  categories: string[];
}

async function checkText(text: string): Promise<ModerationResult> {
  const apiKey = GROQ_API_KEY.value();
  if (!apiKey) {
    logger.warn('contentFilter: GROQ_API_KEY not set — skipping automated screening');
    return { flagged: false, categories: [] };
  }
  if (!text || text.trim().length === 0) return { flagged: false, categories: [] };

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-safeguard-20b',
        messages: [
          { role: 'system', content: POLICY },
          { role: 'user', content: `CONTENT:\n${text}` },
        ],
      }),
    });

    if (!res.ok) {
      logger.error(`contentFilter: Groq API returned ${res.status}`, await res.text());
      return { flagged: false, categories: [] };
    }

    const data = (await res.json()) as {
      choices: [{ message: { content: string } }];
    };
    const raw = data.choices[0]?.message?.content ?? '{}';
    // The model is instructed to return JSON only, but strip code fences
    // defensively in case it wraps the answer anyway.
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as { violation?: boolean; categories?: string[] };

    return {
      flagged: parsed.violation === true,
      categories: parsed.categories ?? [],
    };
  } catch (err) {
    logger.error('contentFilter: Groq API call failed', err);
    return { flagged: false, categories: [] };
  }
}

/**
 * Writes an auto-flag into the existing `reports` collection so it shows up
 * in /moderation/reports exactly like a user-submitted report. `reporterId`
 * is a fixed sentinel (not a real uid) purely as a marker moderators can
 * recognize — this write goes through the Admin SDK, which bypasses
 * firestore.rules entirely, so the rule that normally requires
 * reporterId == request.auth.uid doesn't apply here.
 */
async function fileAutoReport(opts: {
  targetType: 'profile' | 'project';
  targetId: string;
  reason: string;
}) {
  const db = getFirestore();
  await db.collection('reports').add({
    targetType: opts.targetType,
    targetId: opts.targetId,
    reporterId: 'system:content-filter',
    reason: opts.reason,
    status: 'open',
    createdAt: new Date(),
  });
}

/**
 * Each screen is a paid Groq call, and the triggers fire on every edit. A
 * script rewriting a title in a loop would burn the quota, after which
 * checkText fails open for everyone. Cap screens per author per hour; past
 * the cap the text goes to moderators unscreened instead of silently live.
 * One doc per author (reset each hour), so nothing piles up.
 */
const SCREENS_PER_HOUR = 20;

/** Counts this screen; returns how many this author has used this hour. */
async function countScreen(uid: string): Promise<number> {
  const db = getFirestore();
  const ref = db.doc(`screenQuota/${uid}`);
  const hour = new Date().toISOString().slice(0, 13);
  return db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data();
    const n = d?.hour === hour ? (d.n ?? 0) + 1 : 1;
    tx.set(ref, { hour, n });
    return n;
  });
}

/** Screens text unless the author is over quota; then flags it for a human. */
async function screen(
  authorId: string,
  text: string,
  target: { targetType: 'profile' | 'project'; targetId: string },
): Promise<ModerationResult | null> {
  if (!authorId) return checkText(text);
  const n = await countScreen(authorId);
  if (n <= SCREENS_PER_HOUR) return checkText(text);
  // Report once per hour (the first edit past the cap), not on every edit.
  if (n === SCREENS_PER_HOUR + 1) {
    await fileAutoReport({ ...target, reason: `Over ${SCREENS_PER_HOUR} edits in an hour, text not screened: "${truncate(text)}"` });
  }
  return null;
}

function truncate(text: string, max = 140): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

// ---------------- triggers ----------------

export const screenNewProject = onDocumentCreated(
  { document: 'projects/{projectId}', secrets: [GROQ_API_KEY] },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const text = [data.title, data.description].filter(Boolean).join('\n');
    const moderation = await screen(data.authorId, text, { targetType: 'project', targetId: event.params.projectId as string });
    if (!moderation?.flagged) return;

    await fileAutoReport({
      targetType: 'project',
      targetId: event.params.projectId as string,
      reason: `Project auto-flagged (${moderation.categories.join(', ')})`,
    });
  },
);

export const screenLookingForTeamPost = onDocumentCreated(
  { document: 'lookingForTeam/{postId}', secrets: [GROQ_API_KEY] },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const text = [data.title, data.description].filter(Boolean).join('\n');
    const moderation = await screen(data.authorId, text, { targetType: 'profile', targetId: data.authorId });
    if (!moderation?.flagged) return;

    // No dedicated moderation view for lookingForTeam posts yet — flag the
    // author's profile so it's at least visible in the queue; a moderator
    // can follow up manually (delete via Firebase Console) until this gets
    // its own "delete post" action like projects have.
    await fileAutoReport({
      targetType: 'profile',
      targetId: data.authorId,
      reason: `"Looking for team" post auto-flagged (${moderation.categories.join(', ')}): "${truncate(text)}"`,
    });
  },
);
// Edits go through the same screen: otherwise a clean post could be
// created and then rewritten. Only runs when the screened text changed.
export const screenEditedProject = onDocumentUpdated(
  { document: 'projects/{projectId}', secrets: [GROQ_API_KEY] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.title === after.title && before.description === after.description) return;
    const text = [after.title, after.description].filter(Boolean).join('\n');
    const moderation = await screen(after.authorId, text, { targetType: 'project', targetId: event.params.projectId as string });
    if (!moderation?.flagged) return;

    await fileAutoReport({
      targetType: 'project',
      targetId: event.params.projectId as string,
      reason: `Project edit auto-flagged (${moderation.categories.join(', ')})`,
    });
  },
);

export const screenEditedLookingForTeamPost = onDocumentUpdated(
  { document: 'lookingForTeam/{postId}', secrets: [GROQ_API_KEY] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after || before.description === after.description) return;
    const moderation = await screen(after.authorId, String(after.description ?? ''), { targetType: 'profile', targetId: after.authorId });
    if (!moderation?.flagged) return;

    await fileAutoReport({
      targetType: 'profile',
      targetId: after.authorId,
      reason: `"Looking for team" post edit auto-flagged (${moderation.categories.join(', ')}): "${truncate(String(after.description ?? ''))}"`,
    });
  },
);

// Name and bio are on every public profile, so they get the same screen.
// Fires on every users/{uid} write (lastActiveAt on each visit too) but
// returns before any Groq call unless the name or bio actually changed.
export const screenEditedProfile = onDocumentUpdated(
  { document: 'users/{uid}', secrets: [GROQ_API_KEY] },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.name === after.name && before.bio === after.bio) return;
    const uid = event.params.uid as string;
    const text = [after.name, after.bio].filter(Boolean).join('\n');
    const moderation = await screen(uid, text, { targetType: 'profile', targetId: uid });
    if (!moderation?.flagged) return;

    await fileAutoReport({
      targetType: 'profile',
      targetId: uid,
      reason: `Profile auto-flagged (${moderation.categories.join(', ')}): "${truncate(text)}"`,
    });
  },
);
