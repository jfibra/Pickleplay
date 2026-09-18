import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, UserCog, Users } from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  fetchCourtManagersAnalytics,
  type CourtManagerAnalyticsRow,
  type CourtManagersAnalytics,
} from '../../services/adminAnalytics';
import type { CourtManagerStatus } from '../../types';

const PIE_COLORS = ['#2563eb', '#f59e0b', '#10b981', '#94a3b8', '#f43f5e'];

const STATUS_STYLES: Record<CourtManagerStatus, string> = {
  active: 'bg-green-50 text-green-600',
  pending_invite: 'bg-amber-50 text-amber-700',
  pending_approval: 'bg-blue-50 text-blue-600',
  removed: 'bg-slate-100 text-slate-500',
};

const AdminCourtManagersAnalytics: React.FC = () => {
  const [data, setData] = useState<CourtManagersAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourtManagerStatus | 'all'>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCourtManagersAnalytics();
      setData(result);
    } catch (err: any) {
      console.error('Court managers analytics failed:', err);
      setError(err?.message || 'Failed to load court manager analytics. Check admin RLS permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.assignments.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.managerName.toLowerCase().includes(q) ||
        row.managerEmail.toLowerCase().includes(q) ||
        row.courtName.toLowerCase().includes(q) ||
        row.ownerName.toLowerCase().includes(q)
      );
    });
  }, [data, search, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <Loader2 className="animate-spin" size={22} />
        <span className="text-sm font-bold uppercase tracking-widest">Loading court managers…</span>
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
        <MiniMetric label="Active Managers" value={data.activeManagers.toLocaleString()} />
        <MiniMetric label="Pending Invites" value={data.pendingInvites.toLocaleString()} />
        <MiniMetric label="Pending Approvals" value={data.pendingApprovals.toLocaleString()} />
        <MiniMetric label="Courts w/ Manager" value={data.courtsWithManager.toLocaleString()} />
        <MiniMetric label="Courts w/o Manager" value={data.courtsWithoutManager.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="bg-white p-8 md:p-10 rounded-[48px] border border-slate-200 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight flex items-center gap-3">
            <UserCog className="text-blue-600" /> Status Breakdown
          </h2>
          {data.byStatus.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium py-12 text-center">No manager assignments yet.</p>
          ) : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byStatus}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {data.byStatus.map((_, index) => (
                      <Cell key={`pie-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            {data.byStatus.map((s, i) => (
              <span
                key={s.name}
                className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                {s.name} · {s.value}
              </span>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white p-8 md:p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col justify-center">
          <h2 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight flex items-center gap-3">
            <Users className="text-blue-600" /> Coverage Snapshot
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-[28px] bg-slate-950 text-white">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-lime-400 mb-3">Managed</p>
              <p className="text-4xl font-black tracking-tighter">{data.courtsWithManager}</p>
              <p className="text-sm text-white/50 mt-2 font-medium">Courts with an active manager</p>
            </div>
            <div className="p-6 rounded-[28px] bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Uncovered</p>
              <p className="text-4xl font-black tracking-tighter text-slate-900">{data.courtsWithoutManager}</p>
              <p className="text-sm text-slate-500 mt-2 font-medium">Courts without an active manager</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 md:p-10 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Manager Assignments</h2>
            <p className="text-slate-500 text-sm font-medium mt-1">All court manager invites and active assignments.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-wrap">
              {(['all', 'active', 'pending_invite', 'pending_approval', 'removed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    statusFilter === s
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-400 border border-slate-100 hover:text-slate-600'
                  }`}
                >
                  {s === 'all' ? 'All' : s.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search manager, court, owner…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-3xl py-3.5 pl-12 pr-5 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 w-full sm:w-72"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">Manager</th>
                <th className="px-8 py-5">Court</th>
                <th className="px-8 py-5">Owner</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Assigned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row: CourtManagerAnalyticsRow) => (
                <tr key={row.id}>
                  <td className="px-8 py-5">
                    <p className="font-black text-slate-950 text-sm">{row.managerName}</p>
                    <p className="text-[11px] text-slate-400">{row.managerEmail}</p>
                  </td>
                  <td className="px-8 py-5 text-sm font-medium text-slate-600">{row.courtName}</td>
                  <td className="px-8 py-5 text-sm text-slate-500">{row.ownerName}</td>
                  <td className="px-8 py-5">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        STATUS_STYLES[row.status] || STATUS_STYLES.removed
                      }`}
                    >
                      {row.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right text-sm text-slate-500">
                    {row.assignedAt ? new Date(row.assignedAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium">
                    No assignments match your filters.
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

const MiniMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white p-8 rounded-[36px] border border-slate-200 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">{label}</p>
    <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
  </div>
);

export default AdminCourtManagersAnalytics;
