import React, { useState } from 'react';
import { AlertTriangle, CalendarDays, Flag, GraduationCap, Swords, Trophy, UserPlus } from 'lucide-react';
import type { PlayerTimelineItem } from '../../../services/adminPlayers';

type Filter = 'all' | 'booking' | 'match' | 'struggles';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'booking', label: 'Bookings' },
  { id: 'match', label: 'Matches' },
  { id: 'struggles', label: 'Struggles' },
];

const KIND_ICON: Record<PlayerTimelineItem['kind'], React.ReactNode> = {
  account: <UserPlus size={14} />,
  onboarding: <GraduationCap size={14} />,
  booking: <CalendarDays size={14} />,
  match: <Swords size={14} />,
  tournament: <Trophy size={14} />,
  event: <Flag size={14} />,
};

const formatWhen = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const PlayerTimeline: React.FC<{ items: PlayerTimelineItem[] }> = ({ items }) => {
  const [filter, setFilter] = useState<Filter>('all');
  const visible = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'struggles') return Boolean(item.struggle);
    return item.kind === filter;
  });

  return (
    <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Journey Timeline</h3>
        <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100 w-fit" role="group" aria-label="Filter timeline">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === option.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm font-medium text-slate-400">Nothing to show for this filter.</p>
      ) : (
        <ol className="relative border-l-2 border-slate-100 ml-3 space-y-5">
          {visible.map((item, index) => (
            <li key={`${item.at}-${index}`} className="pl-6 relative">
              <span
                className={`absolute -left-[13px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ${
                  item.struggle ? 'bg-rose-500 text-white' : 'bg-slate-900 text-white'
                }`}
              >
                {item.struggle ? <AlertTriangle size={12} /> : KIND_ICON[item.kind]}
              </span>
              <p className={`text-sm font-black ${item.struggle ? 'text-rose-600' : 'text-slate-900'}`}>{item.title}</p>
              <p className="text-[11px] font-medium text-slate-400">
                {formatWhen(item.at)}
                {item.detail ? ` · ${item.detail}` : ''}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default PlayerTimeline;
