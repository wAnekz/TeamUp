// "javascript:", "data:", "mailto:" … — any scheme that isn't followed by a
// port number ("mysite.dev:8080" has no scheme).
const OTHER_SCHEME = /^[a-z][a-z0-9+.-]*:(?!\d)/i;
const HTTP = /^https?:\/\/\S+$/i;

/**
 * User-typed link → stored form: http(s) URLs as-is, bare "mysite.dev" gets
 * https://, anything with another scheme is rejected (null). Mirrors
 * isHttpUrl in firestore.rules.
 */
export function normalizeHttpUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  if (HTTP.test(trimmed)) return trimmed;
  if (OTHER_SCHEME.test(trimmed)) return null;
  const withScheme = `https://${trimmed}`;
  return HTTP.test(withScheme) ? withScheme : null;
}

/** For hrefs: only http(s) links render; covers data saved before the rules check existed. */
export function safeUrl(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim();
  return trimmed && HTTP.test(trimmed) ? trimmed : undefined;
}
