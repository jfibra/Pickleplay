import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { updateManagedUserProfile } from '../../../services/adminUsers';
import type { ManagedUser } from '../../../services/adminUsers';
import UserDialogFrame, {
  DialogCancelButton,
  DialogPrimaryButton,
  dialogInputClass,
  dialogLabelClass,
} from './UserDialogFrame';

interface EditProfileDialogProps {
  isOpen: boolean;
  user: ManagedUser;
  onClose: () => void;
  onSaved: (user: ManagedUser) => void;
  onError: (message: string) => void;
}

const EditProfileDialog: React.FC<EditProfileDialogProps> = ({ isOpen, user, onClose, onSaved, onError }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [location, setLocation] = useState('');
  const [duprRating, setDuprRating] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFullName(user.fullName);
    setUsername(user.username);
    setLocation(user.location || '');
    setDuprRating(user.duprRating ? String(user.duprRating) : '0');
  }, [isOpen, user]);

  const dupr = Number(duprRating);
  const isValid = fullName.trim().length > 0 && Number.isFinite(dupr) && dupr >= 0 && dupr <= 8;

  const handleSave = async () => {
    if (!isValid) return;
    setIsSaving(true);
    try {
      const updated = await updateManagedUserProfile(user.id, {
        fullName: fullName.trim(),
        username: username.trim(),
        location: location.trim(),
        duprRating: dupr,
      });
      onSaved(updated);
    } catch (err: any) {
      onError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <UserDialogFrame
      isOpen={isOpen}
      title="Edit profile"
      description="Update the public profile details for this account."
      onClose={isSaving ? () => {} : onClose}
      zIndexClass="z-[10000]"
      footer={
        <>
          <DialogCancelButton onClick={onClose} disabled={isSaving} />
          <DialogPrimaryButton onClick={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
            Save changes
          </DialogPrimaryButton>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="edit-full-name" className={dialogLabelClass}>Full name</label>
          <input id="edit-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={dialogInputClass} maxLength={120} />
        </div>
        <div>
          <label htmlFor="edit-username" className={dialogLabelClass}>Username</label>
          <input id="edit-username" value={username} onChange={(e) => setUsername(e.target.value)} className={dialogInputClass} maxLength={30} />
        </div>
        <div>
          <label htmlFor="edit-location" className={dialogLabelClass}>Location</label>
          <input id="edit-location" value={location} onChange={(e) => setLocation(e.target.value)} className={dialogInputClass} maxLength={200} />
        </div>
        <div>
          <label htmlFor="edit-dupr" className={dialogLabelClass}>DUPR rating (0 – 8)</label>
          <input
            id="edit-dupr"
            type="number"
            step="0.01"
            min={0}
            max={8}
            value={duprRating}
            onChange={(e) => setDuprRating(e.target.value)}
            className={dialogInputClass}
          />
        </div>
      </div>
    </UserDialogFrame>
  );
};

export default EditProfileDialog;
