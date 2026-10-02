import { LegalPage, type LegalContent } from '@/components/layout/LegalPage';
import type { Lang } from '@/lib/lang';

/** Rules of use, public like /privacy. Written for 14–18 year olds: short and plain. */

const EMAIL = 'dilanabkanov@gmail.com';
const UPDATED_DATE = '01.10.2026';

const CONTENT: Record<Lang, LegalContent> = {
  ru: {
    title: 'Правила TeamUp',
    summaryTitle: 'Коротко',
    summary: [
      'TeamUp для школьников 14-18 лет. Один человек - один аккаунт.',
      'Общайся уважительно: без оскорблений, травли, спама и рекламы.',
      'Не публикуй чужие контакты, адреса и фото без разрешения.',
      'Видишь нарушение - нажми «Пожаловаться» в профиле или проекте.',
      'За нарушения аккаунт блокируют.',
    ],
    sections: [
      {
        heading: '1. Кто может пользоваться',
        paragraphs: [
          'TeamUp - бесплатный сервис для школьников **14-18 лет**, которые ищут команду на хакатоны, олимпиады и учебные проекты. Регистрируясь, ты подтверждаешь, что тебе есть 14 лет и что данные в профиле - твои.',
        ],
      },
      {
        heading: '2. Что нельзя',
        list: [
          'оскорблять, травить, угрожать или унижать других;',
          'рассылать спам, рекламу, ссылки на сомнительные сайты;',
          'выдавать себя за другого человека или создавать несколько аккаунтов;',
          'публиковать чужие личные данные: телефон, адрес, фото, переписку;',
          'выкладывать контент для взрослых, про насилие, наркотики или азартные игры;',
          'просить деньги, пароли или коды из СМС.',
        ],
      },
      {
        heading: '3. Безопасность',
        list: [
          'Не сообщай пароль, домашний адрес и данные банковских карт никому, даже тиммейтам.',
          'Если договариваетесь встретиться вживую - встречайтесь в людном месте (школа, коворкинг, площадка хакатона) и предупреди родителей.',
          'Если кто-то пишет тебе что-то неприятное или странное - не отвечай, заблокируй его в чате и пожалуйся.',
        ],
      },
      {
        heading: '4. Жалобы и блокировки',
        paragraphs: [
          'Кнопка **«Пожаловаться»** есть в профиле пользователя и на странице проекта. Модератор проверяет каждую жалобу. Тот, на кого ты пожаловался(ась), не узнает, кто это сделал.',
          'За нарушение правил мы можем удалить контент или заблокировать аккаунт. Если считаешь блокировку ошибкой - напиши нам.',
        ],
      },
      {
        heading: '5. Твой контент',
        paragraphs: [
          'Ты отвечаешь за то, что публикуешь: проекты, сообщения, достижения и файлы. Мы можем удалить то, что нарушает эти правила.',
        ],
      },
      {
        heading: '6. Удаление аккаунта',
        paragraphs: [
          `Напиши на [${EMAIL}](mailto:${EMAIL}) с почты, на которую зарегистрирован аккаунт, и мы удалим аккаунт и все данные в течение 7 дней. Подробнее - в [политике конфиденциальности](/privacy).`,
        ],
      },
      {
        heading: '7. Прочее',
        paragraphs: [
          'Сервис бесплатный и работает «как есть»: мы стараемся, чтобы всё работало, но не можем обещать, что не будет сбоев. Правила могут меняться, о важных изменениях мы сообщим на сайте.',
          `Вопросы - на [${EMAIL}](mailto:${EMAIL}).`,
        ],
      },
    ],
  },
  en: {
    title: 'TeamUp Rules',
    summaryTitle: 'In short',
    summary: [
      'TeamUp is for students aged 14-18. One person, one account.',
      'Be respectful: no insults, bullying, spam or ads.',
      "Don't post other people's contacts, addresses or photos without permission.",
      'See something wrong? Tap "Report" on a profile or project.',
      'Breaking the rules gets an account suspended.',
    ],
    sections: [
      {
        heading: '1. Who can use TeamUp',
        paragraphs: [
          'TeamUp is a free service for students aged **14-18** looking for a team for hackathons, olympiads and school projects. By signing up you confirm you are at least 14 and the profile details are yours.',
        ],
      },
      {
        heading: "2. What's not allowed",
        list: [
          'insulting, bullying, threatening or humiliating others;',
          'spam, ads, links to shady websites;',
          'pretending to be someone else or making multiple accounts;',
          "posting other people's personal data: phone, address, photos, messages;",
          'adult content, violence, drugs or gambling;',
          'asking for money, passwords or SMS codes.',
        ],
      },
      {
        heading: '3. Staying safe',
        list: [
          "Never share your password, home address or card details with anyone, even teammates.",
          'If you meet in person, meet somewhere public (school, coworking space, the hackathon venue) and tell your parents.',
          "If someone sends you something unpleasant or weird, don't reply: block them in the chat and report them.",
        ],
      },
      {
        heading: '4. Reports and suspensions',
        paragraphs: [
          'The **"Report"** button is on every user profile and project page. A moderator checks every report. The person you report won\'t know it was you.',
          'For breaking these rules we may remove content or suspend an account. If you think a suspension is a mistake, write to us.',
        ],
      },
      {
        heading: '5. Your content',
        paragraphs: [
          'You are responsible for what you post: projects, messages, achievements and files. We may remove anything that breaks these rules.',
        ],
      },
      {
        heading: '6. Deleting your account',
        paragraphs: [
          `Email [${EMAIL}](mailto:${EMAIL}) from the address you signed up with and we'll delete your account and all data within 7 days. More in the [privacy policy](/privacy).`,
        ],
      },
      {
        heading: '7. Other',
        paragraphs: [
          "The service is free and provided as is: we work hard to keep it running but can't promise there will never be outages. These rules may change; we'll announce important changes on the site.",
          `Questions: [${EMAIL}](mailto:${EMAIL}).`,
        ],
      },
    ],
  },
  kz: {
    title: 'TeamUp ережелері',
    summaryTitle: 'Қысқаша',
    summary: [
      'TeamUp 14-18 жастағы оқушыларға арналған. Бір адам - бір аккаунт.',
      'Құрметпен сөйлес: қорлау, қудалау, спам және жарнамасыз.',
      'Басқалардың байланыстарын, мекенжайын, суретін рұқсатсыз жариялама.',
      'Бұзушылықты көрсең - профильде немесе жобада «Шағымдану» бас.',
      'Ережені бұзғаны үшін аккаунт бұғатталады.',
    ],
    sections: [
      {
        heading: '1. Кім қолдана алады',
        paragraphs: [
          'TeamUp - хакатондарға, олимпиадаларға және оқу жобаларына команда іздейтін **14-18 жастағы** оқушыларға арналған тегін сервис. Тіркелу арқылы сен 14 жасқа толғаныңды және профильдегі деректер сенікі екенін растайсың.',
        ],
      },
      {
        heading: '2. Не істеуге болмайды',
        list: [
          'басқаларды қорлау, қудалау, қорқыту немесе кемсіту;',
          'спам, жарнама, күмәнді сайттарға сілтемелер тарату;',
          'басқа адам болып көріну немесе бірнеше аккаунт ашу;',
          'басқалардың жеке деректерін жариялау: телефон, мекенжай, сурет, хат алмасу;',
          'ересектерге арналған, зорлық-зомбылық, есірткі немесе құмар ойындар туралы контент;',
          'ақша, құпиясөз немесе SMS-кодтар сұрау.',
        ],
      },
      {
        heading: '3. Қауіпсіздік',
        list: [
          'Құпиясөзіңді, үй мекенжайыңды және карта деректерін ешкімге, тіпті командаласқа да айтпа.',
          'Кездесуге келіссеңдер - адам көп жерде (мектеп, коворкинг, хакатон алаңы) кездесіңдер және ата-анаңа айт.',
          'Біреу жағымсыз немесе біртүрлі нәрсе жазса - жауап берме, чатта бұғатта және шағым жаса.',
        ],
      },
      {
        heading: '4. Шағымдар және бұғаттау',
        paragraphs: [
          '**«Шағымдану»** батырмасы пайдаланушы профилінде және жоба бетінде бар. Модератор әр шағымды тексереді. Шағым түскен адам оны кім жасағанын білмейді.',
          'Ережені бұзғаны үшін контентті өшіріп немесе аккаунтты бұғаттай аламыз. Бұғаттау қате деп ойласаң - бізге жаз.',
        ],
      },
      {
        heading: '5. Сенің контентің',
        paragraphs: [
          'Жариялағаның үшін өзің жауап бересің: жобалар, хабарламалар, жетістіктер мен файлдар. Ережені бұзатын нәрсені өшіре аламыз.',
        ],
      },
      {
        heading: '6. Аккаунтты өшіру',
        paragraphs: [
          `Аккаунт тіркелген поштадан [${EMAIL}](mailto:${EMAIL}) мекенжайына жаз, аккаунт пен барлық деректі 7 күн ішінде өшіреміз. Толығырақ - [құпиялылық саясатында](/privacy).`,
        ],
      },
      {
        heading: '7. Басқасы',
        paragraphs: [
          'Сервис тегін және «қалай бар, солай» жұмыс істейді: бәрі жұмыс істеуі үшін тырысамыз, бірақ ақаулар болмайды деп уәде бере алмаймыз. Ережелер өзгеруі мүмкін, маңызды өзгерістер туралы сайтта хабарлаймыз.',
          `Сұрақтар: [${EMAIL}](mailto:${EMAIL}).`,
        ],
      },
    ],
  },
};

export default function Terms() {
  return <LegalPage content={CONTENT} updated={UPDATED_DATE} />;
}
