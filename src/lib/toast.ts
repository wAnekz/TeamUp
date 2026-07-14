/**
 * Minimal toast system with no external dependency and no React context.
 * Plain pub/sub so it can be called from anywhere — including non-component
 * code like queryClient's global mutation onError, where there's no
 * component tree to pull a context value from.
 *
 * Usage: toast.success('Project published'), toast.error('Could not save').
 * ToastViewport (mounted once near the app root) subscribes and renders.
 */

export type ToastKind = 'success' | 'error' | 'info';
export interface ToastMessage {
  id: string;
  kind: ToastKind;
  text: string;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let listeners: Listener[] = [];

function notify() {
  for (const l of listeners) l(toasts);
}

export function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  notify();
}

function push(kind: ToastKind, text: string) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  toasts = [...toasts, { id, kind, text }];
  notify();
  // Errors stay up a bit longer — they're more likely to need re-reading.
  setTimeout(() => dismiss(id), kind === 'error' ? 6000 : 3200);
  return id;
}

export const toast = {
  success: (text: string) => push('success', text),
  error: (text: string) => push('error', text),
  info: (text: string) => push('info', text),
};

export function subscribeToasts(listener: Listener) {
  listeners.push(listener);
  listener(toasts);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * Turns whatever a Firestore/mutation error is into a short, human string.
 * Firebase errors often come through as "FirebaseError: Missing or
 * insufficient permissions." — fine as-is. Anything unrecognized falls back
 * to a generic message rather than leaking a raw stack/object to the user.
 */
export function errorToMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string') return error;
  return 'Something went wrong. Please try again.';
}
