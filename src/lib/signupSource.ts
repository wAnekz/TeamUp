// Which link brought a new student here: ?src=poster-165 on a poster QR,
// ?src=tg-class on a class-chat post, and so on. First touch wins, kept in
// localStorage until signup, then written once to users/{uid}/private/signup
// (owner-only, immutable, see firestore.rules). computeMetrics only ever
// shows counts per source, never who came from where.
const KEY = 'teamup:src';
const PARAMS = ['src', 'utm_source'];
// Starts with a letter/digit: a tag becomes a map key in config/metrics, and
// Firestore reserves field names like __x__.
const VALID = /^[a-z0-9][a-z0-9_-]{0,39}$/;

export function normalizeSource(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/\s+/g, '-');
  return VALID.test(v) ? v : null;
}

/** Call once on page load, before the router reads the URL. */
export function captureSignupSource() {
  try {
    const url = new URL(window.location.href);
    let src: string | null = null;
    for (const p of PARAMS) {
      src = src ?? normalizeSource(url.searchParams.get(p));
      url.searchParams.delete(p);
    }
    // Invite links are a source of their own: that's the viral loop.
    if (!src && url.pathname.startsWith('/invite/')) src = 'invite';
    if (src && !localStorage.getItem(KEY)) localStorage.setItem(KEY, src);
    // Drop the tag from the address bar, so a link copied from here and sent
    // to a friend doesn't credit the poster for the friend's signup.
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url.href);
  } catch {
    // storage blocked or old browser: the signup just counts as "direct"
  }
}

export function storedSignupSource(): string {
  try {
    return normalizeSource(localStorage.getItem(KEY)) ?? 'direct';
  } catch {
    return 'direct';
  }
}

/** After it's saved, so a second account made on the same phone isn't credited too. */
export function clearSignupSource() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nothing to clear
  }
}
