import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { ArrowRight, Calendar, ChevronDown, FileText, ShieldCheck, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { useEventsList } from '@/hooks/useEvents';
import { useRecommendationPool } from '@/hooks/useProjects';
import { useSchoolStats } from '@/hooks/useSchoolStats';
import { currentSeason, formatSeason } from '@/constants/gamification';
import { useLang, type Lang } from '@/lib/lang';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import type { Timestamp } from 'firebase/firestore';
import type { EventItem } from '@/types';
import { EventImage } from '@/components/events/EventImage';
import { cn } from '@/utils/cn';
// Headline font, only needed here (this page is its own lazy chunk).
import '@fontsource-variable/geologica/wght.css';

const T = {
  ru: {
    tag: 'Для школьников 14-18 лет в Казахстане',
    title: 'Найди команду для хакатонов и олимпиад',
    subtitle:
      'Вступай в команду, которой нужны твои навыки, или собери свою. Каждая команда и награда попадает в портфолио для поступления в университет.',
    ctaSignup: 'Создать аккаунт бесплатно',
    ctaBrowse: 'Смотреть события',
    howItWorks: 'Как это работает',
    steps: [
      { title: 'Создай профиль', text: 'Навыки, интересы, школа - это минута. Профиль станет твоим портфолио.' },
      {
        title: 'Найди команду или собери свою',
        text: 'Подай заявку на роль в проекте или создай свой и позови друзей по ссылке.',
      },
      {
        title: 'Участвуй и прокачивайся',
        text: 'Хакатоны и олимпиады в одном месте. Получай XP и значки, выиграй сезон для своей школы.',
      },
    ],
    events: 'Ближайшие события',
    allEvents: 'Все события',
    noEvents: 'Скоро тут появятся хакатоны и олимпиады - мы добавляем новые каждый день.',
    online: 'Онлайн',
    interested: (n: number) => `${n} школьников интересуются`,
    projects: 'Команды ищут людей',
    allProjects: 'Все проекты',
    noProjects: 'Пока никто не опубликовал проект. Создай первую команду - её увидят все школьники на TeamUp.',
    leaderboard: 'Рейтинг школ',
    seasonStarted: 'Сезон только начался - твоя школа может стать №1.',
    seeRanking: 'Смотреть рейтинг',
    portfolioTitle: 'Портфолио собирается само',
    portfolioText:
      'Каждую команду подтверждает её лидер. Добавь дипломы и сертификаты и выгрузи всё в PDF для NU, НИШ или зарубежных вузов.',
    finalTitle: 'Готов найти команду?',
    finalText: 'Бесплатно и только для школьников. Твои контакты видят только те, кого ты принял в команду.',
    faqTitle: 'Частые вопросы',
    faq: [
      { q: 'Это бесплатно?', a: 'Да, полностью. Без рекламы и платных функций.' },
      {
        q: 'Кто видит мои контакты?',
        a: 'Только люди из твоих команд: лидер и участники. Остальные видят имя, школу и навыки, но не контакты. Без аккаунта не видно даже имён.',
      },
      { q: 'Кто может зарегистрироваться?', a: 'Школьники 14-18 лет. Нужна почта - её надо будет подтвердить.' },
      {
        q: 'Что делать, если кто-то ведёт себя плохо?',
        a: 'Нажми «Пожаловаться» в его профиле или на странице проекта - модератор проверит. В чате можно скрыть сообщения этого человека.',
      },
      { q: 'Как удалить аккаунт?', a: 'Напиши на dilanabkanov@gmail.com с почты аккаунта - удалим его и все данные за 7 дней.' },
    ],
    footerTerms: 'Правила',
    finalSafe: 'Без рекламы. Модераторы проверяют каждую жалобу.',
    footerContact: 'Написать нам',
    privacy: 'Конфиденциальность',
  },
  kz: {
    tag: 'Қазақстандағы 14-18 жастағы оқушыларға',
    title: 'Хакатондар мен олимпиадаларға команда тап',
    subtitle:
      'Сенің дағдыларың керек командаға қосыл немесе өз командаңды жина. Әр команда мен марапат университетке түсуге арналған портфолиоңа қосылады.',
    ctaSignup: 'Тегін аккаунт ашу',
    ctaBrowse: 'Іс-шараларды қарау',
    howItWorks: 'Бұл қалай жұмыс істейді',
    steps: [
      { title: 'Профиль жаса', text: 'Дағдылар, қызығушылықтар, мектеп - бір минут. Профилің портфолиоға айналады.' },
      {
        title: 'Команда тап немесе өзің жина',
        text: 'Жобадағы рөлге өтінім бер немесе өз жобаңды ашып, достарыңды сілтеме арқылы шақыр.',
      },
      {
        title: 'Қатыс және деңгейіңді көтер',
        text: 'Хакатондар мен олимпиадалар бір жерде. XP мен белгілер жина, мектебің үшін маусымды ұт.',
      },
    ],
    events: 'Жақын іс-шаралар',
    allEvents: 'Барлық іс-шаралар',
    noEvents: 'Жақында мұнда хакатондар мен олимпиадалар пайда болады - жаңаларын күн сайын қосамыз.',
    online: 'Онлайн',
    interested: (n: number) => `${n} оқушы қызығушылық танытты`,
    projects: 'Адам іздеп жүрген командалар',
    allProjects: 'Барлық жобалар',
    noProjects: 'Әзірге ешкім жоба жарияламады. Алғашқы команданы аш - оны TeamUp-тағы барлық оқушы көреді.',
    leaderboard: 'Мектептер рейтингі',
    seasonStarted: 'Маусым жаңа басталды - сенің мектебің №1 бола алады.',
    seeRanking: 'Рейтингті көру',
    portfolioTitle: 'Портфолио өзі жиналады',
    portfolioText:
      'Әр командаға қатысуыңды оның жетекшісі растайды. Дипломдар мен сертификаттарды қосып, бәрін NU, НЗМ немесе шетелдік университеттер үшін PDF-ке шығар.',
    finalTitle: 'Команда табуға дайынсың ба?',
    finalText: 'Тегін және тек оқушыларға арналған. Байланыс деректеріңді тек командаға қабылдаған адамдарың көреді.',
    faqTitle: 'Жиі қойылатын сұрақтар',
    faq: [
      { q: 'Бұл тегін бе?', a: 'Иә, толығымен. Жарнама мен ақылы функциялар жоқ.' },
      {
        q: 'Менің байланыстарымды кім көреді?',
        a: 'Тек командаларыңдағы адамдар: көшбасшы мен қатысушылар. Басқалар атыңды, мектебіңді және дағдыларыңды көреді, бірақ байланыстарды көрмейді. Аккаунтсыз тіпті аттар да көрінбейді.',
      },
      { q: 'Кім тіркеле алады?', a: '14-18 жастағы оқушылар. Пошта керек - оны растау қажет болады.' },
      {
        q: 'Біреу жаман әрекет етсе не істеу керек?',
        a: 'Оның профилінде немесе жоба бетінде «Шағымдану» бас - модератор тексереді. Чатта бұл адамның хабарламаларын жасыруға болады.',
      },
      { q: 'Аккаунтты қалай өшіруге болады?', a: 'Аккаунт поштасынан dilanabkanov@gmail.com мекенжайына жаз - аккаунт пен барлық деректі 7 күн ішінде өшіреміз.' },
    ],
    footerTerms: 'Ережелер',
    finalSafe: 'Жарнамасыз. Модераторлар әр шағымды тексереді.',
    footerContact: 'Бізге жазу',
    privacy: 'Құпиялылық',
  },
  en: {
    tag: 'For school students 14-18 in Kazakhstan',
    title: 'Find your team for hackathons and olympiads',
    subtitle:
      'Join a team that needs your skills, or gather your own. Every team and award goes into a portfolio you can use for university applications.',
    ctaSignup: 'Create free account',
    ctaBrowse: 'Browse events',
    howItWorks: 'How it works',
    steps: [
      { title: 'Make your profile', text: 'Skills, interests, school - takes a minute. It becomes your portfolio.' },
      {
        title: 'Find a team or start one',
        text: 'Apply for a role on a project, or post yours and invite friends with a link.',
      },
      {
        title: 'Compete and level up',
        text: 'Hackathons and olympiads in one place. Earn XP and badges, win the season for your school.',
      },
    ],
    events: 'Upcoming events',
    allEvents: 'All events',
    noEvents: 'Hackathons and olympiads will show up here soon - we add new ones every day.',
    online: 'Online',
    interested: (n: number) => `${n} students interested`,
    projects: 'Teams looking for people',
    allProjects: 'All projects',
    noProjects: 'Nobody has posted a project yet. Start the first team - every student on TeamUp will see it.',
    leaderboard: 'School leaderboard',
    seasonStarted: 'The season just started - your school could be #1.',
    seeRanking: 'See the ranking',
    portfolioTitle: 'A portfolio that builds itself',
    portfolioText:
      'Every team you join is confirmed by its lead. Add diplomas and certificates, then export everything as a PDF for NU, NIS or universities abroad.',
    finalTitle: 'Ready to find your team?',
    finalText: 'Free, for students only. Your contacts are shown only to teammates you accept.',
    faqTitle: 'FAQ',
    faq: [
      { q: 'Is it free?', a: 'Yes, completely. No ads, no paid features.' },
      {
        q: 'Who can see my contacts?',
        a: "Only people on your teams: the lead and members. Everyone else sees your name, school and skills, but not your contacts. Without an account, not even names are visible.",
      },
      { q: 'Who can sign up?', a: "Students aged 14-18. You'll need an email address and to confirm it." },
      {
        q: 'What if someone behaves badly?',
        a: 'Tap "Report" on their profile or the project page and a moderator will check it. In a chat you can hide that person\'s messages.',
      },
      { q: 'How do I delete my account?', a: "Email dilanabkanov@gmail.com from your account's address and we'll delete it and all data within 7 days." },
    ],
    footerTerms: 'Rules',
    finalSafe: 'No ads. Moderators check every report.',
    footerContact: 'Contact us',
    privacy: 'Privacy',
  },
} satisfies Record<Lang, unknown>;

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', kz: 'kk-KZ', en: 'en-US' };

function formatDate(ts: Timestamp | undefined, lang: Lang) {
  return ts ? ts.toDate().toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

// Hero load-in: one short staggered rise so the eye reads tag, headline,
// text, buttons in order. motion-safe only, so reduced-motion users get the
// page instantly (the delay would otherwise still hide content).
const RISE = 'motion-safe:animate-rise';
const riseDelay = (i: number): CSSProperties => ({ animationDelay: `${i * 70}ms` });

const linkClass =
  'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent-600 hover:underline';

/**
 * What a signed-out visitor sees at "/". Its whole job is to answer
 * "what is this and what do I do?" in one screen, then show real content
 * (events, projects) so it's clear the place is alive.
 */
export default function Home() {
  const lang = useLang();
  const t = T[lang];
  const { data: events, isLoading: loadingEvents } = useEventsList();
  const { data: projects, isLoading: loadingProjects } = useRecommendationPool(true);
  const { data: stats } = useSchoolStats();

  const upcoming = (events ?? []).filter((e) => (e.date?.toMillis() ?? 0) > Date.now()).slice(0, 3);
  const fresh = (projects ?? []).slice(0, 3);
  const topSchools = stats?.season === currentSeason() ? stats.schools.filter((s) => s.score > 0).slice(0, 3) : [];

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero: pitch on the left, live upcoming events as the visual on the right
          (a swipeable strip under the buttons on phones). */}
      <section className="grid gap-10 pt-2 sm:pt-6 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-12">
        <div className="min-w-0">
          {/* Desktop has the switcher in the navbar. */}
          <LanguageSwitcher className="mb-6 w-fit md:hidden" />
          <p style={riseDelay(0)} className={cn('text-sm font-semibold text-accent-700', RISE)}>
            {t.tag}
          </p>
          <h1
            style={riseDelay(1)}
            className={cn(
              'mt-3 max-w-[20ch] lg:max-w-none font-display text-[2.125rem] font-extrabold leading-[1.08] tracking-tight text-surface-900 sm:text-5xl lg:text-[3.25rem]',
              RISE,
            )}
          >
            {t.title}
          </h1>
          <p style={riseDelay(2)} className={cn('mt-5 max-w-[46ch] text-base leading-relaxed text-surface-600 sm:text-lg', RISE)}>
            {t.subtitle}
          </p>
          <div style={riseDelay(3)} className={cn('mt-8 flex flex-col gap-3 sm:flex-row', RISE)}>
            <Link to="/login?mode=signup" className="group">
              <Button size="lg" className="w-full transition-transform group-active:scale-[0.98] sm:w-auto">
                {t.ctaSignup} <ArrowRight size={18} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link to="/events" className="group">
              <Button size="lg" variant="secondary" className="w-full transition-transform group-active:scale-[0.98] sm:w-auto">
                {t.ctaBrowse}
              </Button>
            </Link>
          </div>
        </div>

        <div role="region" aria-labelledby="events-title" className="min-w-0">
          <SectionHeader id="events-title" title={t.events} to="/events" linkText={t.allEvents} />
          {loadingEvents && (
            <div className="-mx-4 flex gap-3 overflow-hidden px-4 lg:mx-0 lg:flex-col lg:px-0">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-56 w-[78%] shrink-0 rounded-2xl lg:h-28 lg:w-full" />
              ))}
            </div>
          )}
          {!loadingEvents && upcoming.length === 0 && (
            <p className="rounded-2xl border border-dashed border-surface-300 p-5 text-sm text-surface-600">{t.noEvents}</p>
          )}
          {upcoming.length > 0 && (
            <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:snap-none lg:flex-col lg:overflow-visible lg:px-0">
              {upcoming.map((ev, i) => (
                <li
                  key={ev.id}
                  className={cn(
                    'w-[78%] shrink-0 snap-start sm:w-[45%] lg:w-auto',
                    // Staggered offsets on desktop so the stack reads as a
                    // pinned-up set of posters, not a table.
                    i === 1 && 'lg:ml-10',
                    i === 2 && 'lg:ml-4',
                  )}
                >
                  <EventTile ev={ev} lang={lang} online={t.online} interested={t.interested} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* How it works: big numbers carry the sequence, no cards. */}
      <section className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:gap-14">
        <h2 className="font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">{t.howItWorks}</h2>
        <ol className="space-y-8">
          {t.steps.map(({ title, text }, i) => (
            <li key={title} className="grid grid-cols-[3rem_1fr] gap-4 sm:grid-cols-[4.5rem_1fr]">
              <span aria-hidden className="font-display text-5xl font-extrabold leading-none text-accent-600 sm:text-6xl">
                {i + 1}
              </span>
              <div className="border-t border-surface-200 pt-3">
                <p className="text-lg font-semibold text-surface-900">{title}</p>
                <p className="mt-1 max-w-[52ch] text-surface-600">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Projects */}
      <section aria-labelledby="projects-title">
        <SectionHeader id="projects-title" title={t.projects} to="/feed" linkText={t.allProjects} large />
        {loadingProjects && (
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        )}
        {!loadingProjects && fresh.length === 0 && (
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-surface-300 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <p className="max-w-[52ch] text-surface-700">{t.noProjects}</p>
            <Link to="/login?mode=signup" className="w-full shrink-0 sm:w-auto">
              <Button className="w-full">{t.ctaSignup}</Button>
            </Link>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          {fresh.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>

      {/* Schools + portfolio: two different tiles, not twin cards. */}
      <section className="grid gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-3xl border border-surface-200 bg-white p-6 sm:p-8">
          <p className="flex items-center gap-2 font-semibold text-surface-900">
            <Trophy size={18} aria-hidden className="text-accent-600" /> {t.leaderboard} · {formatSeason(currentSeason())}
          </p>
          {topSchools.length > 0 ? (
            <ol className="mt-5 space-y-3">
              {topSchools.map((s, i) => (
                <li key={s.key} className="flex items-baseline gap-3">
                  <span className="w-6 shrink-0 font-display text-xl font-bold text-accent-600">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-surface-800">{s.name}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-surface-900">{s.score} XP</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-4 font-display text-2xl font-bold leading-snug text-surface-900">{t.seasonStarted}</p>
          )}
          <Link to="/schools" className={cn(linkClass, 'mt-4')}>
            {t.seeRanking} <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
        <div className="rounded-3xl bg-accent-50 p-6 sm:p-8">
          <FileText size={28} aria-hidden className="text-accent-600" />
          <p className="mt-4 font-display text-2xl font-bold tracking-tight text-surface-900 sm:text-3xl">{t.portfolioTitle}</p>
          <p className="mt-3 max-w-[52ch] text-surface-700">{t.portfolioText}</p>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-title" className="max-w-3xl">
        <h2 id="faq-title" className="font-display text-3xl font-bold tracking-tight text-surface-900 sm:text-4xl">
          {t.faqTitle}
        </h2>
        <div className="mt-6 divide-y divide-surface-200 border-y border-surface-200">
          {t.faq.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium text-surface-900 [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown size={20} aria-hidden className="shrink-0 text-accent-600 transition-transform group-open:rotate-180" />
              </summary>
              <p className="max-w-[60ch] pb-5 leading-relaxed text-surface-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Trust + final CTA */}
      <section className="rounded-3xl bg-accent-600 px-6 py-10 text-white sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <div>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t.finalTitle}</h2>
          <p className="mt-3 max-w-[48ch] text-white">{t.finalText}</p>
          <p className="mt-4 flex items-center gap-1.5 text-sm text-white">
            <ShieldCheck size={16} aria-hidden className="shrink-0" /> {t.finalSafe}
          </p>
        </div>
        <Link to="/login?mode=signup" className="group mt-7 block shrink-0 lg:mt-0">
          <Button size="lg" variant="secondary" className="w-full border-0 transition-transform group-active:scale-[0.98] lg:w-auto">
            {t.ctaSignup} <ArrowRight size={18} aria-hidden />
          </Button>
        </Link>
      </section>

      <footer className="flex flex-col items-center gap-2 border-t border-surface-200 pt-6 text-sm text-surface-600 sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} TeamUp</span>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5">
          <Link to="/terms" className="inline-flex min-h-11 items-center hover:text-surface-900 hover:underline">
            {t.footerTerms}
          </Link>
          <Link to="/privacy" className="inline-flex min-h-11 items-center hover:text-surface-900 hover:underline">
            {t.privacy}
          </Link>
          <a href="mailto:dilanabkanov@gmail.com" className="inline-flex min-h-11 items-center hover:text-surface-900 hover:underline">
            {t.footerContact}
          </a>
        </nav>
      </footer>
    </div>
  );
}

function EventTile({
  ev,
  lang,
  online,
  interested,
}: {
  ev: EventItem;
  lang: Lang;
  online: string;
  interested: (n: number) => string;
}) {
  return (
    <Link
      to={`/events/${ev.id}`}
      className="flex h-full flex-col gap-3 rounded-2xl border border-surface-200 bg-white p-3 transition-[border-color,transform] hover:border-accent-300 active:scale-[0.99] lg:flex-row lg:items-center"
    >
      <EventImage src={ev.imageUrl} fit="contain" className="h-32 w-full shrink-0 lg:h-20 lg:w-32" />
      <div className="min-w-0 px-1 pb-1 lg:p-0">
        <p className="line-clamp-2 font-semibold text-surface-900">{ev.title}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-surface-600">
          <Calendar size={12} aria-hidden className="shrink-0" /> {formatDate(ev.date, lang)}
          {ev.format === 'online' ? ` · ${online}` : ev.location ? ` · ${ev.location}` : ''}
        </p>
        {(ev.interestedCount ?? 0) > 0 && (
          <p className="mt-1.5 text-xs font-medium text-accent-700">{interested(ev.interestedCount ?? 0)}</p>
        )}
      </div>
    </Link>
  );
}

function SectionHeader({
  id,
  title,
  to,
  linkText,
  large,
}: {
  id: string;
  title: string;
  to: string;
  linkText: string;
  large?: boolean;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2
        id={id}
        className={cn(
          'font-display font-bold tracking-tight text-surface-900',
          large ? 'text-3xl sm:text-4xl' : 'text-xl',
        )}
      >
        {title}
      </h2>
      <Link to={to} className={cn(linkClass, 'shrink-0')}>
        {linkText} <ArrowRight size={16} aria-hidden />
      </Link>
    </div>
  );
}
