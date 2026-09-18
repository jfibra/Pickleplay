import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Trophy, Calendar, MapPin, Users, PhilippinePeso, Clock, CheckCircle2,
  XCircle, Star, Building2, FileText, Megaphone, Award, Shield, Eye,
  AlertCircle, TrendingUp, User, Grid3x3, Timer, Flag, Loader2, Share2,
  ChevronLeft, ArrowLeft, Pencil, X, Trash2,
} from 'lucide-react';
import {
  fetchTournamentById,
  fetchRegistrations,
  approveTournament,
  rejectTournament,
  featureTournament,
  updateTournament,
  withdrawRegistration,
  type CreateTournamentInput,
} from '../../services/tournaments';
import type {
  Tournament,
  TournamentRegistration,
  TournamentFormat,
  TournamentEventType,
  TournamentCategory,
} from '../../types';
import ConfirmDialog from '../ui/ConfirmDialog';
import TournamentRulesPanel from '../tournaments/TournamentRulesPanel';
import {
  parseTournamentExtras,
  tournamentPublicUrl,
} from '../tournaments/tournamentExtras';
import RulesExtrasEditor, {
  emptyRulesExtras,
  serializeRulesEditorValue,
  type RulesEditorValue,
} from './RulesExtrasEditor';

type DetailTab =
  | 'basics'
  | 'event'
  | 'schedule'
  | 'financial'
  | 'players'
  | 'rules'
  | 'meta';

type DraftState = Record<string, string | number>;

const TABS: { key: DetailTab; label: string; icon: React.ReactNode; editable: boolean }[] = [
  { key: 'basics', label: 'Basics', icon: <FileText size={14} />, editable: true },
  { key: 'event', label: 'Event', icon: <Trophy size={14} />, editable: true },
  { key: 'schedule', label: 'Schedule', icon: <Calendar size={14} />, editable: true },
  { key: 'financial', label: 'Financial', icon: <PhilippinePeso size={14} />, editable: true },
  { key: 'players', label: 'Players', icon: <Users size={14} />, editable: false },
  { key: 'rules', label: 'Rules', icon: <Shield size={14} />, editable: true },
  { key: 'meta', label: 'Meta', icon: <Eye size={14} />, editable: true },
];

const FORMAT_OPTIONS: TournamentFormat[] = ['single_elim', 'double_elim', 'round_robin'];
const EVENT_TYPE_OPTIONS: TournamentEventType[] = ['singles', 'doubles', 'mixed_doubles'];
const CATEGORY_OPTIONS: TournamentCategory[] = ['open', 'beginner', 'intermediate', 'advanced'];

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300';

function toDateInputValue(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildDraft(tab: DetailTab, t: Tournament): DraftState {
  switch (tab) {
    case 'basics':
      return {
        name: t.name || '',
        skillLevel: t.skillLevel || '',
        location: t.location || '',
        maxPlayers: t.maxPlayers ?? 0,
        description: t.description || '',
      };
    case 'event':
      return {
        format: t.format || 'single_elim',
        eventType: t.eventType || 'doubles',
        category: t.category || 'open',
        numCourts: t.numCourts ?? 1,
      };
    case 'schedule':
      return {
        date: toDateInputValue(t.date),
        startTime: t.startTime || '',
        checkInTime: t.checkInTime || '',
        registrationDeadline: toDateInputValue(t.registrationDeadline),
      };
    case 'financial':
      return {
        prizePool: t.prizePool || '',
        prizes: t.prizes || '',
      };
    case 'meta':
      return {
        courtId: t.courtId || '',
        locationId: t.locationId || '',
        sponsorBannerUrl: t.sponsorBannerUrl || '',
      };
    default:
      return {};
  }
}

function buildRulesEditorValue(t: Tournament): RulesEditorValue {
  const parsed = parseTournamentExtras(t.rules);
  return {
    announcement: t.announcement || '',
    extras: parsed ?? emptyRulesExtras(),
  };
}

function draftToPatch(tab: DetailTab, draft: DraftState, original: Tournament): Partial<CreateTournamentInput> {
  const patch: Partial<CreateTournamentInput> = {};

  const changed = (key: keyof CreateTournamentInput, next: unknown, prev: unknown) => {
    if (next !== prev) (patch as Record<string, unknown>)[key] = next;
  };

  switch (tab) {
    case 'basics': {
      changed('name', String(draft.name).trim(), original.name);
      changed('skillLevel', String(draft.skillLevel).trim(), original.skillLevel);
      changed('location', String(draft.location).trim(), original.location);
      changed('maxPlayers', Number(draft.maxPlayers) || 0, original.maxPlayers);
      changed('description', String(draft.description), original.description || '');
      break;
    }
    case 'event': {
      changed('format', draft.format as TournamentFormat, original.format);
      changed('eventType', draft.eventType as TournamentEventType, original.eventType);
      changed('category', draft.category as TournamentCategory, original.category);
      changed('numCourts', Number(draft.numCourts) || 0, original.numCourts ?? 0);
      break;
    }
    case 'schedule': {
      const nextDate = String(draft.date);
      const prevDate = toDateInputValue(original.date);
      if (nextDate && nextDate !== prevDate) {
        // Keep time-of-day from original when only the calendar date changes
        const base = original.date ? new Date(original.date) : new Date();
        const [y, m, d] = nextDate.split('-').map(Number);
        base.setFullYear(y, m - 1, d);
        patch.date = base.toISOString();
      }
      changed('startTime', String(draft.startTime).trim(), original.startTime || '');
      changed('checkInTime', String(draft.checkInTime).trim(), original.checkInTime || '');
      {
        const next = String(draft.registrationDeadline).trim();
        const prev = toDateInputValue(original.registrationDeadline);
        if (next !== prev) {
          patch.registrationDeadline = next
            ? new Date(`${next}T23:59:59`).toISOString()
            : '';
        }
      }
      break;
    }
    case 'financial': {
      changed('prizePool', String(draft.prizePool), original.prizePool || '');
      changed('prizes', String(draft.prizes), original.prizes || '');
      break;
    }
    case 'meta': {
      changed('courtId', String(draft.courtId).trim() || undefined, original.courtId || undefined);
      changed('locationId', String(draft.locationId).trim() || undefined, original.locationId || undefined);
      changed('sponsorBannerUrl', String(draft.sponsorBannerUrl).trim(), original.sponsorBannerUrl || '');
      break;
    }
  }

  return patch;
}

const AdminTournamentDetail: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('basics');
  const [playerSearch, setPlayerSearch] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<DraftState>({});
  const [rulesEditor, setRulesEditor] = useState<RulesEditorValue | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);
  const [playerToRemove, setPlayerToRemove] = useState<TournamentRegistration | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'warning' | 'danger' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });

  const load = async (id: string) => {
    setIsLoading(true);
    try {
      const [t, regs] = await Promise.all([
        fetchTournamentById(id),
        fetchRegistrations(id),
      ]);
      setTournament(t);
      setRegistrations(regs);
    } catch (err) {
      console.error('Failed to load tournament details', err);
      setTournament(null);
      setRegistrations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!tournamentId) return;
    load(tournamentId);
  }, [tournamentId]);

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'warning' | 'danger' | 'info' = 'warning',
  ) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, variant });
  };

  const closeConfirm = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });
  };

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    closeConfirm();
  };

  const refreshAfterAction = async () => {
    if (!tournamentId) return;
    setTournament(await fetchTournamentById(tournamentId));
  };

  const handleApprove = async () => {
    if (!tournament || isProcessing) return;
    setIsProcessing(true);
    try {
      await approveTournament(tournament.id);
      await refreshAfterAction();
    } catch (err: any) {
      alert(err.message || 'Failed to approve tournament');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!tournament || isProcessing) return;
    showConfirm(
      'Reject Tournament?',
      'This will permanently reject this tournament submission. The tournament organizer will need to resubmit if they want to proceed. This action cannot be undone.',
      async () => {
        setIsProcessing(true);
        try {
          await rejectTournament(tournament.id);
          await refreshAfterAction();
        } catch (err: any) {
          alert(err.message || 'Failed to reject tournament');
        } finally {
          setIsProcessing(false);
        }
      },
      'danger',
    );
  };

  const handleFeature = async () => {
    if (!tournament || isProcessing) return;
    setIsProcessing(true);
    try {
      await featureTournament(tournament.id, !tournament.isFeatured);
      await refreshAfterAction();
    } catch (err: any) {
      alert(err.message || 'Failed to update feature status');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyJoinLink = async () => {
    if (!tournament) return;
    const url = tournamentPublicUrl(tournament.id);
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      window.prompt('Copy this player join link:', url);
    }
  };

  const handleRemovePlayer = (reg: TournamentRegistration) => {
    if (!tournament || removingPlayerId) return;
    if (!reg.playerId) {
      alert('Missing player id — cannot remove this registration.');
      return;
    }
    setPlayerToRemove(reg);
  };

  const cancelRemovePlayer = () => {
    if (removingPlayerId) return;
    setPlayerToRemove(null);
  };

  const confirmRemovePlayer = async () => {
    if (!tournament || !playerToRemove?.playerId || removingPlayerId) return;
    const reg = playerToRemove;
    setRemovingPlayerId(reg.playerId);
    try {
      await withdrawRegistration(tournament.id, reg.playerId);
      const [t, regs] = await Promise.all([
        fetchTournamentById(tournament.id),
        fetchRegistrations(tournament.id),
      ]);
      if (t) setTournament(t);
      setRegistrations(regs);
      setPlayerToRemove(null);
    } catch (err: any) {
      alert(err.message || 'Failed to remove player');
    } finally {
      setRemovingPlayerId(null);
    }
  };

  const selectTab = (tab: DetailTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setIsEditing(false);
    setDraft({});
    setRulesEditor(null);
    setSaveError(null);
  };

  const startEditing = () => {
    if (!tournament) return;
    if (activeTab === 'rules') {
      setRulesEditor(buildRulesEditorValue(tournament));
      setDraft({});
    } else {
      setDraft(buildDraft(activeTab, tournament));
      setRulesEditor(null);
    }
    setIsEditing(true);
    setSaveError(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraft({});
    setRulesEditor(null);
    setSaveError(null);
  };

  const setDraftField = (key: string, value: string | number) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const saveEditing = async () => {
    if (!tournament || !isEditing) return;

    let patch: Partial<CreateTournamentInput> = {};

    if (activeTab === 'rules') {
      if (!rulesEditor) return;
      if (rulesEditor.extras.divisions.length === 0) {
        setSaveError('Add at least one division.');
        return;
      }
      if (rulesEditor.extras.divisions.some((d) => !d.categoryName.trim())) {
        setSaveError('Every division needs a name.');
        return;
      }
      const serialized = serializeRulesEditorValue(rulesEditor);
      if (serialized.announcement !== (tournament.announcement || '')) {
        patch.announcement = serialized.announcement;
      }
      if (serialized.rules !== (tournament.rules || '')) {
        patch.rules = serialized.rules;
      }
      if (Object.keys(patch).length === 0) {
        cancelEditing();
        return;
      }
    } else {
      patch = draftToPatch(activeTab, draft, tournament);
      if (Object.keys(patch).length === 0) {
        cancelEditing();
        return;
      }
      if (activeTab === 'basics' && patch.name !== undefined && !String(patch.name).trim()) {
        setSaveError('Tournament name is required.');
        return;
      }
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await updateTournament(tournament.id, patch);
      setTournament(updated);
      setIsEditing(false);
      setDraft({});
      setRulesEditor(null);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRegistrations = registrations.filter((reg) => {
    if (!playerSearch.trim()) return true;
    const q = playerSearch.trim().toLowerCase();
    const name = (reg.player?.full_name || '').toLowerCase();
    return name.includes(q) || (reg.status || '').toLowerCase().includes(q);
  });

  const capacityPct =
    tournament && tournament.maxPlayers > 0
      ? Math.round((tournament.registeredCount / tournament.maxPlayers) * 100)
      : 0;

  const activeTabMeta = TABS.find((t) => t.key === activeTab)!;
  const canEdit = activeTabMeta.editable;

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-6 pb-28">
      {/* Header */}
      <div className="mb-6 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/admin/tournaments')}
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={14} />
          Tournaments
        </button>
        <div className="flex items-start gap-3 min-w-0">
          <div className="bg-amber-100 p-3 rounded-2xl shrink-0">
            <Trophy className="text-amber-600" size={22} />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Admin Review</p>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight truncate">
              {isLoading ? 'Loading…' : tournament?.name ?? 'Tournament Details'}
            </h1>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 size={40} className="text-indigo-500 animate-spin" />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Loading details…</p>
        </div>
      )}

      {!isLoading && !tournament && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle size={48} className="text-slate-300" />
          <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Tournament not found</p>
          <button
            type="button"
            onClick={() => navigate('/admin/tournaments')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
          >
            <ChevronLeft size={14} /> Back to list
          </button>
        </div>
      )}

      {!isLoading && tournament && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
          {/* ── Main column ── */}
          <div className="min-w-0 space-y-5">
            {tournament.image && (
              <div className="w-full h-48 sm:h-64 rounded-3xl overflow-hidden border border-slate-100">
                <img src={tournament.image} alt={tournament.name} className="w-full h-full object-cover" />
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 scrollbar-thin">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => selectTab(tab.key)}
                  className={`shrink-0 inline-flex items-center gap-2 px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.key === 'players' && registrations.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[9px]">
                      {registrations.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {saveError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {saveError}
              </div>
            )}

            {/* Tab panels */}
            <div className="min-h-70">
              {activeTab === 'basics' && (
                <InfoCard
                  title="Basic Information"
                  icon={<FileText size={15} />}
                  color="indigo"
                  headerRight={
                    <EditControls
                      canEdit={canEdit}
                      isEditing={isEditing}
                      isSaving={isSaving}
                      tabLabel="Basics"
                      onEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                    />
                  }
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <Field label="Tournament Name">
                        <input className={inputClass} value={String(draft.name ?? '')} onChange={(e) => setDraftField('name', e.target.value)} />
                      </Field>
                      <Field label="Skill Level">
                        <input className={inputClass} value={String(draft.skillLevel ?? '')} onChange={(e) => setDraftField('skillLevel', e.target.value)} />
                      </Field>
                      <Field label="Location">
                        <input className={inputClass} value={String(draft.location ?? '')} onChange={(e) => setDraftField('location', e.target.value)} />
                      </Field>
                      <Field label="Max Players">
                        <input
                          type="number"
                          min={1}
                          className={inputClass}
                          value={Number(draft.maxPlayers ?? 0)}
                          onChange={(e) => setDraftField('maxPlayers', Number(e.target.value))}
                        />
                      </Field>
                      <Field label="Description">
                        <textarea
                          rows={5}
                          className={`${inputClass} resize-y`}
                          value={String(draft.description ?? '')}
                          onChange={(e) => setDraftField('description', e.target.value)}
                        />
                      </Field>
                    </div>
                  ) : (
                    <>
                      <InfoRow label="Tournament Name" value={tournament.name} />
                      <InfoRow label="Skill Level" value={tournament.skillLevel} />
                      <InfoRow label="Location" value={tournament.location} icon={<MapPin size={12} />} />
                      <InfoRow label="Max Players" value={String(tournament.maxPlayers)} icon={<Users size={12} />} />
                      {tournament.description && <InfoRow label="Description" value={tournament.description} />}
                    </>
                  )}
                </InfoCard>
              )}

              {activeTab === 'event' && (
                <InfoCard
                  title="Event Details"
                  icon={<Trophy size={15} />}
                  color="violet"
                  headerRight={
                    <EditControls
                      canEdit={canEdit}
                      isEditing={isEditing}
                      isSaving={isSaving}
                      tabLabel="Event"
                      onEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                    />
                  }
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <Field label="Format">
                        <select className={inputClass} value={String(draft.format ?? '')} onChange={(e) => setDraftField('format', e.target.value)}>
                          {FORMAT_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o.replace(/_/g, ' ').toUpperCase()}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Type">
                        <select className={inputClass} value={String(draft.eventType ?? '')} onChange={(e) => setDraftField('eventType', e.target.value)}>
                          {EVENT_TYPE_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o.replace(/_/g, ' ').toUpperCase()}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Category">
                        <select className={inputClass} value={String(draft.category ?? '')} onChange={(e) => setDraftField('category', e.target.value)}>
                          {CATEGORY_OPTIONS.map((o) => (
                            <option key={o} value={o}>{o.toUpperCase()}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Courts">
                        <input
                          type="number"
                          min={1}
                          className={inputClass}
                          value={Number(draft.numCourts ?? 1)}
                          onChange={(e) => setDraftField('numCourts', Number(e.target.value))}
                        />
                      </Field>
                    </div>
                  ) : (
                    <>
                      {tournament.format && (
                        <InfoRow label="Format" value={tournament.format.replace(/_/g, ' ').toUpperCase()} icon={<Grid3x3 size={12} />} />
                      )}
                      {tournament.eventType && (
                        <InfoRow label="Type" value={tournament.eventType.replace(/_/g, ' ').toUpperCase()} icon={<Users size={12} />} />
                      )}
                      {tournament.category && (
                        <InfoRow label="Category" value={tournament.category.toUpperCase()} icon={<Award size={12} />} />
                      )}
                      {tournament.numCourts != null && (
                        <InfoRow label="Courts" value={String(tournament.numCourts)} icon={<Building2 size={12} />} />
                      )}
                      {!tournament.format && !tournament.eventType && !tournament.category && tournament.numCourts == null && (
                        <p className="text-xs text-slate-400 italic">No event details set yet.</p>
                      )}
                    </>
                  )}
                </InfoCard>
              )}

              {activeTab === 'schedule' && (
                <InfoCard
                  title="Schedule"
                  icon={<Calendar size={15} />}
                  color="blue"
                  headerRight={
                    <EditControls
                      canEdit={canEdit}
                      isEditing={isEditing}
                      isSaving={isSaving}
                      tabLabel="Schedule"
                      onEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                    />
                  }
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <Field label="Date">
                        <input type="date" className={inputClass} value={String(draft.date ?? '')} onChange={(e) => setDraftField('date', e.target.value)} />
                      </Field>
                      <Field label="Start Time">
                        <input type="time" className={inputClass} value={String(draft.startTime ?? '')} onChange={(e) => setDraftField('startTime', e.target.value)} />
                      </Field>
                      <Field label="Check-In">
                        <input type="time" className={inputClass} value={String(draft.checkInTime ?? '')} onChange={(e) => setDraftField('checkInTime', e.target.value)} />
                      </Field>
                      <Field label="Reg. Deadline">
                        <input
                          type="date"
                          className={inputClass}
                          value={String(draft.registrationDeadline ?? '')}
                          onChange={(e) => setDraftField('registrationDeadline', e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 font-medium mt-1">Leave blank for open registration.</p>
                      </Field>
                    </div>
                  ) : (
                    <>
                      <InfoRow
                        label="Date"
                        value={new Date(tournament.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        icon={<Calendar size={12} />}
                      />
                      {tournament.startTime && (
                        <InfoRow label="Start Time" value={tournament.startTime} icon={<Clock size={12} />} />
                      )}
                      {tournament.checkInTime && (
                        <InfoRow label="Check-In" value={tournament.checkInTime} icon={<Timer size={12} />} />
                      )}
                      <InfoRow
                        label="Reg. Deadline"
                        value={
                          tournament.registrationDeadline
                            ? new Date(tournament.registrationDeadline).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'Open (no deadline)'
                        }
                        icon={<Flag size={12} />}
                      />
                    </>
                  )}
                </InfoCard>
              )}

              {activeTab === 'financial' && (
                <InfoCard
                  title="Financial"
                  icon={<PhilippinePeso size={15} />}
                  color="green"
                  headerRight={
                    <EditControls
                      canEdit={canEdit}
                      isEditing={isEditing}
                      isSaving={isSaving}
                      tabLabel="Financial"
                      onEdit={startEditing}
                      onCancel={cancelEditing}
                      onSave={saveEditing}
                    />
                  }
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <Field label="Prize Pool">
                        <input className={inputClass} value={String(draft.prizePool ?? '')} onChange={(e) => setDraftField('prizePool', e.target.value)} placeholder="e.g. ₱50,000" />
                      </Field>
                      <Field label="Distribution">
                        <textarea
                          rows={4}
                          className={`${inputClass} resize-y`}
                          value={String(draft.prizes ?? '')}
                          onChange={(e) => setDraftField('prizes', e.target.value)}
                          placeholder="1st / 2nd / 3rd breakdown…"
                        />
                      </Field>
                    </div>
                  ) : tournament.prizePool ? (
                    <>
                      <InfoRow label="Prize Pool" value={tournament.prizePool} icon={<PhilippinePeso size={12} />} />
                      {tournament.prizes && <InfoRow label="Distribution" value={tournament.prizes} />}
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No prize pool set.</p>
                  )}
                </InfoCard>
              )}

              {activeTab === 'players' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat
                      label="Registered"
                      value={`${registrations.length} / ${tournament.maxPlayers}`}
                      icon={<Users size={16} />}
                    />
                    <MiniStat
                      label="Capacity"
                      value={`${tournament.maxPlayers > 0 ? Math.round((registrations.length / tournament.maxPlayers) * 100) : 0}%`}
                      icon={<TrendingUp size={16} />}
                    />
                  </div>

                  <InfoCard title="Registrations" icon={<Users size={15} />} color="purple">
                    <div className="mb-3">
                      <input
                        type="search"
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        placeholder="Search players…"
                        className="w-full px-4 py-2.5 rounded-xl border border-purple-100 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
                      />
                    </div>

                    {filteredRegistrations.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-6 text-center">
                        {registrations.length === 0 ? 'No players registered yet.' : 'No matches for your search.'}
                      </p>
                    ) : (
                      <div className="max-h-105 overflow-y-auto rounded-xl bg-white border border-purple-100 divide-y divide-purple-50">
                        {filteredRegistrations.map((reg, idx) => {
                          const displayName = reg.player?.full_name || `Player ${idx + 1}`;
                          const isRemoving = removingPlayerId === reg.playerId;
                          return (
                            <div key={reg.id || reg.playerId} className="flex items-center gap-2 text-xs px-3 py-2.5">
                              <span className="text-slate-400 w-6 font-black shrink-0">{idx + 1}.</span>
                              <User size={12} className="text-purple-500 shrink-0" />
                              <span className="font-bold text-slate-700 flex-1 truncate">{displayName}</span>
                              {reg.status && (
                                <span
                                  className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                                    reg.status === 'confirmed'
                                      ? 'bg-emerald-50 text-emerald-600'
                                      : reg.status === 'waitlisted'
                                        ? 'bg-amber-50 text-amber-600'
                                        : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {reg.status}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemovePlayer(reg)}
                                disabled={!!removingPlayerId}
                                title={`Remove ${displayName}`}
                                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 disabled:opacity-50 transition-colors"
                              >
                                {isRemoving ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Trash2 size={12} />
                                )}
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </InfoCard>
                </div>
              )}

              {activeTab === 'rules' && (
                <div className="space-y-4">
                  <InfoCard
                    title="Rules & Announcements"
                    icon={<Shield size={15} />}
                    color="amber"
                    headerRight={
                      <EditControls
                        canEdit={canEdit}
                        isEditing={isEditing}
                        isSaving={isSaving}
                        tabLabel="Rules"
                        onEdit={startEditing}
                        onCancel={cancelEditing}
                        onSave={saveEditing}
                      />
                    }
                  >
                    {isEditing && rulesEditor ? (
                      <RulesExtrasEditor value={rulesEditor} onChange={setRulesEditor} />
                    ) : tournament.rules || tournament.announcement ? (
                      <TournamentRulesPanel
                        rules={tournament.rules}
                        announcement={tournament.announcement}
                        compact
                      />
                    ) : (
                      <p className="text-xs text-slate-400 italic">No rules or announcements yet.</p>
                    )}
                  </InfoCard>
                  {!isEditing && tournament.announcement && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-2xl p-4">
                      <Megaphone size={16} className="text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-sm font-bold text-amber-900">{tournament.announcement}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'meta' && (
                <div className="space-y-4">
                  {!isEditing && tournament.sponsorBannerUrl && (
                    <InfoCard title="Sponsor" icon={<Star size={15} />} color="slate">
                      <div className="w-full h-24 rounded-xl overflow-hidden border border-slate-200 bg-white">
                        <img
                          src={tournament.sponsorBannerUrl}
                          alt="Sponsor"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </InfoCard>
                  )}
                  <InfoCard
                    title="Metadata"
                    icon={<Eye size={15} />}
                    color="slate"
                    headerRight={
                      <EditControls
                        canEdit={canEdit}
                        isEditing={isEditing}
                        isSaving={isSaving}
                        tabLabel="Meta"
                        onEdit={startEditing}
                        onCancel={cancelEditing}
                        onSave={saveEditing}
                      />
                    }
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <Field label="Court ID">
                          <input className={inputClass} value={String(draft.courtId ?? '')} onChange={(e) => setDraftField('courtId', e.target.value)} />
                        </Field>
                        <Field label="Location ID">
                          <input className={inputClass} value={String(draft.locationId ?? '')} onChange={(e) => setDraftField('locationId', e.target.value)} />
                        </Field>
                        <Field label="Sponsor Banner URL">
                          <input className={inputClass} value={String(draft.sponsorBannerUrl ?? '')} onChange={(e) => setDraftField('sponsorBannerUrl', e.target.value)} />
                        </Field>
                        <InfoRow label="Organizer ID" value={tournament.organizerId || '—'} />
                        <InfoRow label="Tournament ID" value={tournament.id} />
                      </div>
                    ) : (
                      <>
                        {tournament.organizerId && <InfoRow label="Organizer ID" value={tournament.organizerId} />}
                        {tournament.courtId && <InfoRow label="Court ID" value={tournament.courtId} />}
                        {tournament.locationId && <InfoRow label="Location ID" value={tournament.locationId} />}
                        {tournament.sponsorBannerUrl && (
                          <InfoRow label="Sponsor Banner URL" value={tournament.sponsorBannerUrl} />
                        )}
                        {tournament.createdAt && (
                          <InfoRow label="Created" value={new Date(tournament.createdAt).toLocaleString()} />
                        )}
                        {tournament.updatedAt && (
                          <InfoRow label="Updated" value={new Date(tournament.updatedAt).toLocaleString()} />
                        )}
                        <InfoRow label="Tournament ID" value={tournament.id} />
                      </>
                    )}
                  </InfoCard>
                </div>
              )}
            </div>
          </div>

          {/* ── Sticky sidebar ── */}
          <aside className="xl:sticky xl:top-20 space-y-4">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-5">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Status</p>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge show={tournament.isApproved === true} color="emerald" icon={<CheckCircle2 size={12} />} label="Approved" />
                  <StatusBadge show={tournament.isApproved === false} color="rose" icon={<XCircle size={12} />} label="Rejected" />
                  <StatusBadge
                    show={tournament.isApproved === null || tournament.isApproved === undefined}
                    color="amber"
                    icon={<Clock size={12} />}
                    label="Pending"
                    pulse
                  />
                  <StatusBadge show={!!tournament.isFeatured} color="yellow" icon={<Star size={12} />} label="Featured" />
                  <StatusBadge
                    show
                    color={tournament.status === 'LIVE' ? 'red' : tournament.status === 'UPCOMING' ? 'blue' : 'slate'}
                    icon={<Flag size={12} />}
                    label={tournament.status}
                    pulse={tournament.status === 'LIVE'}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-purple-50 border border-purple-100 px-4 py-3">
                <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-1">Players</p>
                <p className="text-lg font-black text-purple-900">
                  {tournament.registeredCount} / {tournament.maxPlayers}
                </p>
                <p className="text-[10px] font-bold text-purple-500 mt-0.5">{capacityPct}% capacity</p>
              </div>

              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Admin Actions</p>
                <div className="flex flex-col gap-2.5">
                  {tournament.isApproved === true && (
                    <button
                      type="button"
                      onClick={handleCopyJoinLink}
                      className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                    >
                      {linkCopied ? <CheckCircle2 size={15} /> : <Share2 size={15} />}
                      {linkCopied ? 'Link Copied' : 'Copy Join Link'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={tournament.isApproved === true || isProcessing}
                    className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                      tournament.isApproved === true
                        ? 'bg-emerald-50 text-emerald-400 cursor-default border border-emerald-100'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                    }`}
                  >
                    {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {tournament.isApproved === true ? 'Already Approved' : 'Approve'}
                  </button>

                  <button
                    type="button"
                    onClick={handleReject}
                    disabled={tournament.isApproved === false || isProcessing}
                    className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
                      tournament.isApproved === false
                        ? 'bg-rose-50 text-rose-400 cursor-default border border-rose-100'
                        : 'bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200'
                    }`}
                  >
                    {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                    {tournament.isApproved === false ? 'Already Rejected' : 'Reject'}
                  </button>

                  <button
                    type="button"
                    onClick={handleFeature}
                    disabled={isProcessing}
                    className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border disabled:opacity-60 ${
                      tournament.isFeatured
                        ? 'bg-yellow-50 text-yellow-600 border-yellow-200 hover:bg-yellow-100'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200'
                    }`}
                  >
                    {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Star size={15} />}
                    {tournament.isFeatured ? 'Unfeature' : 'Feature'}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        variant={confirmDialog.variant}
      />

      <ConfirmDialog
        isOpen={!!playerToRemove}
        title="Remove player?"
        message={`Remove ${playerToRemove?.player?.full_name || 'this player'} from this tournament? They can register again later if spots are open.`}
        onConfirm={confirmRemovePlayer}
        onCancel={cancelRemovePlayer}
        variant="danger"
        confirmText={removingPlayerId ? 'Removing…' : 'Remove'}
        cancelText="Cancel"
      />
    </div>
  );
};

/* ── Sub-components ─────────────────────────────── */

const cardBg: Record<string, string> = {
  indigo: 'bg-indigo-50 border-indigo-100',
  violet: 'bg-violet-50 border-violet-100',
  blue: 'bg-blue-50 border-blue-100',
  green: 'bg-green-50 border-green-100',
  purple: 'bg-purple-50 border-purple-100',
  amber: 'bg-amber-50 border-amber-100',
  yellow: 'bg-yellow-50 border-yellow-100',
  red: 'bg-red-50 border-red-100',
  slate: 'bg-slate-50 border-slate-200',
  rose: 'bg-rose-50 border-rose-100',
  emerald: 'bg-emerald-50 border-emerald-100',
};

const colorText: Record<string, string> = {
  indigo: 'text-indigo-500',
  violet: 'text-violet-500',
  blue: 'text-blue-500',
  green: 'text-green-500',
  purple: 'text-purple-500',
  amber: 'text-amber-500',
  yellow: 'text-yellow-500',
  red: 'text-red-500',
  slate: 'text-slate-500',
  rose: 'text-rose-500',
  emerald: 'text-emerald-500',
};

const EditControls: React.FC<{
  canEdit: boolean;
  isEditing: boolean;
  isSaving: boolean;
  tabLabel: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}> = ({ canEdit, isEditing, isSaving, tabLabel, onEdit, onCancel, onSave }) => {
  if (!canEdit) return null;
  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
        >
          <X size={12} /> Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
          Save Changes
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onEdit}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-slate-600 border border-slate-200 hover:border-blue-200 hover:text-blue-600 transition-colors"
    >
      <Pencil size={12} /> Edit {tabLabel}
    </button>
  );
};

const InfoCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}> = ({ title, icon, color, children, headerRight }) => (
  <div className={`p-5 rounded-3xl border ${cardBg[color] ?? cardBg.slate} space-y-3`}>
    <div className="flex items-center justify-between gap-3">
      <h4
        className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${colorText[color] ?? 'text-slate-500'}`}
      >
        {icon} {title}
      </h4>
      {headerRight}
    </div>
    <div className="space-y-2.5">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">{label}</span>
    {children}
  </label>
);

const InfoRow: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    <div className="flex items-start gap-1.5">
      {icon && <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>}
      <p className="text-sm font-semibold text-slate-800 leading-snug break-words whitespace-pre-line">{value}</p>
    </div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-white border border-purple-100 flex items-center justify-center text-purple-600">
      {icon}
    </div>
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-black text-slate-900">{value}</p>
    </div>
  </div>
);

const badgeColors: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  rose: 'bg-rose-50 text-rose-500 border-rose-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  slate: 'bg-slate-100 text-slate-500 border-slate-200',
};

const StatusBadge: React.FC<{
  show: boolean;
  color: string;
  icon: React.ReactNode;
  label: string;
  pulse?: boolean;
}> = ({ show, color, icon, label, pulse }) => {
  if (!show) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeColors[color] ?? badgeColors.slate} ${pulse ? 'animate-pulse' : ''}`}
    >
      {icon} {label}
    </span>
  );
};

export default AdminTournamentDetail;
