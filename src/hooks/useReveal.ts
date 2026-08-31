import { useEffect, useRef } from 'react';

interface Options {
  /** Fraction of the element that must be visible before revealing. */
  threshold?: number;
  /** Stagger, in ms, applied as a transition delay. */
  delay?: number;
  once?: boolean;
}

/**
 * Adds `is-visible` to a `.reveal` element when it scrolls into view.
 * Uses IntersectionObserver rather than a scroll listener, and disconnects
 * itself after the first reveal so it costs nothing afterwards.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  delay = 0,
  once = true,
}: Options = {}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (delay) node.style.transitionDelay = `${delay}ms`;

    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            if (once) observer.disconnect();
          } else if (!once) {
            entry.target.classList.remove('is-visible');
          }
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, delay, once]);

  return ref;
}

/** Observes whether an element is currently on screen (for pausing work). */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  onChange: (inView: boolean) => void,
  threshold = 0.05,
) {
  const ref = useRef<T | null>(null);
  const handler = useRef(onChange);
  handler.current = onChange;

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      handler.current(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => handler.current(entry.isIntersecting),
      { threshold },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  return ref;
}
