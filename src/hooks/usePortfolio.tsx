import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PortfolioData } from '@/types';
import { content } from '@/services/content';
import {
  DEFAULT_CONTENT,
  DEFAULT_EXPERIENCE,
  DEFAULT_PROJECTS,
  DEFAULT_SKILLS,
} from '@/services/defaults';

interface PortfolioState {
  data: PortfolioData;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const FALLBACK: PortfolioData = {
  content: DEFAULT_CONTENT,
  projects: DEFAULT_PROJECTS.filter((p) => p.published),
  skills: DEFAULT_SKILLS,
  experience: DEFAULT_EXPERIENCE,
};

const PortfolioContext = createContext<PortfolioState | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PortfolioData>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const next = await content.loadPublic();
      setData(next);
    } catch (cause) {
      // The site must still render if the database is unreachable.
      setError(cause instanceof Error ? cause.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo<PortfolioState>(
    () => ({ data, loading, error, refresh: load }),
    [data, loading, error, load],
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio(): PortfolioState {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used inside <PortfolioProvider>');
  return ctx;
}

export function useSiteContent() {
  return usePortfolio().data.content;
}
