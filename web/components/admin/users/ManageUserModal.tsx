import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Mail,
  Pencil,
  RotateCcw,
  Trash2,
  UserCog,
  UserMinus,
  UserRoundCheck,
  KeyRound,
  type LucideIcon,
} from 'lucide-react';
import ConfirmDialog from '../../ui/ConfirmDialog';
import {
  fetchManagedUser,
  formatRoleLabel,
  permanentlyDeleteManagedUser,
  restoreManagedUser,
  setManagedUserStatus,
  softDeleteManagedUser,
} from '../../../services/adminUsers';
import type { ManagedUser } from '../../../services/adminUsers';
import UserDialogFrame, { DialogCancelButton, DialogPrimaryButton, dialogInputClass, dialogLabelClass } from './UserDialogFrame';
import EditProfileDialog from './EditProfileDialog';
import ChangeRoleDialog from './ChangeRoleDialog';
import ResetPasswordDialog from './ResetPasswordDialog';
import ChangeEmailDialog from './ChangeEmailDialog';
import {
  STATUS_BADGE_CLASS,
  formatUserDate,
  getDisplayName,
  getInitials,
  getRoleBadgeClass,
} from './userDisplay';

type Tone = 'blue' | 'violet' | 'emerald' | 'amber' | 'sky' | 'rose' | 'danger';

const TONE_CLASS: Record<Tone, string> = {
  blue: 'text-blue-600 bg-blue-50',
  violet: 'text-violet-600 bg-violet-50',
  emerald: 'text-emerald-600 bg-emerald-50',
  amber: 'text-amber-600 bg-amber-50',
  sky: 'text-sky-600 bg-sky-50',
  rose: 'text-rose-600 bg-rose-50',
  danger: 'text-white bg-rose-500',
};

interface TileAction {
  icon: LucideIcon;
  label: string;
  tone: Tone;
  onClick: () => void;
  disabled?: boolean;
}

const ActionTile: React.FC<TileAction> = ({ icon: Icon, label, tone, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`flex flex-col items-start gap-3 p-4 rounded-3xl border transition-all text-left disabled:opacity-50 disabled:pointer-events-none ${
      tone === 'danger'
        ? 'border-rose-100 hover:border-rose-300 hover:bg-rose-50/60'
        : 'border-slate-100 hover:border-slate-300 hover:shadow-lg'
    }`}
  >
    <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${TONE_CLASS[tone]}`}>
      <Icon size={18} />
    </span>
    <span className={`text-[11px] font-black uppercase tracking-widest ${tone === 'danger' ? 'text-rose-600' : 'text-slate-700'}`}>
      {label}
    </span>
  </button>
);

const ActionGroup: React.FC<{ title: string; actions: Array<TileAction | null> }> = ({ title, actions }) => {
  const visible = actions.filter((action): action is TileAction => Boolean(action));
  if (visible.length === 0) return null;
  return (
    <div>
      <p className={dialogLabelClass}>{title}</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {visible.map((action) => (
          <ActionTile key={action.label} {...action} />
        ))}
      </div>
    </div>
  );
};

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="min-w-0">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="mt-1 truncate text-sm font-bold text-slate-800">{value}</p>
  </div>
);

const yesNo = (value: boolean) => (
  <span className={value ? 'text-green-600' : 'text-slate-400'}>{value ? 'Verified' : 'Not verified'}</span>
);

type PendingConfirm = 'suspend' | 'restore' | 'permanent' | null;

interface ManageUserModalProps {
  isOpen: boolean;
  user: ManagedUser | null;
  currentAdminUserId: string;
  onClose: () => void;
  onUserUpdated: (user: ManagedUser) => void;
  onUserRemoved: (userId: string) => void;
  notify: (message: string, type: 'success' | 'error') => void;
}

const ManageUserModal: React.FC<ManageUserModalProps> = ({
  isOpen,
  user: initialUser,
  currentAdminUserId,
  onClose,
  onUserUpdated,
  onUserRemoved,
  notify,
}) => {
  const [user, setUser] = useState<ManagedUser | null>(initialUser);
  const [isBusy, setIsBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  useEffect(() => {
    if (!isOpen || !initialUser) return;
    let cancelled = false;
    fetchManagedUser(initialUser.id)
      .then((fresh) => {
        if (!cancelled) setUser(fresh);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, initialUser?.id]);

  if (!isOpen || !user) return null;

  const isSelf = user.id === currentAdminUserId;
  const isDeleted = Boolean(user.deletedAt);
  const displayName = getDisplayName(user);

  const applyUpdate = (next: ManagedUser, message: string) => {
    setUser(next);
    onUserUpdated(next);
    notify(message, 'success');
  };

  const runAction = async (action: () => Promise<void>) => {
    setIsBusy(true);
    try {
      await action();
    } catch (err: any) {
      notify(err.message || 'Action failed', 'error');
    } finally {
      setIsBusy(false);
    }
  };

  const handleActivate = () =>
    runAction(async () => {
      applyUpdate(await setManagedUserStatus(user.id, 'Active'), `${displayName} is now active`);
    });

  const handleSuspend = () => {
    setPendingConfirm(null);
    return runAction(async () => {
      applyUpdate(await setManagedUserStatus(user.id, 'Suspended'), `${displayName} has been suspended`);
    });
  };

  const handleSoftDelete = () =>
    runAction(async () => {
      const next = await softDeleteManagedUser(user.id, deleteReason.trim());
      setDeleteOpen(false);
      setDeleteReason('');
      applyUpdate(next, `${displayName} moved to Deleted Users`);
    });

  const handleRestore = () => {
    setPendingConfirm(null);
    return runAction(async () => {
      applyUpdate(await restoreManagedUser(user.id), `${displayName} has been restored`);
    });
  };

  const handlePermanentDelete = () => {
    setPendingConfirm(null);
    return runAction(async () => {
      await permanentlyDeleteManagedUser(user.id);
      notify(`${displayName} was permanently deleted`, 'success');
      onUserRemoved(user.id);
      onClose();
    });
  };

  const notifyError = (message: string) => notify(message, 'error');

  return (
    <>
      <UserDialogFrame
        isOpen={isOpen}
        size="xl"
        title="Manage user"
        description={`Every account action and detail for ${displayName}.`}
        onClose={isBusy ? () => {} : onClose}
        footer={
          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="px-8 py-3.5 rounded-2xl bg-white text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 disabled:opacity-50"
            >
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row gap-5">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="w-20 h-20 shrink-0 rounded-3xl object-cover border border-slate-100 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 shrink-0 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xl">
                {getInitials(user)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-2xl font-black text-slate-950 tracking-tight truncate">
                {displayName}
                {isSelf ? <span className="ml-3 text-[10px] font-black uppercase tracking-widest text-blue-600">You</span> : null}
              </h4>
              <p className="truncate text-sm font-medium text-slate-500">{user.email || '—'}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className={`inline-flex text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${getRoleBadgeClass(role)} ${
                      role === user.activeRole ? 'ring-2 ring-offset-1 ring-slate-900/20' : ''
                    }`}
                    title={role === user.activeRole ? 'Active role' : undefined}
                  >
                    {formatRoleLabel(role)}
                  </span>
                ))}
                <span
                  className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${STATUS_BADGE_CLASS[user.status]}`}
                >
                  {user.status}
                </span>
                {isDeleted ? (
                  <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-500 text-white">
                    Deleted
                  </span>
                ) : null}
              </div>
            </div>
            {isBusy ? <Loader2 size={20} className="animate-spin text-slate-400 shrink-0" /> : null}
          </div>

          {isDeleted ? (
            <div className="rounded-3xl border border-rose-100 bg-rose-50/60 px-5 py-4 text-sm font-medium text-rose-700">
              Deleted {formatUserDate(user.deletedAt)}
              {user.deletedByName ? ` by ${user.deletedByName}` : ''}.
              {user.deletionReason ? ` Reason: ${user.deletionReason}` : ''} Sign-in is blocked until restored.
            </div>
          ) : null}

          <div className="space-y-6">
            <ActionGroup
              title="Profile & access"
              actions={[
                !isDeleted ? { icon: Pencil, label: 'Edit profile', tone: 'blue', onClick: () => setEditOpen(true), disabled: isBusy } : null,
                !isDeleted && !isSelf
                  ? { icon: UserCog, label: 'Change role', tone: 'violet', onClick: () => setRoleOpen(true), disabled: isBusy }
                  : null,
              ]}
            />
            <ActionGroup
              title="Account status"
              actions={[
                !isDeleted && !isSelf && user.status === 'Active'
                  ? { icon: UserMinus, label: 'Suspend', tone: 'amber', onClick: () => setPendingConfirm('suspend'), disabled: isBusy }
                  : null,
                !isDeleted && !isSelf && user.status !== 'Active'
                  ? { icon: UserRoundCheck, label: 'Activate', tone: 'emerald', onClick: handleActivate, disabled: isBusy }
                  : null,
              ]}
            />
            <ActionGroup
              title="Security"
              actions={[
                !isDeleted ? { icon: KeyRound, label: 'Reset password', tone: 'sky', onClick: () => setPasswordOpen(true), disabled: isBusy } : null,
                !isDeleted ? { icon: Mail, label: 'Change email', tone: 'violet', onClick: () => setEmailOpen(true), disabled: isBusy } : null,
              ]}
            />
          </div>

          <div className="rounded-[32px] border border-slate-100 bg-slate-50/50 p-6">
            <p className={dialogLabelClass}>Account details</p>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-5">
              <DetailItem label="Username" value={user.username ? `@${user.username}` : '—'} />
              <DetailItem label="DUPR" value={user.duprRating > 0 ? user.duprRating.toFixed(2) : '—'} />
              <DetailItem label="Location" value={user.location || '—'} />
              <DetailItem label="Active role" value={formatRoleLabel(user.activeRole)} />
              <DetailItem label="Phone" value={yesNo(user.phoneVerified)} />
              <DetailItem label="ID" value={yesNo(user.idVerified)} />
              <DetailItem label="Skill" value={yesNo(user.skillVerified)} />
              <DetailItem label="Status" value={user.status} />
              <DetailItem label="Joined" value={formatUserDate(user.createdAt)} />
              <DetailItem label="Last updated" value={formatUserDate(user.updatedAt)} />
              <div className="col-span-2 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User ID</p>
                <p className="mt-1 truncate font-mono text-xs text-slate-500" title={user.id}>{user.id}</p>
              </div>
            </div>
          </div>

          {!isSelf ? (
            <ActionGroup
              title="Danger zone"
              actions={
                isDeleted
                  ? [
                      { icon: RotateCcw, label: 'Restore', tone: 'emerald', onClick: () => setPendingConfirm('restore'), disabled: isBusy },
                      { icon: Trash2, label: 'Delete permanently', tone: 'danger', onClick: () => setPendingConfirm('permanent'), disabled: isBusy },
                    ]
                  : [{ icon: Trash2, label: 'Soft delete', tone: 'danger', onClick: () => setDeleteOpen(true), disabled: isBusy }]
              }
            />
          ) : null}
        </div>
      </UserDialogFrame>

      <EditProfileDialog
        isOpen={editOpen}
        user={user}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => {
          setEditOpen(false);
          applyUpdate(next, 'Profile updated');
        }}
        onError={notifyError}
      />
      <ChangeRoleDialog
        isOpen={roleOpen}
        user={user}
        onClose={() => setRoleOpen(false)}
        onSaved={(next) => {
          setRoleOpen(false);
          applyUpdate(next, 'Roles updated');
        }}
        onError={notifyError}
      />
      <ResetPasswordDialog
        isOpen={passwordOpen}
        user={user}
        onClose={() => setPasswordOpen(false)}
        onDone={() => {
          setPasswordOpen(false);
          notify('Password updated', 'success');
        }}
        onError={notifyError}
      />
      <ChangeEmailDialog
        isOpen={emailOpen}
        user={user}
        onClose={() => setEmailOpen(false)}
        onSaved={(next) => {
          setEmailOpen(false);
          applyUpdate(next, 'Email changed');
        }}
        onError={notifyError}
      />

      <UserDialogFrame
        isOpen={deleteOpen}
        title="Move to Deleted Users?"
        description={`${user.email || displayName} will be blocked from signing in. You can restore the account later.`}
        onClose={isBusy ? () => {} : () => setDeleteOpen(false)}
        zIndexClass="z-[10000]"
        footer={
          <>
            <DialogCancelButton onClick={() => setDeleteOpen(false)} disabled={isBusy} />
            <DialogPrimaryButton tone="danger" onClick={handleSoftDelete} disabled={isBusy}>
              {isBusy ? <Loader2 size={14} className="animate-spin" /> : null}
              Delete user
            </DialogPrimaryButton>
          </>
        }
      >
        <label htmlFor="delete-reason" className={dialogLabelClass}>Reason (optional)</label>
        <textarea
          id="delete-reason"
          value={deleteReason}
          onChange={(e) => setDeleteReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. Duplicate account, spam, user request"
          className={`${dialogInputClass} resize-none`}
        />
      </UserDialogFrame>

      <ConfirmDialog
        isOpen={pendingConfirm === 'suspend'}
        title="Suspend account?"
        message={`${displayName} will be blocked from signing in until the account is reactivated.`}
        variant="warning"
        confirmText="Suspend"
        onConfirm={handleSuspend}
        onCancel={() => setPendingConfirm(null)}
      />
      <ConfirmDialog
        isOpen={pendingConfirm === 'restore'}
        title="Restore account?"
        message={`${displayName} will return to the users list and can sign in again${user.status === 'Suspended' ? ' once unsuspended' : ''}.`}
        variant="info"
        confirmText="Restore"
        onConfirm={handleRestore}
        onCancel={() => setPendingConfirm(null)}
      />
      <ConfirmDialog
        isOpen={pendingConfirm === 'permanent'}
        title="Delete permanently?"
        message={`This irreversibly removes the auth account and profile for ${user.email || displayName}. This cannot be undone.`}
        variant="danger"
        confirmText="Delete permanently"
        onConfirm={handlePermanentDelete}
        onCancel={() => setPendingConfirm(null)}
      />
    </>
  );
};

export default ManageUserModal;
