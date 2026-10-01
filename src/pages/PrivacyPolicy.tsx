import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { setLang, useLang } from '@/lib/lang';

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
        '**Данные профиля:** имя, возраст, класс, город, школа (по желанию, выбирается из общего справочника или добавляется вами), фото профиля, навыки, интересы, короткое био.',
        '**Контактные данные (по желанию):** телеграм, GitHub, портфолио, Instagram — вы указываете их сами. Они видны только вам и участникам ваших команд (см. п. 6).',
        '**Достижения (по желанию):** название, результат, дата, описание, ссылка и прикреплённый файл (фото диплома или PDF-сертификат). На файле может быть ваше ФИО и школа — загружайте только то, что готовы показать.',
        '**Данные об активности:** время последнего входа, созданные проекты и их итоги, заявки, приглашения в команды, отметки «Мне интересно» у событий, сообщения в командных чатах, поданные жалобы.',
        '**Игровые данные:** очки опыта (XP), уровень и значки. Они начисляются автоматически за подтверждённые действия (например, когда вас приняли в команду) и используются для сезонного рейтинга школ.',
        '**Telegram (по желанию):** если вы подключите Telegram-бота в настройках, мы храним идентификатор чата и ваш username в Telegram, чтобы присылать туда уведомления. Отключить можно в настройках или командой /stop в боте.',
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
        '**ImgBB** (хранение фото профиля, загруженных до 01.10.2026) — [imgbb.com/privacy](https://imgbb.com/privacy)',
        '**Firebase Storage** (хранение фото профиля и файлов достижений) — входит в Google Firebase, см. выше.',
        '**Telegram** (доставка уведомлений, если вы подключили бота) — [telegram.org/privacy](https://telegram.org/privacy)',
        '**Groq** (автоматическая проверка текстов новых проектов и постов «Ищу команду» на недопустимый контент; также разбор публичных постов из Telegram-каналов организаторов для поиска новых событий) — [groq.com/privacy-policy](https://groq.com/privacy-policy/)',
        `**Google (Gmail)** (отправка писем с уведомлениями о заявках и решениях по ним — через обычный Gmail-аккаунт сервиса) — [policies.google.com/privacy](https://policies.google.com/privacy)`,
      ],
    },
    {
      heading: '5. Зачем мы обрабатываем данные',
      list: [
        'Чтобы вы могли зарегистрироваться и пользоваться сервисом.',
        'Чтобы показывать ваш профиль другим пользователям для поиска команды.',
        'Чтобы отправлять уведомления о заявках, решениях по ним и приглашениях в команды (по email, а если вы их включили — push и Telegram).',
        'Чтобы напоминать о дедлайнах событий, которые вы отметили «Мне интересно».',
        'Если вы давно не заходили — иногда (не чаще раза в неделю и не больше трёх раз подряд) присылать push или Telegram-сообщение с конкретным поводом: например, в вашу команду пришли заявки или появилась команда под ваши навыки. Только если вы включили push или подключили Telegram; отключается там же.',
        'Чтобы подбирать проекты и участников под ваши навыки, вести рейтинг школ и собирать ваше портфолио.',
        'Чтобы рассматривать жалобы и поддерживать безопасность платформы (модерация).',
        'Чтобы видеть общую статистику сервиса (например, сколько человек зарегистрировалось за неделю) — только в виде суммарных чисел, без отслеживания отдельных пользователей.',
      ],
    },
    {
      heading: '6. Кто видит ваши данные',
      list: [
        '**Имя, город, класс, школа, аватар, био, навыки, интересы, достижения (включая прикреплённые файлы), команды, в которых вы состоите, уровень и значки** - видны всем зарегистрированным пользователям (профили открыты по замыслу сервиса).',
        '**Посетители без аккаунта** видят только события, рейтинг школ (суммарные очки школ) и обезличенные карточки проектов — название, описание, роли, нужные навыки и итог команды, **без имён, фото и состава команды**. Профили им недоступны.',
        '**Контакты (телеграм и т.д.)** - видны только вам и тем, с кем вы в одной команде: лидеру и участникам общих проектов. Доступ открывается автоматически, когда вас принимают в команду (или вы принимаете кого-то), и закрывается, если общих команд больше нет.',
        '**Email** - виден только вам самим. Другим пользователям он не показывается и не передаётся через интерфейс.',
        '**Сообщения в командном чате** - видны только участникам конкретной команды.',
        '**Отметка «Мне интересно»** у события - ваше имя и фото видны зарегистрированным пользователям в списке интересующихся, чтобы можно было найти команду.',
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
        'посмотреть и отредактировать большинство своих данных прямо в разделе «Мой профиль», удалить свои достижения, отключить push и Telegram;',
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
        '**Profile data:** name, age, grade, city, school (optional; picked from a shared directory or added by you), profile photo, skills, interests, short bio.',
        '**Contact details (optional):** Telegram, GitHub, portfolio, Instagram — you provide these yourself. They are visible only to you and the people on your teams (see section 6).',
        '**Achievements (optional):** title, result, date, description, link and an attached file (a photo of a diploma or a PDF certificate). A file may show your full name and school — only upload what you are happy to show.',
        '**Activity data:** last active time, created projects and their results, applications, team invites, "interested" marks on events, messages in team chats, submitted reports.',
        '**Game data:** experience points (XP), level and badges. Granted automatically for confirmed actions (e.g. being accepted onto a team) and used for the seasonal school leaderboard.',
        '**Telegram (optional):** if you connect the Telegram bot in Settings, we store your chat ID and Telegram username to send notifications there. Disconnect in Settings or with /stop in the bot.',
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
        '**ImgBB** (storage of profile photos uploaded before 01.10.2026) — [imgbb.com/privacy](https://imgbb.com/privacy)',
        '**Firebase Storage** (storage of profile photos and achievement files) — part of Google Firebase, see above.',
        '**Telegram** (delivering notifications if you connected the bot) — [telegram.org/privacy](https://telegram.org/privacy)',
        '**Groq** (automatic screening of new project and "looking for team" texts for harmful content; also reading public posts from organizers\' Telegram channels to find new events) — [groq.com/privacy-policy](https://groq.com/privacy-policy/)',
        "**Google (Gmail)** (sending application/decision notification emails, via the service's regular Gmail account) — [policies.google.com/privacy](https://policies.google.com/privacy)",
      ],
    },
    {
      heading: '5. Why we process data',
      list: [
        'So you can register and use the service.',
        'To show your profile to other users so they can find you for a team.',
        'To send notifications about applications, decisions on them and team invites (by email, and by push and Telegram if you enabled them).',
        'To remind you about deadlines of events you marked as interested.',
        'If you have not visited for a while — occasionally (at most once a week and three times in a row) send a push or Telegram message with a concrete reason, e.g. applications waiting on your team or a new team that needs your skills. Only if you enabled push or connected Telegram; turn it off in the same place.',
        'To match projects and teammates to your skills, run the school leaderboard and build your portfolio.',
        'To review reports and keep the platform safe (moderation).',
        'To see overall service statistics (e.g. how many people signed up this week) — as totals only, without tracking individual users.',
      ],
    },
    {
      heading: '6. Who sees your data',
      list: [
        '**Name, city, grade, school, avatar, bio, skills, interests, achievements (including attached files), the teams you are on, level and badges** - visible to all registered users (profiles are open by design).',
        '**Visitors without an account** only see events, the school leaderboard (school point totals) and anonymized project cards — title, description, roles, required skills and the team result, **with no names, photos or team members**. Profiles are not available to them.',
        '**Contacts (Telegram, etc.)** - visible only to you and the people you share a team with: the lead and members of any common project. Access opens automatically when you are accepted onto a team (or accept someone) and closes when you no longer share a team.',
        '**Email** - visible only to you. It is never shown to other users or exposed through the interface.',
        "**Team chat messages** - visible only to that team's members.",
        '**An "interested" mark** on an event - your name and photo are visible to registered users in the list of interested people, so teams can find each other.',
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
        'view and edit most of your data directly in "My Profile", delete your achievements, turn off push and Telegram;',
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
        '**Профиль деректері:** аты-жөні, жасы, сынып, қала, мектеп (қалауыңызша; ортақ анықтамалықтан таңдалады немесе өзіңіз қосасыз), профиль фотосы, дағдылар, қызығушылықтар, қысқаша био.',
        '**Байланыс деректері (қалауыңызша):** telegram, GitHub, портфолио, Instagram — оларды өзіңіз көрсетесіз. Олар тек өзіңізге және командаларыңыздың мүшелеріне көрінеді (6-бөлімді қараңыз).',
        '**Жетістіктер (қалауыңызша):** атауы, нәтижесі, күні, сипаттамасы, сілтеме және тіркелген файл (диплом фотосы немесе PDF-сертификат). Файлда аты-жөніңіз бен мектебіңіз болуы мүмкін — көрсетуге дайын нәрсені ғана жүктеңіз.',
        '**Белсенділік деректері:** соңғы кіру уақыты, құрылған жобалар мен олардың нәтижелері, өтінімдер, командаға шақырулар, іс-шаралардағы «Маған қызық» белгілері, команда чатындағы хабарламалар, жіберілген шағымдар.',
        '**Ойын деректері:** тәжірибе ұпайлары (XP), деңгей және белгілер. Расталған әрекеттер үшін автоматты түрде беріледі (мысалы, сізді командаға қабылдағанда) және мектептердің маусымдық рейтингінде қолданылады.',
        '**Telegram (қалауыңызша):** баптауларда Telegram-ботты қоссаңыз, хабарлама жіберу үшін чат идентификаторы мен Telegram username-іңізді сақтаймыз. Баптауларда немесе боттағы /stop командасымен ажыратуға болады.',
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
        '**ImgBB** (01.10.2026 дейін жүктелген профиль фотоларын сақтау) — [imgbb.com/privacy](https://imgbb.com/privacy)',
        '**Firebase Storage** (профиль фотолары мен жетістік файлдарын сақтау) — Google Firebase құрамында, жоғарыны қараңыз.',
        '**Telegram** (ботты қоссаңыз, хабарламаларды жеткізу) — [telegram.org/privacy](https://telegram.org/privacy)',
        '**Groq** (жаңа жобалар мен «Команда іздеймін» мәтіндерін орынсыз мазмұнға автоматты тексеру; сондай-ақ жаңа іс-шараларды табу үшін ұйымдастырушылардың ашық Telegram-арналарындағы жазбаларды талдау) — [groq.com/privacy-policy](https://groq.com/privacy-policy/)',
        '**Google (Gmail)** (өтінімдер мен шешімдер туралы хабарлама хаттарын жіберу — қызметтің әдеттегі Gmail аккаунты арқылы) — [policies.google.com/privacy](https://policies.google.com/privacy)',
      ],
    },
    {
      heading: '5. Деректерді неге өңдейміз',
      list: [
        'Тіркеліп, қызметті пайдалана алуыңыз үшін.',
        'Профиліңізді басқа пайдаланушыларға команда іздеу үшін көрсету үшін.',
        'Өтінімдер, олар бойынша шешімдер және командаға шақырулар туралы хабарлама жіберу үшін (email арқылы, ал қоссаңыз - push және Telegram арқылы да).',
        '«Маған қызық» деп белгілеген іс-шаралардың мерзімдерін еске салу үшін.',
        'Ұзақ уақыт кірмесеңіз — кейде (аптасына бір реттен жиі емес және қатарынан үш реттен көп емес) нақты себеппен push немесе Telegram-хабарлама жіберу үшін: мысалы, командаңызға өтінімдер келді немесе дағдыларыңызға сай команда пайда болды. Тек push қосылған немесе Telegram жалғанған болса; сол жерде өшіріледі.',
        'Дағдыларыңызға сай жобалар мен қатысушыларды таңдау, мектептер рейтингін жүргізу және портфолиоңызды жинау үшін.',
        'Шағымдарды қарау және платформаның қауіпсіздігін қамтамасыз ету үшін (модерация).',
        'Қызметтің жалпы статистикасын көру үшін (мысалы, аптада қанша адам тіркелгені) — тек жиынтық сандар түрінде, жеке пайдаланушыларды бақыламай.',
      ],
    },
    {
      heading: '6. Деректеріңізді кім көреді',
      list: [
        '**Аты-жөні, қала, сынып, мектеп, аватар, био, дағдылар, қызығушылықтар, жетістіктер (тіркелген файлдарды қоса), сіз мүше командалар, деңгей мен белгілер** - барлық тіркелген пайдаланушыларға көрінеді (профильдер қызметтің тұжырымдамасы бойынша ашық).',
        '**Аккаунтсыз келушілер** тек іс-шараларды, мектептер рейтингін (мектептердің жиынтық ұпайлары) және иесіздендірілген жоба карточкаларын көреді — атауы, сипаттамасы, рөлдері, қажетті дағдылар және команда нәтижесі, **аттарсыз, фотосыз және команда құрамынсыз**. Профильдер оларға қолжетімсіз.',
        '**Байланыстар (telegram және т.б.)** - тек өзіңізге және сізбен бір командадағыларға көрінеді: ортақ жобалардың жетекшісі мен қатысушыларына. Сізді командаға қабылдағанда (немесе сіз біреуді қабылдағанда) қолжетімділік автоматты түрде ашылады, ал ортақ команда қалмаса жабылады.',
        '**Email** - тек өзіңізге көрінеді. Басқа пайдаланушыларға көрсетілмейді және интерфейс арқылы берілмейді.',
        '**Команда чатындағы хабарламалар** - тек сол команданың қатысушыларына көрінеді.',
        '**Іс-шарадағы «Маған қызық» белгісі** - команда табу үшін атыңыз бен фотоңыз қызығушылық танытқандар тізімінде тіркелген пайдаланушыларға көрінеді.',
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
        'деректеріңіздің көбін тікелей «Менің профилім» бөлімінде көру және өзгерту, жетістіктеріңізді жою, push пен Telegram-ды өшіру;',
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

const UPDATED_DATE = '01.10.2026';

export default function PrivacyPolicy() {
  // Opens in whatever language the visitor already picked on the landing /
  // sign-up page; switching here updates that shared choice too.
  const lang = useLang();
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
