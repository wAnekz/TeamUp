import { Link } from 'react-router-dom';

/**
 * Publicly readable — no RequireAuth/RequireGuest wrapper in App.tsx —
 * because people need to be able to read this *before* creating an account
 * (linked from the signup consent checkbox on Login.tsx) and because a
 * privacy policy that requires a login to view defeats its own purpose.
 */
export default function PrivacyPolicy() {
  return (
    <div className="min-h-dvh bg-surface-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-3xl border border-surface-200 bg-white p-7 shadow-card sm:p-10">
        <Link to="/feed" className="text-sm font-medium text-accent-600 hover:underline">
          ← TeamUp
        </Link>

        <h1 className="mt-4 text-2xl font-bold text-surface-900">Политика конфиденциальности TeamUp</h1>
        <p className="mt-1 text-sm text-surface-400">Дата последнего обновления: 12.07.2026</p>

        <div className="prose-sm mt-6 space-y-5 text-sm leading-relaxed text-surface-700">
          <section>
            <h2 className="text-base font-semibold text-surface-900">1. Кто мы</h2>
            <p className="mt-1.5">
              TeamUp (<a className="text-accent-600 hover:underline" href="https://team-up-web.netlify.app/">team-up-web.netlify.app</a>) —
              платформа, где школьники находят команду для хакатонов, олимпиад и учебных проектов.
              Разработчик и оператор данных: команда TeamUp, контакт:{' '}
              <a className="text-accent-600 hover:underline" href="mailto:dilanabkanov@gmail.com">
                dilanabkanov@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">2. Кого касается эта политика</h2>
            <p className="mt-1.5">
              Сервис предназначен для учащихся <strong>14–18 лет</strong>. Если вам меньше 14 лет — пожалуйста,
              не создавайте аккаунт. Если вы родитель или законный представитель и считаете, что ваш ребёнок
              младше 14 лет создал аккаунт — напишите нам, мы удалим данные.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">3. Какие данные мы собираем</h2>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>
                <strong>Данные аккаунта:</strong> email, пароль (хранится в зашифрованном виде Firebase
                Authentication, мы его не видим).
              </li>
              <li>
                <strong>Данные профиля:</strong> имя, возраст, класс, город, школа (по желанию), фото профиля,
                навыки, интересы, короткое био.
              </li>
              <li>
                <strong>Контактные данные (по желанию):</strong> телеграм, GitHub, портфолио, Instagram — вы
                указываете их сами, они видны другим пользователям после того, как вас приняли в команду.
              </li>
              <li>
                <strong>Данные об активности:</strong> время последнего входа, созданные проекты, заявки,
                сообщения в командных чатах, поданные жалобы.
              </li>
              <li>
                <strong>Технические данные:</strong> то, что автоматически собирают наши инфраструктурные
                провайдеры (см. п. 4), например IP-адрес при обращении к серверу.
              </li>
            </ul>
            <p className="mt-1.5">
              Мы не запрашиваем намеренно данные о здоровье, религии, паспортные данные и другую
              чувствительную информацию.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">4. Кто ещё имеет доступ к данным</h2>
            <p className="mt-1.5">
              Мы используем следующих внешних провайдеров для работы сервиса — они обрабатывают данные от
              нашего имени, каждый по своей политике конфиденциальности:
            </p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>
                <strong>Google Firebase</strong> (аутентификация, база данных, хостинг) —{' '}
                <a
                  className="text-accent-600 hover:underline"
                  href="https://firebase.google.com/support/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  firebase.google.com/support/privacy
                </a>
              </li>
              <li>
                <strong>ImgBB</strong> (хранение загруженных фото профиля) —{' '}
                <a className="text-accent-600 hover:underline" href="https://imgbb.com/privacy" target="_blank" rel="noreferrer">
                  imgbb.com/privacy
                </a>
              </li>
              <li>
                <strong>Resend</strong> (отправка писем — подтверждение почты, уведомления о заявках) —{' '}
                <a
                  className="text-accent-600 hover:underline"
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noreferrer"
                >
                  resend.com/legal/privacy-policy
                </a>
              </li>
            </ul>
            <p className="mt-1.5">Мы не продаём данные пользователей третьим лицам и не используем их для рекламы.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">5. Зачем мы обрабатываем данные</h2>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>Чтобы вы могли зарегистрироваться и пользоваться сервисом.</li>
              <li>Чтобы показывать ваш профиль другим пользователям для поиска команды.</li>
              <li>Чтобы отправлять уведомления о заявках и решениях по ним.</li>
              <li>Чтобы рассматривать жалобы и поддерживать безопасность платформы (модерация).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">6. Кто видит ваши данные</h2>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>
                <strong>Имя, город, класс, школа, аватар, био, навыки, интересы</strong> — видны всем
                зарегистрированным пользователям (профили открыты по замыслу сервиса).
              </li>
              <li>
                <strong>Email</strong> — виден только вам самим. Другим пользователям он не показывается и не
                передаётся через интерфейс.
              </li>
              <li>
                <strong>Контакты (телеграм и т.д.)</strong> — видны только тем, кого вы приняли в команду.
              </li>
              <li>
                <strong>Сообщения в командном чате</strong> — видны только участникам конкретной команды.
              </li>
              <li>
                <strong>Модераторам</strong> — ограниченный круг лиц с доступом к очереди жалоб видит контент,
                на который пожаловались, чтобы принять решение.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">7. Сколько хранятся данные</h2>
            <p className="mt-1.5">
              Данные хранятся, пока существует ваш аккаунт. Если вы хотите удалить аккаунт и все данные —
              напишите на{' '}
              <a className="text-accent-600 hover:underline" href="mailto:dilanabkanov@gmail.com">
                dilanabkanov@gmail.com
              </a>
              , мы удалим их вручную (в текущей версии сервиса нет кнопки самостоятельного удаления аккаунта).
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">8. Ваши права</h2>
            <p className="mt-1.5">Вы можете:</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-5">
              <li>посмотреть и отредактировать большинство своих данных прямо в разделе «Мой профиль»;</li>
              <li>запросить у нас копию своих данных;</li>
              <li>
                попросить исправить или удалить данные, написав на{' '}
                <a className="text-accent-600 hover:underline" href="mailto:dilanabkanov@gmail.com">
                  dilanabkanov@gmail.com
                </a>
                .
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">9. Безопасность</h2>
            <p className="mt-1.5">
              Мы используем стандартные механизмы защиты Firebase (шифрование при передаче, правила доступа на
              уровне базы данных), но ни один сервис не может гарантировать абсолютную защиту. Если вы заметили
              проблему с безопасностью — сообщите на{' '}
              <a className="text-accent-600 hover:underline" href="mailto:dilanabkanov@gmail.com">
                dilanabkanov@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">10. Изменения политики</h2>
            <p className="mt-1.5">
              Мы можем обновлять эту политику. Существенные изменения будут отмечены здесь с новой датой
              обновления.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-surface-900">11. Контакты</h2>
            <p className="mt-1.5">
              По всем вопросам о данных и этой политике:{' '}
              <a className="text-accent-600 hover:underline" href="mailto:dilanabkanov@gmail.com">
                dilanabkanov@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
