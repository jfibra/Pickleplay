import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trophy, Calendar, MapPin, Users, Award, Clock, Shield, Swords,
  ChevronRight, CheckCircle2, Star, Megaphone, UserPlus, UserMinus, Settings2,
  AlertTriangle, Phone, FileText, BadgeCheck, X, Search, Unlock, Eye, EyeOff,
  ChevronDown, ChevronUp, Lock, AlertCircle, HeartPulse
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  fetchTournamentById, fetchRegistrations, fetchRegistrationsWithRatings, registerPlayer, withdrawRegistration,
  getPlayerRegistration, evaluateSquadEligibility, approveRegistration,
  rejectRegistration, getPendingRegistrationsDetailed, checkRegistrationConflicts,
  fetchTournamentChampion, openTournamentRegistration,
  registerSquad, getSquadRegistrations, getSquadRegistration, withdrawSquadRegistration,
  approveSquadRegistration, rejectSquadRegistration, lockAllRosters,
  markPlayerInjured, evaluateSquadRosterEligibility,
  registerForDivision, uploadRegistrationReceipt,
  type TournamentConflict, type PendingRegistrationDetailed
} from '../../services/tournaments';
import { squadsService, type Squad, type SquadMember } from '../../services/squads';
import type { Tournament, TournamentRegistration, TournamentMatch, SquadRegistration, TournamentRosterPlayer } from '../../types';
import TournamentBracket from './TournamentBracket';
import MatchLineupPanel from './MatchLineupPanel';
import PlayerApprovalCard from './PlayerApprovalCard';
import ConfirmDialog from '../ui/ConfirmDialog';
import Toast, { ToastType } from '../ui/Toast';
import useSEO from '../../hooks/useSEO';
import TournamentRulesPanel, { type TournamentDivision } from './TournamentRulesPanel';
import DivisionRegistrationModal, {
  type DivisionRegistrationFormResult,
} from './DivisionRegistrationModal';
import { parseTournamentExtras } from './tournamentExtras';
import {
  clearPendingDivisionRegistration,
  readPendingDivisionRegistration,
  savePendingDivisionRegistration,
  tournamentLoginRedirectPath,
} from './pendingDivisionRegistration';

type Tab = 'overview' | 'bracket' | 'participants';

const TournamentPage: React.FC = () => {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistrationDetailed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [userSquads, setUserSquads] = useState<Squad[]>([]);
  const [selectedSquadId, setSelectedSquadId] = useState<string>('');
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isOpeningReg, setIsOpeningReg] = useState(false);
  const [viewAsPlayer, setViewAsPlayer] = useState(false);
  const effectiveIsOrganizer = isOrganizer && !viewAsPlayer;
  const [conflicts, setConflicts] = useState<TournamentConflict[]>([]);
  const [showConflictsDialog, setShowConflictsDialog] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [participantSearch, setParticipantSearch] = useState('');
  const [playerRatings, setPlayerRatings] = useState<Map<string, number | null>>(new Map());
  const [champion, setChampion] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [squadNames, setSquadNames] = useState<Map<string, string>>(new Map());

  // Squad registration state
  const [squadRegistrations, setSquadRegistrations] = useState<SquadRegistration[]>([]);
  const [mySquadReg, setMySquadReg] = useState<SquadRegistration | null>(null);
  const [squadMembers, setSquadMembers] = useState<SquadMember[]>([]);
  const [selectedRosterIds, setSelectedRosterIds] = useState<Set<string>>(new Set());
  const [showRosterPicker, setShowRosterPicker] = useState(false);
  const [isRegisteringSquad, setIsRegisteringSquad] = useState(false);
  const [userSquadRole, setUserSquadRole] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);

  // Division registration (structured multi-category tournaments)
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([]);
  const [divisionModalOpen, setDivisionModalOpen] = useState(false);
  const [divisionWaitlist, setDivisionWaitlist] = useState(false);
  const [profileSeed, setProfileSeed] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
  } | null>(null);
  const resumedRegistrationRef = React.useRef(false);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
    message: '',
    type: 'info',
    isVisible: false,
  });

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant: 'warning' | 'danger' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });

  const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' | 'info' = 'warning') => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, variant });
  };

  const closeConfirm = () => {
    setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' });
  };

  const handleConfirm = () => {
    confirmDialog.onConfirm();
    closeConfirm();
  };

  useEffect(() => {
    if (!tournamentId) return;
    const load = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);

      const [t, regs] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
      ]);

      setTournament(t);
      setRegistrations(regs);

      // Fetch player ratings
      try {
        const ratingData = await fetchRegistrationsWithRatings(tournamentId);
        const ratingsMap = new Map<string, number | null>();
        ratingData.forEach(r => ratingsMap.set(r.playerId, r.duprRating));
        setPlayerRatings(ratingsMap);
      } catch (e) { /* ratings are optional */ }

      if (userId && t) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('roles, full_name')
          .eq('id', userId)
          .single();

        setProfileSeed({
          fullName: profile?.full_name || undefined,
          email: session?.user?.email || undefined,
        });

        const { data: court } = t.courtId
          ? await supabase.from('courts').select('owner_id').eq('id', t.courtId).single()
          : { data: null };

        const isAdmin = profile?.roles?.includes('ADMIN') || false;
        const isCreator = t.organizerId === userId;
        const isCourtOwner = court?.owner_id === userId;
        const organizerStatus = isAdmin || isCreator || isCourtOwner;

        setIsOrganizer(organizerStatus);

        if (organizerStatus) {
          const pending = await getPendingRegistrationsDetailed(tournamentId);
          setPendingRegistrations(pending);
        }
      }

      if (userId) {
        const reg = await getPlayerRegistration(tournamentId, userId);
        const hasActiveRegistration = reg && reg.status !== 'rejected' && reg.status !== 'withdrawn';
        setIsRegistered(!!hasActiveRegistration);
        setRegistrationStatus(reg?.status || null);

        // Load squad data if squad registration mode
        if (t?.registrationMode === 'squad') {
          const squads = await squadsService.getUserSquads(userId);
          setUserSquads(squads);
          if (squads.length > 0) {
            setSelectedSquadId(squads[0].id);
            // Check user's role in first squad
            try {
              const members = await squadsService.getSquadMembers(squads[0].id);
              setSquadMembers(members);
              const myMember = members.find(m => m.user_id === userId);
              setUserSquadRole(myMember?.role || null);
            } catch { /* squad members optional */ }
            // Check if user's squad is already registered
            try {
              const existingReg = await getSquadRegistration(tournamentId, squads[0].id);
              setMySquadReg(existingReg);
            } catch { /* optional */ }
          }
        } else {
          setUserSquads([]);
          setSelectedSquadId('');
        }

        // Load all squad registrations (for display)
        if (t?.registrationMode === 'squad') {
          try {
            const allSquadRegs = await getSquadRegistrations(tournamentId);
            setSquadRegistrations(allSquadRegs);
          } catch { /* optional */ }
        }
      }
      setIsLoading(false);
    };
    load();
  }, [tournamentId]);

  const handleJoin = async () => {
    if (!currentUserId) return;
    try {
      const detectedConflicts = await checkRegistrationConflicts(tournamentId!, currentUserId);
      const errors = detectedConflicts.filter(c => c.severity === 'error');
      const warnings = detectedConflicts.filter(c => c.severity === 'warning');

      if (errors.length > 0 || warnings.length > 0) {
        setConflicts(detectedConflicts);
        setShowConflictsDialog(true);
        return;
      }
      await proceedWithRegistration();
    } catch (err: any) {
      showToast('Failed to check registration requirements', 'error');
    }
  };

  const proceedWithRegistration = async () => {
    if (!currentUserId || !tournamentId) return;
    setIsJoining(true);
    try {
      await registerPlayer(tournamentId, currentUserId, applicationMessage || undefined);
      setIsRegistered(true);
      setShowConflictsDialog(false);
      setApplicationMessage('');
      const [t, regs] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
      ]);
      setTournament(t);
      setRegistrations(regs);
      const reg = await getPlayerRegistration(tournamentId, currentUserId);
      const status = reg?.status || 'pending';
      setRegistrationStatus(status);
      showToast(
        status === 'confirmed'
          ? "You're registered!"
          : 'Registration submitted! Awaiting organizer approval.',
        'success',
      );
    } catch (err: any) {
      showToast(err.message || 'Failed to register', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!currentUserId || !tournamentId) return;
    showConfirm(
      'Withdraw from Tournament?',
      'Are you sure you want to withdraw from this tournament? You can register again later if spots are available.',
      async () => {
        setIsJoining(true);
        try {
          await withdrawRegistration(tournamentId, currentUserId);
          setIsRegistered(false);
          setRegistrationStatus(null);
          const [t, regs] = await Promise.all([
            fetchTournamentById(tournamentId),
            fetchRegistrations(tournamentId),
          ]);
          setTournament(t);
          setRegistrations(regs);
          showToast('Successfully withdrawn from tournament.', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to withdraw', 'error');
        } finally {
          setIsJoining(false);
        }
      },
      'warning'
    );
  };

  const handleApprove = async (playerId: string) => {
    if (!currentUserId || !tournamentId) return;
    try {
      await approveRegistration(tournamentId, playerId, currentUserId);
      const [t, regs, pending] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
        getPendingRegistrationsDetailed(tournamentId),
      ]);
      setTournament(t);
      setRegistrations(regs);
      setPendingRegistrations(pending);
      showToast('Registration approved!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to approve registration', 'error');
    }
  };

  const handleReject = async (playerId: string, reason?: string) => {
    if (!currentUserId || !tournamentId) return;
    try {
      await rejectRegistration(tournamentId, playerId, currentUserId);
      const pending = await getPendingRegistrationsDetailed(tournamentId);
      setPendingRegistrations(pending);
      showToast('Registration rejected.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to reject registration', 'error');
    }
  };

  const handleOpenRegistration = async () => {
    if (!tournament) return;
    setIsOpeningReg(true);
    try {
      const updated = await openTournamentRegistration(tournament.id);
      setTournament(updated);
      showToast('Registration is now open!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to open registration', 'error');
    } finally {
      setIsOpeningReg(false);
    }
  };

  // ── Squad registration handlers ──────────────────────────
  const handleSquadChange = async (squadId: string) => {
    setSelectedSquadId(squadId);
    setSelectedRosterIds(new Set());
    if (!squadId || !currentUserId) return;
    try {
      const members = await squadsService.getSquadMembers(squadId);
      setSquadMembers(members);
      const myMember = members.find(m => m.user_id === currentUserId);
      setUserSquadRole(myMember?.role || null);
      // Check existing registration
      if (tournamentId) {
        const existingReg = await getSquadRegistration(tournamentId, squadId);
        setMySquadReg(existingReg);
      }
    } catch { /* optional */ }
  };

  const toggleRosterPlayer = (playerId: string) => {
    setSelectedRosterIds(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleRegisterSquad = async () => {
    if (!currentUserId || !tournamentId || !selectedSquadId) return;
    setIsRegisteringSquad(true);
    try {
      const rosterIds = [...selectedRosterIds];
      await registerSquad(tournamentId, selectedSquadId, currentUserId, rosterIds, applicationMessage || undefined);
      // Reload
      const [squadRegs, myReg] = await Promise.all([
        getSquadRegistrations(tournamentId),
        getSquadRegistration(tournamentId, selectedSquadId),
      ]);
      setSquadRegistrations(squadRegs);
      setMySquadReg(myReg);
      setShowRosterPicker(false);
      setApplicationMessage('');
      showToast('Squad registration submitted! Awaiting organizer approval.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to register squad', 'error');
    } finally {
      setIsRegisteringSquad(false);
    }
  };

  const handleWithdrawSquad = async () => {
    if (!mySquadReg) return;
    showConfirm(
      'Withdraw Squad?',
      'Are you sure you want to withdraw your squad from this tournament?',
      async () => {
        try {
          await withdrawSquadRegistration(mySquadReg.id);
          setMySquadReg(null);
          if (tournamentId) {
            const squadRegs = await getSquadRegistrations(tournamentId);
            setSquadRegistrations(squadRegs);
          }
          showToast('Squad withdrawn from tournament.', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to withdraw', 'error');
        }
      },
      'warning'
    );
  };

  // ── Derived state ────────────────────────────────────────
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'bracket', label: 'Bracket' },
    { key: 'participants', label: `Participants (${registrations.length})` },
  ];

  const isFull = tournament ? (tournament.registeredCount || 0) >= (tournament.maxPlayers || 0) : false;
  const regMode = tournament?.registrationMode || 'individual';
  const isSquadMode = regMode === 'squad';
  const selectedSquad = userSquads.find(s => s.id === selectedSquadId);
  const teamSize = tournament?.squadRequirements?.teamSize || ((tournament?.eventType === 'doubles' || tournament?.eventType === 'mixed_doubles') ? 2 : 1);
  const rosterCount = selectedRosterIds.size;
  const rosterTeamCount = teamSize > 0 ? Math.floor(rosterCount / teamSize) : 0;
  const rosterDivisible = teamSize > 0 && rosterCount > 0 && rosterCount % teamSize === 0;
  const isSquadOwner = userSquadRole === 'owner' || userSquadRole === 'captain' || userSquadRole === 'OWNER';
  const hasActiveSquadReg = mySquadReg && mySquadReg.status !== 'withdrawn' && mySquadReg.status !== 'rejected';

  const tournamentExtras = tournament ? parseTournamentExtras(tournament.rules) : null;
  const hasStructuredDivisions = !!tournamentExtras?.divisions?.length;
  const deadlinePassed = !!(
    tournament?.registrationDeadline && new Date() > new Date(tournament.registrationDeadline)
  );
  // Organizers review pending in the approval section; everyone else sees pending in the list.
  const listedRegistrations = effectiveIsOrganizer
    ? registrations.filter((r) => r.status !== 'pending')
    : registrations;
  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length;
  const divisionCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const reg of registrations) {
      if (reg.status === 'withdrawn' || reg.status === 'rejected') continue;
      const msg = reg.applicationMessage;
      if (!msg?.startsWith('{')) continue;
      try {
        const parsed = JSON.parse(msg) as {
          divisionId?: string;
          divisions?: Array<{ divisionId?: string }>;
        };
        const ids = parsed.divisions?.map((d) => d.divisionId).filter(Boolean) as string[] | undefined;
        if (ids?.length) {
          for (const id of ids) {
            counts[id] = (counts[id] || 0) + 1;
          }
        } else if (parsed.divisionId) {
          counts[parsed.divisionId] = (counts[parsed.divisionId] || 0) + 1;
        }
      } catch { /* ignore */ }
    }
    return counts;
  }, [registrations]);

  const selectedDivisions =
    tournamentExtras?.divisions.filter((d) => selectedDivisionIds.includes(d.id)) ?? [];
  const allSelectedFull =
    selectedDivisions.length > 0 &&
    selectedDivisions.every((d) => (divisionCounts[d.id] || 0) >= d.maxTeams);
  const anySelectedFull = selectedDivisions.some(
    (d) => (divisionCounts[d.id] || 0) >= d.maxTeams,
  );

  const divisionRegisterCta = (() => {
    if (selectedDivisions.length === 0) {
      return { label: 'Select a division to continue', disabled: true, waitlist: false, visible: false };
    }
    if (deadlinePassed || tournament?.status !== 'UPCOMING') {
      return { label: 'Registration closed', disabled: true, waitlist: false, visible: true };
    }
    if (!currentUserId) {
      return { label: 'Log in to register', disabled: false, waitlist: false, visible: true, login: true };
    }
    if (isRegistered) {
      return { label: 'Already registered', disabled: true, waitlist: false, visible: true };
    }
    if (allSelectedFull) {
      return {
        label:
          selectedDivisions.length === 1
            ? `Join Waitlist for ${selectedDivisions[0].categoryName}`
            : `Join Waitlist (${selectedDivisions.length} divisions)`,
        disabled: false,
        waitlist: true,
        visible: true,
      };
    }
    return {
      label:
        selectedDivisions.length === 1
          ? `Register for ${selectedDivisions[0].categoryName}`
          : `Register for ${selectedDivisions.length} divisions`,
      disabled: false,
      waitlist: anySelectedFull, // mixed: still register; full ones marked waitlist in payload
      visible: true,
    };
  })();

  const toggleDivisionSelection = (division: TournamentDivision) => {
    setSelectedDivisionIds((prev) =>
      prev.includes(division.id)
        ? prev.filter((id) => id !== division.id)
        : [...prev, division.id],
    );
  };

  const openDivisionModal = (waitlist: boolean) => {
    if (!currentUserId) {
      beginAuthForRegistration(waitlist);
      return;
    }
    if (selectedDivisions.length === 0) return;
    setDivisionWaitlist(waitlist);
    setDivisionModalOpen(true);
  };

  const beginAuthForRegistration = (waitlist: boolean) => {
    if (!tournamentId) return;
    const ids =
      selectedDivisionIds.length > 0
        ? selectedDivisionIds
        : selectedDivisions.map((d) => d.id);
    if (ids.length === 0) {
      showToast('Select at least one division first', 'error');
      return;
    }
    savePendingDivisionRegistration({
      tournamentId,
      divisionIds: ids,
      waitlist,
    });
    const returnTo = tournamentLoginRedirectPath(tournamentId);
    localStorage.setItem('auth_redirect', returnTo);
    navigate(`/login?redirect=${encodeURIComponent(returnTo)}`);
  };

  const handleDivisionRegistrationSubmit = async (result: DivisionRegistrationFormResult) => {
    if (!currentUserId || !tournamentId) return;
    setIsJoining(true);
    try {
      let receiptUrl: string | null = null;
      if (result.paymentReceiptFile) {
        receiptUrl = await uploadRegistrationReceipt(tournamentId, result.paymentReceiptFile);
      }
      const { status } = await registerForDivision(tournamentId, currentUserId, {
        divisions: result.divisions.map((d) => ({
          divisionId: d.id,
          divisionName: d.categoryName,
          eventType: d.eventType,
          registrationFee: d.registrationFee,
          waitlist: (divisionCounts[d.id] || 0) >= d.maxTeams,
        })),
        players: result.players,
        paymentReceiptUrl: receiptUrl,
        notes: result.notes,
        waitlist: result.waitlist,
      });
      setIsRegistered(true);
      setRegistrationStatus(status);
      setDivisionModalOpen(false);
      setSelectedDivisionIds([]);
      clearPendingDivisionRegistration();
      const [t, regs] = await Promise.all([
        fetchTournamentById(tournamentId),
        fetchRegistrations(tournamentId),
      ]);
      setTournament(t);
      setRegistrations(regs);
      showToast(
        status === 'waitlisted'
          ? 'Added to waitlist! Organizer will notify you if a spot opens.'
          : status === 'confirmed'
            ? "You're registered!"
            : 'Registration submitted! Awaiting organizer approval.',
        'success',
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to register';
      showToast(message, 'error');
      throw err;
    } finally {
      setIsJoining(false);
    }
  };

  const canRegister = tournament?.status === 'UPCOMING'
    && !isFull
    && !isRegistered
    && !!currentUserId
    && (!isSquadMode || !hasActiveSquadReg)
    && (!tournament.registrationDeadline || new Date() <= new Date(tournament.registrationDeadline));
  const isPast = tournament?.status === 'COMPLETED';

  // After login/signup, restore selected divisions and open the registration modal
  useEffect(() => {
    if (isLoading || !tournamentId || !currentUserId || !tournament) return;
    if (isRegistered || effectiveIsOrganizer || isSquadMode) return;
    if (resumedRegistrationRef.current) return;

    const pending = readPendingDivisionRegistration(tournamentId);
    if (!pending || pending.divisionIds.length === 0) return;

    const validIds = (tournamentExtras?.divisions || [])
      .map((d) => d.id)
      .filter((id) => pending.divisionIds.includes(id));

    if (validIds.length === 0) {
      clearPendingDivisionRegistration();
      return;
    }

    resumedRegistrationRef.current = true;
    setSelectedDivisionIds(validIds);
    setDivisionWaitlist(!!pending.waitlist);
    setDivisionModalOpen(true);
    clearPendingDivisionRegistration();
    showToast('Welcome back — finish your registration below.', 'info');
  }, [
    isLoading,
    tournamentId,
    currentUserId,
    tournament,
    isRegistered,
    effectiveIsOrganizer,
    isSquadMode,
    tournamentExtras,
  ]);

  useSEO({
    title: tournament ? `${tournament.name} | Pickleball Tournament Philippines` : 'Pickleball Tournament Details',
    description: tournament
      ? `${tournament.name} in ${tournament.location}. View tournament details, schedule, format, prize pool, and registration information on PicklePlay.`
      : 'View pickleball tournament details, schedule, participants, and registration information on PicklePlay.',
    canonical: tournamentId ? `https://www.pickleplay.ph/tournaments/${tournamentId}` : undefined,
    ogType: 'event',
    structuredData: tournament
      ? {
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: tournament.name,
          description: tournament.description || `Pickleball tournament in ${tournament.location}`,
          startDate: tournament.startTime || tournament.date,
          endDate: tournament.date,
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          eventStatus:
            tournament.status === 'COMPLETED'
              ? 'https://schema.org/EventCompleted'
              : tournament.status === 'CANCELLED'
                ? 'https://schema.org/EventCancelled'
                : 'https://schema.org/EventScheduled',
          image: tournament.image ? [tournament.image] : undefined,
          location: {
            '@type': 'Place',
            name: tournament.location,
            address: tournament.location,
          },
          organizer: {
            '@type': 'Organization',
            name: 'PicklePlay Philippines',
            url: 'https://www.pickleplay.ph',
          },
          offers: {
            '@type': 'Offer',
            availability:
              tournament.status === 'UPCOMING'
                ? 'https://schema.org/InStock'
                : 'https://schema.org/SoldOut',
            url: `https://www.pickleplay.ph/tournaments/${tournament.id}`,
          },
        }
      : null,
  });

  if (!tournamentId) return null;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page header bar ── */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 h-14 flex items-center gap-3">
        <button
          onClick={() => navigate('/tournaments')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
          aria-label="Back to tournaments"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => navigate('/tournaments')}
          className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 transition-colors"
        >
          Tournaments
        </button>
        {tournament && (
          <>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 truncate">
              {tournament.name}
            </span>
          </>
        )}
      </div>

      {/* ── Body ── */}
      {isLoading ? (
        <div className="px-4 sm:px-6 py-8 space-y-4 max-w-3xl mx-auto">
          <div className="h-56 bg-slate-200 animate-pulse rounded-3xl" />
          <div className="h-10 bg-slate-100 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      ) : !tournament ? (
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <Trophy className="w-16 h-16 text-slate-200 mb-4" />
          <p className="font-black text-slate-400 uppercase tracking-widest">Tournament not found</p>
          <button
            onClick={() => navigate('/tournaments')}
            className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors"
          >
            Back to Tournaments
          </button>
        </div>
      ) : (
        <div className="w-full">
          {/* ── Hero image ── */}
          <div className="relative h-56 sm:h-72 overflow-hidden">
            <img
              src={tournament.image || 'https://images.unsplash.com/photo-1599586120429-48281b6f0ece?auto=format&fit=crop&q=80&w=1200'}
              alt={tournament.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* Badges */}
            <div className="absolute bottom-4 left-6 flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                tournament.status === 'LIVE' ? 'bg-emerald-500 text-white' :
                tournament.status === 'UPCOMING' ? 'bg-blue-600 text-white' :
                'bg-slate-600 text-white'
              }`}>
                {tournament.status}
              </span>
              {tournament.isFeatured && (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-yellow-400 text-yellow-900 flex items-center gap-1">
                  <Star size={10} /> Featured
                </span>
              )}
              {tournament.format && (
                <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-sm">
                  {tournament.format.replace('_', ' ')}
                </span>
              )}
            </div>

            {/* Tournament name */}
            <div className="absolute bottom-4 right-6 text-right max-w-[60%]">
              <h1 className="text-2xl font-black text-white uppercase tracking-tight drop-shadow-lg leading-tight">
                {tournament.name}
              </h1>
            </div>
          </div>

          {/* ── Tab bar ── */}
          <div className="flex border-b border-slate-100 bg-white px-4 sm:px-8 sticky top-14 z-20">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 font-black text-[10px] uppercase tracking-widest transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab content ── */}
          <div className={activeTab === 'bracket' ? 'pb-24' : 'px-4 sm:px-8 py-6 pb-28 max-w-3xl mx-auto'}>
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Champion banner */}
                {tournament.status === 'COMPLETED' && champion && (
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-100 flex items-center justify-center shrink-0">
                      {champion.avatar
                        ? <img src={champion.avatar} alt={champion.name} className="w-full h-full rounded-2xl object-cover" />
                        : <Trophy size={28} className="text-yellow-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-0.5">Tournament Champion</p>
                      <p className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">{champion.name}</p>
                    </div>
                    <Trophy size={36} className="text-yellow-200 shrink-0" />
                  </div>
                )}

                {/* Announcement */}
                {tournament.announcement && (
                  <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4">
                    <Megaphone size={18} className="text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-sm font-bold text-blue-900">{tournament.announcement}</p>
                  </div>
                )}

                {/* Info cards — keep it light for players */}
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard
                    icon={Calendar}
                    label="When"
                    value={new Date(tournament.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  />
                  <InfoCard icon={MapPin} label="Where" value={tournament.location} />
                </div>

                {/* Pending approvals indicator */}
                {effectiveIsOrganizer && pendingRegistrations.length > 0 && (
                  <button
                    onClick={() => setActiveTab('participants')}
                    className="w-full bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center justify-between text-left hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="text-amber-600" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-amber-900">
                          {pendingRegistrations.length} {pendingRegistrations.length === 1 ? 'Registration' : 'Registrations'} Pending
                        </p>
                        <p className="text-xs text-amber-600 font-medium">Review in Participants tab</p>
                      </div>
                    </div>
                    <ChevronRight className="text-amber-400" size={20} />
                  </button>
                )}

                {/* Short welcome blurb */}
                <div className="rounded-3xl bg-blue-50 border border-blue-100 px-5 py-4">
                  <p className="text-sm font-bold text-blue-900 leading-relaxed">
                    {tournament.description?.split('\n')[0]?.trim() ||
                      'Pick a division below and register — we will build the event around who joins.'}
                  </p>
                  {(tournament.description?.split('\n').filter(Boolean).length ?? 0) > 1 && (
                    <p className="text-xs text-blue-800/70 font-medium mt-2 leading-relaxed">
                      {tournament.description
                        ?.split('\n')
                        .map((l) => l.trim())
                        .filter(Boolean)
                        .slice(1, 3)
                        .join(' ')}
                    </p>
                  )}
                </div>

                {/* Divisions — primary action for players */}
                {tournament.rules && hasStructuredDivisions ? (
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight mb-1">
                      Choose your division
                    </h3>
                    <p className="text-sm text-slate-500 font-medium mb-4">
                      {(() => {
                        const reqs = tournamentExtras?.registrationRequirements;
                        const anyUpload =
                          !!reqs?.requireValidId ||
                          !!reqs?.requireProofOfResidency ||
                          !!reqs?.requirePaymentReceipt;
                        const anyFee = (tournamentExtras?.divisions || []).some(
                          (d) => (d.registrationFee ?? 0) > 0,
                        );
                        if (!anyFee && !anyUpload) {
                          return 'Select one or more — free to join, no documents needed.';
                        }
                        if (!anyUpload) return 'Select one or more divisions to register.';
                        return 'Select one or more divisions, then complete registration.';
                      })()}
                    </p>
                    <div className="bg-white rounded-3xl p-4 border border-slate-100">
                      <TournamentRulesPanel
                        rules={tournament.rules}
                        interactive={!isSquadMode && !effectiveIsOrganizer}
                        selectedDivisionIds={selectedDivisionIds}
                        onToggleDivision={toggleDivisionSelection}
                        divisionCounts={divisionCounts}
                        deadlinePassed={deadlinePassed}
                        playerFriendly
                      />
                    </div>
                  </div>
                ) : tournament.rules ? (
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Details
                    </h3>
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <TournamentRulesPanel
                        rules={tournament.rules}
                        announcement={tournament.announcement}
                      />
                    </div>
                  </div>
                ) : null}

                {/* Organizer-only extras stay available */}
                {effectiveIsOrganizer && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <DetailRow
                        icon={Users}
                        label="Registered"
                        value={`${tournament.registeredCount} / ${tournament.maxPlayers}`}
                      />
                      {tournament.registrationDeadline && (
                        <DetailRow
                          icon={Calendar}
                          label="Reg. Deadline"
                          value={new Date(tournament.registrationDeadline).toLocaleDateString()}
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
                          Registration Mode
                        </p>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${regMode === 'squad' ? 'bg-slate-900 text-white' : 'bg-blue-50 text-blue-700'}`}>
                          {regMode === 'squad' ? 'Squads Only' : 'Individual'}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {/* Prizes */}
                {(tournament.prizePool || tournament.prizes) && (
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Prizes</h3>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                      {tournament.prizePool && (
                        <p className="text-lg font-black text-emerald-700 mb-1">Prize Pool: {tournament.prizePool}</p>
                      )}
                      {tournament.prizes && (
                        <p className="text-sm text-emerald-600 whitespace-pre-line">{tournament.prizes}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bracket' && (
              <div className="animate-in fade-in duration-200 w-full">
                <TournamentBracket
                  tournamentId={tournamentId}
                  format={tournament.format || 'single_elim'}
                  currentUserId={currentUserId}
                  onMatchClick={(m: TournamentMatch) => {
                    if (isSquadMode && mySquadReg) {
                      setSelectedMatch(m);
                    }
                  }}
                />
              </div>
            )}

            {activeTab === 'participants' && (
              <div className="space-y-3 animate-in fade-in duration-200">
                {regMode === 'squad' && (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-600 font-bold">
                    Squad-based registrations. {squadRegistrations.filter(s => s.status === 'confirmed').length} squads confirmed.
                  </div>
                )}

                {/* Pending squad approvals — organizers only */}
                {effectiveIsOrganizer && isSquadMode && squadRegistrations.filter(s => s.status === 'pending').length > 0 && (
                  <div className="space-y-3 pb-4 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending Squad Approvals</h4>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black">
                        {squadRegistrations.filter(s => s.status === 'pending').length}
                      </span>
                    </div>
                    {squadRegistrations.filter(s => s.status === 'pending').map(sr => (
                      <div key={sr.id} className="bg-white border border-amber-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{sr.squad?.name || 'Unknown Squad'}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {sr.roster?.length || 0} players • {sr.roster ? Math.floor((sr.roster.filter(r => r.status === 'active').length) / teamSize) : 0} teams
                            </p>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-widest border border-amber-100">Pending</span>
                        </div>
                        {/* Roster list */}
                        {sr.roster && sr.roster.length > 0 && (
                          <div className="space-y-1">
                            {sr.roster.map(rp => (
                              <div key={rp.id} className="flex items-center gap-2 text-sm">
                                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500">
                                  {(rp.player?.full_name || '?')[0]}
                                </div>
                                <span className="font-bold text-slate-700">{rp.player?.full_name || rp.playerId.slice(0, 8)}</span>
                                {rp.player?.rating && (
                                  <span className="text-[9px] font-black text-amber-600">⭐ {rp.player.rating.toFixed(1)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {sr.applicationMessage && (
                          <p className="text-xs text-slate-500 italic bg-slate-50 rounded-xl p-2">"{sr.applicationMessage}"</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await approveSquadRegistration(sr.id, currentUserId!);
                                const updated = await getSquadRegistrations(tournamentId!);
                                setSquadRegistrations(updated);
                                showToast('Squad approved!', 'success');
                              } catch (err: any) { showToast(err.message || 'Failed', 'error'); }
                            }}
                            className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all"
                          >Approve</button>
                          <button
                            onClick={async () => {
                              try {
                                await rejectSquadRegistration(sr.id, currentUserId!);
                                const updated = await getSquadRegistrations(tournamentId!);
                                setSquadRegistrations(updated);
                                showToast('Squad rejected.', 'info');
                              } catch (err: any) { showToast(err.message || 'Failed', 'error'); }
                            }}
                            className="flex-1 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 transition-all border border-rose-100"
                          >Reject</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending approvals — organizers only */}
                {effectiveIsOrganizer && pendingRegistrations.length > 0 && (
                  <div className="space-y-3 pb-4 border-b border-amber-100">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending Approvals</h4>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black">{pendingRegistrations.length}</span>
                    </div>
                    {pendingRegistrations.map((reg) => (
                      <PlayerApprovalCard
                        key={reg.id}
                        registration={reg}
                        tournamentId={tournamentId}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        isProcessing={isJoining}
                      />
                    ))}
                  </div>
                )}

                {/* Summary bar */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2">
                    <Users size={14} className="text-blue-600" />
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                      {registrations.length} / {tournament?.maxPlayers || '∞'} Players
                    </span>
                  </div>
                  {confirmedCount > 0 && confirmedCount !== registrations.length && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        {confirmedCount} Confirmed
                      </span>
                    </div>
                  )}
                  {registrations.filter(r => r.checkedIn).length > 0 && (
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-2">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        {registrations.filter(r => r.checkedIn).length} Checked In
                      </span>
                    </div>
                  )}
                  {currentUserId && registrations.some(r => r.playerId === currentUserId) && (
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2">
                      <BadgeCheck size={14} className="text-indigo-600" />
                      <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                        {registrations.find(r => r.playerId === currentUserId)?.status === 'confirmed'
                          ? "You're In!"
                          : registrations.find(r => r.playerId === currentUserId)?.status === 'waitlisted'
                            ? 'Waitlisted'
                            : 'Pending'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Search participants */}
                {listedRegistrations.length > 5 && (
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                      type="text"
                      placeholder="Search players..."
                      value={participantSearch}
                      onChange={e => setParticipantSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm text-slate-700"
                    />
                  </div>
                )}

                {isSquadMode ? (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registered Squads</h4>
                    {squadRegistrations.filter(s => s.status === 'confirmed').length === 0 ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-400 font-bold">
                        No confirmed squad registrations yet.
                      </div>
                    ) : (
                      squadRegistrations.filter(s => s.status === 'confirmed').map(sr => (
                        <div key={sr.id} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{sr.squad?.name || 'Unknown Squad'}</p>
                              <p className="text-[10px] text-slate-400 font-bold">
                                {sr.roster?.filter(r => r.status === 'active').length || 0} active players • {Math.floor((sr.roster?.filter(r => r.status === 'active').length || 0) / teamSize)} teams
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {sr.rosterLockedAt && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[8px] font-black uppercase">
                                  <Lock size={8} /> Locked
                                </span>
                              )}
                              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100">Confirmed</span>
                            </div>
                          </div>
                          {sr.roster && sr.roster.length > 0 && (
                            <div className="space-y-1">
                              {sr.roster.map(rp => (
                                <div key={rp.id} className={`flex items-center gap-2 text-sm ${rp.status !== 'active' ? 'opacity-50' : ''}`}>
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ${
                                    rp.status === 'inactive_injured' ? 'bg-rose-100 text-rose-500' :
                                    rp.status === 'substituted' ? 'bg-amber-100 text-amber-500' :
                                    'bg-indigo-100 text-indigo-500'
                                  }`}>
                                    {rp.status === 'inactive_injured' ? <HeartPulse size={12} /> : (rp.player?.full_name || '?')[0]}
                                  </div>
                                  <span className="font-bold text-slate-700">{rp.player?.full_name || rp.playerId.slice(0, 8)}</span>
                                  {rp.status !== 'active' && (
                                    <span className="text-[8px] font-black uppercase text-slate-400">{rp.status.replace('_', ' ')}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : null}

                {listedRegistrations.length === 0 && !(effectiveIsOrganizer && pendingRegistrations.length > 0) ? (
                  <div className="text-center py-16">
                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="font-black text-slate-300 uppercase text-sm">No participants yet</p>
                    <p className="text-xs text-slate-300 mt-1">Be the first to register!</p>
                  </div>
                ) : listedRegistrations.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Players {participantSearch && `matching "${participantSearch}"`}
                    </h4>
                    {listedRegistrations
                      .filter(reg => {
                        if (!participantSearch.trim()) return true;
                        const name = reg.player?.full_name || '';
                        return name.toLowerCase().includes(participantSearch.toLowerCase());
                      })
                      .map((reg, i) => {
                        const isYou = currentUserId && reg.playerId === currentUserId;
                        const rating = playerRatings.get(reg.playerId);
                        return (
                          <div key={reg.id} className={`flex items-center gap-4 rounded-2xl p-4 transition-colors ${
                            isYou ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-white border border-slate-100'
                          }`}>
                            {reg.player?.avatar_url ? (
                              <img src={reg.player.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                            ) : (
                              <span className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${
                                isYou ? 'bg-indigo-200 text-indigo-700' : 'bg-blue-100 text-blue-600'
                              }`}>
                                {(reg.player?.full_name || '?')[0].toUpperCase()}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm text-slate-900 truncate">
                                  {reg.player?.full_name || `Player ${reg.playerId.slice(0, 6)}...`}
                                </p>
                                {isYou && (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                {rating !== undefined && rating !== null && (
                                  <span className="text-[10px] font-black text-amber-600">
                                    ⭐ {rating.toFixed(1)} DUPR
                                  </span>
                                )}
                                <span className="text-[10px] font-bold text-slate-400">
                                  Joined {new Date(reg.registeredAt || '').toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {reg.checkedIn && (
                                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Checked In
                                </span>
                              )}
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                reg.status === 'confirmed'
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                  : reg.status === 'waitlisted'
                                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                                    : reg.status === 'pending'
                                      ? 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                      : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}>
                                {reg.status === 'confirmed' ? 'Confirmed' : reg.status === 'waitlisted' ? 'Waitlisted' : reg.status === 'pending' ? 'Pending' : reg.status}
                              </span>
                              <span className="text-[10px] font-black text-slate-300">#{i + 1}</span>
                            </div>
                          </div>
                        );
                      })}
                    {listedRegistrations.filter(reg => {
                      if (!participantSearch.trim()) return true;
                      return (reg.player?.full_name || '').toLowerCase().includes(participantSearch.toLowerCase());
                    }).length === 0 && participantSearch && (
                      <div className="text-center py-8">
                        <p className="text-sm text-slate-400 font-bold">No players matching "{participantSearch}"</p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* ── Sticky footer action ── */}
          <div className="fixed bottom-0 left-0 right-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-100 px-4 py-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
              {effectiveIsOrganizer ? (
                <div className="space-y-3">
                  <button
                    onClick={() => navigate(`/tournaments-admin/manage/${tournamentId}`)}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                  >
                    <Settings2 size={16} /> Manage Tournament
                  </button>
                  {tournament?.status === 'UPCOMING' && tournament.registrationDeadline && new Date(tournament.registrationDeadline) < new Date() && (
                    <button
                      onClick={handleOpenRegistration}
                      disabled={isOpeningReg}
                      className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      <Unlock size={15} /> {isOpeningReg ? 'Opening...' : 'Open Registration'}
                    </button>
                  )}
                  <button
                    onClick={() => setViewAsPlayer(true)}
                    className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <Eye size={15} /> View as Player
                  </button>
                </div>
              ) : !isPast && (
                <>
                  {isOrganizer && viewAsPlayer && (
                    <button
                      onClick={() => setViewAsPlayer(false)}
                      className="w-full mb-3 py-2.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                    >
                      <EyeOff size={13} /> Back to Organizer View
                    </button>
                  )}
                  {/* ── Squad mode footer ── */}
                  {isSquadMode ? (
                    <>
                      {/* Squad already registered — show status */}
                      {hasActiveSquadReg && mySquadReg ? (
                        <div className="space-y-3">
                          <div className={`flex items-center justify-between py-3 px-4 rounded-2xl border font-black text-xs uppercase tracking-widest ${
                            mySquadReg.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            mySquadReg.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest mb-0.5">Your Squad</p>
                              <p>{mySquadReg.squad?.name || 'Your Squad'}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400">
                                {mySquadReg.roster?.filter(r => r.status === 'active').length || 0} players • {rosterTeamCount} teams
                              </p>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                mySquadReg.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                mySquadReg.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {mySquadReg.status === 'pending' ? 'Pending Approval' : mySquadReg.status === 'confirmed' ? 'Confirmed ✓' : mySquadReg.status}
                              </span>
                              {mySquadReg.rosterLockedAt && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[8px] font-black uppercase">
                                  <Lock size={8} className="inline mr-0.5" />Locked
                                </span>
                              )}
                            </div>
                          </div>
                          {isSquadOwner && (
                            <button
                              onClick={handleWithdrawSquad}
                              disabled={isRegisteringSquad}
                              className="w-full py-3 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-2xl border border-rose-100 font-black text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              <UserMinus size={14} /> Withdraw Squad
                            </button>
                          )}
                          {!isSquadOwner && (
                            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              Only squad owners/captains can withdraw
                            </p>
                          )}
                        </div>
                      ) : isSquadOwner && canRegister ? (
                        /* Squad owner — registration flow with roster picker */
                        <div className="space-y-3">
                          {/* Squad selector (if user has multiple squads) */}
                          {userSquads.length > 1 && (
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Select Squad</p>
                              <select
                                value={selectedSquadId}
                                onChange={e => handleSquadChange(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700"
                              >
                                <option value="">Choose a squad</option>
                                {userSquads.map(s => (
                                  <option key={s.id} value={s.id}>{s.name} — {s.members_count} members</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {/* Roster picker toggle */}
                          {selectedSquadId && (
                            <button
                              onClick={() => setShowRosterPicker(!showRosterPicker)}
                              className="w-full flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-left hover:bg-slate-100 transition-colors"
                            >
                              <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Roster Players</p>
                                <p className="text-sm font-bold text-slate-700">
                                  {rosterCount} selected {rosterDivisible ? `= ${rosterTeamCount} team${rosterTeamCount !== 1 ? 's' : ''}` : ''}
                                  {rosterCount > 0 && !rosterDivisible && (
                                    <span className="text-rose-500 ml-1">(must be divisible by {teamSize})</span>
                                  )}
                                </p>
                              </div>
                              {showRosterPicker ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                            </button>
                          )}

                          {/* Roster picker accordion content */}
                          {showRosterPicker && selectedSquadId && (
                            <div className="bg-white border border-slate-100 rounded-2xl p-3 space-y-1 max-h-48 overflow-y-auto">
                              {squadMembers.length === 0 ? (
                                <p className="text-sm text-slate-400 font-bold text-center py-4">No squad members found.</p>
                              ) : (
                                squadMembers.map(member => {
                                  const isSelected = selectedRosterIds.has(member.user_id);
                                  return (
                                    <button
                                      key={member.user_id}
                                      onClick={() => toggleRosterPlayer(member.user_id)}
                                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left ${
                                        isSelected ? 'bg-indigo-50 border border-indigo-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                                      }`}
                                    >
                                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                        isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'
                                      }`}>
                                        {isSelected && <CheckCircle2 size={12} />}
                                      </div>
                                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-500 flex-shrink-0">
                                        {(member.profiles?.full_name || '?')[0]}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-700 truncate">{member.profiles?.full_name || member.user_id.slice(0, 8)}</p>
                                        {member.profiles?.skill_level && (
                                          <p className="text-[10px] text-slate-400 font-bold">{member.profiles.skill_level} rating</p>
                                        )}
                                      </div>
                                      <span className="text-[9px] font-black text-slate-400 uppercase">{member.role}</span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}

                          {/* Application message */}
                          {selectedSquadId && rosterCount > 0 && (
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                                Message to Organizer (Optional)
                              </label>
                              <textarea
                                value={applicationMessage}
                                onChange={(e) => setApplicationMessage(e.target.value)}
                                placeholder="Tell the organizer about your squad..."
                                className="w-full p-2 text-sm border border-slate-200 rounded-xl resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                maxLength={500}
                              />
                              <p className="text-[9px] text-slate-400 text-right mt-1">{applicationMessage.length}/500</p>
                            </div>
                          )}

                          {/* Register Squad button */}
                          <button
                            onClick={handleRegisterSquad}
                            disabled={isRegisteringSquad || !selectedSquadId || rosterCount === 0 || !rosterDivisible}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                          >
                            {isRegisteringSquad ? 'Registering Squad...' : (
                              <><Users size={16} /> Register Squad{rosterDivisible && rosterCount > 0 ? ` (${rosterTeamCount} team${rosterTeamCount !== 1 ? 's' : ''})` : ''}</>
                            )}
                          </button>
                        </div>
                      ) : !isSquadOwner && currentUserId ? (
                        /* Squad member (not owner) — read-only view */
                        <div className="text-center py-3 space-y-2">
                          {mySquadReg ? (
                            <div className={`px-4 py-3 rounded-2xl border font-bold text-sm ${
                              mySquadReg.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                              mySquadReg.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              'bg-slate-50 text-slate-500 border-slate-100'
                            }`}>
                              Your squad's registration is <span className="font-black uppercase">{mySquadReg.status}</span>
                            </div>
                          ) : (
                            <p className="text-slate-400 font-bold text-xs uppercase">
                              Only squad owners/captains can register
                            </p>
                          )}
                        </div>
                      ) : (
                        /* No canRegister — cannot register message */
                        <div className="text-center py-2">
                          <p className="text-slate-400 font-bold text-xs uppercase">
                            {isFull ? 'Tournament is full'
                              : !currentUserId ? 'Log in to register'
                              : 'Registration closed'}
                          </p>
                        </div>
                      )}
                    </>

                  /* ── Individual mode footer ── */
                  ) : hasStructuredDivisions ? (
                    isRegistered ? (
                      <div className="flex gap-3">
                        <div className={`flex-[3] flex items-center justify-center gap-2 py-4 rounded-2xl border font-black text-xs uppercase tracking-widest ${
                          registrationStatus === 'pending' || registrationStatus === 'waitlisted'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {registrationStatus === 'waitlisted'
                            ? 'On Waitlist'
                            : registrationStatus === 'pending'
                              ? 'Pending Approval'
                              : "You're Registered ✓"}
                        </div>
                        <button
                          onClick={handleLeave}
                          disabled={isJoining}
                          className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-500 hover:bg-rose-100 py-4 rounded-2xl border border-rose-100 font-black text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                          <UserMinus size={16} /> Withdraw
                        </button>
                      </div>
                    ) : divisionRegisterCta.visible ? (
                      <button
                        type="button"
                        disabled={divisionRegisterCta.disabled || isJoining}
                        onClick={() => {
                          if ('login' in divisionRegisterCta && divisionRegisterCta.login) {
                            beginAuthForRegistration(!!divisionRegisterCta.waitlist);
                            return;
                          }
                          openDivisionModal(!!divisionRegisterCta.waitlist);
                        }}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-bottom-2 duration-300 ${
                          divisionRegisterCta.disabled
                            ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                            : divisionRegisterCta.waitlist
                              ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                        }`}
                      >
                        <UserPlus size={16} />
                        {divisionRegisterCta.label}
                      </button>
                    ) : (
                      <div className="text-center py-2">
                        <p className="text-slate-400 font-bold text-xs uppercase">
                          Select one or more divisions above to register
                        </p>
                      </div>
                    )

                  ) : (
                    <>
                      {registrationStatus === 'rejected' ? (
                        <div className="space-y-3">
                          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 text-center">
                            <p className="text-sm font-bold text-rose-600 mb-0.5">Registration Not Approved</p>
                            <p className="text-xs text-rose-500">You can reapply below.</p>
                          </div>
                          <button
                            onClick={handleJoin}
                            disabled={isJoining || !canRegister}
                            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                              canRegister ? 'bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <UserPlus size={18} /> {isJoining ? 'Reapplying...' : 'Reapply'}
                          </button>
                        </div>
                      ) : isRegistered ? (
                        <div className="flex gap-3">
                          <div className={`flex-[3] flex items-center justify-center gap-2 py-4 rounded-2xl border font-black text-xs uppercase tracking-widest ${
                            registrationStatus === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {registrationStatus === 'pending' ? 'Pending Approval' : "You're Registered ✓"}
                          </div>
                          <button
                            onClick={handleLeave}
                            disabled={isJoining}
                            className="flex-1 flex items-center justify-center gap-2 bg-rose-50 text-rose-500 hover:bg-rose-100 py-4 rounded-2xl border border-rose-100 font-black text-[10px] uppercase tracking-widest transition-colors disabled:opacity-50"
                          >
                            <UserMinus size={16} /> Withdraw
                          </button>
                        </div>
                      ) : canRegister ? (
                        <div className="space-y-3">
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                              Message to Organizer (Optional)
                            </label>
                            <textarea
                              value={applicationMessage}
                              onChange={(e) => setApplicationMessage(e.target.value)}
                              placeholder="Tell the organizer why you'd like to join..."
                              className="w-full p-2 text-sm border border-slate-200 rounded-xl resize-none h-16 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              maxLength={500}
                            />
                            <p className="text-[9px] text-slate-400 text-right mt-1">{applicationMessage.length}/500</p>
                          </div>
                          <button
                            onClick={handleJoin}
                            disabled={isJoining}
                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                          >
                            {isJoining ? 'Registering...' : <><UserPlus size={16} /> Register for Tournament</>}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-slate-400 font-bold text-xs uppercase">
                            {isFull ? 'Tournament is full'
                              : !currentUserId ? 'Log in to register'
                              : 'Registration closed'}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Match Lineup Panel ── */}
      {selectedMatch && isSquadMode && mySquadReg && (
        <MatchLineupPanel
          match={selectedMatch}
          squadRegistration={mySquadReg}
          teamSize={teamSize}
          isSquadOwner={isSquadOwner}
          isRosterLocked={!!mySquadReg.rosterLockedAt}
          tournamentMode={tournament?.tournamentMode || 'casual'}
          onClose={() => setSelectedMatch(null)}
          onSaved={async () => {
            // Reload squad registration data
            if (tournamentId && selectedSquadId) {
              const updated = await getSquadRegistration(tournamentId, selectedSquadId);
              setMySquadReg(updated);
              const allRegs = await getSquadRegistrations(tournamentId);
              setSquadRegistrations(allRegs);
            }
          }}
        />
      )}

      {/* ── Dialogs ── */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirm}
        onCancel={closeConfirm}
        variant={confirmDialog.variant}
      />

      {/* Conflicts dialog */}
      {showConflictsDialog && conflicts.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden animate-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${conflicts.some(c => c.severity === 'error') ? 'bg-rose-100' : 'bg-amber-100'}`}>
                  <AlertTriangle size={24} className={conflicts.some(c => c.severity === 'error') ? 'text-rose-600' : 'text-amber-600'} />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight text-slate-900">
                    {conflicts.some(c => c.severity === 'error') ? 'Registration Blocked' : 'Registration Warnings'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {conflicts.filter(c => c.severity === 'error').length > 0 ? 'Resolve these issues before registering' : 'Review before continuing'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowConflictsDialog(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto">
              {conflicts.map((conflict, idx) => (
                <div key={idx} className={`p-4 rounded-2xl border ${conflict.severity === 'error' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${conflict.severity === 'error' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {conflict.type === 'verification' && conflict.field === 'phone' && <Phone size={18} />}
                      {conflict.type === 'verification' && conflict.field === 'id' && <FileText size={18} />}
                      {conflict.type === 'verification' && conflict.field === 'skill' && <BadgeCheck size={18} />}
                      {conflict.type !== 'verification' && <AlertTriangle size={18} />}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${conflict.severity === 'error' ? 'text-rose-900' : 'text-amber-900'}`}>{conflict.message}</p>
                      {conflict.type === 'verification' && (
                        <button
                          onClick={() => { setShowConflictsDialog(false); window.location.href = '/profile?tab=verification'; }}
                          className={`mt-2 text-xs font-black uppercase tracking-wide ${conflict.severity === 'error' ? 'text-rose-600 hover:text-rose-700' : 'text-amber-600 hover:text-amber-700'}`}
                        >
                          Complete Verification →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button onClick={() => setShowConflictsDialog(false)} className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 font-black text-xs uppercase tracking-widest text-slate-700 transition-colors">
                Cancel
              </button>
              {!conflicts.some(c => c.severity === 'error') && (
                <button
                  onClick={proceedWithRegistration}
                  disabled={isJoining}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {isJoining ? 'Registering...' : 'Register Anyway'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <DivisionRegistrationModal
        isOpen={divisionModalOpen}
        divisions={selectedDivisions}
        waitlist={divisionWaitlist}
        requirePaymentReceipt={!!tournamentExtras?.registrationRequirements.requirePaymentReceipt}
        profileSeed={profileSeed}
        isSubmitting={isJoining}
        onClose={() => setDivisionModalOpen(false)}
        onSubmit={handleDivisionRegistrationSubmit}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const InfoCard: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="bg-white rounded-2xl p-4 text-center border border-slate-100">
    <Icon size={18} className="text-blue-600 mx-auto mb-2" />
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    <p className="text-sm font-bold text-slate-900 mt-1 truncate">{value}</p>
  </div>
);

const DetailRow: React.FC<{ icon: React.ElementType; label: string; value: string }> = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-slate-100">
    <Icon size={16} className="text-blue-600 shrink-0" />
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-sm font-bold text-slate-900 capitalize">{value}</p>
    </div>
  </div>
);

export default TournamentPage;
