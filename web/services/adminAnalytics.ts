import { supabase } from './supabase';
import type { CourtManagerStatus } from '../types';

export type GrowthRange = '7D' | '1M' | '6M' | '1Y';

export interface ChartPoint {
  name: string;
  value: number;
}

export interface PlatformOverviewMetrics {
  totalUsers: number;
  activeUsers24h: number;
  totalCourts: number;
  bookings30d: number;
  gmv30d: number;
  pendingVerifications: number;
  pendingManagers: number;
  userGrowth: ChartPoint[];
  usersChangePct: number | null;
}

export interface UserRoleBreakdown {
  role: string;
  count: number;
}

export interface UserAnalytics {
  total: number;
  suspended: number;
  byRole: UserRoleBreakdown[];
  growth: ChartPoint[];
}

export interface CourtAnalyticsRow {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  locationName: string;
  courtType: string | null;
  numCourts: number;
  bookingCount: number;
  revenue: number;
  createdAt: string | null;
}

export interface CourtsAnalytics {
  totalCourts: number;
  totalLocations: number;
  bookings30d: number;
  gmv30d: number;
  utilizationPct: number;
  dailySeries: ChartPoint[];
  topCourts: CourtAnalyticsRow[];
  courts: CourtAnalyticsRow[];
}

export interface CourtManagerAnalyticsRow {
  id: string;
  managerName: string;
  managerEmail: string;
  courtId: string;
  courtName: string;
  ownerId: string;
  ownerName: string;
  status: CourtManagerStatus;
  assignedAt: string | null;
}

export interface CourtManagersAnalytics {
  activeManagers: number;
  pendingInvites: number;
  pendingApprovals: number;
  courtsWithManager: number;
  courtsWithoutManager: number;
  byStatus: ChartPoint[];
  assignments: CourtManagerAnalyticsRow[];
}

const resolveDisplayName = (profile: {
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  id: string;
}) => {
  const fullName = profile.full_name?.trim();
  if (fullName) return fullName;
  const username = profile.username?.trim();
  if (username) return username;
  const email = profile.email?.trim();
  if (email) return email.split('@')[0];
  return `User ${profile.id.slice(0, 8)}`;
};

const daysAgoIso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
};

const dateOnlyDaysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

export async function fetchUserGrowthSeries(range: GrowthRange = '1M'): Promise<{
  series: ChartPoint[];
  changePct: number | null;
}> {
  const now = new Date();
  let startDate = new Date();
  let granularity: 'day' | 'week' | 'month' = 'month';

  if (range === '7D') {
    startDate.setDate(now.getDate() - 7);
    granularity = 'day';
  } else if (range === '1M') {
    startDate.setMonth(now.getMonth() - 1);
    granularity = 'week';
  } else if (range === '6M') {
    startDate.setMonth(now.getMonth() - 6);
    granularity = 'month';
  } else {
    startDate.setFullYear(now.getFullYear() - 1);
    granularity = 'month';
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const labels: string[] = [];
  const tempDate = new Date(startDate);

  while (tempDate <= now) {
    if (granularity === 'day') {
      labels.push(tempDate.toLocaleDateString([], { weekday: 'short' }));
      tempDate.setDate(tempDate.getDate() + 1);
    } else if (granularity === 'week') {
      labels.push(`W${Math.ceil(tempDate.getDate() / 7)}`);
      tempDate.setDate(tempDate.getDate() + 7);
    } else {
      labels.push(months[tempDate.getMonth()]);
      tempDate.setMonth(tempDate.getMonth() + 1);
    }
  }

  const uniqueLabels = [...new Set(labels)];

  const { count: baselineCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .lt('created_at', startDate.toISOString());

  let cumulative = baselineCount || 0;
  const counts: Record<string, number> = {};
  uniqueLabels.forEach((label) => {
    counts[label] = 0;
  });

  (profiles || []).forEach((p) => {
    const d = new Date(p.created_at);
    let label = '';
    if (granularity === 'day') label = d.toLocaleDateString([], { weekday: 'short' });
    else if (granularity === 'week') label = `W${Math.ceil(d.getDate() / 7)}`;
    else label = months[d.getMonth()];
    if (label in counts) counts[label] += 1;
  });

  const series: ChartPoint[] = uniqueLabels.map((name) => {
    cumulative += counts[name] || 0;
    return { name, value: cumulative };
  });

  let changePct: number | null = null;
  if (series.length >= 2) {
    const first = series[0].value;
    const last = series[series.length - 1].value;
    if (first > 0) changePct = Math.round(((last - first) / first) * 100);
    else if (last > 0) changePct = 100;
    else changePct = 0;
  }

  return { series, changePct };
}

export async function fetchPlatformOverview(): Promise<PlatformOverviewMetrics> {
  const oneDayAgo = daysAgoIso(1);
  const thirtyDaysAgoDate = dateOnlyDaysAgo(30);

  const [
    totalUsersRes,
    activeRes,
    courtsRes,
    bookingsRes,
    verificationsRes,
    managersPendingRes,
    growth,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gt('updated_at', oneDayAgo),
    supabase.from('courts').select('*', { count: 'exact', head: true }),
    supabase
      .from('bookings')
      .select('total_price, status')
      .gte('date', thirtyDaysAgoDate)
      .in('status', ['confirmed', 'completed']),
    supabase
      .from('court_owner_verifications')
      .select('id', { count: 'exact', head: true })
      .in('status', ['PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUESTED']),
    supabase
      .from('court_manager_assignments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending_invite', 'pending_approval']),
    fetchUserGrowthSeries('1M'),
  ]);

  const bookings = bookingsRes.data || [];
  const gmv30d = bookings.reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  return {
    totalUsers: totalUsersRes.count ?? 0,
    activeUsers24h: activeRes.count ?? 0,
    totalCourts: courtsRes.count ?? 0,
    bookings30d: bookings.length,
    gmv30d,
    pendingVerifications: verificationsRes.count ?? 0,
    pendingManagers: managersPendingRes.count ?? 0,
    userGrowth: growth.series,
    usersChangePct: growth.changePct,
  };
}

export async function fetchUserAnalytics(): Promise<UserAnalytics> {
  const [{ count: total }, { data: profiles }, growth] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('profiles').select('active_role, account_status').is('deleted_at', null),
    fetchUserGrowthSeries('1M'),
  ]);

  const byRoleMap: Record<string, number> = {};
  let suspended = 0;

  (profiles || []).forEach((p) => {
    const role = (p.active_role || 'PLAYER') as string;
    byRoleMap[role] = (byRoleMap[role] || 0) + 1;
    const status = String(p.account_status || 'Active').toLowerCase();
    if (status === 'suspended') suspended += 1;
  });

  const byRole = Object.entries(byRoleMap)
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: total ?? profiles?.length ?? 0,
    suspended,
    byRole,
    growth: growth.series,
  };
}

export async function fetchCourtsAnalytics(): Promise<CourtsAnalytics> {
  const thirtyDaysAgo = dateOnlyDaysAgo(30);
  const fourteenDaysAgo = dateOnlyDaysAgo(14);

  const [courtsRes, locationsRes, bookingsRes] = await Promise.all([
    supabase
      .from('courts')
      .select('id, name, owner_id, location_id, num_courts, court_type, created_at, locations(name)')
      .order('created_at', { ascending: false }),
    supabase.from('locations').select('*', { count: 'exact', head: true }),
    supabase
      .from('bookings')
      .select('court_id, total_price, date, status')
      .gte('date', thirtyDaysAgo)
      .in('status', ['confirmed', 'completed', 'pending']),
  ]);

  if (courtsRes.error) throw courtsRes.error;
  if (bookingsRes.error) throw bookingsRes.error;

  const courtsRaw = courtsRes.data || [];
  const bookings = bookingsRes.data || [];
  const ownerIds = [...new Set(courtsRaw.map((c) => c.owner_id).filter(Boolean))];

  const ownerNameMap: Record<string, string> = {};
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name, username, email')
      .in('id', ownerIds);
    (owners || []).forEach((o) => {
      ownerNameMap[o.id] = resolveDisplayName(o);
    });
  }

  const bookingStats: Record<string, { count: number; revenue: number }> = {};
  let gmv30d = 0;
  let bookings30d = 0;

  bookings.forEach((b) => {
    if (b.status === 'confirmed' || b.status === 'completed') {
      bookings30d += 1;
      gmv30d += Number(b.total_price || 0);
    }
    if (!b.court_id) return;
    if (!bookingStats[b.court_id]) bookingStats[b.court_id] = { count: 0, revenue: 0 };
    bookingStats[b.court_id].count += 1;
    if (b.status === 'confirmed' || b.status === 'completed') {
      bookingStats[b.court_id].revenue += Number(b.total_price || 0);
    }
  });

  const courts: CourtAnalyticsRow[] = courtsRaw.map((c) => {
    const loc = c.locations as { name?: string } | { name?: string }[] | null;
    const locationName = Array.isArray(loc) ? loc[0]?.name || '—' : loc?.name || '—';
    const stats = bookingStats[c.id] || { count: 0, revenue: 0 };
    return {
      id: c.id,
      name: c.name || 'Untitled Court',
      ownerId: c.owner_id,
      ownerName: ownerNameMap[c.owner_id] || 'Unknown',
      locationName,
      courtType: c.court_type || null,
      numCourts: c.num_courts || 1,
      bookingCount: stats.count,
      revenue: stats.revenue,
      createdAt: c.created_at || null,
    };
  });

  const totalCourtUnits = courts.reduce((sum, c) => sum + (c.numCourts || 1), 0);
  const totalAvailableSlots = totalCourtUnits * 10;
  const utilizationPct =
    totalAvailableSlots > 0 ? Math.min(100, Math.round((bookings30d / totalAvailableSlots) * 100)) : 0;

  const dailyMap: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    dailyMap[key] = 0;
  }

  bookings.forEach((b) => {
    if (!b.date || b.date < fourteenDaysAgo) return;
    if (b.status !== 'confirmed' && b.status !== 'completed') return;
    if (b.date in dailyMap) dailyMap[b.date] += 1;
  });

  const dailySeries: ChartPoint[] = Object.entries(dailyMap).map(([date, value]) => ({
    name: new Date(date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value,
  }));

  const topCourts = [...courts].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  return {
    totalCourts: courts.length,
    totalLocations: locationsRes.count ?? 0,
    bookings30d,
    gmv30d,
    utilizationPct,
    dailySeries,
    topCourts,
    courts,
  };
}

export async function fetchCourtManagersAnalytics(): Promise<CourtManagersAnalytics> {
  const [assignmentsRes, courtsRes] = await Promise.all([
    supabase
      .from('court_manager_assignments')
      .select('*, courts(id, name, owner_id)')
      .order('created_at', { ascending: false }),
    supabase.from('courts').select('id'),
  ]);

  if (assignmentsRes.error) throw assignmentsRes.error;

  const assignmentsRaw = assignmentsRes.data || [];
  const allCourtIds = (courtsRes.data || []).map((c) => c.id);
  const ownerIds = [
    ...new Set(
      assignmentsRaw
        .map((a) => a.owner_id || (a.courts as { owner_id?: string } | null)?.owner_id)
        .filter(Boolean) as string[]
    ),
  ];

  const ownerNameMap: Record<string, string> = {};
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name, username, email')
      .in('id', ownerIds);
    (owners || []).forEach((o) => {
      ownerNameMap[o.id] = resolveDisplayName(o);
    });
  }

  let activeManagers = 0;
  let pendingInvites = 0;
  let pendingApprovals = 0;
  const courtsWithActive = new Set<string>();
  const statusCounts: Record<string, number> = {
    active: 0,
    pending_invite: 0,
    pending_approval: 0,
    removed: 0,
  };

  const assignments: CourtManagerAnalyticsRow[] = assignmentsRaw.map((a) => {
    const court = a.courts as { id?: string; name?: string; owner_id?: string } | { id?: string; name?: string; owner_id?: string }[] | null;
    const courtObj = Array.isArray(court) ? court[0] : court;
    const status = (a.status || 'removed') as CourtManagerStatus;
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    if (status === 'active') {
      activeManagers += 1;
      if (a.court_id) courtsWithActive.add(a.court_id);
    } else if (status === 'pending_invite') {
      pendingInvites += 1;
    } else if (status === 'pending_approval') {
      pendingApprovals += 1;
    }

    const ownerId = a.owner_id || courtObj?.owner_id || '';
    return {
      id: a.id,
      managerName: a.manager_name || '—',
      managerEmail: a.manager_email || '—',
      courtId: a.court_id,
      courtName: courtObj?.name || 'Unknown Court',
      ownerId,
      ownerName: ownerNameMap[ownerId] || 'Unknown',
      status,
      assignedAt: a.created_at || a.approved_at || null,
    };
  });

  const byStatus: ChartPoint[] = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
    }));

  return {
    activeManagers,
    pendingInvites,
    pendingApprovals,
    courtsWithManager: courtsWithActive.size,
    courtsWithoutManager: Math.max(0, allCourtIds.length - courtsWithActive.size),
    byStatus,
    assignments,
  };
}
