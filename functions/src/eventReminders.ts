import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import { sendPush } from './notifications';
import { sendTelegram, TELEGRAM_BOT_TOKEN } from './telegram';

/**
 * "I'm interested" on an event (eventSubscriptions/{uid}_{eventId}):
 *   - keeps events/{id}.interestedCount in sync (events are moderator-only
 *     writes, so the client can't bump it);
 *   - sends reminders 7 days and 1 day before registration closes (or
 *     before the event itself when there's no registration deadline), and
 *     the day before it starts.
 */

const DAY = 24 * 60 * 60 * 1000;

export const onEventSubscriptionCreated = onDocumentCreated('eventSubscriptions/{subId}', async (event) => {
  const eventId = event.data?.data().eventId as string | undefined;
  if (!eventId) return;
  await getFirestore()
    .doc(`events/${eventId}`)
    .update({ interestedCount: FieldValue.increment(1) })
    .catch((err) => logger.warn('interestedCount increment failed', { eventId, err: String(err) }));
});

export const onEventSubscriptionDeleted = onDocumentDeleted('eventSubscriptions/{subId}', async (event) => {
  const eventId = event.data?.data().eventId as string | undefined;
  if (!eventId) return;
  await getFirestore()
    .doc(`events/${eventId}`)
    .update({ interestedCount: FieldValue.increment(-1) })
    .catch((err) => logger.warn('interestedCount decrement failed', { eventId, err: String(err) }));
});

interface EventDoc {
  title: string;
  date?: Timestamp;
  registrationDeadline?: Timestamp | null;
}

function daysUntil(ts: Timestamp | null | undefined, now: number) {
  return ts ? Math.ceil((ts.toMillis() - now) / DAY) : null;
}

export const sendEventReminders = onSchedule(
  { schedule: 'every day 09:00', timeZone: 'Asia/Almaty', secrets: [TELEGRAM_BOT_TOKEN] },
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const eventsSnap = await db.collection('events').where('isActive', '==', true).get();
    let sent = 0;

    for (const eventDoc of eventsSnap.docs) {
      const ev = eventDoc.data() as EventDoc;
      const regDays = daysUntil(ev.registrationDeadline ?? ev.date, now);
      const startDays = daysUntil(ev.date, now);
      const hasRegDeadline = !!ev.registrationDeadline;

      // Each reminder has a key stored on the subscription once sent, so a
      // retried or re-run schedule never sends the same one twice.
      const due: { key: string; title: string; body: string }[] = [];
      if (regDays === 7) {
        due.push({
          key: 'reg7',
          title: `${ev.title}: осталась неделя`,
          body: hasRegDeadline
            ? 'Регистрация закроется через 7 дней. Команда уже есть?'
            : 'Старт через 7 дней. Команда уже есть?',
        });
      }
      if (regDays === 1 && hasRegDeadline) {
        due.push({ key: 'reg1', title: `${ev.title}: последний день регистрации`, body: 'Регистрация закрывается завтра - не пропусти.' });
      }
      if (startDays === 1) {
        due.push({ key: 'start1', title: `${ev.title} стартует завтра`, body: 'Удачи! Сверьтесь с командой сегодня.' });
      }
      if (due.length === 0) continue;

      const subs = await db.collection('eventSubscriptions').where('eventId', '==', eventDoc.id).get();
      for (const sub of subs.docs) {
        const data = sub.data() as { uid: string; remindersSent?: string[] };
        const already = new Set(data.remindersSent ?? []);
        const pending = due.filter((d) => !already.has(d.key));
        if (pending.length === 0) continue;
        // Only the most relevant one if two land on the same day.
        const reminder = pending[pending.length - 1];
        const note = { title: reminder.title, body: reminder.body, url: `/events/${eventDoc.id}` };
        await Promise.all([sendPush(data.uid, note), sendTelegram(data.uid, { ...note, button: 'Открыть событие' })]);
        await sub.ref.update({ remindersSent: FieldValue.arrayUnion(...pending.map((p) => p.key)) });
        sent++;
      }
    }
    logger.info(`sendEventReminders: sent ${sent} reminder(s)`);
  },
);
