import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { track } from '@/services/analytics';

/**
 * Records one page view per route.
 *
 * This is a single-page app, so there is no document load between routes to
 * hook — the view has to be recorded when the path changes. The last path is
 * remembered so React's double-invoked effects in development, and a re-render
 * that does not change the route, do not each count as a visit.
 */
export function usePageViews(): void {
  const { pathname } = useLocation();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    void track('page_view', { path: pathname });
  }, [pathname]);
}
