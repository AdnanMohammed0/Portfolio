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

/**
 * A touch device with no mouse. Used to decide whether AR is offered at all —
 * viewport width alone gets this wrong in both directions: a tablet is wider
 * than the `lg` breakpoint but still wants AR, and a narrow desktop window is
 * narrower than it but does not.
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}
