import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SEGMENT_LABELS, fetchPlayerOverview } from '../../../services/adminPlayers';
import type { PlayerOverview, PlayerSegmentType } from '../../../services/adminPlayers';
import { formatUserDate } from '../users/userDisplay';
import OnboardingFunnel from './OnboardingFunnel';
import StruggleCards from './StruggleCards';
import PlayerSegmentTable from './PlayerSegmentTable';
import TrackedStruggles from './TrackedStruggles';

const parseSegment = (value: string | null): PlayerSegmentType | null =>
  value && Object.hasOwn(SEGMENT_LABELS, value) ? (value as PlayerSegmentType) : null;

const PlayerAnalyticsPanel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const segment = parseSegment(searchParams.get('segment'));

  const [overview, setOverview] = useState<PlayerOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setOverview(await fetchPlayerOverview());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load player analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selectSegment = (next: PlayerSegmentType | null) => {
    const params = new URLSearchParams(searchParams);
    if (next && next !== segment) params.set('segment', next);
    else params.delete('segment');
    setSearchParams(params, { replace: true });
  };

  if (isLoading && !overview) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="animate-spin" size={22} />
        <span className="text-sm font-bold uppercase tracking-widest">Loading player analytics…</span>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-[40px] p-10 text-center space-y-4">
        <p className="text-rose-700 font-bold">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!overview) return null;
  const { kpis } = overview;
  const kpiCards = [
    { label: 'Players', value: kpis.players, hint: 'Accounts, excluding admins and owner-only' },
    { label: 'Active 7d', value: kpis.active7d, hint: 'Signed in this week' },
    { label: 'Active 30d', value: kpis.active30d, hint: 'Signed in this month' },
    { label: 'Dormant 90d+', value: kpis.dormant90d, hint: 'Last sign-in over 90 days ago' },
    { label: 'Never signed in', value: kpis.neverSignedIn, hint: 'Created but never logged in' },
    { label: 'Unconfirmed', value: kpis.unconfirmed, hint: 'Email not confirmed', segment: 'stuck_unconfirmed' as PlayerSegmentType },
  ];

  return (
    <div className="space-y-10 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Player Analytics</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Where players drop off and what gets in their way. Updated {formatUserDate(overview.computedAt)}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest w-fit"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        {kpiCards.map((card) => {
          const content = (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
              <p className="mt-4 text-3xl font-black text-slate-900 tracking-tighter">{card.value.toLocaleString()}</p>
              <p className="mt-2 text-[11px] font-medium text-slate-400">{card.hint}</p>
            </>
          );
          const className = 'text-left p-6 rounded-[32px] border border-slate-200 bg-white shadow-sm';
          return card.segment ? (
            <button
              key={card.label}
              type="button"
              onClick={() => selectSegment(card.segment)}
              className={`${className} hover:shadow-xl hover:border-slate-300 transition-all`}
            >
              {content}
            </button>
          ) : (
            <div key={card.label} className={className}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-200 shadow-sm">
        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3 mb-6">
          <TrendingUp className="text-blue-600" /> Signups vs Active Players · 12 Months
        </h2>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={overview.activityTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }} />
              <Bar dataKey="signups" name="Signups" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="activeUsers" name="Active (logged in)" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <OnboardingFunnel stages={overview.funnel} activeSegment={segment} onSelectSegment={selectSegment} />

      <StruggleCards struggles={overview.struggles} activeSegment={segment} onSelectSegment={selectSegment} />

      {segment ? (
        <PlayerSegmentTable
          segment={segment}
          onClose={() => selectSegment(null)}
          onOpenPlayer={(playerId) => navigate(`/admin/players/${playerId}`)}
        />
      ) : null}

      <TrackedStruggles />
    </div>
  );
};

export default PlayerAnalyticsPanel;
