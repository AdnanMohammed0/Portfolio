import { isSupabaseConfigured, supabase } from '@/lib/supabase';

/**
 * Lightweight first-party analytics.
 *
 * Events are written straight to Supabase under a policy that allows inserts
 * and nothing else, so a visitor can record a page view but cannot read anyone
 * else's. No third-party script, no cookie, no cross-site identifier.
 *
 * The session id is random per tab and lives in sessionStorage, so it is gone
 * when the tab closes. It exists only to tell "one person viewing five pages"
 * apart from "five people", not to follow anyone between visits.
 */

export type AnalyticsEvent =
  | 'page_view'
  | 'cta_click'
  | 'project_open'
  | 'social_click'
  | 'outbound_click'
  | 'filter_change'
  | 'contact_submit';

const SESSION_KEY = 'portfolio:session';

function sessionId(): string | null {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private mode, or storage disabled. Events still record, just unattributed.
    return null;
  }
}

function device(): string {
  if (typeof window === 'undefined') return 'unknown';
  const width = window.innerWidth;
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/** Origin only — the full referring URL is more than this needs to know. */
function referrer(): string {
  try {
    if (!document.referrer) return '';
    const url = new URL(document.referrer);
    if (url.hostname === window.location.hostname) return '';
    return url.hostname;
  } catch {
    return '';
  }
}

/** Never record the dashboard: it is the owner using their own site. */
function isTrackablePath(path: string): boolean {
  return !path.startsWith('/admin');
}

/**
 * Records an event. Always resolves — analytics must never interrupt the page
 * or surface an error to a visitor.
 */
export async function track(
  type: AnalyticsEvent,
  options: { label?: string; path?: string } = {},
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const path = options.path ?? window.location.pathname;
  if (!isTrackablePath(path)) return;

  try {
    await supabase.from('analytics_events').insert({
      type,
      path,
      label: options.label ?? null,
      session_id: sessionId(),
      referrer: referrer(),
      device: device(),
    });
  } catch {
    /* Ignored on purpose. A failed metric is not worth a broken page. */
  }
}

/** Fire-and-forget, for use directly in event handlers. */
export function trackClick(type: AnalyticsEvent, label: string): void {
  void track(type, { label });
}

export interface AnalyticsSummary {
  total_views: number;
  unique_visitors: number;
  total_events: number;
  messages: number;
  unread_messages: number;
  daily: Array<{ day: string; views: number; visitors: number }>;
  by_type: Record<string, number>;
  top_pages: Array<{ path: string; n: number }>;
  top_projects: Array<{ label: string; n: number }>;
  top_clicks: Array<{ label: string; type: string; n: number }>;
  referrers: Array<{ referrer: string; n: number }>;
  devices: Record<string, number>;
}

/**
 * Admin-only. Aggregation happens in Postgres — a busy month is tens of
 * thousands of rows and the dashboard only needs the totals.
 */
export async function fetchSummary(days = 30): Promise<AnalyticsSummary> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.rpc('analytics_summary', { days });
  if (error) throw new Error(error.message);
  return data as AnalyticsSummary;
}
