import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ClipboardCheck, Wrench } from 'lucide-react';
import { formatPeso } from '../../../services/adminCourtOwners';
import type { CourtOwnerDetail } from '../../../services/adminCourtOwners';
import { formatUserDate } from '../users/userDisplay';
import {
  formatBookingDate,
  formatTime,
  formatVerificationLabel,
  getBookingStatusBadge,
  getVenueStatusBadgeClass,
  getVerificationBadgeClass,
  isVenueOpen,
} from './ownerDisplay';
import BookingTrendCard from './BookingTrendCard';

const Kpi: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
    {hint ? <p className="mt-1 text-[11px] font-medium text-slate-400">{hint}</p> : null}
  </div>
);

const Card: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  icon,
  children,
  className = '',
}) => (
  <div className={`bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm ${className}`}>
    <h3 className="text-lg font-black text-slate-900 mb-5 uppercase tracking-tight flex items-center gap-3">
      {icon}
      {title}
    </h3>
    {children}
  </div>
);

const formatEventRange = (start: string, end: string) => {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const date = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return sameDay
    ? `${date}, ${time(s)} – ${time(e)}`
    : `${date} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const OverviewTab: React.FC<{ detail: CourtOwnerDetail }> = ({ detail }) => {
  const { stats, verification } = detail;
  const attentionCourts = detail.courts.filter((court) => !isVenueOpen(court.status, court.isActive));
  const attentionLocations = detail.locations.filter((location) => !isVenueOpen(location.status, location.isActive));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <Kpi label="Locations" value={stats.locations.toLocaleString()} />
        <Kpi label="Courts" value={stats.courts.toLocaleString()} hint={`${stats.activeCourts} open for booking`} />
        <Kpi label="30d Bookings" value={stats.bookings30d.toLocaleString()} />
        <Kpi label="30d Revenue" value={formatPeso(stats.revenue30d)} hint="All non-cancelled bookings" />
        <Kpi label="Upcoming" value={stats.upcomingBookings.toLocaleString()} hint="From today onward" />
        <Kpi label="Cancellation" value={`${Math.round(stats.cancellationRate * 100)}%`} hint="Last 30 days" />
        <Kpi
          label="Rating"
          value={stats.averageRating != null ? stats.averageRating.toFixed(1) : '—'}
          hint={`${stats.reviewCount} review${stats.reviewCount === 1 ? '' : 's'}`}
        />
        <Kpi label="Managers" value={stats.activeManagers.toLocaleString()} hint="Active assignments" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <BookingTrendCard ownerId={detail.owner.id} className="xl:col-span-2" />

        <Card title="Verification" icon={<ClipboardCheck className="text-blue-600" />}>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getVerificationBadgeClass(verification?.status ?? null)}`}
          >
            {formatVerificationLabel(verification?.status ?? null)}
          </span>
          {verification ? (
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-slate-400">Path</dt>
                <dd className="font-bold text-slate-700 text-right">
                  {verification.verificationPath ? verification.verificationPath.replace(/_/g, ' ') : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-slate-400">Venue</dt>
                <dd className="font-bold text-slate-700 text-right truncate">{verification.courtLocationName || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-slate-400">Submitted</dt>
                <dd className="font-bold text-slate-700">{formatUserDate(verification.submittedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-bold text-slate-400">Reviewed</dt>
                <dd className="font-bold text-slate-700">{formatUserDate(verification.reviewedAt)}</dd>
              </div>
              {verification.adminNotes ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-600">{verification.adminNotes}</p>
              ) : null}
            </dl>
          ) : (
            <p className="mt-4 text-sm font-medium text-slate-400">This owner has not submitted a court owner verification.</p>
          )}
          <Link
            to="/admin/verifications"
            className="mt-6 inline-flex text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
          >
            Open Court Owner Apps
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <Card title="Recent Bookings" className="xl:col-span-2">
          {detail.recentBookings.length === 0 ? (
            <p className="text-sm font-medium text-slate-400">No bookings yet on this owner's courts.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {detail.recentBookings.map((booking) => (
                <li key={booking.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-slate-900">{booking.playerName}</p>
                    <p className="truncate text-[11px] font-medium text-slate-400">
                      {booking.courtName} · {formatBookingDate(booking.date)}
                      {booking.startTime ? ` · ${formatTime(booking.startTime)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black text-slate-900">{formatPeso(booking.totalPrice)}</span>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getBookingStatusBadge(booking.status)}`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-8">
          <Card title="Needs Attention" icon={<AlertTriangle className="text-amber-500" />}>
            {attentionCourts.length === 0 && attentionLocations.length === 0 ? (
              <p className="text-sm font-medium text-slate-400">All locations and courts are open.</p>
            ) : (
              <ul className="space-y-3">
                {attentionLocations.map((location) => (
                  <li key={location.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-bold text-slate-700">{location.name}</span>
                    <span
                      className={`shrink-0 inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getVenueStatusBadgeClass(location.status, location.isActive)}`}
                    >
                      {location.isActive ? location.status : 'Inactive'}
                    </span>
                  </li>
                ))}
                {attentionCourts.map((court) => (
                  <li key={court.id} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-bold text-slate-700">{court.name}</span>
                    <span
                      className={`shrink-0 inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getVenueStatusBadgeClass(court.status, court.isActive)}`}
                    >
                      {court.isActive ? court.status : 'Inactive'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Upcoming Blocks" icon={<Wrench className="text-blue-600" />}>
            {detail.upcomingEvents.length === 0 ? (
              <p className="text-sm font-medium text-slate-400">No upcoming maintenance, closures, or private events.</p>
            ) : (
              <ul className="space-y-3">
                {detail.upcomingEvents.map((event) => (
                  <li key={event.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-sm font-black text-slate-900">{event.title}</p>
                    <p className="text-[11px] font-medium text-slate-500">
                      {event.courtName} · {event.eventType.replace(/_/g, ' ')} · {formatEventRange(event.start, event.end)}
                    </p>
                    {event.blocksBookings ? (
                      <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-rose-500">Blocks bookings</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
