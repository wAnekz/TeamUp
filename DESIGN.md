---
name: TeamUp
description: Поиск тиммейтов на хакатоны, олимпиады и проекты для школьников Алматы
colors:
  indigo-signal: "#4F46E5"
  indigo-signal-deep: "#4338CA"
  indigo-signal-pressed: "#3730A3"
  indigo-mist: "#EEF2FF"
  indigo-haze: "#E0E7FF"
  indigo-focus: "#6366F1"
  paper: "#FAFAFA"
  card-white: "#FFFFFF"
  chalk: "#F4F4F5"
  hairline: "#E4E4E7"
  field-stroke: "#6F6F77"
  muted-ink: "#606069"
  soft-ink: "#3F3F46"
  ink: "#18181B"
  night: "#0B0B0F"
  night-card: "#141419"
  success: "#047857"
  danger: "#DC2626"
  warning: "#B45309"
typography:
  display:
    fontFamily: "Geologica Variable, Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geologica Variable, Inter Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  label-small:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  lg: "8px"
  xl: "14px"
  2xl: "20px"
  3xl: "28px"
  full: "9999px"
spacing:
  1: "4px"
  1.5: "6px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
components:
  button-primary:
    backgroundColor: "{colors.indigo-signal}"
    textColor: "{colors.card-white}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.indigo-signal-deep}"
  button-primary-active:
    backgroundColor: "{colors.indigo-signal-pressed}"
  button-secondary:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "40px"
  button-secondary-hover:
    backgroundColor: "{colors.chalk}"
  button-ghost:
    textColor: "{colors.soft-ink}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.card-white}"
    rounded: "{rounded.xl}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "10px 14px"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  badge-accent:
    backgroundColor: "{colors.indigo-mist}"
    textColor: "{colors.indigo-signal-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  badge-gray:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.muted-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  nav-tab-active:
    backgroundColor: "{colors.indigo-mist}"
    textColor: "{colors.indigo-signal-deep}"
    rounded: "{rounded.xl}"
    padding: "8px 14px"
---

# Design System: TeamUp

## Overview

**Creative North Star: "The Starting Line"**

Ощущение минуты перед стартом хакатона: всё готово, осталось собрать команду и нажать «поехали». Само приложение спокойное и собранное. Нейтральный цинковый фон, белые карточки, один индиго-акцент на действие. Энергия сосредоточена в нескольких местах: крупные заголовки Geologica на лендинге, цифры шагов, XP и бейджи.

Плотность средняя, рассчитанная на телефон. Основной текст 14px, отступы шагом 4px, касания не меньше 44px. Интерфейс дружелюбный и мягкий: крупные скругления (14-20px), лёгкие тени, которые подсказывают, что карточку можно нажать. Тёмная тема равноправна со светлой, вся нейтральная шкала переключается через CSS-переменные.

Три языка (RU/KZ/EN) задают жёсткие ограничения: шрифт заголовков обязан покрывать казахские буквы (ә ғ қ ң ө ұ ү һ і), а вёрстка должна выдерживать более длинные русские и казахские строки на экранах от 320px.

**Key Characteristics:**
- Один индиго-акцент на нейтральном цинковом фоне
- Geologica только для крупных заголовков, весь интерфейс на Inter
- Мягкие формы: кнопки и поля 14px, карточки 20px, бейджи-пилюли
- Лёгкий подъём: карточки слегка приподняты, при наведении поднимаются выше
- Мобильная навигация снизу, на десктопе верхняя панель
- Контраст текста не ниже WCAG AA в обеих темах

## Colors

Сдержанная нейтральная база в холодном цинковом оттенке и один насыщенный индиго для действий и активного состояния.

### Primary
- **Indigo Signal** (indigo-signal): главные кнопки, активная вкладка в нижней навигации, слово «Up» в логотипе, номера шагов на лендинге. Это цвет «сделай это».
- **Indigo Signal Deep / Pressed** (indigo-signal-deep, indigo-signal-pressed): hover и active главной кнопки, текст на светлых индиго-подложках.
- **Indigo Mist / Haze** (indigo-mist, indigo-haze): фон активной вкладки, акцентных бейджей и аватаров без фото. В тёмной теме заменяются полупрозрачным индиго (16-24%).
- **Indigo Focus** (indigo-focus): кольцо фокуса 2px с отступом 2px на всех интерактивных элементах.

### Neutral
- **Paper** (paper): фон страницы.
- **Card White** (card-white): карточки, поля, вторичные кнопки, шапка (с прозрачностью 95%).
- **Chalk** (chalk): hover вторичных и ghost-кнопок, серые бейджи, неактивные поля.
- **Hairline** (hairline): границы карточек, разделители, шапки и нижней панели.
- **Field Stroke** (field-stroke): обводка полей ввода (3:1 к карточке, WCAG 1.4.11) и плейсхолдеры.
- **Muted Ink / Soft Ink / Ink** (muted-ink, soft-ink, ink): вторичный текст и подписи, текст ghost-кнопок и лейблов, основной текст и заголовки.
- **Night / Night Card** (night, night-card): фон страницы и карточек в тёмной теме.

### Semantic
- **Success / Danger / Warning** (emerald-700, red-600, amber-700): статусы, ошибки полей, дедлайны. Всегда как текст на светлой подложке своего цвета (emerald-50, red-50, amber-50), в тёмной теме подложка 14% прозрачности, а текст светлее.

### Dark Theme
Нейтральная шкала `surface-*` переключается сама через CSS-переменные под `:root.dark`. Фиксированные цвета (белые карточки, индиго-подложки, статусные цвета) переопределяются вручную в конце `src/index.css`:
- **Подложки** `*-50` и `*-100` становятся полупрозрачным оттенком своего цвета (14-24%) поверх Night.
- **Текст** `*-600..*-900` становится светлым оттенком того же цвета (например, индиго `rgb(165 180 252)`, красный `rgb(252 165 165)`), не ниже 4.5:1 к Night Card.
- **Границы** `*-200/300` становятся тем же цветом на 40-45% прозрачности.
- **Тень card** сводится к одной тёмной линии 1px.

### Named Rules
**The One Signal Rule.** Индиго означает действие или текущее место. Не используй его для декора, фоновых плашек или обычного текста.

**The Paired Theme Rule.** Любой новый фиксированный цвет (не из шкалы surface) нужно сразу переопределить для `.dark` в `src/index.css` с контрастом текста не ниже 4.5:1.

## Typography

**Display Font:** Geologica Variable (with Inter Variable, system-ui)
**Body Font:** Inter Variable (with Inter, system-ui)

**Character:** Geologica даёт плотные, немного геометричные заголовки со стартовой энергией. Inter остаётся нейтральным и хорошо читается мелким кеглем. Geologica выбрана потому, что покрывает казахский алфавит.

### Hierarchy
- **Display** (800, 34px → 48px → 52px, line-height 1.08): только hero на лендинге, ширина до 20ch на мобильном.
- **Headline** (700, 30px → 36px): заголовки секций лендинга («Как это работает», FAQ, финальный CTA). Декоративные номера шагов тоже набираются Geologica (48-60px, индиго).
- **Title** (Inter 600, 16-20px): названия карточек проектов и событий, заголовки страниц приложения, обычно с line-clamp-2.
- **Body** (Inter 400, 14px): основной текст интерфейса, около 60% всех текстов.
- **Label** (Inter 500, 12px): бейджи, подсказки и ошибки полей, мета-информация.
- **Label Small** (Inter 500-600, 11px): самый мелкий шаг. Подписи нижней навигации, просмотры и время в карточке, время сообщений в чате, бейджи XP и уровней, шапка таблицы рейтинга школ. Ниже 11px текста нет.

### Named Rules
**The Landing-Only Display Rule.** Geologica только для крупных заголовков лендинга и маркетинговых блоков. Экраны приложения целиком на Inter.

## Layout

Мобильная раскладка в первую очередь. На мобильном фиксированная нижняя панель вкладок с учётом `safe-area-inset-bottom`, начиная с `sm` (640px) её сменяет липкая верхняя шапка высотой 64px. Основной контейнер до 1152px (max-w-6xl) с отступами 24px. Формы и детальные страницы до 672px (max-w-2xl).

Отступы идут шагом 4px. Чаще всего встречаются промежутки 8 и 12px между элементами и 12-16px между блоками в списках. Внутри карточек 20px. Экраны уже 360px получают отдельные поджатые отступы (`max-[359px]:`), горизонтальный скролл страницы недопустим.

## Elevation & Depth

Система лёгкого подъёма. Карточки всегда слегка приподняты над фоном тенью `card` и отделены от него тонкой границей. При наведении интерактивная карточка поднимается до `popover`. Главная кнопка имеет едва заметную тень `soft`. В тёмной теме тени почти исчезают (card становится одной тёмной линией 1px), глубину дают оттенки поверхности.

### Shadow Vocabulary
- **Soft** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.04), 0 2px 8px -2px rgb(0 0 0 / 0.06)`): главная кнопка, CTA регистрации в шапке.
- **Card** (`box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 4px 16px -4px rgb(0 0 0 / 0.08)`): все карточки в покое.
- **Popover** (`box-shadow: 0 8px 30px -4px rgb(0 0 0 / 0.12)`): hover кликабельной карточки, модальные окна и выпадающие меню.

### Named Rules
**The Lift-On-Intent Rule.** Тень растёт только в ответ на намерение пользователя (hover, открытие поверх). Не делай статичные блоки выше уровня card.

## Shapes

Мягкие, дружелюбные формы без острых углов. Кнопки md/lg и поля ввода скругляются на 14px, компактные кнопки и мелкие контролы на 8px. Карточки 20px, крупные блоки лендинга и модалки 28px. Бейджи, аватары и переключатели полностью круглые. Границы тонкие (1px), цвет hairline для карточек и field-stroke для полей.

## Components

### Buttons
Мягкие и уверенные, всегда с иконкой слева через gap 8px, если она есть.
- **Shape:** 14px для md (40px) и lg (48px), 8px для sm (32px). У sm невидимый `::after` расширяет зону касания до 44px.
- **Primary:** индиго-фон, белый текст 14px/500, тень soft. Hover на тон темнее, active ещё на тон.
- **Secondary:** белый фон, граница hairline, текст ink. Hover chalk.
- **Ghost:** без фона, текст soft-ink, hover chalk.
- **Danger:** red-600, hover red-700.
- **States:** переход цвета 150ms. Disabled и офлайн: прозрачность 50%, клики отключены. Загрузка: спиннер 14px в цвет текста.

### Chips / Badges
- **Style:** пилюля, padding 4×10px, текст 12px/500 на светлой подложке своего тона: accent, gray, green, red, yellow.
- **Use:** тип проекта (событие или постоянный проект), статус, «Ищет команду».

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** card-white (night-card в тёмной теме).
- **Shadow Strategy:** card в покое, popover на hover у кликабельных карточек (см. Elevation & Depth).
- **Border:** 1px hairline.
- **Internal Padding:** 20px.

### Inputs / Fields
- **Style:** белый фон, обводка 1px field-stroke, скругление 14px, padding 10×14px, текст 14px. Лейбл сверху 14px/500 soft-ink с отступом 6px.
- **Focus:** граница становится индиго-focus, плюс глобальное кольцо фокуса.
- **Error / Disabled:** граница red-400 и текст ошибки 12px red-600 под полем, связанный через `aria-describedby`. Disabled: фон chalk, текст field-stroke. У textarea счётчик символов справа внизу.

### Navigation
- **Desktop:** липкая шапка 64px, фон белый 95%, нижняя граница hairline. Логотип «Team**Up**» (Up индиго, 18px/700). Вкладки с иконкой 16px и текстом 14px/500, скругление 14px; активная на indigo-mist с текстом indigo-signal-deep.
- **Mobile:** фиксированная нижняя панель, вкладки равной ширины, иконка 20px над подписью 11px/500. Активная окрашивается индиго, неактивные muted-ink.
- **Guest:** в шапке «Войти» (ghost) и «Регистрация» (primary), высота 44px на мобильном.

### Project Card (signature)
Вся карточка открывает проект через растянутую ссылку на заголовке (её `::after` покрывает карточку). Звезда и ссылка на автора лежат поверх неё (`z-10`) как отдельные элементы, а не внутри `<a>`. Справа вверху звезда «Сохранить» (жёлтая заливка, когда проект сохранён). Название 16px/600 в две строки, рядом бейдж типа, ниже автор, роли и свободные слоты, дедлайн. Hover поднимает карточку до popover.

## Do's and Don'ts

### Do:
- **Do** бери цвета только из токенов `accent-*` и `surface-*` в Tailwind. Нейтральная шкала живёт в CSS-переменных и сама переключается в тёмной теме.
- **Do** держи зону касания не меньше 44px, даже когда кнопка визуально 32px.
- **Do** проверяй каждый экран на 320-359px с самой длинной из трёх локалей.
- **Do** используй статусные цвета парой: светлая подложка 50 и текст 700.
- **Do** уважай `prefers-reduced-motion`: анимации (fade-in 160ms, slide-up 200ms, rise 520ms) глобально гасятся.

### Don't:
- **Don't** используй Geologica на экранах приложения, только на лендинге и в маркетинговых блоках.
- **Don't** вводи второй акцентный цвет для действий. Индиго единственный.
- **Don't** задавай фиксированные цвета без пары для `.dark`.
- **Don't** делай обводку полей светлее field-stroke, она должна давать 3:1 к фону.
- **Don't** поднимай статичные блоки тенью popover, она только для hover и всплывающих слоёв.
