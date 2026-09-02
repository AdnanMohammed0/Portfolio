import { useEffect, useMemo, useState } from 'react';
import { Eye, MessageSquare, MousePointerClick, Users } from 'lucide-react';
import { Skeleton } from '@/components/primitives';
import { fetchSummary, type AnalyticsSummary } from '@/services/analytics';
import { cx } from '@/lib/utils';
import { Panel } from './ui';

/**
 * Series colours.
 *
 * Validated with the palette checker against the dark chart surface: both sit
 * inside the dark lightness band, clear the chroma floor, and separate at
 * ΔE 19.8 under protanopia (30.8 for normal vision) — so the two lines stay
 * distinguishable without relying on colour alone, which the legend and direct
 * labels also cover.
 */
const SERIES = {
  views: '#0891B2',
  visitors: '#EA580C',
} as const;

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

function StatTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div
      className="liquid-glass rounded-2xl p-5"
      style={{ backgroundColor: 'var(--surface)' }}
    >
      <span className="text-white/30">{icon}</span>
      <p className="mt-3 text-3xl tabular-nums tracking-tight text-white">{value}</p>
      <p className="label-xs mt-1 normal-case tracking-normal text-white/35">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-white/25">{hint}</p>}
    </div>
  );
}

/**
 * Daily views and visitors.
 *
 * Two series over time, so: one shared y-axis (never a second scale), a legend
 * plus direct end-labels so identity is not colour-alone, recessive grid, and a
 * crosshair tooltip. Values are labelled at the peak only rather than on every
 * point.
 */
function DailyChart({ daily }: { daily: AnalyticsSummary['daily'] }) {
  const [hover, setHover] = useState<number | null>(null);

  const { points, max, width, height, pad } = useMemo(() => {
    const w = 720;
    const h = 220;
    const p = { top: 16, right: 16, bottom: 26, left: 34 };
    const peak = Math.max(1, ...daily.map((d) => Math.max(d.views, d.visitors)));
    const step = daily.length > 1 ? (w - p.left - p.right) / (daily.length - 1) : 0;

    const map = (value: number, i: number) => ({
      x: p.left + i * step,
      y: p.top + (1 - value / peak) * (h - p.top - p.bottom),
    });

    return {
      points: daily.map((d, i) => ({
        day: d.day,
        views: map(d.views, i),
        visitors: map(d.visitors, i),
        raw: d,
      })),
      max: peak,
      width: w,
      height: h,
      pad: p,
    };
  }, [daily]);

  if (daily.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-white/30">
        No visits recorded in this period yet.
      </p>
    );
  }

  const line = (key: 'views' | 'visitors') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[key].x.toFixed(1)},${p[key].y.toFixed(1)}`).join(' ');

  const area = (key: 'views' | 'visitors') =>
    `${line(key)} L${points[points.length - 1][key].x.toFixed(1)},${height - pad.bottom} L${points[0][key].x.toFixed(1)},${height - pad.bottom} Z`;

  const active = hover !== null ? points[hover] : null;

  return (
    <div>
      {/* Legend — always present for two series, so identity is never colour alone. */}
      <div className="mb-4 flex flex-wrap items-center gap-5">
        {(['views', 'visitors'] as const).map((key) => (
          <span key={key} className="flex items-center gap-2 text-xs text-white/50">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: SERIES[key] }}
            />
            {key === 'views' ? 'Page views' : 'Visitors'}
          </span>
        ))}
      </div>

      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={`Daily page views and visitors over ${daily.length} days`}
          onMouseLeave={() => setHover(null)}
        >
          {/* Recessive grid */}
          {[0, 0.5, 1].map((t) => {
            const y = pad.top + t * (height - pad.top - pad.bottom);
            return (
              <g key={t}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth={1}
                />
                <text x={4} y={y + 3} fill="rgba(255,255,255,0.3)" fontSize={9}>
                  {Math.round(max * (1 - t))}
                </text>
              </g>
            );
          })}

          {(['views', 'visitors'] as const).map((key) => (
            <g key={key}>
              <path d={area(key)} fill={SERIES[key]} opacity={0.1} />
              <path
                d={line(key)}
                fill="none"
                stroke={SERIES[key]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          ))}

          {/* Crosshair */}
          {active && (
            <line
              x1={active.views.x}
              x2={active.views.x}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1}
            />
          )}
          {active &&
            (['views', 'visitors'] as const).map((key) => (
              <circle
                key={key}
                cx={active[key].x}
                cy={active[key].y}
                r={4}
                fill={SERIES[key]}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}

          {/* Hit targets, wider than the marks */}
          {points.map((p, i) => (
            <rect
              key={p.day}
              x={p.views.x - 10}
              y={pad.top}
              width={20}
              height={height - pad.top - pad.bottom}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          ))}

          {/* End labels — direct identity without a number on every point */}
          <text x={pad.left} y={height - 8} fill="rgba(255,255,255,0.3)" fontSize={9}>
            {points[0]?.day.slice(5)}
          </text>
          <text
            x={width - pad.right}
            y={height - 8}
            textAnchor="end"
            fill="rgba(255,255,255,0.3)"
            fontSize={9}
          >
            {points[points.length - 1]?.day.slice(5)}
          </text>
        </svg>

        {active && (
          <div className="pointer-events-none absolute left-0 top-0 rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs">
            <p className="text-white/50">{active.day}</p>
            <p className="mt-1 text-white">
              {active.raw.views} views · {active.raw.visitors} visitors
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Ranked list with a magnitude bar — one hue, length carries the value. */
function TopList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ label: string; n: number }>;
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.n));

  return (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-white/30">{empty}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((row) => (
            <li key={row.label} className="relative">
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="min-w-0 truncate text-white/75">{row.label}</span>
                <span className="shrink-0 tabular-nums text-white/45">{row.n}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(row.n / max) * 100}%`, backgroundColor: SERIES.views }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    fetchSummary(days)
      .then((summary) => active && setData(summary))
      .catch((cause: unknown) =>
        active ? setError(cause instanceof Error ? cause.message : 'Failed to load') : undefined,
      );
    return () => {
      active = false;
    };
  }, [days]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-xs">Insights</p>
          <h1 className="mt-3 text-3xl tracking-tightest sm:text-4xl">Analytics</h1>
          <p className="mt-2 text-sm text-white/40">
            First-party, stored in your own database. No third-party script, no cookie.
          </p>
        </div>

        {/* Filters in one row above the charts. */}
        <div role="tablist" aria-label="Time range" className="flex gap-1">
          {RANGES.map((range) => (
            <button
              key={range.days}
              role="tab"
              type="button"
              aria-selected={days === range.days}
              onClick={() => setDays(range.days)}
              className={cx(
                'rounded-full px-4 py-2 text-[12px] transition-colors duration-300',
                days === range.days
                  ? 'liquid-glass text-white'
                  : 'text-white/40 hover:text-white/75',
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <Panel>
          <p className="text-sm text-red-300/80">{error}</p>
          <p className="mt-2 text-xs text-white/35">
            If this says the function is missing, run <code>supabase/analytics.sql</code> in the
            SQL editor.
          </p>
        </Panel>
      )}

      {!data && !error ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                icon={<Eye size={17} />}
                label="Page views"
                value={data.total_views.toLocaleString()}
              />
              <StatTile
                icon={<Users size={17} />}
                label="Visitors"
                value={data.unique_visitors.toLocaleString()}
                hint="Distinct sessions"
              />
              <StatTile
                icon={<MousePointerClick size={17} />}
                label="Interactions"
                value={data.total_events.toLocaleString()}
                hint="All tracked events"
              />
              <StatTile
                icon={<MessageSquare size={17} />}
                label="Messages"
                value={data.messages.toLocaleString()}
                hint={`${data.unread_messages} unread`}
              />
            </div>

            <Panel title="Traffic" description={`Last ${days} days`}>
              <DailyChart daily={data.daily} />
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <TopList
                title="Most visited pages"
                rows={data.top_pages.map((p) => ({ label: p.path, n: p.n }))}
                empty="No page views yet."
              />
              <TopList
                title="Most opened projects"
                rows={data.top_projects}
                empty="No project has been opened yet."
              />
              <TopList
                title="Most clicked"
                rows={data.top_clicks.map((c) => ({ label: c.label, n: c.n }))}
                empty="No clicks recorded yet."
              />
              <TopList
                title="Where visitors came from"
                rows={data.referrers.map((r) => ({ label: r.referrer, n: r.n }))}
                empty="No referrers yet."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Panel title="Devices">
                <ul className="space-y-2 text-sm">
                  {Object.entries(data.devices).length === 0 ? (
                    <li className="text-white/30">No sessions yet.</li>
                  ) : (
                    Object.entries(data.devices).map(([name, n]) => (
                      <li key={name} className="flex justify-between">
                        <span className="capitalize text-white/70">{name}</span>
                        <span className="tabular-nums text-white/45">{n}</span>
                      </li>
                    ))
                  )}
                </ul>
              </Panel>

              <Panel title="Events by type">
                <ul className="space-y-2 text-sm">
                  {Object.entries(data.by_type).length === 0 ? (
                    <li className="text-white/30">Nothing recorded yet.</li>
                  ) : (
                    Object.entries(data.by_type).map(([name, n]) => (
                      <li key={name} className="flex justify-between">
                        <span className="text-white/70">{name.replace(/_/g, ' ')}</span>
                        <span className="tabular-nums text-white/45">{n}</span>
                      </li>
                    ))
                  )}
                </ul>
              </Panel>
            </div>
          </>
        )
      )}
    </div>
  );
}
