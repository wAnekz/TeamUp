import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/contexts/AuthContext';
import { authSchema, type AuthFormValues } from '@/utils/validation';

export default function Login() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
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
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInGoogle();
      navigate('/feed');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const needsConsent = !agreed;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm animate-slide-up rounded-3xl border border-surface-200 bg-white p-7 shadow-card">
        <h1 className="text-2xl font-bold text-surface-900">
          Team<span className="text-accent-600">Up</span>
        </h1>
        <p className="mt-1.5 text-sm text-surface-500">
          Find teammates for hackathons, olympiads and student projects.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Input label="Email" type="email" placeholder="you@school.kz" {...register('email')} error={errors.email?.message} />
          <Input label="Password" type="password" placeholder="••••••••" {...register('password')} error={errors.password?.message} />
          <label className="flex items-start gap-2 text-xs text-surface-500">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-surface-300 text-accent-600 focus:ring-accent-500"
            />
            <span>
              I agree to the{' '}
              <Link to="/privacy" target="_blank" rel="noreferrer" className="font-medium text-accent-600 hover:underline">
                privacy policy
              </Link>
            </span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" loading={isSubmitting} disabled={needsConsent}>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-surface-200" />
          <span className="text-xs text-surface-400">or</span>
          <div className="h-px flex-1 bg-surface-200" />
        </div>

        <Button variant="secondary" className="w-full" onClick={handleGoogle} type="button" disabled={needsConsent}>
          <GoogleIcon />
          Continue with Google
        </Button>

        <p className="mt-5 text-center text-sm text-surface-500">
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="font-medium text-accent-600 hover:underline"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </p>

        <p className="mt-3 text-center text-xs text-surface-400">
          <Link to="/privacy" target="_blank" rel="noreferrer" className="hover:text-surface-600 hover:underline">
            Privacy policy
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
