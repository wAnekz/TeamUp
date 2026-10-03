/**
 * Kazakhstani events for school students, entered by hand from OFFICIAL
 * sources only. Add an event only when the organizer has published dates
 * for the current school year; never guess. `id` is the Firestore doc id,
 * so re-running the seed updates instead of duplicating.
 *
 * Checked 2026-10-03, no dates published yet for the 2026-2027 school year:
 *   - Infomatrix Asia        https://infomatrix.asia (last: 25-27 Mar 2026, Astana)
 *   - IZhO (Zhautykov)       https://izho.kz (last: 10-14 Jan 2026, Almaty)
 *   - Republican olympiad    https://daryn.kz/respa/ (school stage by 30 Nov by law, no 2026-2027 schedule yet)
 *   - Republican science projects competition  https://daryn.kz/rknp-ru/
 *   - Astana Hub school hackathons  https://astanahub.com/ru/event/ (last school one: 31 Oct - 1 Nov 2025, Pavlodar)
 *   - WRO Kazakhstan         https://robotics.nis.edu.kz (2026 national stage was 18 Jun 2026)
 */
export interface KzEvent {
  id: string;
  title: string;
  description: { ru: string; kz: string; en: string };
  date: string; // YYYY-MM-DD, first day of the event
  registrationDeadline?: string; // YYYY-MM-DD
  format: 'online' | 'offline' | 'hybrid';
  location?: string;
  organizer: string;
  registrationUrl?: string;
  sourceUrl: string; // the official page the dates were taken from
}

export const KZ_EVENTS: KzEvent[] = [];
