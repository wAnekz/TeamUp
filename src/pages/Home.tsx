import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, FileText, ShieldCheck, Sparkles, Trophy, UserRound, Users } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { useEventsList } from '@/hooks/useEvents';
import { useRecommendationPool } from '@/hooks/useProjects';
import { useSchoolStats } from '@/hooks/useSchoolStats';
import { currentSeason, formatSeason } from '@/constants/gamification';
import { useLang, type Lang } from '@/lib/lang';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import type { Timestamp } from 'firebase/firestore';

const STEP_ICONS = [UserRound, Users, Trophy];

const T = {
  ru: {
    tag: 'Для школьников 14-18 лет в Казахстане',
    title: 'Найди команду для хакатонов и олимпиад',
    subtitle:
      'Вступай в команду, которой нужны твои навыки, или собери свою. Каждая команда и награда попадает в портфолио для поступления в университет.',
    ctaSignup: 'Создать аккаунт бесплатно',
    ctaBrowse: 'Смотреть проекты',
    haveAccount: 'Уже есть аккаунт?',
    login: 'Войти',
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
    noEvents: 'Новые хакатоны и олимпиады добавляются каждую неделю.',
    online: 'Онлайн',
    interested: (n: number) => `${n} школьников интересуются`,
    projects: 'Команды ищут людей',
    allProjects: 'Все проекты',
    noProjects: 'Пока нет проектов - зарегистрируйся и создай первую команду.',
    leaderboard: 'Рейтинг школ',
    seasonStarted: 'Сезон только начался - твоя школа может стать №1.',
    seeRanking: 'Смотреть рейтинг →',
    portfolioTitle: 'Портфолио собирается само',
    portfolioText:
      'Каждую команду подтверждает её лидер. Добавь дипломы и сертификаты и выгрузи всё в PDF для NU, НИШ или зарубежных вузов.',
    finalTitle: 'Готов найти команду?',
    finalText: 'Бесплатно и только для школьников. Твои контакты видят только те, кого ты принял в команду.',
    privacy: 'Политика конфиденциальности',
  },
  kz: {
    tag: 'Қазақстандағы 14-18 жастағы оқушыларға',
    title: 'Хакатондар мен олимпиадаларға команда тап',
    subtitle:
      'Сенің дағдыларың керек командаға қосыл немесе өз командаңды жина. Әр команда мен марапат университетке түсуге арналған портфолиоңа қосылады.',
    ctaSignup: 'Тегін аккаунт ашу',
    ctaBrowse: 'Жобаларды қарау',
    haveAccount: 'Аккаунтың бар ма?',
    login: 'Кіру',
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
    noEvents: 'Жаңа хакатондар мен олимпиадалар апта сайын қосылады.',
    online: 'Онлайн',
    interested: (n: number) => `${n} оқушы қызығушылық танытты`,
    projects: 'Адам іздеп жүрген командалар',
    allProjects: 'Барлық жобалар',
    noProjects: 'Әзірге жоба жоқ - тіркеліп, алғашқы команданы аш.',
    leaderboard: 'Мектептер рейтингі',
    seasonStarted: 'Маусым жаңа басталды - сенің мектебің №1 бола алады.',
    seeRanking: 'Рейтингті көру →',
    portfolioTitle: 'Портфолио өзі жиналады',
    portfolioText:
      'Әр командаға қатысуыңды оның жетекшісі растайды. Дипломдар мен сертификаттарды қосып, бәрін NU, НЗМ немесе шетелдік университеттер үшін PDF-ке шығар.',
    finalTitle: 'Команда табуға дайынсың ба?',
    finalText: 'Тегін және тек оқушыларға арналған. Байланыс деректеріңді тек командаға қабылдаған адамдарың көреді.',
    privacy: 'Құпиялылық саясаты',
  },
  en: {
    tag: 'For school students 14-18 in Kazakhstan',
    title: 'Find your team for hackathons and olympiads',
    subtitle:
      'Join a team that needs your skills, or gather your own. Every team and award goes into a portfolio you can use for university applications.',
    ctaSignup: 'Create free account',
    ctaBrowse: 'Browse projects',
    haveAccount: 'Already have an account?',
    login: 'Log in',
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
    noEvents: 'New hackathons and olympiads are added every week.',
    online: 'Online',
    interested: (n: number) => `${n} students interested`,
    projects: 'Teams looking for people',
    allProjects: 'All projects',
    noProjects: 'Be the first to post a project - sign up and start a team.',
    leaderboard: 'School leaderboard',
    seasonStarted: 'The season just started - your school could be #1.',
    seeRanking: 'See the ranking →',
    portfolioTitle: 'A portfolio that builds itself',
    portfolioText:
      'Every team you join is confirmed by its lead. Add diplomas and certificates, then export everything as a PDF for NU, NIS or universities abroad.',
    finalTitle: 'Ready to find your team?',
    finalText: 'Free, for students only. Your contacts are shown only to teammates you accept.',
    privacy: 'Privacy policy',
  },
} satisfies Record<Lang, unknown>;

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', kz: 'kk-KZ', en: 'en-US' };

function formatDate(ts: Timestamp | undefined, lang: Lang) {
  return ts ? ts.toDate().toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' }) : '';
}

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
    <div className="space-y-12 sm:space-y-16">
      {/* Hero */}
      <section className="pt-2 text-center sm:pt-8">
        <div className="mb-5 flex justify-center">
          <LanguageSwitcher />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-medium text-accent-700">
          <Sparkles size={12} /> {t.tag}
        </span>
        <h1 className="mx-auto mt-4 max-w-2xl text-3xl font-bold tracking-tight text-surface-900 sm:text-5xl">
          {t.title}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-surface-500 sm:text-lg">{t.subtitle}</p>
        <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <Link to="/login?mode=signup">
            <Button size="lg" className="w-full sm:w-auto">
              {t.ctaSignup} <ArrowRight size={18} />
            </Button>
          </Link>
          <Link to="/feed">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              {t.ctaBrowse}
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-xs text-surface-400">
          {t.haveAccount}{' '}
          <Link to="/login" className="font-medium text-accent-600 hover:underline">
            {t.login}
          </Link>
        </p>
      </section>

      {/* How it works */}
      <section>
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-surface-400">
          {t.howItWorks}
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {t.steps.map(({ title, text }, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <Card key={title} className="relative">
                <span className="absolute right-4 top-4 text-3xl font-bold text-surface-100">{i + 1}</span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                  <Icon size={20} />
                </div>
                <p className="mt-3 font-semibold text-surface-900">{title}</p>
                <p className="mt-1 text-sm text-surface-500">{text}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Events */}
      <section>
        <SectionHeader title={t.events} to="/events" linkText={t.allEvents} />
        {loadingEvents && <Skeleton className="h-24" />}
        {!loadingEvents && upcoming.length === 0 && <p className="text-sm text-surface-500">{t.noEvents}</p>}
        <div className="grid gap-3 sm:grid-cols-3">
          {upcoming.map((ev) => (
            <Link key={ev.id} to={`/events/${ev.id}`}>
              <Card className="h-full transition-colors hover:border-accent-300">
                {ev.imageUrl && <img src={ev.imageUrl} alt="" className="mb-3 h-28 w-full rounded-xl object-cover" />}
                <p className="line-clamp-2 font-semibold text-surface-900">{ev.title}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-surface-500">
                  <Calendar size={12} /> {formatDate(ev.date, lang)}
                  {ev.format === 'online' ? ` · ${t.online}` : ev.location ? ` · ${ev.location}` : ''}
                </p>
                {(ev.interestedCount ?? 0) > 0 && (
                  <p className="mt-2 text-xs font-medium text-accent-700">{t.interested(ev.interestedCount ?? 0)}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Projects */}
      <section>
        <SectionHeader title={t.projects} to="/feed" linkText={t.allProjects} />
        {loadingProjects && <Skeleton className="h-40" />}
        {!loadingProjects && fresh.length === 0 && <p className="text-sm text-surface-500">{t.noProjects}</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          {fresh.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      </section>

      {/* Schools + portfolio */}
      <section className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="flex items-center gap-2 font-semibold text-surface-900">
            <Trophy size={18} className="text-amber-500" /> {t.leaderboard} · {formatSeason(currentSeason())}
          </p>
          {topSchools.length > 0 ? (
            <ol className="mt-3 space-y-1.5 text-sm">
              {topSchools.map((s, i) => (
                <li key={s.key} className="flex justify-between gap-3">
                  <span className="truncate text-surface-700">
                    {i + 1}. {s.name}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-surface-900">{s.score} XP</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-surface-500">{t.seasonStarted}</p>
          )}
          <Link to="/schools" className="mt-3 inline-block text-sm font-medium text-accent-600 hover:underline">
            {t.seeRanking}
          </Link>
        </Card>
        <Card>
          <p className="flex items-center gap-2 font-semibold text-surface-900">
            <FileText size={18} className="text-accent-600" /> {t.portfolioTitle}
          </p>
          <p className="mt-2 text-sm text-surface-500">{t.portfolioText}</p>
        </Card>
      </section>

      {/* Trust + final CTA */}
      <section className="rounded-3xl bg-accent-600 px-6 py-10 text-center text-white">
        <h2 className="text-2xl font-bold">{t.finalTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-accent-100">{t.finalText}</p>
        <Link to="/login?mode=signup" className="mt-5 inline-block">
          <Button size="lg" variant="secondary" className="border-0">
            {t.ctaSignup}
          </Button>
        </Link>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-accent-100">
          <ShieldCheck size={13} />
          <Link to="/privacy" className="underline-offset-2 hover:underline">
            {t.privacy}
          </Link>
        </p>
      </section>
    </div>
  );
}

function SectionHeader({ title, to, linkText }: { title: string; to: string; linkText: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold text-surface-900">{title}</h2>
      <Link to={to} className="shrink-0 text-sm font-medium text-accent-600 hover:underline">
        {linkText} →
      </Link>
    </div>
  );
}
