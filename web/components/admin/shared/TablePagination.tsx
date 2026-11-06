import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

const PAGE_SIZES = [10, 25, 50, 100] as const;
export type TablePageSize = (typeof PAGE_SIZES)[number];

const getVisiblePages = (currentPage: number, totalPages: number) => {
  const safeTotal = Math.max(1, totalPages);
  const safeCurrent = Math.min(Math.max(1, currentPage), safeTotal);
  if (safeTotal <= 5) return Array.from({ length: safeTotal }, (_, index) => index + 1);
  if (safeCurrent <= 3) return [1, 2, 3, 4, 5];
  if (safeCurrent >= safeTotal - 2) return Array.from({ length: 5 }, (_, index) => safeTotal - 4 + index);
  return [safeCurrent - 2, safeCurrent - 1, safeCurrent, safeCurrent + 1, safeCurrent + 2];
};

interface TablePaginationProps {
  page: number;
  pageSize: TablePageSize;
  total: number;
  isLoading: boolean;
  noun: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: TablePageSize) => void;
}

const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  pageSize,
  total,
  isLoading,
  noun,
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);

  const goToPage = (nextPage: number) => {
    if (isLoading) return;
    const clamped = Math.min(Math.max(1, nextPage), totalPages);
    if (clamped !== safePage) onPageChange(clamped);
  };

  const buttonClass = (disabled: boolean, active = false) =>
    `min-w-9 h-9 px-2.5 rounded-xl text-[11px] font-black inline-flex items-center justify-center gap-1 transition-all ${
      active
        ? 'bg-slate-900 text-white'
        : 'bg-white text-slate-500 border border-slate-100 hover:text-slate-900 hover:border-slate-300'
    } ${disabled ? 'pointer-events-none opacity-40' : ''}`;

  return (
    <div className="flex flex-col gap-4 border-t border-slate-100 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
        {isLoading ? `Loading ${noun}...` : `Showing ${rangeStart} to ${rangeEnd} of ${total.toLocaleString()} ${noun}`}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          Rows
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value) as TablePageSize)}
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
          <button type="button" aria-label="First page" onClick={() => goToPage(1)} className={buttonClass(safePage <= 1 || isLoading)}>
            <ChevronsLeft size={14} />
          </button>
          <button type="button" aria-label="Previous page" onClick={() => goToPage(safePage - 1)} className={buttonClass(safePage <= 1 || isLoading)}>
            <ChevronLeft size={14} />
          </button>
          {getVisiblePages(safePage, totalPages).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              aria-current={pageNumber === safePage ? 'page' : undefined}
              onClick={() => goToPage(pageNumber)}
              className={buttonClass(isLoading, pageNumber === safePage)}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next page"
            onClick={() => goToPage(safePage + 1)}
            className={buttonClass(safePage >= totalPages || isLoading)}
          >
            <ChevronRight size={14} />
          </button>
          <button
            type="button"
            aria-label="Last page"
            onClick={() => goToPage(totalPages)}
            className={buttonClass(safePage >= totalPages || isLoading)}
          >
            <ChevronsRight size={14} />
          </button>
        </nav>
      </div>
    </div>
  );
};

export default TablePagination;
