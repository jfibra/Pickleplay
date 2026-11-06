import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle, Loader2, RefreshCw, UserCog } from 'lucide-react';
import Toast, { type ToastType } from '../../ui/Toast';
import { fetchPlayerJourney } from '../../../services/adminPlayers';
import type { PlayerJourney } from '../../../services/adminPlayers';
import { fetchManagedUser, formatRoleLabel } from '../../../services/adminUsers';
import type { ManagedUser } from '../../../services/adminUsers';
import { supabase } from '../../../services/supabase';
import ManageUserModal from '../users/ManageUserModal';
import { STATUS_BADGE_CLASS, formatUserDate, getDisplayName, getInitials, getRoleBadgeClass } from '../users/userDisplay';
import PlayerTimeline from './PlayerTimeline';

const Stat: React.FC<{ label: string; value: number; tone?: 'default' | 'danger' }> = ({ label, value, tone = 'default' }) => (
  <div className="bg-white p-5 rounded-[28px] border border-slate-200 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className={`mt-2 text-2xl font-black tracking-tighter ${tone === 'danger' && value > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
      {value.toLocaleString()}
    </p>
  </div>
);

const PlayerJourneyPage: React.FC = () => {
  const { playerId = '' } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const [journey, setJourney] = useState<PlayerJourney | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAdminUserId, setCurrentAdminUserId] = useState('');
  const [managedUser, setManagedUser] = useState<ManagedUser | null>(null);
  const [isOpeningManage, setIsOpeningManage] = useState(false);
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
        setJourney(await fetchPlayerJourney(playerId));
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load player');
      } finally {
        setIsLoading(false);
      }
    },
    [playerId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentAdminUserId(user.id);
    });
  }, []);

  const openManage = async () => {
    setIsOpeningManage(true);
    try {
      setManagedUser(await fetchManagedUser(playerId));
    } catch (err: any) {
      notify(err.message || 'This account has no profile to manage yet', 'error');
    } finally {
      setIsOpeningManage(false);
    }
  };

  const player = journey?.player;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-6 pb-28 space-y-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft size={14} />
        Player Analytics
      </button>

      {isLoading && !journey ? (
        <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
          <Loader2 className="animate-spin" size={22} />
          <span className="text-sm font-bold uppercase tracking-widest">Loading player journey…</span>
        </div>
      ) : error && !journey ? (
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
      ) : journey && player ? (
        <>
          <div className="bg-white p-6 md:p-10 rounded-[48px] border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center gap-6">
            {player.avatarUrl ? (
              <img src={player.avatarUrl} alt={getDisplayName(player)} className="w-20 h-20 shrink-0 rounded-3xl object-cover border border-slate-100 shadow-sm" />
            ) : (
              <div className="w-20 h-20 shrink-0 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl">
                {getInitials(player)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Player Journey</p>
              <h1 className="mt-1 text-3xl font-black text-slate-950 tracking-tight truncate">{getDisplayName(player)}</h1>
              <p className="truncate text-sm font-medium text-slate-500">
                {player.email || '—'} · Joined {formatUserDate(player.createdAt)} · Last sign-in{' '}
                {player.lastSignInAt ? formatUserDate(player.lastSignInAt) : 'never'}
                {player.provider ? ` · via ${player.provider}` : ''}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {player.roles.map((role) => (
                  <span key={role} className={`inline-flex text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${getRoleBadgeClass(role)}`}>
                    {formatRoleLabel(role)}
                  </span>
                ))}
                <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_BADGE_CLASS[player.status]}`}>
                  {player.status}
                </span>
                {!player.hasProfile ? (
                  <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-600">
                    No profile
                  </span>
                ) : null}
                {player.isDeleted ? (
                  <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-500 text-white">Deleted</span>
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
              {player.hasProfile ? (
                <button
                  type="button"
                  onClick={() => void openManage()}
                  disabled={isOpeningManage}
                  className="px-5 py-3 rounded-2xl bg-slate-900 text-white hover:bg-blue-600 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest disabled:opacity-60"
                >
                  {isOpeningManage ? <Loader2 size={14} className="animate-spin" /> : <UserCog size={14} />} Manage account
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-5">Onboarding</h3>
              {journey.stuckStage ? (
                <div className="mb-5 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Stuck at: {journey.stuckStage.label}</p>
                  {journey.stuckStage.reason ? <p className="mt-1 text-sm font-medium text-rose-700">{journey.stuckStage.reason}</p> : null}
                </div>
              ) : (
                <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">
                  Fully onboarded and returning.
                </div>
              )}
              <ul className="space-y-3">
                {journey.checklist.map((item) => {
                  const isStuck = journey.stuckStage?.id === item.id;
                  return (
                    <li key={item.id} className="flex items-center gap-3">
                      {item.done ? (
                        <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                      ) : (
                        <Circle size={18} className={`shrink-0 ${isStuck ? 'text-rose-500' : 'text-slate-300'}`} />
                      )}
                      <span className={`text-sm font-bold ${item.done ? 'text-slate-700' : isStuck ? 'text-rose-600' : 'text-slate-400'}`}>
                        {item.label}
                        {item.optional ? <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-slate-300">optional</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-bold text-slate-400">Skill</span>
                  <span className="font-bold text-slate-700">
                    {player.skillRating || (player.duprRating ? `DUPR ${player.duprRating.toFixed(2)}` : '—')}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-bold text-slate-400">Location</span>
                  <span className="font-bold text-slate-700 truncate">{player.location || '—'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-bold text-slate-400">Email confirmed</span>
                  <span className="font-bold text-slate-700">{player.emailConfirmedAt ? formatUserDate(player.emailConfirmedAt) : 'No'}</span>
                </div>
              </div>
              {journey.recentSessions.length > 0 ? (
                <div className="mt-6 pt-5 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Recent devices</p>
                  <ul className="space-y-2 text-sm">
                    {journey.recentSessions.map((session, index) => (
                      <li key={index} className="flex justify-between gap-3">
                        <span className="font-bold text-slate-700 truncate">{session.device}</span>
                        <span className="font-bold text-slate-400 shrink-0">{formatUserDate(session.lastActivity)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <div className="xl:col-span-2 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Stat label="Bookings" value={journey.stats.bookings} />
                <Stat label="Matches" value={journey.stats.matches} />
                <Stat label="Tournaments" value={journey.stats.tournaments} />
                <Stat label="Requests sent" value={journey.stats.matchRequestsSent} />
                <Stat label="Requests received" value={journey.stats.matchRequestsReceived} />
                <Stat label="Messages sent" value={journey.stats.messagesSent} />
                <Stat label="Achievements" value={journey.stats.achievements} />
                <Stat label="Sessions" value={journey.stats.sessions} />
                <Stat label="Struggles" value={journey.stats.struggles} tone="danger" />
              </div>
              <PlayerTimeline items={journey.timeline} />
            </div>
          </div>
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
        onUserRemoved={() => navigate('/admin/players')}
        notify={notify}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={closeToast} />
    </div>
  );
};

export default PlayerJourneyPage;
