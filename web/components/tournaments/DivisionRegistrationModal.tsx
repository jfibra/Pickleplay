import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Upload, User, Users, Loader2, Check } from 'lucide-react';
import type { CreateTournamentApiPayload } from '../admin/create-tournament/schema';
import { formatPhp } from './tournamentExtras';

export type TournamentDivision = CreateTournamentApiPayload['divisions'][number];

export type DivisionPlayerInput = {
  fullName: string;
  email: string;
  phone: string;
};

export type DivisionRegistrationFormResult = {
  divisions: TournamentDivision[];
  players: DivisionPlayerInput[];
  paymentReceiptFile: File | null;
  notes: string;
  waitlist: boolean;
};

type ProfileSeed = {
  fullName?: string;
  email?: string;
  phone?: string;
};

type Props = {
  isOpen: boolean;
  divisions: TournamentDivision[];
  waitlist?: boolean;
  requirePaymentReceipt?: boolean;
  profileSeed?: ProfileSeed | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (result: DivisionRegistrationFormResult) => void | Promise<void>;
};

function emptyPlayer(): DivisionPlayerInput {
  return { fullName: '', email: '', phone: '' };
}

const DivisionRegistrationModal: React.FC<Props> = ({
  isOpen,
  divisions,
  waitlist = false,
  requirePaymentReceipt = false,
  profileSeed,
  isSubmitting = false,
  onClose,
  onSubmit,
}) => {
  const playerCount = Math.max(1, ...divisions.map((d) => d.playersPerEntry || 1), 1);
  const totalFee = divisions.reduce((sum, d) => sum + (d.registrationFee || 0), 0);
  const needsReceipt = requirePaymentReceipt || totalFee > 0;
  const fileRef = useRef<HTMLInputElement>(null);

  const [players, setPlayers] = useState<DivisionPlayerInput[]>([emptyPlayer()]);
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const divisionKey = divisions.map((d) => d.id).join('|');

  useEffect(() => {
    if (!isOpen || divisions.length === 0) return;
    const count = Math.max(1, ...divisions.map((d) => d.playersPerEntry || 1));
    const next = Array.from({ length: count }, (_, i) => {
      if (i === 0 && profileSeed) {
        return {
          fullName: profileSeed.fullName || '',
          email: profileSeed.email || '',
          phone: profileSeed.phone || '',
        };
      }
      return emptyPlayer();
    });
    setPlayers(next);
    setNotes('');
    setReceiptFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }, [isOpen, divisionKey, profileSeed?.fullName, profileSeed?.email, profileSeed?.phone]);

  if (!isOpen || divisions.length === 0) return null;

  const updatePlayer = (index: number, patch: Partial<DivisionPlayerInput>) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      if (!p.fullName.trim() || !p.email.trim() || !p.phone.trim()) {
        setError(`Please complete all fields for ${playerLabel(i, playerCount)}.`);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) {
        setError(`Enter a valid email for ${playerLabel(i, playerCount)}.`);
        return;
      }
    }

    if (needsReceipt && !receiptFile) {
      setError('Payment receipt is required for the selected divisions.');
      return;
    }

    try {
      await onSubmit({
        divisions,
        players: players.map((p) => ({
          fullName: p.fullName.trim(),
          email: p.email.trim(),
          phone: p.phone.trim(),
        })),
        paymentReceiptFile: receiptFile,
        notes: notes.trim(),
        waitlist,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-[32px] rounded-t-[32px] shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">
              {waitlist ? 'Join Waitlist' : 'Register'}
            </p>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1">
              {divisions.length === 1
                ? divisions[0].categoryName
                : `${divisions.length} divisions`}
            </h2>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {divisions.map((d) => (
                <span
                  key={d.id}
                  className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100"
                >
                  {d.categoryName}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-2">
              {totalFee > 0 ? `Total fee ${formatPhp(totalFee)}` : 'Free to join'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 disabled:opacity-50 shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0" noValidate>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {players.map((player, index) => (
              <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  {playerCount > 1 ? (
                    <Users size={16} className="text-blue-600" />
                  ) : (
                    <User size={16} className="text-blue-600" />
                  )}
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {playerLabel(index, playerCount)}
                  </p>
                </div>
                <Field
                  label="Full Name"
                  required
                  value={player.fullName}
                  onChange={(v) => updatePlayer(index, { fullName: v })}
                  placeholder="Juan Dela Cruz"
                />
                <Field
                  label="Email"
                  required
                  type="email"
                  value={player.email}
                  onChange={(v) => updatePlayer(index, { email: v })}
                  placeholder="you@email.com"
                />
                <Field
                  label="Contact Number"
                  required
                  type="tel"
                  value={player.phone}
                  onChange={(v) => updatePlayer(index, { phone: v })}
                  placeholder="09XXXXXXXXX"
                />
              </div>
            ))}

            {needsReceipt && (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Payment Receipt <span className="text-rose-500">*</span>
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 text-slate-400 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {receiptFile ? (
                    <>
                      <Check size={20} className="text-emerald-600" />
                      <span className="text-sm font-bold text-slate-700 truncate max-w-full px-4">
                        {receiptFile.name}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Replace file</span>
                    </>
                  ) : (
                    <>
                      <Upload size={20} />
                      <span className="text-sm font-bold">Upload payment receipt</span>
                      <span className="text-[10px] font-medium">JPG, PNG, or PDF</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Notes to organizer (optional)
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={400}
                rows={3}
                placeholder="Anything the organizer should know…"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 text-sm font-medium text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                {error}
              </p>
            )}
          </div>

          <div className="shrink-0 flex gap-3 px-6 py-5 border-t border-slate-100 bg-white">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3.5 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] inline-flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Submitting…
                </>
              ) : waitlist ? (
                'Join Waitlist'
              ) : (
                'Submit Registration'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

function playerLabel(index: number, total: number) {
  if (total <= 1) return 'Player';
  if (index === 0) return 'Player 1 (You)';
  if (index === 1 && total === 2) return 'Partner';
  return `Player ${index + 1}`;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-100 rounded-xl py-3 px-4 text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/10"
      />
    </div>
  );
}

export default DivisionRegistrationModal;
