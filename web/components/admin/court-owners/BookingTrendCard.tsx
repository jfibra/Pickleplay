import React, { useEffect, useRef, useState } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchOwnerBookingSeries, formatPeso } from '../../../services/adminCourtOwners';
import type { OwnerSeries, OwnerSeriesRange } from '../../../services/adminCourtOwners';

const RANGES: Array<{ id: OwnerSeriesRange; label: string; title: string }> = [
  { id: '14d', label: '14D', title: 'Last 14 Days' },
  { id: '30d', label: '30D', title: 'Last 30 Days' },
  { id: '3m', label: '3M', title: 'Last 3 Months · Weekly' },
  { id: '6m', label: '6M', title: 'Last 6 Months · Monthly' },
  { id: '12m', label: '12M', title: 'Last 12 Months · Monthly' },
];

type Metric = 'bookings' | 'value';

const toggleClass = (active: boolean) =>
  `px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
    active ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900'
  }`;

const BookingTrendCard: React.FC<{ ownerId: string; className?: string }> = ({ ownerId, className = '' }) => {
  const [range, setRange] = useState<OwnerSeriesRange>('14d');
  const [metric, setMetric] = useState<Metric>('bookings');
  const [series, setSeries] = useState<OwnerSeries | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setIsLoading(true);
    fetchOwnerBookingSeries(ownerId, range)
      .then((next) => {
        if (id !== requestId.current) return;
        setSeries(next);
        setError(null);
      })
      .catch((err) => {
        if (id === requestId.current) setError(err.message || 'Failed to load booking trend');
      })
      .finally(() => {
        if (id === requestId.current) setIsLoading(false);
      });
  }, [ownerId, range]);

  const points = series?.points ?? [];
  const totalBookings = points.reduce((sum, p) => sum + p.bookings, 0);
  const totalValue = points.reduce((sum, p) => sum + p.value, 0);
  const title = RANGES.find((r) => r.id === range)?.title ?? '';

  return (
    <div className={`bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm ${className}`}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <CalendarClock className="text-blue-600" />
            Bookings · {title}
          </h3>
          <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
            {totalBookings.toLocaleString()} booking{totalBookings === 1 ? '' : 's'} · {formatPeso(totalValue)} booked
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100" role="group" aria-label="Chart metric">
            <button type="button" onClick={() => setMetric('bookings')} aria-pressed={metric === 'bookings'} className={toggleClass(metric === 'bookings')}>
              Count
            </button>
            <button type="button" onClick={() => setMetric('value')} aria-pressed={metric === 'value'} className={toggleClass(metric === 'value')}>
              Value
            </button>
          </div>
          <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100" role="group" aria-label="Chart range">
            {RANGES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setRange(option.id)}
                aria-pressed={range === option.id}
                className={toggleClass(range === option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative h-[260px]">
        {error ? (
          <p className="flex h-full items-center justify-center text-sm font-bold text-rose-600">{error}</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} minTickGap={8} />
              <YAxis hide allowDecimals={metric === 'value'} />
              <Tooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => (metric === 'value' ? formatPeso(value) : value)}
                labelFormatter={(label: string) => (series?.bucket === 'week' ? `Week of ${label}` : label)}
              />
              <Bar dataKey={metric} name={metric === 'value' ? 'Booked value' : 'Bookings'} radius={[8, 8, 0, 0]}>
                {points.map((point, index) => (
                  <Cell key={point.key} fill={index === points.length - 1 ? '#2563eb' : '#cbd5e1'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Loader2 className="animate-spin text-slate-400" size={20} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default BookingTrendCard;
