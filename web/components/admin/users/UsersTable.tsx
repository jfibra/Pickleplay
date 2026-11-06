import React, { useEffect, useMemo, useRef } from 'react';
import { ArrowDownAZ, ArrowDownWideNarrow, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { formatRoleLabel } from '../../../services/adminUsers';
import type { AdminUsersPageSize, AdminUsersSort, ManagedUser } from '../../../services/adminUsers';
import {
  STATUS_BADGE_CLASS,
  formatUserDate,
  getDisplayName,
  getInitials,
  getRoleBadgeClass,
  getSecondaryLine,
} from './userDisplay';

const PAGE_SIZES: AdminUsersPageSize[] = [10, 25, 50, 100];

const getVisiblePages = (currentPage: number, totalPages: number) => {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = Math.min(Math.max(1, currentPage), safeTotal);
  if (safeTotal <= 5) return Array.from({ length: safeTotal }, (_, index) => index + 1);
  if (safeCurrent <= 3) return [1, 2, 3, 4, 5];
  if (safeCurrent >= safeTotal - 2) return Array.from({ length: 5 }, (_, index) => safeTotal - 4 + index);
  return [safeCurrent - 2, safeCurrent - 1, safeCurrent, safeCurrent + 1, safeCurrent + 2];
};

const SelectAllCheckbox: React.FC<{
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}> = ({ checked, indeterminate, disabled, onChange }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      aria-label="Select all users on this page"
      className="w-4 h-4 rounded accent-slate-900 cursor-pointer disabled:cursor-not-allowed"
    />
  );
};

interface UsersTableProps {
  items: ManagedUser[];
  page: number;
  pageSize: AdminUsersPageSize;
  total: number;
  isLoading: boolean;
  sort: AdminUsersSort;
  showDeletedMeta: boolean;
  currentAdminUserId: string;
  selectedById: Map<string, ManagedUser>;
  onSelectedChange: React.Dispatch<React.SetStateAction<Map<string, ManagedUser>>>;
  selectionDisabled: boolean;
  emptyMessage: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: AdminUsersPageSize) => void;
  onSortChange: (sort: AdminUsersSort) => void;
  onManage: (user: ManagedUser) => void;
}

const thClass = 'px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap';

const UsersTable: React.FC<UsersTableProps> = ({
  items,
  page,
  pageSize,
  total,
  isLoading,
  sort,
  showDeletedMeta,
  currentAdminUserId,
  selectedById,
  onSelectedChange,
  selectionDisabled,
  emptyMessage,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onManage,
}) => {
  const columnCount = showDeletedMeta ? 8 : 7;
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);
  const isSelectionLocked = selectionDisabled || isLoading;

  const selectableItems = useMemo(
    () => items.filter((user) => user.id !== currentAdminUserId),
    [items, currentAdminUserId]
  );
  const allPageSelected = selectableItems.length > 0 && selectableItems.every((user) => selectedById.has(user.id));
  const somePageSelected = selectableItems.some((user) => selectedById.has(user.id));

  const toggleUser = (user: ManagedUser, checked: boolean) => {
    onSelectedChange((current) => {
      const next = new Map(current);
      if (checked) next.set(user.id, user);
      else next.delete(user.id);
      return next;
    });
  };

  const togglePage = (checked: boolean) => {
    onSelectedChange((current) => {
      const next = new Map(current);
      for (const user of selectableItems) {
        if (checked) next.set(user.id, user);
        else next.delete(user.id);
      }
      return next;
    });
  };

  const goToPage = (nextPage: number) => {
    if (isLoading) return;
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped !== safePage) onPageChange(clamped);
  };

  const pagerButtonClass = (disabled: boolean, active = false) =>
    `min-w-9 h-9 px-2.5 rounded-xl text-[11px] font-black inline-flex items-center justify-center gap-1 transition-all ${
      active
        ? 'bg-slate-900 text-white'
        : 'bg-white text-slate-500 border border-slate-100 hover:text-slate-900 hover:border-slate-300'
    } ${disabled ? 'pointer-events-none opacity-40' : ''}`;

  return (
    <div className={`bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden ${isLoading ? 'opacity-80' : ''}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-12 pl-8 pr-2 py-4">
                <SelectAllCheckbox
                  checked={allPageSelected}
                  indeterminate={!allPageSelected && somePageSelected}
                  disabled={selectableItems.length === 0 || isSelectionLocked}
                  onChange={togglePage}
                />
              </th>
              <th className={`${thClass} w-28`}>Manage</th>
              <th className={thClass}>
                <button type="button" onClick={() => onSortChange('name')} className="inline-flex items-center gap-1.5 uppercase">
                  User
                  <ArrowDownAZ size={12} className={sort === 'name' ? 'text-blue-600' : ''} />
                </button>
              </th>
              <th className={`${thClass} w-44`}>Role</th>
              <th className={`${thClass} w-32`}>Status</th>
              <th className={`${thClass} w-24`}>DUPR</th>
              {showDeletedMeta ? <th className={`${thClass} w-48`}>Deleted by</th> : null}
              <th className={`${thClass} w-36 pr-8`}>
                <button type="button" onClick={() => onSortChange('date')} className="inline-flex items-center gap-1.5 uppercase">
                  {showDeletedMeta ? 'Deleted' : 'Joined'}
                  <ArrowDownWideNarrow size={12} className={sort === 'date' ? 'text-blue-600' : ''} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && items.length === 0 ? (
              Array.from({ length: 6 }).map((_, index) => (
                <tr key={`loading-${index}`}>
                  <td colSpan={columnCount} className="px-8 py-4">
                    <div className="h-10 rounded-2xl bg-slate-50 animate-pulse" />
                  </td>
                </tr>
              ))
            ) : items.length > 0 ? (
              items.map((user) => {
                const isSelf = user.id === currentAdminUserId;
                const extraRoles = user.roles.filter((role) => role !== user.activeRole).length;
                return (
                  <tr
                    key={user.id}
                    onClick={() => onManage(user)}
                    className="cursor-pointer hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="pl-8 pr-2 py-5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedById.has(user.id)}
                        disabled={isSelectionLocked || isSelf}
                        onChange={(e) => toggleUser(user, e.target.checked)}
                        aria-label={`Select ${getDisplayName(user)}`}
                        title={isSelf ? 'You cannot select your own account' : undefined}
                        className="w-4 h-4 rounded accent-slate-900 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </td>
                    <td className="px-4 py-5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onManage(user)}
                        className="whitespace-nowrap px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                      >
                        Manage
                      </button>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-4 min-w-0">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={getDisplayName(user)}
                            className="w-10 h-10 shrink-0 rounded-xl object-cover border border-slate-100 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
                            {getInitials(user)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-black text-slate-950 text-sm">
                            {getDisplayName(user)}
                            {isSelf ? (
                              <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-blue-600">You</span>
                            ) : null}
                          </p>
                          <p className="truncate text-[11px] text-slate-400">{getSecondaryLine(user)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${getRoleBadgeClass(user.activeRole)}`}
                        >
                          {formatRoleLabel(user.activeRole)}
                        </span>
                        {extraRoles > 0 ? (
                          <span
                            className="inline-flex text-[9px] font-black px-2 py-1 rounded-lg bg-blue-50 text-blue-600"
                            title={user.roles.map(formatRoleLabel).join(', ')}
                          >
                            +{extraRoles}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_BADGE_CLASS[user.status]}`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-5 text-sm font-bold text-slate-600">
                      {user.duprRating > 0 ? user.duprRating.toFixed(2) : '—'}
                    </td>
                    {showDeletedMeta ? (
                      <td className="px-4 py-5">
                        <p className="truncate text-sm font-bold text-slate-700">
                          {user.deletedByName || (user.deletedBy ? 'Unknown admin' : '—')}
                        </p>
                        {user.deletionReason ? (
                          <p className="truncate text-[11px] text-slate-400" title={user.deletionReason}>
                            {user.deletionReason}
                          </p>
                        ) : null}
                      </td>
                    ) : null}
                    <td className="px-4 pr-8 py-5 text-[11px] font-bold text-slate-400 tabular-nums whitespace-nowrap">
                      {formatUserDate(showDeletedMeta ? user.deletedAt : user.createdAt)}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={columnCount} className="px-8 py-16 text-center text-sm font-medium text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          {isLoading ? 'Loading users...' : `Showing ${rangeStart} to ${rangeEnd} of ${total.toLocaleString()} users`}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value) as AdminUsersPageSize)}
              disabled={isLoading}
              className="bg-slate-50 border border-slate-100 rounded-xl py-2 px-3 text-[11px] font-black text-slate-600 outline-none cursor-pointer"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <nav className="flex items-center gap-1.5" aria-label="Pagination">
            <button
              type="button"
              aria-label="First page"
              onClick={() => goToPage(1)}
              className={pagerButtonClass(safePage <= 1 || isLoading)}
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              aria-label="Previous page"
              onClick={() => goToPage(safePage - 1)}
              className={pagerButtonClass(safePage <= 1 || isLoading)}
            >
              <ChevronLeft size={14} />
            </button>
            {getVisiblePages(safePage, totalPages).map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                aria-current={pageNumber === safePage ? 'page' : undefined}
                onClick={() => goToPage(pageNumber)}
                className={pagerButtonClass(isLoading, pageNumber === safePage)}
              >
                {pageNumber}
              </button>
            ))}
            <button
              type="button"
              aria-label="Next page"
              onClick={() => goToPage(safePage + 1)}
              className={pagerButtonClass(safePage >= totalPages || isLoading)}
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              aria-label="Last page"
              onClick={() => goToPage(totalPages)}
              className={pagerButtonClass(safePage >= totalPages || isLoading)}
            >
              <ChevronsRight size={14} />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default UsersTable;
