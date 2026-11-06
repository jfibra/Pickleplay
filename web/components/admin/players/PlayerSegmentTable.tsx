import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, X } from 'lucide-react';
import { SEGMENT_LABELS, fetchPlayerSegment } from '../../../services/adminPlayers';
import type { PlayerSegmentPage, PlayerSegmentType } from '../../../services/adminPlayers';
import TablePagination, { type TablePageSize } from '../shared/TablePagination';
import { formatUserDate, getDisplayName, getInitials } from '../users/userDisplay';

interface PlayerSegmentTableProps {
  segment: PlayerSegmentType;
  onClose: () => void;
  onOpenPlayer: (playerId: string) => void;
}

const thClass = 'px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap';

const PlayerSegmentTable: React.FC<PlayerSegmentTableProps> = ({ segment, onClose, onOpenPlayer }) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [result, setResult] = useState<PlayerSegmentPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage(1);
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [segment]);

  useEffect(() => {
    const id = ++requestId.current;
    setIsLoading(true);
    fetchPlayerSegment(segment, page, pageSize)
      .then((next) => {
        if (id !== requestId.current) return;
        setResult(next);
        setError(null);
      })
      .catch((err) => {
        if (id === requestId.current) setError(err.message || 'Failed to load players');
      })
      .finally(() => {
        if (id === requestId.current) setIsLoading(false);
      });
  }, [segment, page, pageSize]);

  const label = SEGMENT_LABELS[segment];
  const items = result?.items ?? [];

  return (
    <div ref={containerRef} className={`bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden scroll-mt-6 ${isLoading ? 'opacity-80' : ''}`}>
      <div className="flex items-start justify-between gap-4 px-8 md:px-10 pt-8 pb-6 border-b border-slate-100">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Players</p>
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{label.title}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">{label.description}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player list"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50"
        >
          <X size={18} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className={`${thClass} pl-8`}>Player</th>
              <th className={thClass}>Why they are here</th>
              <th className={`${thClass} text-right`}>Activities</th>
              <th className={thClass}>Last sign-in</th>
              <th className={thClass}>Joined</th>
              <th className="w-12 pr-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && items.length === 0 ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={`loading-${index}`}>
                  <td colSpan={6} className="px-8 py-4">
                    <div className="h-10 rounded-2xl bg-slate-50 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : items.length > 0 ? (
              items.map((player) => (
                <tr key={player.id} onClick={() => onOpenPlayer(player.id)} className="cursor-pointer hover:bg-slate-50/70 transition-colors">
                  <td className="pl-8 pr-4 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt={getDisplayName(player)} className="w-9 h-9 shrink-0 rounded-xl object-cover border border-slate-100" />
                      ) : (
                        <div className="w-9 h-9 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-[10px]">
                          {getInitials(player)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-950">
                          {getDisplayName(player)}
                          {!player.hasProfile ? (
                            <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-amber-600">No profile</span>
                          ) : null}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{player.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-slate-600">{player.reason}</td>
                  <td className="px-4 py-4 text-right text-sm font-black text-slate-900">{player.activities}</td>
                  <td className="px-4 py-4 text-[11px] font-bold text-slate-400 whitespace-nowrap">
                    {player.lastSignInAt ? formatUserDate(player.lastSignInAt) : 'Never'}
                  </td>
                  <td className="px-4 py-4 text-[11px] font-bold text-slate-400 whitespace-nowrap">{formatUserDate(player.createdAt)}</td>
                  <td className="pr-8 py-4 text-slate-300">
                    <ChevronRight size={18} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-8 py-16 text-center text-sm font-medium text-slate-400">
                  {error || 'No players in this group.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        page={page}
        pageSize={pageSize}
        total={result?.total ?? 0}
        isLoading={isLoading}
        noun="players"
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />
    </div>
  );
};

export default PlayerSegmentTable;
