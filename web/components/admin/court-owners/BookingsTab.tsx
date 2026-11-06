import React, { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOwnerBookings, formatPeso } from '../../../services/adminCourtOwners';
import type { OwnerBooking, OwnerBookingsRange, OwnerCourt, Paged } from '../../../services/adminCourtOwners';
import TablePagination, { type TablePageSize } from '../shared/TablePagination';
import { formatBookingDate, formatTime, getBookingStatusBadge } from './ownerDisplay';

const RANGES: Array<{ id: OwnerBookingsRange; label: string }> = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
];

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show'];

const selectClass =
  'bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-[11px] font-black uppercase tracking-widest text-slate-600 outline-none cursor-pointer';
const thClass = 'px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap';

const BookingsTab: React.FC<{ ownerId: string; courts: OwnerCourt[] }> = ({ ownerId, courts }) => {
  const [range, setRange] = useState<OwnerBookingsRange>('upcoming');
  const [status, setStatus] = useState('all');
  const [courtId, setCourtId] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);
  const [result, setResult] = useState<Paged<OwnerBooking>>({ items: [], total: 0, page: 1, pageSize: 25 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    try {
      const next = await fetchOwnerBookings(ownerId, { page, pageSize, range, status, courtId });
      if (id !== requestId.current) return;
      setResult(next);
      setError(null);
    } catch (err: any) {
      if (id !== requestId.current) return;
      setResult({ items: [], total: 0, page: 1, pageSize });
      setError(err.message || 'Failed to load bookings');
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [ownerId, page, pageSize, range, status, courtId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex gap-2 bg-white p-2 rounded-3xl border border-slate-200 shadow-sm w-fit" role="tablist">
          {RANGES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={range === option.id}
              onClick={() => {
                setRange(option.id);
                setPage(1);
              }}
              className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                range === option.id ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by booking status"
          className={selectClass}
        >
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {option === 'all' ? 'All statuses' : option.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={courtId}
          onChange={(e) => {
            setCourtId(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by court"
          className={selectClass}
        >
          <option value="all">All courts</option>
          {courts.map((court) => (
            <option key={court.id} value={court.id}>
              {court.name}
            </option>
          ))}
        </select>
      </div>

      <div className={`bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden ${isLoading ? 'opacity-80' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className={`${thClass} pl-8`}>Date &amp; time</th>
                <th className={thClass}>Court</th>
                <th className={thClass}>Player</th>
                <th className={`${thClass} text-right`}>Price</th>
                <th className={thClass}>Payment</th>
                <th className={thClass}>Check-in</th>
                <th className={`${thClass} pr-8`}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && result.items.length === 0 ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`loading-${index}`}>
                    <td colSpan={7} className="px-8 py-4">
                      <div className="h-10 rounded-2xl bg-slate-50 animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : result.items.length > 0 ? (
                result.items.map((booking) => (
                  <tr key={booking.id}>
                    <td className="pl-8 pr-4 py-5">
                      <p className="text-sm font-black text-slate-900 whitespace-nowrap">{formatBookingDate(booking.date)}</p>
                      <p className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                        {formatTime(booking.startTime)}
                        {booking.endTime ? ` – ${formatTime(booking.endTime)}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-5 text-sm font-bold text-slate-700">{booking.courtName}</td>
                    <td className="px-4 py-5">
                      <p className="text-sm font-bold text-slate-900">{booking.playerName}</p>
                      {booking.playerEmail ? <p className="text-[11px] text-slate-400">{booking.playerEmail}</p> : null}
                    </td>
                    <td className="px-4 py-5 text-right text-sm font-black text-slate-900">{formatPeso(booking.totalPrice)}</td>
                    <td className="px-4 py-5">
                      <p className="text-[11px] font-black uppercase tracking-widest text-slate-600">{booking.paymentStatus || '—'}</p>
                      <p className="text-[11px] text-slate-400">{booking.paymentMethod ? booking.paymentMethod.replace(/_/g, ' ') : ''}</p>
                    </td>
                    <td className="px-4 py-5 text-[11px] font-black uppercase tracking-widest">
                      {booking.isNoShow ? (
                        <span className="text-rose-500">No-show</span>
                      ) : booking.isCheckedIn ? (
                        <span className="text-green-600">Checked in</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 pr-8 py-5">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getBookingStatusBadge(booking.status)}`}
                        title={booking.cancelledReason || undefined}
                      >
                        {(booking.status || '—').replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-8 py-16 text-center text-sm font-medium text-slate-400">
                    {error || 'No bookings match the current filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={result.total}
          isLoading={isLoading}
          noun="bookings"
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
};

export default BookingsTab;
