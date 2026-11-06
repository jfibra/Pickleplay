import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Loader2, RefreshCw, UserCog } from 'lucide-react';
import Toast, { type ToastType } from '../../ui/Toast';
import { fetchCourtOwnerDetail } from '../../../services/adminCourtOwners';
import type { CourtOwnerDetail } from '../../../services/adminCourtOwners';
import { fetchManagedUser, formatRoleLabel } from '../../../services/adminUsers';
import type { ManagedUser } from '../../../services/adminUsers';
import { supabase } from '../../../services/supabase';
import ManageUserModal from '../users/ManageUserModal';
import { STATUS_BADGE_CLASS, formatUserDate, getDisplayName, getInitials, getRoleBadgeClass } from '../users/userDisplay';
import ChangeCourtStatusDialog, { type VenueTarget } from './ChangeCourtStatusDialog';
import OverviewTab from './OverviewTab';
import CourtsTab from './CourtsTab';
import BookingsTab from './BookingsTab';
import ManagersTab from './ManagersTab';
import ReviewsTab from './ReviewsTab';

type DetailTab = 'overview' | 'courts' | 'bookings' | 'managers' | 'reviews';

const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'courts', label: 'Courts' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'managers', label: 'Managers' },
  { id: 'reviews', label: 'Reviews' },
];

const parseTab = (value: string | null): DetailTab =>
  TABS.some((tab) => tab.id === value) ? (value as DetailTab) : 'overview';

const AdminCourtOwnerDetail: React.FC = () => {
  const { ownerId = '' } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get('tab'));

  const [detail, setDetail] = useState<CourtOwnerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminUserId, setCurrentAdminUserId] = useState('');

  const [managedUser, setManagedUser] = useState<ManagedUser | null>(null);
  const [isOpeningManage, setIsOpeningManage] = useState(false);
  const [venueTarget, setVenueTarget] = useState<VenueTarget | null>(null);
  const [venueInitialActive, setVenueInitialActive] = useState<boolean | undefined>(undefined);

  const [toast, setToast] = useState<{ message: string; type: ToastType; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false,
  });
  const notify = useCallback((message: string, type: ToastType) => setToast({ message, type, visible: true }), []);
  const closeToast = useCallback(() => setToast((current) => ({ ...current, visible: false })), []);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setIsLoading(true);
      try {
        setDetail(await fetchCourtOwnerDetail(ownerId));
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load court owner');
      } finally {
        setIsLoading(false);
      }
    },
    [ownerId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentAdminUserId(user.id);
    });
  }, []);

  const setTab = (tab: DetailTab) => {
    const params = new URLSearchParams(searchParams);
    if (tab === 'overview') params.delete('tab');
    else params.set('tab', tab);
    setSearchParams(params, { replace: true });
  };

  const openManage = async () => {
    setIsOpeningManage(true);
    try {
      setManagedUser(await fetchManagedUser(ownerId));
    } catch (err: any) {
      notify(err.message || 'Failed to load account', 'error');
    } finally {
      setIsOpeningManage(false);
    }
  };

  const openVenueDialog = (target: VenueTarget, initialIsActive?: boolean) => {
    setVenueInitialActive(initialIsActive);
    setVenueTarget(target);
  };

  const handleVenueSaved = (saved: VenueTarget) => {
    setVenueTarget(null);
    notify(`${saved.venue.name} updated. The owner has been notified.`, 'success');
    void load(true);
  };

  const owner = detail?.owner;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-6 pb-28 space-y-8">
      <button
        type="button"
        onClick={() => navigate('/admin/court-owners')}
        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft size={14} />
        Court Owners
      </button>

      {isLoading && !detail ? (
        <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
          <Loader2 className="animate-spin" size={22} />
          <span className="text-sm font-bold uppercase tracking-widest">Loading court owner…</span>
        </div>
      ) : error && !detail ? (
        <div className="bg-rose-50 border border-rose-100 rounded-[40px] p-10 text-center space-y-4">
          <p className="text-rose-700 font-bold">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest"
          >
            Retry
          </button>
        </div>
      ) : detail && owner ? (
        <>
          <div className="bg-white p-6 md:p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center gap-6">
            {owner.avatarUrl ? (
              <img
                src={owner.avatarUrl}
                alt={getDisplayName(owner)}
                className="w-20 h-20 shrink-0 rounded-3xl object-cover border border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 shrink-0 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl">
                {getInitials(owner)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 flex items-center gap-2">
                <Building2 size={12} /> Court Owner
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-950 tracking-tight truncate">{getDisplayName(owner)}</h1>
              <p className="truncate text-sm font-medium text-slate-500">
                {owner.email || '—'} · Joined {formatUserDate(owner.createdAt)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {owner.roles.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${getRoleBadgeClass(role)}`}
                  >
                    {formatRoleLabel(role)}
                  </span>
                ))}
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_BADGE_CLASS[owner.status]}`}
                >
                  {owner.status}
                </span>
                {!owner.hasOwnerRole ? (
                  <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600">
                    Owns venues without Court Owner role
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void load(true)}
                className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                type="button"
                onClick={() => void openManage()}
                disabled={isOpeningManage}
                className="px-5 py-3 rounded-2xl bg-slate-900 text-white hover:bg-blue-600 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
              >
                {isOpeningManage ? <Loader2 size={14} className="animate-spin" /> : <UserCog size={14} />} Manage account
              </button>
            </div>
          </div>

          <div className="flex gap-2 bg-white p-2 rounded-3xl border border-slate-200 shadow-sm w-fit max-w-full overflow-x-auto" role="tablist">
            {TABS.map((tab) => {
              const count =
                tab.id === 'courts'
                  ? detail.stats.courts
                  : tab.id === 'managers'
                    ? detail.managers.length
                    : tab.id === 'reviews'
                      ? detail.stats.reviewCount
                      : tab.id === 'bookings'
                        ? detail.stats.upcomingBookings
                        : null;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(tab.id)}
                  className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${
                    isActive ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                  title={tab.id === 'bookings' ? 'Upcoming bookings' : undefined}
                >
                  {tab.label}
                  {count != null ? (
                    <span className={`px-2 py-0.5 rounded-full text-[9px] ${isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {activeTab === 'overview' ? <OverviewTab detail={detail} /> : null}
          {activeTab === 'courts' ? (
            <CourtsTab locations={detail.locations} courts={detail.courts} onEdit={openVenueDialog} />
          ) : null}
          {activeTab === 'bookings' ? <BookingsTab ownerId={ownerId} courts={detail.courts} /> : null}
          {activeTab === 'managers' ? <ManagersTab managers={detail.managers} /> : null}
          {activeTab === 'reviews' ? (
            <ReviewsTab ownerId={ownerId} averageRating={detail.stats.averageRating} reviewCount={detail.stats.reviewCount} />
          ) : null}
        </>
      ) : null}

      <ManageUserModal
        isOpen={Boolean(managedUser)}
        user={managedUser}
        currentAdminUserId={currentAdminUserId}
        onClose={() => {
          setManagedUser(null);
          void load(true);
        }}
        onUserUpdated={(next) => setManagedUser(next)}
        onUserRemoved={() => navigate('/admin/court-owners')}
        notify={notify}
      />

      <ChangeCourtStatusDialog
        target={venueTarget}
        initialIsActive={venueInitialActive}
        onClose={() => setVenueTarget(null)}
        onSaved={handleVenueSaved}
        onError={(message) => notify(message, 'error')}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={closeToast} />
    </div>
  );
};

export default AdminCourtOwnerDetail;
