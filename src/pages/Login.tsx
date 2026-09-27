import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { authSchema, type AuthFormValues } from '@/utils/validation';
import { useLang, type Lang } from '@/lib/lang';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

const T = {
  ru: {
    browse: 'Смотреть без аккаунта',
    subSignup: 'Создай бесплатный аккаунт - это займёт около минуты.',
    subSignin: 'С возвращением! Находи команды для хакатонов, олимпиад и проектов.',
    perks: ['Вступай в команды или собирай свою', 'Напоминания до конца регистрации', 'Портфолио, которое можно скачать в PDF'],
    email: 'Email',
    password: 'Пароль',
    agree: 'Я согласен(на) с',
    policyLink: 'политикой конфиденциальности',
    signIn: 'Войти',
    createAccount: 'Создать аккаунт',
    or: 'или',
    google: 'Продолжить с Google',
    noAccount: 'Нет аккаунта? ',
    haveAccount: 'Уже есть аккаунт? ',
    signUp: 'Зарегистрироваться',
    privacy: 'Политика конфиденциальности',
    invalidEmail: 'Введите корректный email',
    shortPassword: 'Минимум 6 символов',
    errors: {
      credentials: 'Неверный email или пароль.',
      exists: 'Аккаунт с этим email уже есть - попробуй войти.',
      weak: 'Пароль слишком простой - минимум 6 символов.',
      tooMany: 'Слишком много попыток. Подожди пару минут.',
      network: 'Нет соединения с интернетом.',
      popup: 'Окно входа Google было закрыто.',
      generic: 'Что-то пошло не так. Попробуй ещё раз.',
    },
  },
  kz: {
    browse: 'Аккаунтсыз қарау',
    subSignup: 'Тегін аккаунт аш - бір минуттай уақыт алады.',
    subSignin: 'Қайта келуіңмен! Хакатондар, олимпиадалар мен жобаларға команда тап.',
    perks: ['Командаларға қосыл немесе өз командаңды жина', 'Тіркеу аяқталар алдында еске салу', 'PDF-ке жүктеуге болатын портфолио'],
    email: 'Email',
    password: 'Құпиясөз',
    agree: 'Мен келісемін:',
    policyLink: 'құпиялылық саясаты',
    signIn: 'Кіру',
    createAccount: 'Аккаунт ашу',
    or: 'немесе',
    google: 'Google арқылы жалғастыру',
    noAccount: 'Аккаунтың жоқ па? ',
    haveAccount: 'Аккаунтың бар ма? ',
    signUp: 'Тіркелу',
    privacy: 'Құпиялылық саясаты',
    invalidEmail: 'Дұрыс email енгізіңіз',
    shortPassword: 'Кемінде 6 таңба',
    errors: {
      credentials: 'Email немесе құпиясөз қате.',
      exists: 'Бұл email-мен аккаунт бар - кіріп көр.',
      weak: 'Құпиясөз тым оңай - кемінде 6 таңба.',
      tooMany: 'Әрекет тым көп. Бірнеше минут күте тұр.',
      network: 'Интернет байланысы жоқ.',
      popup: 'Google кіру терезесі жабылды.',
      generic: 'Бірдеңе дұрыс болмады. Қайталап көр.',
    },
  },
  en: {
    browse: 'Browse without an account',
    subSignup: 'Create your free account - takes about a minute.',
    subSignin: 'Welcome back! Find teammates for hackathons, olympiads and student projects.',
    perks: ['Join teams or start your own', 'Reminders before registration closes', 'A portfolio you can export as PDF'],
    email: 'Email',
    password: 'Password',
    agree: 'I agree to the',
    policyLink: 'privacy policy',
    signIn: 'Sign in',
    createAccount: 'Create account',
    or: 'or',
    google: 'Continue with Google',
    noAccount: "Don't have an account? ",
    haveAccount: 'Already have an account? ',
    signUp: 'Sign up',
    privacy: 'Privacy policy',
    invalidEmail: 'Enter a valid email',
    shortPassword: 'At least 6 characters',
    errors: {
      credentials: 'Wrong email or password.',
      exists: 'An account with this email already exists - try signing in.',
      weak: 'Password is too weak - at least 6 characters.',
      tooMany: 'Too many attempts. Wait a couple of minutes.',
      network: 'No internet connection.',
      popup: 'The Google sign-in window was closed.',
      generic: 'Something went wrong. Please try again.',
    },
  },
} satisfies Record<Lang, unknown>;

// Firebase Auth errors arrive as "Firebase: Error (auth/invalid-credential)."
// — turn the common ones into something a 15-year-old can act on.
function authErrorMessage(e: unknown, t: (typeof T)[Lang]) {
  const code = (e as { code?: string })?.code ?? '';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code))
    return t.errors.credentials;
  if (code === 'auth/email-already-in-use') return t.errors.exists;
  if (code === 'auth/weak-password') return t.errors.weak;
  if (code === 'auth/too-many-requests') return t.errors.tooMany;
  if (code === 'auth/network-request-failed') return t.errors.network;
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return t.errors.popup;
  return t.errors.generic;
}

export default function Login() {
  const t = T[useLang()];
  const [searchParams] = useSearchParams();
  // "Sign up" buttons across the site link here with ?mode=signup.
  const [mode, setMode] = useState<'signin' | 'signup'>(searchParams.get('mode') === 'signup' ? 'signup' : 'signin');
  const [error, setError] = useState<string | null>(null);
  // Required regardless of signin/signup mode. It's tempting to only require
  // this for signup, since signing back in doesn't need re-consent — but
  // "Continue with Google" is a single button for both, and signInGoogle()
  // silently creates an account on first use (see AuthContext.ensureUserDoc)
  // with no separate signup step to gate. A returning user re-checking this
  // once per session is a small cost; a new user creating an account with
  // zero mention of the privacy policy is not.
  const [agreed, setAgreed] = useState(false);
  const { signInEmail, signUpEmail, signInGoogle } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({ resolver: zodResolver(authSchema) });

  const onSubmit = async (values: AuthFormValues) => {
    setError(null);
    try {
      if (mode === 'signin') await signInEmail(values.email, values.password);
      else await signUpEmail(values.email, values.password);
      navigate('/feed');
    } catch (e) {
      setError(authErrorMessage(e, t));
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInGoogle();
      navigate('/feed');
    } catch (e) {
      setError(authErrorMessage(e, t));
    }
  };

  const needsConsent = !agreed;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-50 px-4 py-8">
      <Link
        to="/"
        className="mb-4 inline-flex w-full max-w-sm items-center gap-1 text-sm text-surface-500 hover:text-surface-700"
      >
        <ArrowLeft size={14} /> {t.browse}
      </Link>
      <div className="w-full max-w-sm animate-slide-up rounded-3xl border border-surface-200 bg-white p-7 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-surface-900">
            Team<span className="text-accent-600">Up</span>
          </h1>
          <LanguageSwitcher compact />
        </div>
        <p className="mt-1.5 text-sm text-surface-500">
          {mode === 'signup' ? t.subSignup : t.subSignin}
        </p>
        {mode === 'signup' && (
          <ul className="mt-4 space-y-1.5 text-sm text-surface-600">
            {t.perks.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check size={14} className="shrink-0 text-emerald-600" /> {item}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input
            label={t.email}
            type="email"
            placeholder="you@school.kz"
            {...register('email')}
            error={errors.email ? t.invalidEmail : undefined}
          />
          <Input
            label={t.password}
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password ? t.shortPassword : undefined}
          />
          <label className="flex items-start gap-2 text-xs text-surface-500">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-surface-300 text-accent-600 focus:ring-accent-500"
            />
            <span>
              {t.agree}{' '}
              <Link to="/privacy" target="_blank" rel="noreferrer" className="font-medium text-accent-600 hover:underline">
                {t.policyLink}
              </Link>
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" loading={isSubmitting} disabled={needsConsent}>
            {mode === 'signin' ? t.signIn : t.createAccount}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-surface-200" />
          <span className="text-xs text-surface-400">{t.or}</span>
          <div className="h-px flex-1 bg-surface-200" />
        </div>

        <Button variant="secondary" className="w-full" onClick={handleGoogle} type="button" disabled={needsConsent}>
          <GoogleIcon />
          {t.google}
        </Button>

        <p className="mt-5 text-center text-sm text-surface-500">
          {mode === 'signin' ? t.noAccount : t.haveAccount}
          <button
            type="button"
            className="font-medium text-accent-600 hover:underline"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? t.signUp : t.signIn}
          </button>
        </p>

        <p className="mt-3 text-center text-xs text-surface-400">
          <Link to="/privacy" target="_blank" rel="noreferrer" className="hover:text-surface-600 hover:underline">
            {t.privacy}
          </Link>
        </p>
      </div>
    </div>
  );
}

// Standard multicolor "G" mark used on Google sign-in buttons everywhere —
// not the wordmark/logo, just the icon glyph, per Google's own branding
// for third-party "Sign in with Google" buttons.
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
