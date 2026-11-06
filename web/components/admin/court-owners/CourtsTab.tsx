import React from 'react';
import { MapPin, Phone } from 'lucide-react';
import { formatPeso } from '../../../services/adminCourtOwners';
import type { OwnerCourt, OwnerLocation } from '../../../services/adminCourtOwners';
import type { VenueTarget } from './ChangeCourtStatusDialog';
import { getVenueStatusBadgeClass } from './ownerDisplay';

interface CourtsTabProps {
  locations: OwnerLocation[];
  courts: OwnerCourt[];
  onEdit: (target: VenueTarget, initialIsActive?: boolean) => void;
}

const StatusBadge: React.FC<{ status: string; isActive: boolean }> = ({ status, isActive }) => (
  <span className="inline-flex items-center gap-1.5">
    <span
      className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getVenueStatusBadgeClass(status, true)}`}
    >
      {status}
    </span>
    {!isActive ? (
      <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white">
        Inactive
      </span>
    ) : null}
  </span>
);

const ActionButtons: React.FC<{ target: VenueTarget; onEdit: CourtsTabProps['onEdit'] }> = ({ target, onEdit }) => (
  <div className="flex flex-wrap justify-end gap-2">
    <button
      type="button"
      onClick={() => onEdit(target)}
      className="whitespace-nowrap px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
    >
      Set status
    </button>
    {target.venue.isActive ? (
      <button
        type="button"
        onClick={() => onEdit(target, false)}
        className="whitespace-nowrap px-4 py-2 border border-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
      >
        Deactivate
      </button>
    ) : (
      <button
        type="button"
        onClick={() => onEdit(target, true)}
        className="whitespace-nowrap px-4 py-2 bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all"
      >
        Reactivate
      </button>
    )}
  </div>
);

const CourtRow: React.FC<{ court: OwnerCourt; onEdit: CourtsTabProps['onEdit'] }> = ({ court, onEdit }) => (
  <div className="flex flex-col lg:flex-row lg:items-center gap-4 px-6 py-5 rounded-3xl border border-slate-100 bg-white">
    <div className="flex items-center gap-4 min-w-0 flex-1">
      {court.imageUrl ? (
        <img src={court.imageUrl} alt={court.name} className="w-12 h-12 shrink-0 rounded-2xl object-cover border border-slate-100" />
      ) : (
        <div className="w-12 h-12 shrink-0 rounded-2xl bg-slate-100" />
      )}
      <div className="min-w-0">
        <p className="truncate font-black text-slate-950 text-sm">{court.name}</p>
        <p className="truncate text-[11px] font-medium text-slate-400">
          {court.numCourts} unit{court.numCourts === 1 ? '' : 's'}
          {court.courtType ? ` · ${court.courtType}` : ''}
          {court.surfaceType ? ` · ${court.surfaceType}` : ''}
          {court.basePrice ? ` · ${formatPeso(court.basePrice)}/hr` : ''}
        </p>
        <div className="mt-2">
          <StatusBadge status={court.status} isActive={court.isActive} />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-4 gap-4 text-right shrink-0">
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">30d</p>
        <p className="text-sm font-black text-slate-900">{court.bookings30d ?? 0}</p>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Revenue</p>
        <p className="text-sm font-black text-slate-900">{formatPeso(court.revenue30d ?? 0)}</p>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Upcoming</p>
        <p className="text-sm font-black text-slate-900">{court.upcomingBookings ?? 0}</p>
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Rating</p>
        <p className="text-sm font-black text-slate-900">
          {court.averageRating != null ? court.averageRating.toFixed(1) : '—'}
        </p>
      </div>
    </div>
    <ActionButtons target={{ kind: 'court', venue: court }} onEdit={onEdit} />
  </div>
);

const CourtsTab: React.FC<CourtsTabProps> = ({ locations, courts, onEdit }) => {
  const locationIds = new Set(locations.map((l) => l.id));
  const unassigned = courts.filter((court) => !court.locationId || !locationIds.has(court.locationId));

  if (locations.length === 0 && courts.length === 0) {
    return (
      <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm px-8 py-16 text-center text-sm font-medium text-slate-400">
        This owner has not set up any locations or courts yet.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {locations.map((location) => {
        const locationCourts = courts.filter((court) => court.locationId === location.id);
        const address = [location.address, location.barangay, location.city, location.region].filter(Boolean).join(', ');
        return (
          <div key={location.id} className="bg-slate-50/70 p-6 md:p-8 rounded-[40px] border border-slate-200 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                {location.imageUrl ? (
                  <img
                    src={location.imageUrl}
                    alt={location.name}
                    className="w-16 h-16 shrink-0 rounded-2xl object-cover border border-slate-100"
                  />
                ) : null}
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Location</p>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight truncate">{location.name}</h3>
                  {address ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <MapPin size={12} /> {address}
                    </p>
                  ) : null}
                  {location.phone ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Phone size={12} /> {location.phone}
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <StatusBadge status={location.status} isActive={location.isActive} />
                  </div>
                </div>
              </div>
              <ActionButtons target={{ kind: 'location', venue: location }} onEdit={onEdit} />
            </div>
            {locationCourts.length === 0 ? (
              <p className="text-sm font-medium text-slate-400">No courts at this location yet.</p>
            ) : (
              <div className="space-y-3">
                {locationCourts.map((court) => (
                  <CourtRow key={court.id} court={court} onEdit={onEdit} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {unassigned.length > 0 ? (
        <div className="bg-slate-50/70 p-6 md:p-8 rounded-[40px] border border-slate-200 space-y-5">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Courts without a location</h3>
          <div className="space-y-3">
            {unassigned.map((court) => (
              <CourtRow key={court.id} court={court} onEdit={onEdit} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CourtsTab;
