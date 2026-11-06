import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatPercent } from '../../../services/adminPlayers';
import type { FunnelStage, PlayerSegmentType } from '../../../services/adminPlayers';

interface OnboardingFunnelProps {
  stages: FunnelStage[];
  activeSegment: PlayerSegmentType | null;
  onSelectSegment: (segment: PlayerSegmentType) => void;
}

const OnboardingFunnel: React.FC<OnboardingFunnelProps> = ({ stages, activeSegment, onSelectSegment }) => {
  const top = Math.max(1, stages[0]?.count ?? 1);
  let worst: FunnelStage | null = null;
  for (const stage of stages.slice(1)) {
    if (!worst || stage.dropOffRate > worst.dropOffRate) worst = stage;
  }

  return (
    <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-200 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Onboarding Funnel</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Each step counts players who reached it and every step before. Click a drop-off to see who is stuck.
          </p>
        </div>
        {worst && worst.dropOff > 0 ? (
          <p className="text-[11px] font-black uppercase tracking-widest text-rose-500">
            Biggest drop: {worst.label} ({formatPercent(worst.dropOffRate)})
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        {stages.map((stage) => {
          const width = Math.max(2, (stage.count / top) * 100);
          const isWorst = worst?.id === stage.id && stage.dropOff > 0;
          return (
            <div key={stage.id} className="grid grid-cols-1 lg:grid-cols-[180px_1fr_220px] items-center gap-3">
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">{stage.label}</p>
              <div className="h-10 rounded-2xl bg-slate-50 overflow-hidden">
                <div
                  className={`h-full rounded-2xl flex items-center px-4 text-[11px] font-black text-white ${isWorst ? 'bg-rose-500' : 'bg-blue-600'}`}
                  style={{ width: `${width}%` }}
                >
                  {stage.count.toLocaleString()}
                </div>
              </div>
              {stage.stuckSegment && stage.dropOff > 0 ? (
                <button
                  type="button"
                  onClick={() => onSelectSegment(stage.stuckSegment as PlayerSegmentType)}
                  aria-pressed={activeSegment === stage.stuckSegment}
                  className={`inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeSegment === stage.stuckSegment
                      ? 'bg-slate-900 text-white'
                      : 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                  }`}
                >
                  {stage.dropOff.toLocaleString()} stuck · {formatPercent(stage.dropOffRate)}
                  <ChevronRight size={14} />
                </button>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {stage.stuckSegment ? 'No drop-off' : 'Start'}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OnboardingFunnel;
