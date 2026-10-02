import { useSyncExternalStore } from 'react';

/**
 * Light / dark / follow the system. Light by default, so the site never
 * changes on its own unless the student picks "system". The class is first
 * set by the inline script in index.html (before paint); this keeps it in
 * sync afterwards. Remembered in localStorage like the language.
 */

export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'teamup:theme';
const listeners = new Set<() => void>();
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // storage blocked — fall through to default
  }
  return 'light';
}

let current: ThemePref = read();

function apply() {
  if (typeof document === 'undefined') return;
  const dark = current === 'dark' || (current === 'system' && !!media?.matches);
  document.documentElement.classList.toggle('dark', dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B0B0F' : '#4F46E5');
}

apply();
media?.addEventListener('change', () => {
  if (current === 'system') {
    apply();
    listeners.forEach((l) => l());
  }
});

export function setTheme(pref: ThemePref) {
  current = pref;
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // storage blocked — still applies for this visit
  }
  apply();
  listeners.forEach((l) => l());
}

export function isDarkNow() {
  return current === 'dark' || (current === 'system' && !!media?.matches);
}

export function useTheme() {
  const pref = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
  return { pref, dark: pref === 'dark' || (pref === 'system' && !!media?.matches) };
}
