import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../ui/ConfirmDialog';
import Toast, { type ToastType } from '../../ui/Toast';
import {
  MANAGEABLE_ROLES,
  fetchManagedUsers,
  fetchManagedUsersSummary,
  permanentlyDeleteManagedUser,
  restoreManagedUser,
  softDeleteManagedUser,
} from '../../../services/adminUsers';
import type {
  AdminUserStatus,
  AdminUsersPage,
  AdminUsersPageSize,
  AdminUsersSort,
  AdminUsersSummary,
  AdminUsersTab,
  ManageableRole,
  ManagedUser,
} from '../../../services/adminUsers';
import UsersKpiCards, { type UsersKpiAction } from './UsersKpiCards';
import UsersWorkspaceTabs from './UsersWorkspaceTabs';
import UsersRoleChips from './UsersRoleChips';
import UsersFilterBar from './UsersFilterBar';
import UsersTable from './UsersTable';
import ManageUserModal from './ManageUserModal';

const STATUSES: AdminUserStatus[] = ['Active', 'Suspended', 'Pending'];

const parseTab = (value: string | null): AdminUsersTab => (value === 'deleted' ? 'deleted' : 'active');
const parseRole = (value: string | null): ManageableRole | 'all' =>
  value && (MANAGEABLE_ROLES as readonly string[]).includes(value) ? (value as ManageableRole) : 'all';
const parseStatus = (value: string | null): AdminUserStatus | 'all' =>
  value && (STATUSES as string[]).includes(value) ? (value as AdminUserStatus) : 'all';

const emptyPage = (pageSize: number): AdminUsersPage => ({ items: [], total: 0, page: 1, pageSize });

interface AdminUsersPanelProps {
  currentAdminUserId: string;
  insights?: React.ReactNode;
}

type BulkAction = 'delete' | 'permanent' | 'restore';

const AdminUsersPanel: React.FC<AdminUsersPanelProps> = ({ currentAdminUserId, insights }) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<AdminUsersTab>(() => parseTab(searchParams.get('tab')));
  const [role, setRole] = useState<ManageableRole | 'all'>(() => parseRole(searchParams.get('role')));
  const [status, setStatus] = useState<AdminUserStatus | 'all'>(() => parseStatus(searchParams.get('status')));
  const [search, setSearch] = useState(() => searchParams.get('q') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [sort, setSort] = useState<AdminUsersSort>('date');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminUsersPageSize>(25);

  const [pageResult, setPageResult] = useState<AdminUsersPage>(() => emptyPage(25));
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [summary, setSummary] = useState<AdminUsersSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedById, setSelectedById] = useState<Map<string, ManagedUser>>(() => new Map());
  const [pendingBulk, setPendingBulk] = useState<BulkAction | null>(null);
  const [isBulkRunning, setIsBulkRunning] = useState(false);

  const [managedUser, setManagedUser] = useState<ManagedUser | null>(null);
  const modalChangedRef = useRef(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });
  const notify = useCallback((message: string, type: ToastType) => setToast({ message, type, visible: true }), []);
  const closeToast = useCallback(() => setToast((current) => ({ ...current, visible: false })), []);

  const listRequestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const sync = (key: string, value: string, defaultValue: string) => {
      if (value && value !== defaultValue) params.set(key, value);
      else params.delete(key);
    };
    sync('tab', tab, 'active');
    sync('role', role, 'all');
    sync('status', tab === 'deleted' ? 'all' : status, 'all');
    sync('q', debouncedSearch.trim(), '');
    if (params.toString() !== searchParams.toString()) setSearchParams(params, { replace: true });
  }, [tab, role, status, debouncedSearch, searchParams, setSearchParams]);

  const query = useMemo(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      role,
      status: tab === 'deleted' ? ('all' as const) : status,
      tab,
      sort,
    }),
    [page, pageSize, debouncedSearch, role, status, tab, sort]
  );

  const loadList = useCallback(async () => {
    const requestId = ++listRequestId.current;
    setIsLoadingList(true);
    try {
      const result = await fetchManagedUsers(query);
      if (requestId !== listRequestId.current) return;
      setPageResult(result);
      setListError(null);
      const lastPage = Math.max(1, Math.ceil(result.total / query.pageSize));
      if (query.page > lastPage) setPage(lastPage);
    } catch (err: any) {
      if (requestId !== listRequestId.current) return;
      setPageResult(emptyPage(query.pageSize));
      setListError(err.message || 'Failed to load users');
    } finally {
      if (requestId === listRequestId.current) setIsLoadingList(false);
    }
  }, [query]);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await fetchManagedUsersSummary());
    } catch (err: any) {
      notify(err.message || 'Failed to load user summary', 'error');
    } finally {
      setSummaryLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const refreshAll = useCallback(() => {
    void loadList();
    void loadSummary();
  }, [loadList, loadSummary]);

  const resetSelection = () => setSelectedById(new Map());

  const handleTabChange = (next: AdminUsersTab) => {
    if (next === tab) return;
    resetSelection();
    setTab(next);
    setStatus('all');
    setPage(1);
  };

  const handleRoleChange = (next: ManageableRole | 'all') => {
    resetSelection();
    setRole(next);
    setPage(1);
  };

  const handleStatusChange = (next: AdminUserStatus | 'all') => {
    resetSelection();
    setStatus(next);
    setPage(1);
  };

  const handleSortChange = (next: AdminUsersSort) => {
    setSort(next);
    setPage(1);
  };

  const handlePageSizeChange = (next: AdminUsersPageSize) => {
    setPageSize(next);
    setPage(1);
  };

  const handleKpiClick = (action: UsersKpiAction) => {
    resetSelection();
    setTab(action.tab);
    setRole(action.role);
    setStatus(action.status);
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const handleUserUpdated = (next: ManagedUser) => {
    modalChangedRef.current = true;
    setPageResult((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === next.id ? next : item)),
    }));
    setSelectedById((current) => {
      if (!current.has(next.id)) return current;
      const updated = new Map(current);
      updated.set(next.id, next);
      return updated;
    });
  };

  const handleUserRemoved = (userId: string) => {
    modalChangedRef.current = true;
    setSelectedById((current) => {
      if (!current.has(userId)) return current;
      const updated = new Map(current);
      updated.delete(userId);
      return updated;
    });
  };

  const handleModalClose = () => {
    setManagedUser(null);
    if (modalChangedRef.current) {
      modalChangedRef.current = false;
      refreshAll();
    }
  };

  const runBulk = async (action: BulkAction) => {
    setPendingBulk(null);
    const targets: ManagedUser[] = [];
    selectedById.forEach((user) => {
      if (user.id !== currentAdminUserId) targets.push(user);
    });
    if (targets.length === 0) return;

    setIsBulkRunning(true);
    const failures: string[] = [];
    let succeeded = 0;

    for (const user of targets) {
      try {
        if (action === 'delete') await softDeleteManagedUser(user.id);
        else if (action === 'restore') await restoreManagedUser(user.id);
        else await permanentlyDeleteManagedUser(user.id);
        succeeded += 1;
      } catch (err: any) {
        failures.push(err.message || 'Unknown error');
      }
    }

    setIsBulkRunning(false);
    resetSelection();
    refreshAll();

    const verb = action === 'delete' ? 'moved to Deleted Users' : action === 'restore' ? 'restored' : 'permanently deleted';
    if (failures.length === 0) {
      notify(`${succeeded} user${succeeded === 1 ? '' : 's'} ${verb}`, 'success');
    } else {
      notify(`${succeeded} ${verb}, ${failures.length} failed. First error: ${failures[0]}`, 'error');
    }
  };

  const selectedCount = selectedById.size;
  const isDeletedTab = tab === 'deleted';

  const bulkConfirmCopy: Record<BulkAction, { title: string; message: string; confirm: string; variant: 'warning' | 'danger' | 'info' }> = {
    delete: {
      title: `Delete ${selectedCount} user${selectedCount === 1 ? '' : 's'}?`,
      message: 'Selected accounts will be blocked from signing in and moved to Deleted Users. You can restore them later.',
      confirm: 'Move to Deleted',
      variant: 'warning',
    },
    restore: {
      title: `Restore ${selectedCount} user${selectedCount === 1 ? '' : 's'}?`,
      message: 'Selected accounts will return to the users list and be allowed to sign in again.',
      confirm: 'Restore',
      variant: 'info',
    },
    permanent: {
      title: `Permanently delete ${selectedCount} user${selectedCount === 1 ? '' : 's'}?`,
      message: 'This irreversibly removes the auth accounts and profiles. This cannot be undone.',
      confirm: 'Delete permanently',
      variant: 'danger',
    },
  };

  const emptyMessage = listError
    ? listError
    : isDeletedTab
      ? 'No deleted users match the current filters.'
      : 'No users match the current filters.';

  return (
    <div className="space-y-8 animate-slide-up">
      <UsersKpiCards
        summary={summary}
        isLoading={summaryLoading}
        activeFilters={{ tab, role, status }}
        onCardClick={handleKpiClick}
      />

      <div className="bg-white p-6 md:p-10 rounded-[48px] border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">User Management</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {isDeletedTab
                ? 'Soft-deleted accounts. Restore them or remove them permanently.'
                : 'Search, filter, and manage every PicklePlay account.'}
            </p>
          </div>
          <UsersWorkspaceTabs
            activeTab={tab}
            usersCount={summary?.total ?? null}
            deletedCount={summary?.deleted ?? null}
            onChange={handleTabChange}
          />
        </div>

        <UsersRoleChips activeRole={role} summary={isDeletedTab ? null : summary} onChange={handleRoleChange} />

        <UsersFilterBar
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={handleStatusChange}
          showStatus={!isDeletedTab}
          sort={sort}
          onSortChange={handleSortChange}
          dateSortLabel={isDeletedTab ? 'Recently deleted' : 'Newest first'}
        />
      </div>

      {selectedCount > 0 ? (
        <div className="sticky top-4 z-20 flex flex-col gap-3 rounded-3xl border border-slate-900/10 bg-slate-900 px-6 py-4 shadow-2xl sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] font-black uppercase tracking-widest text-white">
            {selectedCount} user{selectedCount === 1 ? '' : 's'} selected across pages
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resetSelection}
              disabled={isBulkRunning}
              className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-300 border border-white/15 hover:bg-white/10 disabled:opacity-50"
            >
              Clear selection
            </button>
            {isDeletedTab ? (
              <>
                <button
                  type="button"
                  onClick={() => setPendingBulk('restore')}
                  disabled={isBulkRunning}
                  className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-green-600 text-white hover:bg-green-700 inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw size={14} /> Restore
                </button>
                <button
                  type="button"
                  onClick={() => setPendingBulk('permanent')}
                  disabled={isBulkRunning}
                  className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {isBulkRunning ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete permanently
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setPendingBulk('delete')}
                disabled={isBulkRunning}
                className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-rose-600 text-white hover:bg-rose-700 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isBulkRunning ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete selected
              </button>
            )}
          </div>
        </div>
      ) : null}

      <UsersTable
        items={pageResult.items}
        page={page}
        pageSize={pageSize}
        total={pageResult.total}
        isLoading={isLoadingList}
        sort={sort}
        showDeletedMeta={isDeletedTab}
        currentAdminUserId={currentAdminUserId}
        selectedById={selectedById}
        onSelectedChange={setSelectedById}
        selectionDisabled={isBulkRunning}
        emptyMessage={emptyMessage}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onSortChange={handleSortChange}
        onManage={setManagedUser}
      />

      {insights ? (
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setInsightsOpen((open) => !open)}
            aria-expanded={insightsOpen}
            className="w-full flex items-center justify-between px-10 py-6 text-left"
          >
            <span className="text-xl font-black text-slate-900 uppercase tracking-tight">Insights</span>
            <ChevronDown size={20} className={`text-slate-400 transition-transform ${insightsOpen ? 'rotate-180' : ''}`} />
          </button>
          {insightsOpen ? <div className="px-6 pb-8 md:px-10 md:pb-10">{insights}</div> : null}
        </div>
      ) : null}

      <ManageUserModal
        isOpen={Boolean(managedUser)}
        user={managedUser}
        currentAdminUserId={currentAdminUserId}
        onClose={handleModalClose}
        onUserUpdated={handleUserUpdated}
        onUserRemoved={handleUserRemoved}
        notify={notify}
      />

      {pendingBulk ? (
        <ConfirmDialog
          isOpen
          title={bulkConfirmCopy[pendingBulk].title}
          message={bulkConfirmCopy[pendingBulk].message}
          variant={bulkConfirmCopy[pendingBulk].variant}
          confirmText={bulkConfirmCopy[pendingBulk].confirm}
          onConfirm={() => void runBulk(pendingBulk)}
          onCancel={() => setPendingBulk(null)}
        />
      ) : null}

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={closeToast} />
    </div>
  );
};

export default AdminUsersPanel;
