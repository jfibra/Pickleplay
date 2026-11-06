import React, { useEffect, useRef, useState } from 'react';
import { Activity, Bug, KeyRound, Loader2, SearchX, ShoppingCart, Star } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchTrackedEvents, formatPercent, formatReason } from '../../../services/adminPlayers';
import type { CountItem, PlayerEventsRange, TrackedEvents } from '../../../services/adminPlayers';
import { formatUserDate } from '../users/userDisplay';

const RANGES: PlayerEventsRange[] = ['7d', '30d', '90d'];

const Panel: React.FC<{ title: string; icon: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  icon,
  className = '',
  children,
}) => (
  <div className={`bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm ${className}`}>
    <h3 className="text-lg font-black text-slate-900 mb-5 uppercase tracking-tight flex items-center gap-3">
      {icon}
      {title}
    </h3>
    {children}
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => <p className="text-sm font-medium text-slate-400">{text}</p>;

const CountList: React.FC<{ items: CountItem[]; empty: string; format?: (key: string) => string }> = ({
  items,
  empty,
  format = formatReason,
}) => {
  if (items.length === 0) return <Empty text={empty} />;
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-slate-700 truncate">{format(item.key)}</span>
            <span className="font-black text-slate-900 shrink-0">{item.count.toLocaleString()}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-slate-50">
            <div className="h-full rounded-full bg-rose-400" style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
};

const TrackedStruggles: React.FC = () => {
  const [range, setRange] = useState<PlayerEventsRange>('30d');
  const [data, setData] = useState<TrackedEvents | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setIsLoading(true);
    fetchTrackedEvents(range)
      .then((next) => {
        if (id !== requestId.current) return;
        setData(next);
        setError(null);
      })
      .catch((err) => {
        if (id === requestId.current) setError(err.message || 'Failed to load tracked events');
      })
      .finally(() => {
        if (id === requestId.current) setIsLoading(false);
      });
  }, [range]);

  const header = (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tracked Struggles</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Live signals from the player app: blocked bookings, empty searches, failed logins, abandoned quizzes, and app errors.
          {data?.available && data.trackingStartedAt ? ` Tracking since ${formatUserDate(data.trackingStartedAt)}.` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {isLoading ? <Loader2 size={16} className="animate-spin text-slate-400" /> : null}
        <div className="flex gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm" role="group" aria-label="Event range">
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              aria-pressed={range === option}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                range === option ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (error || (data && !data.available)) {
    return (
      <div>
        {header}
        <div className="bg-amber-50 border border-amber-100 rounded-[40px] p-8 text-sm font-bold text-amber-800">
          {error || data?.message}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        {header}
        <div className="h-48 rounded-[40px] bg-white border border-slate-200 animate-pulse" />
      </div>
    );
  }

  const funnel = data.bookingFunnel;
  const funnelTop = Math.max(1, ...(funnel?.steps.map((s) => s.visitors) ?? [1]));
  const noData = (data.totalEvents ?? 0) === 0;

  return (
    <div>
      {header}
      {noData ? (
        <div className="mb-6 bg-blue-50 border border-blue-100 rounded-[32px] p-6 text-sm font-bold text-blue-800">
          {data.trackingStartedAt
            ? `No events in the last ${range}. Tracking started ${formatUserDate(data.trackingStartedAt)}.`
            : 'Tracking is on. Events will appear here as players use the app.'}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        <Panel title="Struggle Events per Day" icon={<Activity className="text-blue-600" />} className="xl:col-span-2">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyStruggles ?? []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} minTickGap={12} />
                <YAxis hide allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="count" name="Struggle events" fill="#f43f5e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Booking Funnel" icon={<ShoppingCart className="text-blue-600" />}>
          {funnel ? (
            <>
              <ul className="space-y-3">
                {funnel.steps.map((step) => (
                  <li key={step.id}>
                    <div className="flex justify-between text-sm">
                      <span className="font-bold text-slate-700">{step.label}</span>
                      <span className="font-black text-slate-900">{step.visitors.toLocaleString()}</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-slate-50">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${(step.visitors / funnelTop) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[11px] font-black uppercase tracking-widest text-rose-500">
                {formatPercent(funnel.abandonRate)} picked a time but did not book · {funnel.abandoned} left mid-booking
              </p>
            </>
          ) : null}
        </Panel>

        <Panel title="Booking Blockers" icon={<ShoppingCart className="text-rose-500" />}>
          <CountList items={data.bookingBlockers ?? []} empty="No blocked bookings." />
          {(data.bookingFailures ?? []).length > 0 ? (
            <div className="mt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Booking errors</p>
              <CountList items={data.bookingFailures ?? []} empty="" format={(k) => k} />
            </div>
          ) : null}
        </Panel>

        <Panel title="Searches With No Results" icon={<SearchX className="text-rose-500" />}>
          {(data.noResultSearches ?? []).length === 0 ? (
            <Empty text="Every search found something." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(data.noResultSearches ?? []).map((search) => (
                <li key={search.query} className="py-2.5 flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-bold text-slate-700">"{search.query}"</span>
                  <span className="shrink-0 text-[11px] font-black text-slate-900">
                    {search.count}× <span className="text-slate-400 font-bold">{formatUserDate(search.lastSeen)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Login & Signup Failures" icon={<KeyRound className="text-rose-500" />}>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Login</p>
          <CountList items={data.authFailures?.login ?? []} empty="No failed logins." />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-6 mb-3">Signup</p>
          <CountList items={data.authFailures?.signup ?? []} empty="No failed signups." />
        </Panel>

        <Panel title="Skill Quiz" icon={<Star className="text-blue-600" />}>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Started', value: data.quiz?.started ?? 0 },
              { label: 'Finished', value: data.quiz?.completed ?? 0 },
              { label: 'Quit', value: data.quiz?.abandoned ?? 0 },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-3 text-center">
                <p className="text-2xl font-black text-slate-900">{item.value}</p>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">
            {formatPercent(data.quiz?.completionRate ?? 0)} completion
          </p>
          <CountList items={data.quiz?.abandonedAt ?? []} empty="Nobody quit the quiz." format={(k) => k} />
        </Panel>

        <Panel title="App Errors" icon={<Bug className="text-rose-500" />} className="xl:col-span-3">
          {(data.clientErrors ?? []).length === 0 ? (
            <Empty text="No app errors reported." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    <th className="py-2 pr-4">Error</th>
                    <th className="py-2 px-4">Source</th>
                    <th className="py-2 px-4 text-right">Times</th>
                    <th className="py-2 px-4 text-right">Players hit</th>
                    <th className="py-2 pl-4">Last seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.clientErrors ?? []).map((err) => (
                    <tr key={err.message}>
                      <td className="py-3 pr-4 text-sm font-bold text-slate-700 max-w-[420px] truncate" title={err.message}>
                        {err.message}
                      </td>
                      <td className="py-3 px-4 text-[11px] font-black uppercase tracking-widest text-slate-400">{err.source || '—'}</td>
                      <td className="py-3 px-4 text-right text-sm font-black text-slate-900">{err.count}</td>
                      <td className="py-3 px-4 text-right text-sm font-black text-slate-900">{err.affectedUsers}</td>
                      <td className="py-3 pl-4 text-[11px] font-bold text-slate-400">{formatUserDate(err.lastSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
};

export default TrackedStruggles;
