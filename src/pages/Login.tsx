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
  // Only required to create a new account — signing back in doesn't need
  // re-consent. signInGoogle() also creates an account on first use (see
  // AuthContext.ensureUserDoc), so this gates that button too while in
  // signup mode, not just the email/password form.
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

  const needsConsent = mode === 'signup' && !agreed;

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
          {mode === 'signup' && (
            <label className="flex items-start gap-2 text-xs text-surface-500">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-surface-300 text-accent-600 focus:ring-accent-500"
              />
              <span>
                Я согласен(на) с{' '}
                <Link to="/privacy" target="_blank" rel="noreferrer" className="font-medium text-accent-600 hover:underline">
                  политикой конфиденциальности
                </Link>
              </span>
            </label>
          )}
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
            Политика конфиденциальности
          </Link>
        </p>
      </div>
    </div>
  );
}
