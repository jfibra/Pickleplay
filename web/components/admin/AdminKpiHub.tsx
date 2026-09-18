import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  List,
  Search,
} from 'lucide-react';

export type AdminHubKind =
  | 'analytics'
  | 'approvals'
  | 'people'
  | 'operations'
  | 'content';

export interface AdminHubQueue {
  id: string;
  kind: AdminHubKind;
  kindLabel: string;
  title: string;
  description: string;
  pending?: number;
  preview: React.ReactNode;
}

type ViewMode = 'list' | 'cols4' | 'cols5';
type KindFilter = 'all' | AdminHubKind;
type SortOrder = 'default' | 'pending' | 'alpha';

interface AdminKpiHubProps {
  queues: AdminHubQueue[];
  onOpen: (id: string) => void;
}

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All kinds' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'people', label: 'People' },
  { value: 'operations', label: 'Operations' },
  { value: 'content', label: 'Content' },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'default', label: 'Default order' },
  { value: 'pending', label: 'Pending first' },
  { value: 'alpha', label: 'A–Z' },
];

const GRID_CLASS: Record<Exclude<ViewMode, 'list'>, string> = {
  cols4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5',
  cols5: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5',
};

const AdminKpiHub: React.FC<AdminKpiHubProps> = ({ queues, onOpen }) => {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  const [viewMode, setViewMode] = useState<ViewMode>('cols4');
  const [showScrollHint, setShowScrollHint] = useState(false);
  const endSentinelRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = queues.filter((item) => {
      if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.kindLabel.toLowerCase().includes(q)
      );
    });

    if (sortOrder === 'pending') {
      list = [...list].sort((a, b) => (b.pending || 0) - (a.pending || 0));
    } else if (sortOrder === 'alpha') {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    }

    return list;
  }, [queues, search, kindFilter, sortOrder]);

  useEffect(() => {
    const sentinel = endSentinelRef.current;
    if (!sentinel || filtered.length === 0) {
      setShowScrollHint(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hint when the end of the list is not yet in view (more content below)
        setShowScrollHint(!entry.isIntersecting);
      },
      { root: null, rootMargin: '0px', threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filtered.length, viewMode]);

  return (
    <div className="space-y-8 animate-slide-up relative pb-16">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admin queues & analytics…"
            className="w-full bg-white border border-slate-200 rounded-full py-3 pl-12 pr-5 text-sm text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-300"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value as KindFilter)}
            className="bg-white border border-slate-200 rounded-full px-4 py-3 text-sm font-medium text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10"
          >
            {KIND_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="bg-white border border-slate-200 rounded-full px-4 py-3 text-sm font-medium text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="flex items-center bg-white border border-slate-200 rounded-full p-1 gap-0.5">
            <ViewToggle
              active={viewMode === 'list'}
              onClick={() => setViewMode('list')}
              ariaLabel="List view"
            >
              <List size={16} />
            </ViewToggle>
            <ViewToggle
              active={viewMode === 'cols4'}
              onClick={() => setViewMode('cols4')}
              ariaLabel="4 column grid"
            >
              <span className="text-[11px] font-black tracking-tight">4</span>
            </ViewToggle>
            <ViewToggle
              active={viewMode === 'cols5'}
              onClick={() => setViewMode('cols5')}
              ariaLabel="5 column grid"
            >
              <span className="text-[11px] font-black tracking-tight">5</span>
            </ViewToggle>
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-400 font-medium">
        {filtered.length} queue{filtered.length === 1 ? '' : 's'}
      </p>

      <div
        className={
          viewMode === 'list' ? 'flex flex-col gap-4' : GRID_CLASS[viewMode]
        }
      >
        {filtered.map((queue) => (
          <HubCard
            key={queue.id}
            queue={queue}
            listMode={viewMode === 'list'}
            onOpen={() => onOpen(queue.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-medium">
          No queues match your search.
        </div>
      )}

      {/* Sentinel: when this enters the viewport, all queues are visible */}
      <div ref={endSentinelRef} className="h-px w-full" aria-hidden />

      {showScrollHint && (
        <div
          className="pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-20"
          aria-hidden
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-200/80 text-sm font-medium text-slate-600 shadow-md shadow-slate-900/5">
            More queues below
            <ChevronDown size={16} className="text-slate-500" />
          </div>
        </div>
      )}
    </div>
  );
};

const HubCard: React.FC<{
  queue: AdminHubQueue;
  listMode?: boolean;
  onOpen: () => void;
}> = ({ queue, listMode, onOpen }) => {
  const pending = queue.pending ?? 0;
  const clear = pending <= 0;

  if (listMode) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left bg-white border border-slate-200 rounded-3xl p-5 flex items-center gap-5 hover:border-blue-300 hover:shadow-md transition-all group"
      >
        <div className="w-28 h-20 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
          {queue.preview}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
              {queue.kindLabel}
            </span>
            {clear ? (
              <span className="text-xs text-slate-400">All clear</span>
            ) : (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {pending} Pending
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
            {queue.title}
          </h3>
          <p className="text-sm text-slate-500 line-clamp-1">{queue.description}</p>
        </div>
        <span className="text-sm font-semibold text-blue-600 inline-flex items-center gap-1 shrink-0">
          Open <ArrowRight size={14} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left bg-white border border-slate-200 rounded-3xl overflow-hidden hover:border-blue-300 hover:shadow-lg transition-all group flex flex-col"
    >
      <div className="h-40 bg-slate-50 border-b border-slate-100 overflow-hidden relative">
        {queue.preview}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
            {queue.kindLabel}
          </span>
          {clear ? (
            <span className="text-xs text-slate-400">All clear</span>
          ) : (
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {pending} Pending
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1.5 group-hover:text-blue-700 transition-colors">
          {queue.title}
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 flex-1">
          {queue.description}
        </p>
        <span className="mt-4 text-sm font-semibold text-blue-600 inline-flex items-center gap-1">
          Open <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </button>
  );
};

const ViewToggle: React.FC<{
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}> = ({ active, onClick, ariaLabel, children }) => (
  <button
    type="button"
    aria-label={ariaLabel}
    onClick={onClick}
    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
      active ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700'
    }`}
  >
    {children}
  </button>
);

/** Compact preview widgets for hub cards */
export const HubPreviewUsers: React.FC<{ total: number; active: number }> = ({ total, active }) => (
  <div className="h-full w-full p-4 flex flex-col justify-end gap-2">
    <div className="flex items-end gap-1.5 h-16">
      {[40, 55, 48, 70, 62, 85, 78].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-md bg-blue-500/80"
          style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }}
        />
      ))}
    </div>
    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
      <span>{total.toLocaleString()} users</span>
      <span>{active} active</span>
    </div>
  </div>
);

export const HubPreviewList: React.FC<{ rows: { label: string; tone?: string }[] }> = ({ rows }) => (
  <div className="h-full w-full p-4 space-y-2">
    {rows.map((row, i) => (
      <div key={i} className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 px-3 py-2 shadow-sm">
        <span className={`w-2.5 h-2.5 rounded-full ${row.tone || 'bg-blue-500'}`} />
        <span className="text-xs font-semibold text-slate-600 truncate flex-1">{row.label}</span>
        <span className="text-[10px] font-bold text-blue-600 uppercase">Review</span>
      </div>
    ))}
  </div>
);

export const HubPreviewProgress: React.FC<{ pct: number; label: string }> = ({ pct, label }) => (
  <div className="h-full w-full p-5 flex flex-col justify-center gap-3">
    <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
      <div
        className="h-full rounded-full bg-blue-600 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
    <div className="flex justify-between text-xs font-semibold text-slate-500">
      <span>{label}</span>
      <span>{pct}%</span>
    </div>
  </div>
);

export const HubPreviewStats: React.FC<{ items: { label: string; value: string }[] }> = ({ items }) => (
  <div className="h-full w-full p-4 grid grid-cols-2 gap-2">
    {items.map((item) => (
      <div key={item.label} className="bg-white rounded-xl border border-slate-100 p-3 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{item.label}</p>
        <p className="text-sm font-black text-slate-900">{item.value}</p>
      </div>
    ))}
  </div>
);

export const HubPreviewBanner: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="h-full w-full bg-slate-900 text-white p-5 flex flex-col justify-end">
    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300 mb-1">{title}</p>
    <p className="text-sm font-semibold text-white/80">{subtitle}</p>
  </div>
);

export default AdminKpiHub;
