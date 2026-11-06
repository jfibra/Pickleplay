import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  COURT_STATUS_OPTIONS,
  LOCATION_STATUS_OPTIONS,
  updateOwnerCourt,
  updateOwnerLocation,
} from '../../../services/adminCourtOwners';
import type { OwnerCourt, OwnerLocation } from '../../../services/adminCourtOwners';
import UserDialogFrame, {
  DialogCancelButton,
  DialogPrimaryButton,
  dialogInputClass,
  dialogLabelClass,
} from '../users/UserDialogFrame';

export type VenueTarget =
  | { kind: 'court'; venue: OwnerCourt }
  | { kind: 'location'; venue: OwnerLocation };

interface ChangeCourtStatusDialogProps {
  target: VenueTarget | null;
  /** Pre-selects the active toggle, used by the quick Deactivate / Reactivate buttons. */
  initialIsActive?: boolean;
  onClose: () => void;
  onSaved: (target: VenueTarget) => void;
  onError: (message: string) => void;
}

const ChangeCourtStatusDialog: React.FC<ChangeCourtStatusDialogProps> = ({
  target,
  initialIsActive,
  onClose,
  onSaved,
  onError,
}) => {
  const [status, setStatus] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setStatus(target.venue.status);
    setIsActive(initialIsActive ?? target.venue.isActive);
    setReason('');
  }, [target, initialIsActive]);

  if (!target) return null;

  const isCourt = target.kind === 'court';
  const options: string[] = isCourt ? COURT_STATUS_OPTIONS : LOCATION_STATUS_OPTIONS;
  const openStatus = isCourt ? 'Available' : 'Active';
  const statusChanged = status !== target.venue.status;
  const activeChanged = isActive !== target.venue.isActive;
  const restricts = (activeChanged && !isActive) || (statusChanged && status !== openStatus);
  const needsReason = restricts && !reason.trim();
  const canSave = (statusChanged || activeChanged) && !needsReason;
  const label = isCourt ? 'court' : 'location';

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      const patch = {
        ...(statusChanged ? { status } : {}),
        ...(activeChanged ? { isActive } : {}),
        reason: reason.trim(),
      };
      if (target.kind === 'court') {
        onSaved({ kind: 'court', venue: { ...target.venue, ...(await updateOwnerCourt(target.venue.id, patch)) } });
      } else {
        onSaved({ kind: 'location', venue: await updateOwnerLocation(target.venue.id, patch) });
      }
    } catch (err: any) {
      onError(err.message || `Failed to update ${label}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <UserDialogFrame
      isOpen
      title={`Update ${label}`}
      description={`${target.venue.name}. The owner is notified of any change.`}
      onClose={isSaving ? () => {} : onClose}
      footer={
        <>
          <DialogCancelButton onClick={onClose} disabled={isSaving} />
          <DialogPrimaryButton onClick={handleSave} disabled={!canSave || isSaving} tone={restricts ? 'danger' : 'dark'}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save changes
          </DialogPrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="venue-status" className={dialogLabelClass}>Status</label>
          <select id="venue-status" value={status} onChange={(e) => setStatus(e.target.value)} className={dialogInputClass}>
            {!options.includes(target.venue.status) ? <option value={target.venue.status}>{target.venue.status}</option> : null}
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-slate-100 cursor-pointer">
          <span>
            <span className="block text-[11px] font-black uppercase tracking-widest text-slate-700">
              {isActive ? 'Active' : 'Deactivated'}
            </span>
            <span className="block mt-1 text-xs font-medium text-slate-400">
              {isActive
                ? `Players can find this ${label}${isCourt ? ' and book it when Available' : ''}.`
                : `Hidden from booking until reactivated.`}
            </span>
          </span>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-5 h-5 accent-slate-900"
            aria-label={`${label} active`}
          />
        </label>

        <div>
          <label htmlFor="venue-reason" className={dialogLabelClass}>
            Reason {restricts ? '(required)' : '(optional)'}
          </label>
          <textarea
            id="venue-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Shared with the owner, e.g. Safety inspection pending"
            className={`${dialogInputClass} resize-none`}
          />
        </div>
      </div>
    </UserDialogFrame>
  );
};

export default ChangeCourtStatusDialog;
