import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  Loader2,
  MapPin,
  PhilippinePeso,
  Search,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  fetchCourtsAnalytics,
  type CourtAnalyticsRow,
  type CourtsAnalytics,
} from '../../services/adminAnalytics';

const BAR_COLORS = ['#2563eb', '#cbd5e1'];

const AdminCourtsAnalytics: React.FC = () => {
  const [data, setData] = useState<CourtsAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCourtsAnalytics();
      setData(result);
    } catch (err: any) {
      console.error('Courts analytics failed:', err);
      setError(err?.message || 'Failed to load courts analytics. Check admin RLS permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredCourts = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.courts;
    return data.courts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.locationName.toLowerCase().includes(q)
    );
  }, [data, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="animate-spin" size={22} />
        <span className="text-sm font-bold uppercase tracking-widest">Loading courts analytics…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-100 rounded-[40px] p-10 text-center space-y-4">
        <p className="text-rose-700 font-bold">{error}</p>
        <button
          onClick={load}
          className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        <MiniMetric icon={<Building2 size={16} />} label="Total Courts" value={data.totalCourts.toLocaleString()} />
        <MiniMetric icon={<MapPin size={16} />} label="Locations" value={data.totalLocations.toLocaleString()} />
        <MiniMetric icon={<Calendar size={16} />} label="30d Bookings" value={data.bookings30d.toLocaleString()} />
        <MiniMetric
          icon={<PhilippinePeso size={16} />}
          label="30d GMV"
          value={`₱${Math.round(data.gmv30d).toLocaleString()}`}
        />
        <MiniMetric
          icon={<TrendingUp size={16} />}
          label="Utilization"
          value={`${data.utilizationPct}%`}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-white p-8 md:p-10 rounded-[48px] border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-tight flex items-center gap-3">
            <Calendar className="text-blue-600" /> Bookings · Last 14 Days
          </h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailySeries}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {data.dailySeries.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === data.dailySeries.length - 1 ? BAR_COLORS[0] : BAR_COLORS[1]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Top Courts by Revenue</h2>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {data.topCourts.length === 0 ? (
              <p className="text-sm text-slate-400 font-medium">No booking revenue in the last 30 days.</p>
            ) : (
              data.topCourts.slice(0, 8).map((court, i) => (
                <div
                  key={court.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{i + 1}</p>
                    <p className="font-black text-slate-900 text-sm truncate">{court.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{court.ownerName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-slate-900 text-sm">₱{Math.round(court.revenue).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{court.bookingCount} bookings</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 md:p-10 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">All Courts</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">Platform-wide court inventory and 30-day activity.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search court, owner, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-3xl py-3.5 pl-12 pr-5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 w-full md:w-80"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Court</th>
                <th className="px-8 py-5">Owner</th>
                <th className="px-8 py-5">Location</th>
                <th className="px-8 py-5">Type</th>
                <th className="px-8 py-5 text-right">Bookings</th>
                <th className="px-8 py-5 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCourts.map((court: CourtAnalyticsRow) => (
                <tr key={court.id}>
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-950 text-sm">{court.name}</p>
                    <p className="text-[11px] text-slate-400">{court.numCourts} unit{court.numCourts === 1 ? '' : 's'}</p>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">{court.ownerName}</td>
                  <td className="px-8 py-5 text-sm text-slate-500">{court.locationName}</td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-slate-100 text-slate-500">
                      {court.courtType || '—'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900">{court.bookingCount}</td>
                  <td className="px-8 py-5 text-right font-black text-slate-900">
                    ₱{Math.round(court.revenue).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filteredCourts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-medium">
                    No courts match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const MiniMetric: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="bg-white p-8 rounded-[36px] border border-slate-200 shadow-sm">
    <div className="flex items-center gap-2 text-slate-400 mb-4">
      {icon}
      <p className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
    </div>
    <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
  </div>
);

export default AdminCourtsAnalytics;
