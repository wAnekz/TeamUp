import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Publicly readable — no RequireAuth/RequireGuest wrapper in App.tsx —
 * because people need to be able to read this *before* creating an account
 * (linked from the signup consent checkbox on Login.tsx) and because a
 * privacy policy that requires a login to view defeats its own purpose.
 *
 * This page has its own EN/RU/KZ switcher rather than the rest of the app
 * being translated — it's the one page a non-Russian-speaking parent,
 * regulator, or platform reviewer is most likely to need to read, and it's
 * the one place a language mismatch (a Russian-only policy on an
 * English-language product) actually matters. This is a self-contained
 * substitute for that mismatch, not a first step toward full-site i18n.
 */

type Lang = 'ru' | 'en' | 'kz';

const LANG_LABEL: Record<Lang, string> = { ru: 'Русский', en: 'English', kz: 'Қазақша' };

const UI = {
  ru: { back: '← TeamUp', updated: 'Дата последнего обновления', title: 'Политика конфиденциальности TeamUp' },
  en: { back: '← TeamUp', updated: 'Last updated', title: 'TeamUp Privacy Policy' },
  kz: { back: '← TeamUp', updated: 'Соңғы жаңарту күні', title: 'TeamUp құпиялылық саясаты' },
};

const EMAIL = 'dilanabkanov@gmail.com';
const SITE_URL = 'https://team-up-web.netlify.app/';
const SITE_LABEL = SITE_URL.replace('https://', '').replace(/\/$/, '');

interface Section {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

// Minimal inline formatter: **bold** and [label](url) (mailto: or https:).
// Kept intentionally tiny — this is a legal document, not a place for rich
// markdown — but bold terms and a handful of contact/provider links are
// enough to need *something* rather than three copies of raw JSX per section.
function renderInline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const isExternal = link[2].startsWith('http');
      return (
        <a
          key={i}
          className="text-accent-600 hover:underline"
          href={link[2]}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noreferrer' : undefined}
        >
          {link[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

const CONTENT: Record<Lang, Section[]> = {
  ru: [
    {
      heading: '1. Кто мы',
      paragraphs: [
        `TeamUp ([${SITE_LABEL}](${SITE_URL})) - платформа, где школьники находят команду для хакатонов, олимпиад и учебных проектов. Разработчик и оператор данных: команда TeamUp, контакт: [${EMAIL}](mailto:${EMAIL}).`,
      ],
    },
    {
      heading: '2. Кого касается эта политика',
      paragraphs: [
        'Сервис предназначен для учащихся **14–18 лет**. Если вам меньше 14 лет - пожалуйста, не создавайте аккаунт. Если вы родитель или законный представитель и считаете, что ваш ребёнок младше 14 лет создал аккаунт - напишите нам, мы удалим данные.',
      ],
    },
    {
      heading: '3. Какие данные мы собираем',
      list: [
        '**Данные аккаунта:** email, пароль (хранится в зашифрованном виде Firebase Authentication, мы его не видим).',
        '**Данные профиля:** имя, возраст, класс, город, школа (по желанию), фото профиля, навыки, интересы, короткое био.',
        '**Контактные данные (по желанию):** телеграм, GitHub, портфолио, Instagram — вы указываете их сами, они видны другим пользователям после того, как вас приняли в команду.',
        '**Данные об активности:** время последнего входа, созданные проекты, заявки, сообщения в командных чатах, поданные жалобы.',
        '**Технические данные:** то, что автоматически собирают наши инфраструктурные провайдеры (см. п. 4), например IP-адрес при обращении к серверу.',
        '**Push-уведомления (по желанию):** если вы включите push-уведомления в настройках, мы храним технический идентификатор вашего устройства (FCM-токен), чтобы присылать уведомления о заявках. Его можно отозвать в любой момент, отключив уведомления или выйдя из аккаунта.',
      ],
      paragraphs: [
        'Мы не запрашиваем намеренно данные о здоровье, религии, паспортные данные и другую чувствительную информацию.',
      ],
    },
    {
      heading: '4. Кто ещё имеет доступ к данным',
      paragraphs: [
        'Мы используем следующих внешних провайдеров для работы сервиса - они обрабатывают данные от нашего имени, каждый по своей политике конфиденциальности:',
      ],
      list: [
        '**Google Firebase** (аутентификация, база данных, хостинг, push-уведомления) — [firebase.google.com/support/privacy](https://firebase.google.com/support/privacy)',
        '**ImgBB** (хранение загруженных фото профиля) — [imgbb.com/privacy](https://imgbb.com/privacy)',
        `**Google (Gmail)** (отправка писем с уведомлениями о заявках и решениях по ним — через обычный Gmail-аккаунт сервиса) — [policies.google.com/privacy](https://policies.google.com/privacy)`,
      ],
    },
    {
      heading: '5. Зачем мы обрабатываем данные',
      list: [
        'Чтобы вы могли зарегистрироваться и пользоваться сервисом.',
        'Чтобы показывать ваш профиль другим пользователям для поиска команды.',
        'Чтобы отправлять уведомления о заявках и решениях по ним (по email и, если вы их включили, push).',
        'Чтобы рассматривать жалобы и поддерживать безопасность платформы (модерация).',
      ],
    },
    {
      heading: '6. Кто видит ваши данные',
      list: [
        '**Имя, город, класс, школа, аватар, био, навыки, интересы** - видны всем зарегистрированным пользователям (профили открыты по замыслу сервиса).',
        '**Email** - виден только вам самим. Другим пользователям он не показывается и не передаётся через интерфейс.',
        '**Контакты (телеграм и т.д.)** - видны только тем, кого вы приняли в команду.',
        '**Сообщения в командном чате** - видны только участникам конкретной команды.',
        '**Модераторам** - ограниченный круг лиц с доступом к очереди жалоб видит контент, на который пожаловались, чтобы принять решение.',
      ],
    },
    {
      heading: '7. Сколько хранятся данные',
      paragraphs: [
        `Данные хранятся, пока существует ваш аккаунт. Если вы хотите удалить аккаунт и все данные - напишите на [${EMAIL}](mailto:${EMAIL}), мы удалим их вручную (в текущей версии сервиса нет кнопки самостоятельного удаления аккаунта).`,
      ],
    },
    {
      heading: '8. Ваши права',
      paragraphs: ['Вы можете:'],
      list: [
        'посмотреть и отредактировать большинство своих данных прямо в разделе «Мой профиль»;',
        'запросить у нас копию своих данных;',
        `попросить исправить или удалить данные, написав на [${EMAIL}](mailto:${EMAIL}).`,
      ],
    },
    {
      heading: '9. Безопасность',
      paragraphs: [
        `Мы используем стандартные механизмы защиты Firebase (шифрование при передаче, правила доступа на уровне базы данных), но ни один сервис не может гарантировать абсолютную защиту. Если вы заметили проблему с безопасностью - сообщите на [${EMAIL}](mailto:${EMAIL}).`,
      ],
    },
    {
      heading: '10. Изменения политики',
      paragraphs: ['Мы можем обновлять эту политику. Существенные изменения будут отмечены здесь с новой датой обновления.'],
    },
    {
      heading: '11. Контакты',
      paragraphs: [`По всем вопросам о данных и этой политике: [${EMAIL}](mailto:${EMAIL}).`],
    },
  ],
  en: [
    {
      heading: '1. Who we are',
      paragraphs: [
        `TeamUp ([${SITE_LABEL}](${SITE_URL})) is a platform where school students find teammates for hackathons, olympiads, and student projects. Developer and data operator: the TeamUp team, contact: [${EMAIL}](mailto:${EMAIL}).`,
      ],
    },
    {
      heading: '2. Who this policy applies to',
      paragraphs: [
        'The service is intended for students aged **14–18**. If you are under 14, please do not create an account. If you are a parent or legal guardian and believe your child under 14 has created an account, contact us and we will delete the data.',
      ],
    },
    {
      heading: '3. What data we collect',
      list: [
        '**Account data:** email, password (stored encrypted by Firebase Authentication — we never see it).',
        '**Profile data:** name, age, grade, city, school (optional), profile photo, skills, interests, short bio.',
        "**Contact details (optional):** Telegram, GitHub, portfolio, Instagram — you provide these yourself; they become visible to other users once you accept them onto a team.",
        '**Activity data:** last active time, created projects, applications, messages in team chats, submitted reports.',
        '**Technical data:** whatever our infrastructure providers automatically collect (see section 4), e.g. IP address when contacting the server.',
        '**Push notifications (optional):** if you turn on push notifications in Settings, we store a technical device identifier (an FCM token) so we can send you application-related notifications. You can revoke this at any time by disabling notifications or signing out.',
      ],
      paragraphs: ['We do not intentionally request health data, religious information, ID/passport numbers, or other sensitive information.'],
    },
    {
      heading: '4. Who else has access to the data',
      paragraphs: [
        'We use the following external providers to run the service - they process data on our behalf, each under their own privacy policy:',
      ],
      list: [
        '**Google Firebase** (authentication, database, hosting, push notifications) — [firebase.google.com/support/privacy](https://firebase.google.com/support/privacy)',
        '**ImgBB** (storage of uploaded profile photos) — [imgbb.com/privacy](https://imgbb.com/privacy)',
        "**Google (Gmail)** (sending application/decision notification emails, via the service's regular Gmail account) — [policies.google.com/privacy](https://policies.google.com/privacy)",
      ],
    },
    {
      heading: '5. Why we process data',
      list: [
        'So you can register and use the service.',
        'To show your profile to other users so they can find you for a team.',
        'To send notifications about applications and decisions on them (by email, and by push if you enabled it).',
        'To review reports and keep the platform safe (moderation).',
      ],
    },
    {
      heading: '6. Who sees your data',
      list: [
        '**Name, city, grade, school, avatar, bio, skills, interests** - visible to all registered users (profiles are open by design).',
        '**Email** - visible only to you. It is never shown to other users or exposed through the interface.',
        '**Contacts (Telegram, etc.)** - visible only to people you have accepted onto a team.',
        "**Team chat messages** - visible only to that team's members.",
        '**Moderators** - a limited set of people with access to the report queue can see reported content in order to make a decision.',
      ],
    },
    {
      heading: '7. How long data is stored',
      paragraphs: [
        `Data is stored for as long as your account exists. If you want to delete your account and all data, email [${EMAIL}](mailto:${EMAIL}) and we will delete it manually (the current version of the service has no self-service account deletion button).`,
      ],
    },
    {
      heading: '8. Your rights',
      paragraphs: ['You can:'],
      list: [
        'view and edit most of your data directly in "My Profile";',
        'request a copy of your data from us;',
        `ask us to correct or delete data by emailing [${EMAIL}](mailto:${EMAIL}).`,
      ],
    },
    {
      heading: '9. Security',
      paragraphs: [
        `We use Firebase's standard protections (encryption in transit, database-level access rules), but no service can guarantee absolute security. If you notice a security issue, report it to [${EMAIL}](mailto:${EMAIL}).`,
      ],
    },
    {
      heading: '10. Changes to this policy',
      paragraphs: ['We may update this policy. Material changes will be noted here with a new "last updated" date.'],
    },
    {
      heading: '11. Contact',
      paragraphs: [`For any questions about data or this policy: [${EMAIL}](mailto:${EMAIL}).`],
    },
  ],
  kz: [
    {
      heading: '1. Біз кімбіз',
      paragraphs: [
        `TeamUp ([${SITE_LABEL}](${SITE_URL})) - мектеп оқушылары хакатон, олимпиада және оқу жобалары үшін команда табатын платформа. Әзірлеуші және деректер операторы: TeamUp тобы, байланыс: [${EMAIL}](mailto:${EMAIL}).`,
      ],
    },
    {
      heading: '2. Бұл саясат кімге қатысты',
      paragraphs: [
        'Қызмет **14–18 жас** аралығындағы оқушыларға арналған. Егер сізге 14 толмаса, аккаунт жасамаңыз. Егер сіз ата-ана немесе заңды өкіл болсаңыз және 14 жасқа толмаған балаңыз аккаунт жасады деп есептесеңіз - бізге жазыңыз, деректерді жоямыз.',
      ],
    },
    {
      heading: '3. Біз қандай деректерді жинаймыз',
      list: [
        '**Аккаунт деректері:** email, құпия сөз (Firebase Authentication шифрланған түрде сақтайды, біз оны көрмейміз).',
        '**Профиль деректері:** аты-жөні, жасы, сынып, қала, мектеп (қалауыңызша), профиль фотосы, дағдылар, қызығушылықтар, қысқаша био.',
        '**Байланыс деректері (қалауыңызша):** telegram, GitHub, портфолио, Instagram — оларды өзіңіз көрсетесіз, сізді командаға қабылдағаннан кейін басқа пайдаланушыларға көрінеді.',
        '**Белсенділік деректері:** соңғы кіру уақыты, құрылған жобалар, өтінімдер, команда чатындағы хабарламалар, жіберілген шағымдар.',
        '**Техникалық деректер:** біздің инфрақұрылым провайдерлері автоматты түрде жинайтын деректер (4-бөлімді қараңыз), мысалы, серверге жүгінгендегі IP-мекенжай.',
        '**Push-хабарландырулар (қалауыңызша):** параметрлерде push-хабарландыруларды қоссаңыз, өтінімдер туралы хабарлама жіберу үшін құрылғыңыздың техникалық идентификаторын (FCM-токен) сақтаймыз. Оны кез келген уақытта хабарландыруларды өшіру немесе аккаунттан шығу арқылы алып тастауға болады.',
      ],
      paragraphs: [
        'Біз денсаулық, дін туралы деректерді, жеке куәлік нөмірлерін және басқа да құпия ақпаратты әдейі сұрамаймыз.',
      ],
    },
    {
      heading: '4. Деректерге тағы кімнің қолжетімділігі бар',
      paragraphs: [
        'Қызметтің жұмысы үшін келесі сыртқы провайдерлерді пайдаланамыз - олар деректерді біздің атымыздан, әрқайсысы өз құпиялылық саясаты бойынша өңдейді:',
      ],
      list: [
        '**Google Firebase** (аутентификация, дерекқор, хостинг, push-хабарландырулар) — [firebase.google.com/support/privacy](https://firebase.google.com/support/privacy)',
        '**ImgBB** (жүктелген профиль фотоларын сақтау) — [imgbb.com/privacy](https://imgbb.com/privacy)',
        '**Google (Gmail)** (өтінімдер мен шешімдер туралы хабарлама хаттарын жіберу — қызметтің әдеттегі Gmail аккаунты арқылы) — [policies.google.com/privacy](https://policies.google.com/privacy)',
      ],
    },
    {
      heading: '5. Деректерді неге өңдейміз',
      list: [
        'Тіркеліп, қызметті пайдалана алуыңыз үшін.',
        'Профиліңізді басқа пайдаланушыларға команда іздеу үшін көрсету үшін.',
        'Өтінімдер мен олар бойынша шешімдер туралы хабарлама жіберу үшін (email арқылы, ал қоссаңыз - push арқылы да).',
        'Шағымдарды қарау және платформаның қауіпсіздігін қамтамасыз ету үшін (модерация).',
      ],
    },
    {
      heading: '6. Деректеріңізді кім көреді',
      list: [
        '**Аты-жөні, қала, сынып, мектеп, аватар, био, дағдылар, қызығушылықтар** - барлық тіркелген пайдаланушыларға көрінеді (профильдер қызметтің тұжырымдамасы бойынша ашық).',
        '**Email** - тек өзіңізге көрінеді. Басқа пайдаланушыларға көрсетілмейді және интерфейс арқылы берілмейді.',
        '**Байланыстар (telegram және т.б.)** - тек сіз командаға қабылдаған адамдарға көрінеді.',
        '**Команда чатындағы хабарламалар** - тек сол команданың қатысушыларына көрінеді.',
        '**Модераторларға** - шағымдар кезегіне қолжетімділігі бар шектеулі топ шешім қабылдау үшін шағым берілген контентті көреді.',
      ],
    },
    {
      heading: '7. Деректер қанша уақыт сақталады',
      paragraphs: [
        `Деректер аккаунтыңыз бар кезде сақталады. Аккаунт пен барлық деректерді жойғыңыз келсе - [${EMAIL}](mailto:${EMAIL}) мекенжайына жазыңыз, оларды қолмен жоямыз (қызметтің қазіргі нұсқасында аккаунтты өз бетімен жою түймесі жоқ).`,
      ],
    },
    {
      heading: '8. Сіздің құқықтарыңыз',
      paragraphs: ['Сіз мыналарды жасай аласыз:'],
      list: [
        'деректеріңіздің көбін тікелей «Менің профилім» бөлімінде көру және өзгерту;',
        'бізден деректеріңіздің көшірмесін сұрау;',
        `[${EMAIL}](mailto:${EMAIL}) мекенжайына жазып, деректерді түзетуді немесе жоюды сұрау.`,
      ],
    },
    {
      heading: '9. Қауіпсіздік',
      paragraphs: [
        `Біз Firebase-тің стандартты қорғау тетіктерін қолданамыз (тасымалдау кезіндегі шифрлау, дерекқор деңгейіндегі қолжетімділік ережелері), бірақ ешбір қызмет абсолютті қорғауды кепілдендіре алмайды. Қауіпсіздік мәселесін байқасаңыз - [${EMAIL}](mailto:${EMAIL}) мекенжайына хабарлаңыз.`,
      ],
    },
    {
      heading: '10. Саясаттың өзгеруі',
      paragraphs: ['Біз бұл саясатты жаңартып отыруымыз мүмкін. Елеулі өзгерістер осы жерде жаңа жаңарту күнімен белгіленеді.'],
    },
    {
      heading: '11. Байланыс',
      paragraphs: [`Деректер мен осы саясат бойынша барлық сұрақтар үшін: [${EMAIL}](mailto:${EMAIL}).`],
    },
  ],
};

const UPDATED_DATE = '14.07.2026';

export default function PrivacyPolicy() {
  const [lang, setLang] = useState<Lang>('ru');
  const t = UI[lang];

  return (
    <div className="min-h-dvh bg-surface-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-surface-200 bg-white p-7 shadow-card sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <Link to="/feed" className="text-sm font-medium text-accent-600 hover:underline">
            {t.back}
          </Link>
          <div className="flex gap-1 rounded-full bg-surface-100 p-1">
            {(Object.keys(LANG_LABEL) as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  lang === l ? 'bg-white text-surface-900 shadow-sm' : 'text-surface-500 hover:text-surface-700'
                }`}
              >
                {LANG_LABEL[l]}
              </button>
            ))}
          </div>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-surface-900">{t.title}</h1>
        <p className="mt-1 text-sm text-surface-400">
          {t.updated}: {UPDATED_DATE}
        </p>

        <div className="prose-sm mt-6 space-y-5 text-sm leading-relaxed text-surface-700">
          {CONTENT[lang].map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-semibold text-surface-900">{section.heading}</h2>
              {section.paragraphs?.map((p, i) => (
                <p key={i} className="mt-1.5">
                  {renderInline(p)}
                </p>
              ))}
              {section.list && (
                <ul className="mt-1.5 list-disc space-y-1 pl-5">
                  {section.list.map((item, i) => (
                    <li key={i}>{renderInline(item)}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
