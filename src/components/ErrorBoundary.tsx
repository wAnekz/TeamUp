import { Component, type ErrorInfo, type ReactNode, lazy, Suspense } from 'react';
import { getT } from '@/i18n';

// Lazy so framer-motion and the form libraries stay out of the first bundle.
const FeedbackButton = lazy(() => import('@/components/FeedbackButton').then((m) => ({ default: m.FeedbackButton })));

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time crashes anywhere below it in the tree. Without this,
 * an uncaught error unmounts the whole React tree and the person is left
 * looking at a blank white page with zero explanation — on a platform aimed
 * at 14–18 year olds, that reads as "the site is broken", not "something
 * glitched", and they just leave.
 *
 * Deliberately class-based: componentDidCatch has no hook equivalent yet.
 * Only catches render/lifecycle errors (React's own limitation) — async
 * errors in event handlers or effects still need their own try/catch,
 * which is why mutations across the app also report failures via toast.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Still logged to devtools/console for whoever's debugging locally —
    // FeedbackButton below is what gets it to the developer for everyone
    // else, without them needing to know devtools exist.
    console.error('Unhandled render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const errorContext = `Crash: ${this.state.error.message}\nPage: ${window.location.pathname}`;
    // Class component — no hooks, so read the current language directly.
    const t = getT();

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-50 px-6 text-center">
        <div className="max-w-sm space-y-3 rounded-2xl border border-surface-200 bg-white p-7 shadow-card">
          <h1 className="text-lg font-semibold text-surface-900">{t.errors.title}</h1>
          <p className="text-sm text-surface-500">{t.errors.text}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl bg-accent-600 px-4 text-sm font-medium text-white transition-colors hover:bg-accent-700"
          >
            {t.errors.reload}
          </button>
          <Suspense fallback={null}>
            <FeedbackButton
            initialMessage={errorContext}
            label={t.feedback.letKnow}
            variant="secondary"
            className="w-full"
          />
          </Suspense>
        </div>
      </div>
    );
  }
}