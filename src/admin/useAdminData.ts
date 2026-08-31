import { useCallback, useEffect, useState } from 'react';
import { content } from '@/services/content';
import { usePortfolio } from '@/hooks/usePortfolio';

/**
 * Generic loader for an admin list. Every mutation refreshes both the local
 * list and the public site data, so the dashboard and the portfolio never drift
 * apart — one source of truth, one refresh path.
 */
export function useAdminResource<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const { refresh } = usePortfolio();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** Runs a mutation, then refreshes this list and the public site. */
  const mutate = useCallback(
    async (action: () => Promise<unknown>) => {
      await action();
      await reload();
      await refresh();
    },
    [reload, refresh],
  );

  return { data, loading, error, reload, mutate, setData };
}

export { content };
