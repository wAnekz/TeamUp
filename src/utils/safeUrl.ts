/**
 * Only http(s) links ever reach an href — user-supplied strings like
 * "javascript:..." are dropped. firestore.rules enforce the same on write;
 * this also covers data saved before that rule existed.
 */
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  return /^https?:\/\/[^\s]+$/i.test(trimmed) ? trimmed : undefined;
}
