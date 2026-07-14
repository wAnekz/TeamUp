import type { FieldErrors } from 'react-hook-form';

/**
 * react-hook-form's handleSubmit(onValid) does nothing visible when
 * validation fails — the error text renders inline, but on a tall mobile
 * form that's often off-screen, making a failed submit look like a dead
 * button. Pass this as the second argument to handleSubmit() to scroll the
 * first invalid field into view and focus it instead.
 */
export function scrollToFirstError(errors: FieldErrors) {
  const path = findFirstErrorPath(errors);
  if (!path) return;

  // Real <input>/<select>/<textarea> fields (registered via react-hook-form)
  // have a matching [name] attribute.
  const input = document.querySelector<HTMLElement>(`[name="${cssEscape(path)}"]`);
  // Controlled fields with no real input — TagPicker, and any array-level
  // error whose path points at the array itself rather than one row (e.g.
  // "roles" -> "Add at least one role") — are marked with [data-field]
  // instead. Try progressively shorter prefixes of the path so a nested
  // error like "roles.0.requiredSkills" still matches a picker that only
  // knows its own path, and a bare array error like "roles" still finds
  // something to scroll to.
  const el = input ?? findByDataField(path);
  if (!el) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus?.({ preventScroll: true });
  flash(el);
}

function findByDataField(path: string): HTMLElement | null {
  let candidate = path;
  while (candidate) {
    const el = document.querySelector<HTMLElement>(`[data-field="${cssEscape(candidate)}"]`);
    if (el) return el;
    const lastDot = candidate.lastIndexOf('.');
    if (lastDot === -1) break;
    candidate = candidate.slice(0, lastDot);
  }
  return null;
}

/**
 * A silent scrollIntoView still looks like nothing happened on a long form —
 * easy to miss which field is the problem, especially on mobile where the
 * error text can end up just off the edge of the viewport. This briefly
 * pulses a ring around the target so a failed "Publish" reads as "here's
 * what to fix", not "the button is broken".
 */
function flash(el: HTMLElement) {
  el.classList.add('ring-2', 'ring-red-400', 'ring-offset-2', 'transition-shadow');
  setTimeout(() => el.classList.remove('ring-2', 'ring-red-400', 'ring-offset-2', 'transition-shadow'), 1500);
}

function findFirstErrorPath(obj: unknown, prefix = ''): string | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === 'message' || key === 'type' || key === 'ref' || key === 'root') continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      if ('message' in value && typeof (value as { message?: unknown }).message === 'string') {
        return path;
      }
      const nested = findFirstErrorPath(value, path);
      if (nested) return nested;
    }
  }
  return null;
}

function cssEscape(value: string) {
  return value.replace(/[.[\]]/g, '\\$&');
}
