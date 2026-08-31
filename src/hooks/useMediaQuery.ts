import { useEffect, useState } from 'react';

/** Reactive media query, used to branch behaviour rather than just styling. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** True below the `lg` breakpoint — where the hero re-composes for touch. */
export function useIsCompact(): boolean {
  return useMediaQuery('(max-width: 1023px)');
}
