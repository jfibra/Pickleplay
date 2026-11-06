import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { CourtOwnerListItem } from '../../../services/adminCourtOwners';
import { formatPeso } from '../../../services/adminCourtOwners';
import TablePagination, { type TablePageSize } from '../shared/TablePagination';
import { STATUS_BADGE_CLASS, formatUserDate, getDisplayName, getInitials } from '../users/userDisplay';
import { formatVerificationLabel, getVerificationBadgeClass } from './ownerDisplay';

interface CourtOwnersTableProps {
  items: CourtOwnerListItem[];
  page: number;
  pageSize: TablePageSize;
  total: number;
  isLoading: boolean;
  emptyMessage: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: TablePageSize) => void;
  onOpen: (owner: CourtOwnerListItem) => void;
}

const thClass = 'px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap';

const CourtOwnersTable: React.FC<CourtOwnersTableProps> = ({
  items,
  page,
  pageSize,
  total,
  isLoading,
  emptyMessage,
  onPageChange,
  onPageSizeChange,
  onOpen,
}) => (
  <div className={`bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden ${isLoading ? 'opacity-80' : ''}`}>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1080px] text-left">
        <thead>
          <tr className="bg-slate-50">
            <th className={`${thClass} pl-8`}>Owner</th>
            <th className={`${thClass} text-right`}>Locations</th>
            <th className={`${thClass} text-right`}>Courts</th>
            <th className={`${thClass} text-right`}>30d Bookings</th>
            <th className={`${thClass} text-right`}>30d Revenue</th>
            <th className={`${thClass} text-right`}>Upcoming</th>
            <th className={thClass}>Verification</th>
            <th className={thClass}>Account</th>
            <th className={thClass}>Joined</th>
            <th className="w-12 pr-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading && items.length === 0 ? (
            Array.from({ length: 5 }).map((_, index) => (
              <tr key={`loading-${index}`}>
                <td colSpan={10} className="px-8 py-4">
                  <div className="h-10 rounded-2xl bg-slate-50 animate-pulse" />
                </td>
              </tr>
            ))
          ) : items.length > 0 ? (
            items.map((owner) => (
              <tr key={owner.id} onClick={() => onOpen(owner)} className="cursor-pointer hover:bg-slate-50/70 transition-colors">
                <td className="pl-8 pr-4 py-5">
                  <div className="flex items-center gap-4 min-w-0">
                    {owner.avatarUrl ? (
                      <img
                        src={owner.avatarUrl}
                        alt={getDisplayName(owner)}
                        className="w-10 h-10 shrink-0 rounded-xl object-cover border border-slate-100 shadow-sm"
                      />
                    ) : (
                      <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
                        {getInitials(owner)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950 text-sm">{getDisplayName(owner)}</p>
                      <p className="truncate text-[11px] text-slate-400">{owner.email || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-5 text-right text-sm font-black text-slate-900">{owner.locations}</td>
                <td className="px-4 py-5 text-right">
                  <p className="text-sm font-black text-slate-900">{owner.courts}</p>
                  {owner.courts > 0 ? (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{owner.activeCourts} open</p>
                  ) : null}
                </td>
                <td className="px-4 py-5 text-right text-sm font-black text-slate-900">{owner.bookings30d}</td>
                <td className="px-4 py-5 text-right text-sm font-black text-slate-900">{formatPeso(owner.revenue30d)}</td>
                <td className="px-4 py-5 text-right text-sm font-black text-slate-900">{owner.upcomingBookings}</td>
                <td className="px-4 py-5">
                  <span
                    className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${getVerificationBadgeClass(owner.verificationStatus)}`}
                  >
                    {formatVerificationLabel(owner.verificationStatus)}
                  </span>
                </td>
                <td className="px-4 py-5">
                  <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_BADGE_CLASS[owner.status]}`}>
                    {owner.status}
                  </span>
                </td>
                <td className="px-4 py-5 text-[11px] font-bold text-slate-400 tabular-nums whitespace-nowrap">
                  {formatUserDate(owner.createdAt)}
                </td>
                <td className="pr-8 py-5 text-slate-300">
                  <ChevronRight size={18} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={10} className="px-8 py-16 text-center text-sm font-medium text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
    <TablePagination
      page={page}
      pageSize={pageSize}
      total={total}
      isLoading={isLoading}
      noun="owners"
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
    />
  </div>
);

export default CourtOwnersTable;
