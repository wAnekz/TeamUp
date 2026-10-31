import { useEffect } from 'react';

/**
 * Sets the tab title to "<title> · TeamUp" (WCAG 2.4.2). Pass `full` for a
 * title that already names the app (the landing page). Undefined leaves the
 * current title alone, e.g. while a detail page is still loading its data.
 */
export function usePageTitle(title: string | undefined, full = false) {
  useEffect(() => {
    if (!title) return;
    document.title = full ? title : `${title} · TeamUp`;
  }, [title, full]);
}
