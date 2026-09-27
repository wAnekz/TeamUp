import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { logger } from 'firebase-functions/v2';
import { APP_URL, escapeHtml } from './notifications';

/**
 * Telegram bot: account linking, notifications and a weekly digest.
 * Students here read Telegram far more than email, so every notification
 * that already goes out by push/email also goes here when linked.
 *
 * Linking flow:
 *   1. Settings → "Connect" writes telegramLinks/{token} = { uid } and opens
 *      t.me/<bot>?start=<token> (see src/hooks/useTelegram.ts).
 *   2. The user presses Start; Telegram POSTs "/start <token>" to
 *      telegramWebhook below, which stores the chat id on
 *      users/{uid}/private/telegram and deletes the token.
 *
 * Setup (see README "Telegram bot"):
 *   firebase functions:secrets:set TELEGRAM_BOT_TOKEN       (from @BotFather)
 *   firebase functions:secrets:set TELEGRAM_WEBHOOK_SECRET  (any random string)
 *   then point the bot at telegramWebhook with setWebhook + that secret.
 * Unset token → sendTelegram logs and no-ops, same pattern as sendEmail.
 */

export const TELEGRAM_BOT_TOKEN = defineSecret('TELEGRAM_BOT_TOKEN');
const TELEGRAM_WEBHOOK_SECRET = defineSecret('TELEGRAM_WEBHOOK_SECRET');

const LINK_TOKEN_TTL_MS = 30 * 60 * 1000;

async function telegramApi(method: string, payload: Record<string, unknown>) {
  const token = TELEGRAM_BOT_TOKEN.value();
  if (!token) {
    logger.warn('TELEGRAM_BOT_TOKEN not set — skipping Telegram call', { method });
    return null;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => null)) as { ok: boolean; error_code?: number; description?: string } | null;
  if (!data?.ok) logger.warn('Telegram API error', { method, code: data?.error_code, description: data?.description });
  return data;
}

function absoluteUrl(path: string) {
  return path.startsWith('http') ? path : `${APP_URL.value()}${path}`;
}

async function sendToChat(chatId: number, html: string, button?: { text: string; url: string }) {
  const url = button ? absoluteUrl(button.url) : null;
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text: html,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    // Inline buttons only accept https URLs — skip it for a localhost APP_URL.
    ...(button && url?.startsWith('https://')
      ? { reply_markup: { inline_keyboard: [[{ text: button.text, url }]] } }
      : {}),
  });
}

/**
 * Sends a notification to a user's linked Telegram chat, if they have one.
 * Never throws — a Telegram hiccup must not roll back the triggering write.
 * `title`/`body` are plain text; they get escaped here.
 */
export async function sendTelegram(uid: string, opts: { title: string; body: string; url: string; button?: string }) {
  try {
    const ref = getFirestore().doc(`users/${uid}/private/telegram`);
    const chatId = (await ref.get()).data()?.chatId as number | null | undefined;
    if (!chatId) return;
    const res = await sendToChat(chatId, `<b>${escapeHtml(opts.title)}</b>\n${escapeHtml(opts.body)}`, {
      text: opts.button ?? 'Открыть TeamUp',
      url: opts.url,
    });
    // 403 = the user blocked the bot. Unlink so we stop trying.
    if (res && !res.ok && res.error_code === 403) await ref.update({ chatId: null });
  } catch (err) {
    logger.error('Telegram send failed', { uid, error: err instanceof Error ? err.message : String(err) });
  }
}

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { username?: string; first_name?: string };
    text?: string;
  };
}

async function upcomingEventsText() {
  const snap = await getFirestore().collection('events').where('isActive', '==', true).get();
  const now = Date.now();
  const events = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as { title: string; date?: Timestamp; registrationDeadline?: Timestamp | null }) }))
    .filter((e) => (e.date?.toMillis() ?? 0) > now)
    .sort((a, b) => (a.date?.toMillis() ?? 0) - (b.date?.toMillis() ?? 0))
    .slice(0, 6);
  if (events.length === 0) return 'Ближайших событий пока нет - загляни позже.';
  return events
    .map((e) => {
      const date = e.date?.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Asia/Almaty' });
      return `• <a href="${absoluteUrl(`/events/${e.id}`)}">${escapeHtml(e.title)}</a> - ${date}`;
    })
    .join('\n');
}

export const telegramWebhook = onRequest(
  { secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET] },
  async (req, res) => {
    // Telegram echoes the secret_token given to setWebhook in this header —
    // anything without it isn't Telegram.
    if (req.method !== 'POST' || req.get('X-Telegram-Bot-Api-Secret-Token') !== TELEGRAM_WEBHOOK_SECRET.value()) {
      res.status(403).send('forbidden');
      return;
    }
    // Always 200 back to Telegram, or it retries the same update forever.
    try {
      await handleUpdate(req.body as TelegramUpdate);
    } catch (err) {
      logger.error('telegramWebhook failed', err);
    }
    res.status(200).send('ok');
  },
);

async function handleUpdate(update: TelegramUpdate) {
  const msg = update.message;
  if (!msg?.text || msg.chat.type !== 'private') return;
  const chatId = msg.chat.id;
  const [command, arg] = msg.text.trim().split(/\s+/, 2);
  const db = getFirestore();

  if (command === '/start' && arg) {
    const tokenRef = db.doc(`telegramLinks/${arg}`);
    const tokenSnap = await tokenRef.get();
    const data = tokenSnap.data() as { uid: string; createdAt?: Timestamp } | undefined;
    if (!data || Date.now() - (data.createdAt?.toMillis() ?? 0) > LINK_TOKEN_TTL_MS) {
      await sendToChat(chatId, 'Ссылка устарела. Открой TeamUp → Профиль → Настройки и снова нажми «Подключить».');
      return;
    }
    // One TeamUp account per chat: unlink whichever account had it before.
    const previous = await db.collectionGroup('private').where('chatId', '==', chatId).get();
    const batch = db.batch();
    previous.docs.forEach((d) => batch.update(d.ref, { chatId: null }));
    batch.set(
      db.doc(`users/${data.uid}/private/telegram`),
      { chatId, username: msg.from?.username ?? null, digest: true, linkedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    batch.delete(tokenRef);
    await batch.commit();
    await sendToChat(
      chatId,
      '✅ Готово! Сюда будут приходить заявки, приглашения в команды и напоминания о событиях.\n\n/events - ближайшие хакатоны и олимпиады\n/stop - отключить',
      { text: 'Открыть TeamUp', url: '/feed' },
    );
    return;
  }

  if (command === '/stop') {
    const linked = await db.collectionGroup('private').where('chatId', '==', chatId).get();
    await Promise.all(linked.docs.map((d) => d.ref.update({ chatId: null })));
    await sendToChat(chatId, 'Отключено. Подключиться снова можно в настройках TeamUp.');
    return;
  }

  if (command === '/events') {
    await sendToChat(chatId, `<b>Ближайшие события</b>\n${await upcomingEventsText()}`, { text: 'Все события', url: '/events' });
    return;
  }

  await sendToChat(
    chatId,
    'Привет! Я бот TeamUp. Чтобы получать уведомления, открой TeamUp → Профиль → Настройки → Telegram → «Подключить».\n\n/events - ближайшие хакатоны и олимпиады',
    { text: 'Открыть TeamUp', url: '/dashboard?tab=profile' },
  );
}

/**
 * Monday digest: events published in the last week, to everyone linked
 * who hasn't turned the digest off. The "come back" hook for students who
 * aren't mid-project right now.
 */
export const weeklyTelegramDigest = onSchedule(
  { schedule: 'every monday 10:00', timeZone: 'Asia/Almaty', secrets: [TELEGRAM_BOT_TOKEN] },
  async () => {
    const db = getFirestore();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const eventsSnap = await db.collection('events').where('isActive', '==', true).get();
    const fresh = eventsSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as { title: string; date?: Timestamp; createdAt?: Timestamp }) }))
      .filter((e) => (e.createdAt?.toMillis() ?? 0) > weekAgo && (e.date?.toMillis() ?? 0) > Date.now())
      .sort((a, b) => (a.date?.toMillis() ?? 0) - (b.date?.toMillis() ?? 0));
    if (fresh.length === 0) {
      logger.info('weeklyTelegramDigest: no new events this week');
      return;
    }

    const list = fresh
      .slice(0, 8)
      .map((e) => {
        const date = e.date?.toDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Asia/Almaty' });
        return `• <a href="${absoluteUrl(`/events/${e.id}`)}">${escapeHtml(e.title)}</a> - ${date}`;
      })
      .join('\n');
    const text = `<b>🗓 Новое на TeamUp за неделю</b>\n${list}${fresh.length > 8 ? `\n…и ещё ${fresh.length - 8}` : ''}`;

    const linked = await db.collectionGroup('private').where('chatId', '>', 0).get();
    let sent = 0;
    for (const d of linked.docs) {
      const data = d.data() as { chatId: number; digest?: boolean };
      if (data.digest === false) continue;
      await sendToChat(data.chatId, text, { text: 'Найти команду', url: '/events' });
      sent++;
      // Telegram allows ~30 messages/second per bot; stay well under it.
      if (sent % 20 === 0) await new Promise((r) => setTimeout(r, 1000));
    }
    logger.info(`weeklyTelegramDigest: sent to ${sent} chat(s)`);
  },
);
