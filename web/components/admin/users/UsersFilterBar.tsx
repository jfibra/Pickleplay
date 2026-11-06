import React from 'react';
import { Search, X } from 'lucide-react';
import type { AdminUserStatus, AdminUsersSort } from '../../../services/adminUsers';

interface UsersFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  status: AdminUserStatus | 'all';
  onStatusChange: (value: AdminUserStatus | 'all') => void;
  showStatus: boolean;
  sort: AdminUsersSort;
  onSortChange: (value: AdminUsersSort) => void;
  dateSortLabel: string;
}

const selectClass =
  'bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-5 text-[11px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer';

const UsersFilterBar: React.FC<UsersFilterBarProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  showStatus,
  sort,
  onSortChange,
  dateSortLabel,
}) => (
  <div className="flex flex-col md:flex-row gap-3">
    <div className="relative flex-1">
      <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
      <input
        type="text"
        placeholder="Search by name, email, or username..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-slate-50 border border-slate-100 rounded-3xl py-4 pl-14 pr-12 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 w-full"
        aria-label="Search users"
      />
      {search ? (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          aria-label="Clear search"
          className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-white"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
    {showStatus ? (
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as AdminUserStatus | 'all')}
        className={selectClass}
        aria-label="Filter by status"
      >
        <option value="all">All statuses</option>
        <option value="Active">Active</option>
        <option value="Suspended">Suspended</option>
        <option value="Pending">Pending</option>
      </select>
    ) : null}
    <select
      value={sort}
      onChange={(e) => onSortChange(e.target.value as AdminUsersSort)}
      className={selectClass}
      aria-label="Sort users"
    >
      <option value="date">{dateSortLabel}</option>
      <option value="name">Name A–Z</option>
    </select>
  </div>
);

export default UsersFilterBar;
