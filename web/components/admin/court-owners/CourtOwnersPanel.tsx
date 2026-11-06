import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { fetchCourtOwners, fetchCourtOwnersSummary, formatPeso } from '../../../services/adminCourtOwners';
import type {
  CourtOwnerFilter,
  CourtOwnerSort,
  CourtOwnersPage,
  CourtOwnersSummary,
} from '../../../services/adminCourtOwners';
import type { TablePageSize } from '../shared/TablePagination';
import CourtOwnersTable from './CourtOwnersTable';

const FILTERS: Array<{ id: CourtOwnerFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'has_courts', label: 'Has courts' },
  { id: 'no_courts', label: 'No courts' },
  { id: 'pending_verification', label: 'Pending verification' },
  { id: 'suspended', label: 'Suspended' },
];

const SORTS: Array<{ id: CourtOwnerSort; label: string }> = [
  { id: 'revenue', label: 'Top revenue' },
  { id: 'bookings', label: 'Most bookings' },
  { id: 'joined', label: 'Newest first' },
  { id: 'name', label: 'Name A–Z' },
];

const parseFilter = (value: string | null): CourtOwnerFilter =>
  FILTERS.some((f) => f.id === value) ? (value as CourtOwnerFilter) : 'all';

interface KpiCard {
  key: string;
  label: string;
  description: string;
  value: (summary: CourtOwnersSummary) => string;
  filter: CourtOwnerFilter | null;
}

const KPI_CARDS: KpiCard[] = [
  { key: 'total', label: 'Court Owners', description: 'Role holders and venue owners', value: (s) => s.total.toLocaleString(), filter: 'all' },
  { key: 'with', label: 'With Courts', description: 'Have at least one court', value: (s) => s.withCourts.toLocaleString(), filter: 'has_courts' },
  { key: 'none', label: 'No Courts Yet', description: 'Setup not started', value: (s) => s.noCourts.toLocaleString(), filter: 'no_courts' },
  {
    key: 'pending',
    label: 'Pending Verification',
    description: 'Awaiting admin review',
    value: (s) => s.pendingVerification.toLocaleString(),
    filter: 'pending_verification',
  },
  { key: 'suspended', label: 'Suspended', description: 'Blocked owner accounts', value: (s) => s.suspended.toLocaleString(), filter: 'suspended' },
  {
    key: 'revenue',
    label: '30d Revenue',
    description: 'All non-cancelled bookings',
    value: (s) => formatPeso(s.revenue30d),
    filter: null,
  },
];

const emptyPage = (pageSize: number): CourtOwnersPage => ({ items: [], total: 0, page: 1, pageSize });

const CourtOwnersPanel: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filter, setFilter] = useState<CourtOwnerFilter>(() => parseFilter(searchParams.get('filter')));
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sort, setSort] = useState<CourtOwnerSort>('revenue');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(25);

  const [result, setResult] = useState<CourtOwnersPage>(() => emptyPage(25));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CourtOwnersSummary | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (filter !== 'all') params.set('filter', filter);
    else params.delete('filter');
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    else params.delete('q');
    if (params.toString() !== searchParams.toString()) setSearchParams(params, { replace: true });
  }, [filter, debouncedSearch, searchParams, setSearchParams]);

  const loadList = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    try {
      const next = await fetchCourtOwners({ page, pageSize, search: debouncedSearch, filter, sort });
      if (id !== requestId.current) return;
      setResult(next);
      setError(null);
    } catch (err: any) {
      if (id !== requestId.current) return;
      setResult(emptyPage(pageSize));
      setError(err.message || 'Failed to load court owners');
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [page, pageSize, debouncedSearch, filter, sort]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    fetchCourtOwnersSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  const applyFilter = (next: CourtOwnerFilter) => {
    setFilter(next);
    setPage(1);
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6" role="group" aria-label="Court owner metrics">
        {KPI_CARDS.map((card) => {
          const isActive = card.filter !== null && card.filter === filter;
          const className = `text-left p-6 rounded-[32px] border transition-all group ${
            isActive ? 'bg-slate-900 border-slate-900 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          } ${card.filter !== null && !isActive ? 'hover:shadow-xl hover:border-slate-300' : ''}`;
          const content = (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{card.label}</p>
              {summary ? (
                <h3
                  className={`mt-4 text-3xl font-black tracking-tighter transition-colors ${
                    isActive ? 'text-white' : 'text-slate-900 group-hover:text-blue-600'
                  }`}
                >
                  {card.value(summary)}
                </h3>
              ) : (
                <div className={`mt-4 h-9 w-16 rounded-xl animate-pulse ${isActive ? 'bg-slate-700' : 'bg-slate-100'}`} />
              )}
              <p className="mt-2 text-[11px] font-medium text-slate-400">{card.description}</p>
            </>
          );
          return card.filter !== null ? (
            <button
              key={card.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => applyFilter(card.filter as CourtOwnerFilter)}
              className={className}
            >
              {content}
            </button>
          ) : (
            <div key={card.key} className={className}>
              {content}
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 md:p-10 rounded-[48px] border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Court Owners</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Every court owner, their venues, and what is happening on their courts.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter owners">
          {FILTERS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => applyFilter(chip.id)}
              aria-pressed={filter === chip.id}
              className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                filter === chip.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-400 border border-slate-100 hover:text-slate-600'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search court owners"
              className="bg-slate-50 border border-slate-100 rounded-3xl py-4 pl-14 pr-12 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 w-full"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as CourtOwnerSort);
              setPage(1);
            }}
            aria-label="Sort owners"
            className="bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-5 text-[11px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer"
          >
            {SORTS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <CourtOwnersTable
        items={result.items}
        page={page}
        pageSize={pageSize}
        total={result.total}
        isLoading={isLoading}
        emptyMessage={error || 'No court owners match the current filters.'}
        onPageChange={setPage}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
        onOpen={(owner) => navigate(`/admin/court-owners/${owner.id}`)}
      />
    </div>
  );
};

export default CourtOwnersPanel;
