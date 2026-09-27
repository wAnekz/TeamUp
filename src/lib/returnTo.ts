// Where to send someone after they sign in / sign up / finish their profile.
// Set when a guest taps something that needs an account (Apply, Save,
// I'm interested, an invite link) so the login → complete-profile detour
// ends back on that same page instead of the generic feed. localStorage,
// not router state, because Google sign-in and the profile wizard both
// navigate away and would drop router state on the floor.
const KEY = 'teamup:returnTo';

/**
 * `keepExisting`: used on the onboarding detour, where the path is just the
 * generic post-login landing (/feed) — it must not clobber the page the
 * person originally asked for.
 */
export function rememberReturnTo(path: string, { keepExisting = false } = {}) {
  try {
    if (keepExisting && localStorage.getItem(KEY)) return;
    if (path.startsWith('/') && !path.startsWith('/login')) localStorage.setItem(KEY, path);
  } catch {
    // storage blocked (private mode) — they just land on the feed
  }
}

export function takeReturnTo(): string | null {
  try {
    const path = localStorage.getItem(KEY);
    if (path) localStorage.removeItem(KEY);
    return path;
  } catch {
    return null;
  }
}
