/**
 * Events for Kazakhstani school students (in Kazakhstan, or worldwide online
 * ones with `country: null`), entered by hand from OFFICIAL sources only.
 * Add an event only when the organizer has published dates for the current
 * school year; never guess. `id` is the Firestore doc id,
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
  teamSizeHint?: string;
  // 'KZ' (default) for events in or for Kazakhstan; null for worldwide
  // online ones that Kazakhstani students can enter.
  country?: 'KZ' | null;
}

export const KZ_EVENTS: KzEvent[] = [
  // Checked 2026-10-20 on the official pages below.
  {
    id: 'nasa-space-apps-2026',
    title: 'NASA Space Apps Challenge 2026',
    description: {
      ru: 'Самый большой хакатон в мире на открытых данных NASA: космос, Земля, климат. 48 часов, можно полностью онлайн. Возрастного минимума нет, опыт не нужен, участие бесплатное. Команда до 6 человек.',
      kz: 'NASA ашық деректері бойынша әлемдегі ең үлкен хакатон: ғарыш, Жер, климат. 48 сағат, толығымен онлайн қатысуға болады. Жас шегі жоқ, тәжірибе қажет емес, қатысу тегін. Командада 6 адамға дейін.',
      en: "The world's largest hackathon on NASA open data: space, Earth, climate. 48 hours, fully online if you like. No minimum age, no experience needed, free. Teams of up to 6.",
    },
    date: '2026-11-14',
    registrationDeadline: '2026-11-15',
    format: 'hybrid',
    organizer: 'NASA',
    registrationUrl: 'https://www.spaceappschallenge.org/2026/',
    sourceUrl: 'https://www.spaceappschallenge.org/2026/',
    teamSizeHint: 'до 6 / up to 6',
    country: null,
  },
  {
    id: 'cosmo-hacks-2026',
    title: 'Cosmo Hacks 2026',
    description: {
      ru: 'Бесплатный онлайн-хакатон на 4 дня, который делают школьники для школьников. Тема: технологии для жизни учеников и местных сообществ - приложение, сайт, игра. Школьный дивизион 13-18 лет, можно одному или командой до 4.',
      kz: 'Оқушылар оқушыларға жасайтын 4 күндік тегін онлайн-хакатон. Тақырыбы: оқушылар мен жергілікті қауымдастық өміріне арналған технологиялар - қосымша, сайт, ойын. Мектеп дивизионы 13-18 жас, жеке немесе 4 адамға дейінгі командамен.',
      en: 'A free 4-day online hackathon run by high schoolers. Theme: tech for student and community life - an app, a website, a game. School division for ages 13-18, solo or teams of up to 4.',
    },
    date: '2026-12-18',
    registrationDeadline: '2026-12-21',
    format: 'online',
    organizer: 'Cosmo Hacks',
    registrationUrl: 'https://cosmohacks.devpost.com/',
    sourceUrl: 'https://cosmohacks.com/',
    teamSizeHint: '1-4',
    country: null,
  },
];
