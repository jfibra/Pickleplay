import React from 'react';
import { CalendarX, ClockAlert, MessageSquareOff, Moon, Star, Trophy } from 'lucide-react';
import { SEGMENT_LABELS } from '../../../services/adminPlayers';
import type { PlayerOverview, PlayerSegmentType } from '../../../services/adminPlayers';

const ICONS: Partial<Record<PlayerSegmentType, React.ReactNode>> = {
  dormant: <Moon size={18} />,
  stuck_skill: <Star size={18} />,
  unanswered_requests: <MessageSquareOff size={18} />,
  stale_matches: <ClockAlert size={18} />,
  booking_issues: <CalendarX size={18} />,
  registration_issues: <Trophy size={18} />,
};

interface StruggleCardsProps {
  struggles: PlayerOverview['struggles'];
  activeSegment: PlayerSegmentType | null;
  onSelectSegment: (segment: PlayerSegmentType) => void;
}

const StruggleCards: React.FC<StruggleCardsProps> = ({ struggles, activeSegment, onSelectSegment }) => (
  <div>
    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-1">Where Players Struggle</h2>
    <p className="text-sm font-medium text-slate-500 mb-6">From existing activity data. Click a card to see the players.</p>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
      {struggles.map((struggle) => {
        const label = SEGMENT_LABELS[struggle.type];
        const isActive = activeSegment === struggle.type;
        return (
          <button
            key={struggle.type}
            type="button"
            onClick={() => onSelectSegment(struggle.type)}
            aria-pressed={isActive}
            disabled={struggle.count === 0}
            className={`text-left p-6 rounded-[32px] border transition-all group disabled:opacity-60 disabled:cursor-default ${
              isActive ? 'bg-slate-900 border-slate-900 shadow-xl' : 'bg-white border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isActive ? 'bg-white/10 text-white' : 'bg-rose-50 text-rose-500'}`}>
                {ICONS[struggle.type]}
              </span>
              <span className={`text-3xl font-black tracking-tighter ${isActive ? 'text-white' : 'text-slate-900 group-hover:text-blue-600'}`}>
                {struggle.count.toLocaleString()}
              </span>
            </div>
            <p className={`mt-4 text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-white' : 'text-slate-700'}`}>{label.title}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-400">{label.description}</p>
          </button>
        );
      })}
    </div>
  </div>
);

export default StruggleCards;
