import React from 'react';
import { Check, IdCard, Home, Receipt, Users, Swords } from 'lucide-react';
import {
  eligibilityLabel,
  formatLabel,
  formatPhp,
  parseTournamentExtras,
  type TournamentExtrasV1,
} from './tournamentExtras';
import type { CreateTournamentApiPayload } from '../admin/create-tournament/schema';

export type TournamentDivision = CreateTournamentApiPayload['divisions'][number];

type Props = {
  rules?: string | null;
  announcement?: string | null;
  compact?: boolean;
  /** Interactive multi-select mode for players */
  interactive?: boolean;
  selectedDivisionIds?: string[];
  onToggleDivision?: (division: TournamentDivision) => void;
  divisionCounts?: Record<string, number>;
  deadlinePassed?: boolean;
  /** Hide admin-ish extras; show a clean join list */
  playerFriendly?: boolean;
};

const REQUIREMENT_META = [
  { key: 'requireValidId' as const, label: 'Valid ID', icon: IdCard },
  { key: 'requireProofOfResidency' as const, label: 'Proof of Residency', icon: Home },
  { key: 'requirePaymentReceipt' as const, label: 'Payment Receipt', icon: Receipt },
];

const TournamentRulesPanel: React.FC<Props> = ({
  rules,
  announcement,
  compact,
  interactive,
  selectedDivisionIds = [],
  onToggleDivision,
  divisionCounts,
  deadlinePassed,
  playerFriendly,
}) => {
  const extras = parseTournamentExtras(rules);

  if (!rules && !announcement) return null;

  if (!extras) {
    return (
      <div className={compact ? 'space-y-3' : 'space-y-4'}>
        {rules && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Rules</p>
            <p className="text-sm text-slate-600 whitespace-pre-line break-words">{rules}</p>
          </div>
        )}
        {announcement && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
              Announcement
            </p>
            <p className="text-sm text-amber-900/80 whitespace-pre-line break-words">{announcement}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <ExtrasView
        extras={extras}
        compact={compact}
        interactive={interactive}
        selectedDivisionIds={selectedDivisionIds}
        onToggleDivision={onToggleDivision}
        divisionCounts={divisionCounts}
        deadlinePassed={deadlinePassed}
        playerFriendly={playerFriendly}
      />
      {announcement && !interactive && !playerFriendly && (
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">
            Announcement
          </p>
          <p className="text-sm text-amber-900/80 whitespace-pre-line break-words">{announcement}</p>
        </div>
      )}
    </div>
  );
};

function ExtrasView({
  extras,
  compact,
  interactive,
  selectedDivisionIds,
  onToggleDivision,
  divisionCounts,
  deadlinePassed,
  playerFriendly,
}: {
  extras: TournamentExtrasV1;
  compact?: boolean;
  interactive?: boolean;
  selectedDivisionIds: string[];
  onToggleDivision?: (division: TournamentDivision) => void;
  divisionCounts?: Record<string, number>;
  deadlinePassed?: boolean;
  playerFriendly?: boolean;
}) {
  const required = REQUIREMENT_META.filter((r) => extras.registrationRequirements[r.key]);
  const selectedCount = selectedDivisionIds.length;
  const showUploads = !playerFriendly && required.length > 0;

  return (
    <div className="space-y-3">
      {!interactive && !playerFriendly && (
        <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <MetaChip label="Eligibility" value={eligibilityLabel(extras.eligibility)} />
          {extras.endDate && <MetaChip label="Ends" value={extras.endDate} />}
        </div>
      )}

      <div>
        {!playerFriendly && (
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Swords size={12} /> Divisions
            </p>
            {interactive && (
              <p className="text-[10px] font-bold text-slate-400">
                {selectedCount === 0 ? 'Select one or more' : `${selectedCount} selected`}
              </p>
            )}
          </div>
        )}
        {playerFriendly && interactive && (
          <p className="text-[10px] font-bold text-slate-400 mb-2 text-right">
            {selectedCount === 0 ? 'Tap to select' : `${selectedCount} selected`}
          </p>
        )}
        <ul className="space-y-2">
          {extras.divisions.map((div) => {
            const count = divisionCounts?.[div.id] ?? 0;
            const isFull = count >= div.maxTeams;
            const selected = selectedDivisionIds.includes(div.id);
            const capacityLabel = div.eventType === 'singles' ? 'Max Players' : 'Max Teams';
            const feeLabel =
              div.registrationFee > 0 ? formatPhp(div.registrationFee) : 'Free';

            if (!interactive) {
              return (
                <li
                  key={div.id}
                  className="rounded-2xl bg-white border border-slate-100 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                >
                  <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Users size={14} className="text-blue-500 shrink-0" />
                    {div.categoryName}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {playerFriendly
                      ? `${div.eventType} · ${feeLabel}`
                      : `${formatLabel(div.format)} · ${div.eventType} · ${capacityLabel} ${div.maxTeams} · ${formatPhp(div.registrationFee)}`}
                  </span>
                </li>
              );
            }

            return (
              <li key={div.id}>
                <button
                  type="button"
                  onClick={() => onToggleDivision?.(div)}
                  className={`w-full text-left rounded-2xl px-4 py-3.5 transition-all border ${
                    selected
                      ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-500/10'
                      : 'border-slate-100 bg-white hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                        selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selected && <Check size={12} strokeWidth={3} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <span className={`text-sm font-bold ${selected ? 'text-blue-800' : 'text-slate-800'}`}>
                          {div.categoryName}
                        </span>
                        <span className="text-xs font-medium text-slate-500">
                          {playerFriendly
                            ? `${div.eventType === 'singles' ? 'Singles' : div.eventType === 'team' ? 'Team' : 'Doubles'} · ${feeLabel}`
                            : `${formatLabel(div.format)} · ${div.eventType} · ${count}/${div.maxTeams} · ${formatPhp(div.registrationFee)}`}
                        </span>
                      </div>
                      {(isFull || deadlinePassed) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {isFull && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                              Full — waitlist
                            </span>
                          )}
                          {deadlinePassed && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-slate-100 text-slate-500">
                              Deadline passed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {showUploads && (
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Registration Uploads
          </p>
          <div className="flex flex-wrap gap-2">
            {required.map((r) => (
              <span
                key={r.key}
                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
              >
                <Check size={12} />
                <r.icon size={12} />
                {r.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-800 mt-1 break-words">{value}</p>
    </div>
  );
}

export default TournamentRulesPanel;
