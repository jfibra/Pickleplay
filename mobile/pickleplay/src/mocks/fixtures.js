/**
 * Sample data for prototype mode, used only when EXPO_PUBLIC_USE_MOCKS=true.
 *
 * createFixtures() returns fresh tables for the in-memory Supabase client (mockSupabase.js), which
 * mutates them. Rows carry the plain columns the screens read plus the *_id foreign keys the client
 * follows to resolve embeds such as `profiles:player_id ( full_name )` or `courts(*)`.
 *
 * Column names follow what the screens read. Where the mobile code and the real schema
 * (web/DATABASE_SCHEMA.md) disagree, rows carry both spellings with the same value, e.g. courts
 * base_price / price_per_hour and num_courts / number_of_courts, bookings player_id / user_id,
 * date / booking_date and total_price / total_amount, profiles status / account_status and
 * phone / phone_number. A few columns exist only because screens read them (profiles.skill_level,
 * courts.location / city / address). Dates are relative to now, so upcoming items stay upcoming.
 */
import { MOCK_ACCOUNTS } from './accounts';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** ISO timestamp n days from now at the given local time. */
function daysFromNow(n, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** 'YYYY-MM-DD' n days from today, the same way screens compute today (`toISOString().split('T')[0]`). */
function dateOnly(n) {
  return new Date(Date.now() + n * DAY).toISOString().slice(0, 10);
}

/** ISO timestamp h hours ago. */
function hoursAgo(h) {
  return new Date(Date.now() - h * HOUR).toISOString();
}

/** 'HH:00:00', the time format bookings use. */
const clock = (hour) => `${String(hour).padStart(2, '0')}:00:00`;

const photo = (id, w = 800) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=${w}`;
const avatar = (id) => photo(id, 150);

const ID = {
  player: MOCK_ACCOUNTS.player.id,
  coach: MOCK_ACCOUNTS.coach.id,
  owner: MOCK_ACCOUNTS.owner.id,
  manager: MOCK_ACCOUNTS.manager.id,
  admin: MOCK_ACCOUNTS.admin.id,
  // Community members without a login.
  bea: '00000000-0000-4000-c000-000000000011',
  miguel: '00000000-0000-4000-c000-000000000012',
  trisha: '00000000-0000-4000-c000-000000000013',
  josh: '00000000-0000-4000-c000-000000000014',
  liza: '00000000-0000-4000-c000-000000000015',
  kevin: '00000000-0000-4000-c000-000000000016',
};

/** Fills the long tail of profile columns; `p` holds what differs per person. */
function makeProfile(p) {
  const [firstName, ...rest] = p.full_name.split(' ');
  const played = p.matches_played || 0;
  const won = p.matches_won || 0;
  return {
    first_name: firstName,
    last_name: rest.join(' '),
    active_role: 'PLAYER',
    avatar_url: null,
    bio: null,
    phone_number: p.phone, // PersonalInformationScreen reads phone_number, ProfileScreen reads phone
    skill_rating: p.skill_level, // the real schema's quiz label; screens read skill_level
    skill_rating_updated_at: p.created_at,
    specialization: null, // CoachesScreen filters coaches on this
    experience_years: 0,
    rating: null,
    matches_lost: played - won,
    win_rate: played ? Math.round((won / played) * 1000) / 10 : 0,
    tournaments_played: 0, tournaments_won: 0, bookings_completed: 0, points: 0,
    profile_visibility: 'public',
    availability_status: 'offline', availability_start: null, availability_end: null, availability_note: null,
    preferred_location_ids: [], preferred_court_ids: [], preferred_skill_min: null, preferred_skill_max: null,
    preferred_court_type: 'Both',
    referred_by_id: null,
    followed_tags: [],
    terms_accepted_at: p.created_at,
    phone_verified: true, id_verified: false, id_document_url: null, skill_verified: false, skill_verified_by: null,
    no_show_count: 0, late_cancel_count: 0,
    player_endorsements: 0, player_review_count: 0, player_avg_rating: null,
    professional_status: null, // 'PENDING' | 'VERIFIED', read by CoachScreen and CourtOwnerScreen
    professional_type: null, // 'COACH' | 'COURT_OWNER'
    status: 'active', // userService writes status; the real schema calls it account_status
    account_status: 'Active',
    deleted_at: null, deleted_by: null, deletion_reason: null,
    updated_at: p.created_at,
    ...p,
  };
}

export function createFixtures() {
  const A = MOCK_ACCOUNTS;

  /* ---------- profiles ---------- */

  const profiles = [
    makeProfile({
      id: ID.player, email: A.player.email, full_name: A.player.fullName, username: 'paolo.reyes', roles: [...A.player.roles],
      avatar_url: avatar('1507003211169-0a1dd7228f2d'),
      bio: 'Weekend warrior turned weeknight regular. Working on my third-shot drop.',
      location: 'Taguig City', phone: '+63 917 555 0101', gender: 'male', date_of_birth: '1994-03-18', playing_since: '2023-02-01',
      dupr_rating: 3.62, skill_level: 'Intermediate', play_frequency: '3-4 times a week', availability_status: 'available',
      matches_played: 48, matches_won: 27, tournaments_played: 3, tournaments_won: 1, bookings_completed: 14,
      points: 1250, referral_code: 'PAOLO-7K2Q', created_at: daysFromNow(-210),
    }),
    makeProfile({
      id: ID.coach, email: A.coach.email, full_name: A.coach.fullName, username: 'coach.mika', roles: [...A.coach.roles],
      avatar_url: avatar('1494790108377-be9c29b29330'),
      bio: 'PPR-certified coach. I help 3.0-4.0 players fix their soft game and win more points at the kitchen line.',
      location: 'Makati City', phone: '+63 917 555 0102', gender: 'female', date_of_birth: '1991-07-02', playing_since: '2018-05-01',
      dupr_rating: 4.85, skill_level: 'Advanced', play_frequency: 'Daily', specialization: 'Intermediate', experience_years: 6,
      matches_played: 210, matches_won: 158, tournaments_played: 22, tournaments_won: 9, bookings_completed: 64,
      points: 4800, referral_code: 'MIKA-COACH', professional_status: 'VERIFIED', professional_type: 'COACH',
      skill_verified: true, id_verified: true, created_at: daysFromNow(-400),
    }),
    makeProfile({
      id: ID.owner, email: A.owner.email, full_name: A.owner.fullName, username: 'carlo.courts', roles: [...A.owner.roles],
      avatar_url: avatar('1500648767791-00dcc994a43e'),
      bio: 'Running four venues across Metro Manila. Always looking for feedback on our courts.',
      location: 'Pasig City', phone: '+63 917 555 0103', gender: 'male', date_of_birth: '1986-11-25', playing_since: '2021-09-01',
      dupr_rating: 3.4, skill_level: 'Intermediate', play_frequency: '1-2 times a week',
      matches_played: 30, matches_won: 16, tournaments_played: 1, bookings_completed: 9,
      points: 900, referral_code: 'CARLO-8OWN', professional_status: 'VERIFIED', professional_type: 'COURT_OWNER',
      id_verified: true, created_at: daysFromNow(-380),
    }),
    makeProfile({
      id: ID.manager, email: A.manager.email, full_name: A.manager.fullName, username: 'jenny.lim', roles: [...A.manager.roles],
      bio: 'Front desk at BGC Pickle Hub by day, kitchen-line grinder by night.',
      location: 'Taguig City', phone: '+63 917 555 0104', gender: 'female', date_of_birth: '1997-01-09', playing_since: '2024-01-15',
      dupr_rating: 2.9, skill_level: 'Beginner', play_frequency: '1-2 times a week',
      matches_played: 22, matches_won: 10, tournaments_played: 1, bookings_completed: 11,
      points: 640, referral_code: 'JENNY-5LIM', created_at: daysFromNow(-150),
    }),
    makeProfile({
      id: ID.admin, email: A.admin.email, full_name: A.admin.fullName, username: 'ana.v', roles: [...A.admin.roles],
      avatar_url: avatar('1438761681033-6461ffad8d80'),
      bio: 'PicklePlay community team. Say hi at the next open play!',
      location: 'Makati City', phone: '+63 917 555 0105', gender: 'female', date_of_birth: '1990-09-14', playing_since: '2022-03-01',
      dupr_rating: 3.9, skill_level: 'Intermediate', play_frequency: '3-4 times a week',
      matches_played: 75, matches_won: 44, tournaments_played: 5, tournaments_won: 1, bookings_completed: 20,
      points: 2100, referral_code: 'ANA-3ADMN', created_at: daysFromNow(-500),
    }),
    makeProfile({
      id: ID.bea, email: 'bea.garcia@example.com', full_name: 'Bea Garcia', username: 'bea.g', roles: ['PLAYER'],
      avatar_url: avatar('1544005313-94ddf0286df2'),
      bio: 'Lefty. Loves a long dink rally. Captain of BGC Dinkers.',
      location: 'Taguig City', phone: '+63 917 555 0111', gender: 'female', date_of_birth: '1996-05-21', playing_since: '2022-06-01',
      dupr_rating: 3.95, skill_level: 'Intermediate', play_frequency: '3-4 times a week', availability_status: 'available',
      matches_played: 96, matches_won: 57, tournaments_played: 6, tournaments_won: 2, bookings_completed: 31,
      points: 2650, referral_code: 'BEA-9DINK', created_at: daysFromNow(-300),
    }),
    makeProfile({
      id: ID.miguel, email: 'miguel.torres@example.com', full_name: 'Miguel Torres', username: 'coachmigs', roles: ['PLAYER', 'COACH'],
      avatar_url: avatar('1506794778202-cad84cf45f1d'),
      bio: 'Former tennis pro, now full-time pickleball coach. Advanced tactics, stacking and tournament prep.',
      location: 'Makati City', phone: '+63 917 555 0112', gender: 'male', date_of_birth: '1988-02-27', playing_since: '2017-01-01',
      dupr_rating: 5.1, skill_level: 'Advanced', play_frequency: 'Daily', specialization: 'Advanced', experience_years: 9,
      matches_played: 320, matches_won: 251, tournaments_played: 35, tournaments_won: 14, bookings_completed: 88,
      points: 6200, referral_code: 'MIGS-5PRO', professional_status: 'VERIFIED', professional_type: 'COACH',
      skill_verified: true, id_verified: true, created_at: daysFromNow(-460),
    }),
    makeProfile({
      id: ID.trisha, email: 'trisha.ramos@example.com', full_name: 'Trisha Ramos', username: 'trish.r', roles: ['PLAYER'],
      bio: 'UP Diliman grad student. 6 AM sessions are my therapy. Applying to coach beginners!',
      location: 'Quezon City', phone: '+63 917 555 0113', gender: 'female', date_of_birth: '1999-12-03', playing_since: '2023-08-01',
      dupr_rating: 3.3, skill_level: 'Intermediate', play_frequency: '3-4 times a week',
      matches_played: 41, matches_won: 20, tournaments_played: 2, tournaments_won: 1, bookings_completed: 12,
      points: 980, referral_code: 'TRISH-2QC', professional_status: 'PENDING', professional_type: 'COACH',
      created_at: daysFromNow(-190),
    }),
    makeProfile({
      id: ID.josh, email: 'josh.navarro@example.com', full_name: 'Josh Navarro', username: 'josh.nav', roles: ['PLAYER'],
      avatar_url: avatar('1633332755192-727a05c4013d'),
      bio: 'Cebu crew. Hard drives, fast hands, zero chill.',
      location: 'Cebu City', phone: '+63 917 555 0114', gender: 'male', date_of_birth: '1993-08-11', playing_since: '2021-04-01',
      dupr_rating: 4.2, skill_level: 'Advanced', play_frequency: 'Daily', availability_status: 'available',
      matches_played: 120, matches_won: 78, tournaments_played: 9, tournaments_won: 3, bookings_completed: 40,
      points: 3300, referral_code: 'JOSH-6CEB', created_at: daysFromNow(-260),
    }),
    makeProfile({
      id: ID.liza, email: 'liza.delacruz@example.com', full_name: 'Liza Dela Cruz', username: 'coach.liza', roles: ['PLAYER', 'COACH'],
      avatar_url: avatar('1534528741775-53994a69daeb'),
      bio: 'Patient coach for first-timers, juniors and seniors. Fundamentals first, fun always.',
      location: 'Muntinlupa City', phone: '+63 917 555 0115', gender: 'female', date_of_birth: '1992-04-30', playing_since: '2019-10-01',
      dupr_rating: 4.4, skill_level: 'Advanced', play_frequency: 'Daily', specialization: 'Beginner', experience_years: 4,
      matches_played: 150, matches_won: 101, tournaments_played: 12, tournaments_won: 4, bookings_completed: 50,
      points: 3900, referral_code: 'LIZA-1KID', professional_status: 'VERIFIED', professional_type: 'COACH',
      skill_verified: true, created_at: daysFromNow(-330),
    }),
    makeProfile({
      id: ID.kevin, email: 'kevin.tan@example.com', full_name: 'Kevin Tan', username: 'kevin.tan', roles: ['PLAYER', 'COURT_OWNER'],
      bio: 'Owner of Lahug Pickle Yard and Mandaue Paddle Club. Growing the game in Cebu.',
      location: 'Cebu City', phone: '+63 917 555 0116', gender: 'male', date_of_birth: '1985-06-17', playing_since: '2022-01-01',
      dupr_rating: 3.7, skill_level: 'Intermediate', play_frequency: '1-2 times a week',
      matches_played: 55, matches_won: 30, tournaments_played: 2, bookings_completed: 15,
      points: 1100, referral_code: 'KEVIN-4CEB', professional_status: 'VERIFIED', professional_type: 'COURT_OWNER',
      id_verified: true, created_at: daysFromNow(-280),
    }),
  ];
  const profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));

  /* ---------- locations and courts (one location per court, as CourtFormModal creates them) ---------- */

  const venues = [
    {
      key: 'bgc-1', owner: ID.owner, name: 'BGC Pickle Hub', area: 'Bonifacio Global City, Taguig',
      address: '28th St. cor. 7th Ave., Bonifacio Global City', barangay: 'Fort Bonifacio', city: 'Taguig',
      state: 'Metro Manila', region: 'NCR', postal: '1634', lat: 14.5512, lng: 121.0497,
      type: 'Indoor', surface: 'acrylic', courts: 4, price: 600, hours: 'Daily 6:00 AM - 11:00 PM', open: '06:00', close: '23:00',
      amenities: ['Air-conditioned', 'Parking', 'Showers', 'Pro Shop', 'Paddle Rental'],
      phone: '+63 2 8555 0110', email: 'bookings@bgcpicklehub.example.com', website: 'https://bgcpicklehub.example.com',
      images: ['1599586120429-48281b6f0ece', '1626224583764-f87db24ac4ea'], age: 240,
      description: 'Four air-conditioned indoor courts in the heart of BGC with tournament-grade acrylic surfaces, LED lighting and a pro shop.',
    },
    {
      key: 'makati-1', owner: ID.owner, name: 'Legazpi Village Dink Club', area: 'Legazpi Village, Makati',
      address: 'Rufino St., Legazpi Village', barangay: 'San Lorenzo', city: 'Makati',
      state: 'Metro Manila', region: 'NCR', postal: '1229', lat: 14.5547, lng: 121.017,
      type: 'Indoor', surface: 'hardwood', courts: 3, price: 550, hours: 'Daily 7:00 AM - 10:00 PM', open: '07:00', close: '22:00',
      amenities: ['Air-conditioned', 'Restrooms', 'Lockers', 'Cafe'],
      phone: '+63 2 8555 0120', email: 'play@legazpidink.example.com', website: null,
      images: ['1626224583764-f87db24ac4ea', '1511067007398-7e4b90cfa4bc'], age: 200,
      description: 'A converted warehouse with three hardwood courts a short walk from the Legazpi Sunday Market. Popular with the after-work crowd.',
    },
    {
      key: 'pasig-1', owner: ID.owner, name: 'Kapitolyo Pickleball Center', area: 'Kapitolyo, Pasig',
      address: 'East Capitol Dr., Kapitolyo', barangay: 'Kapitolyo', city: 'Pasig',
      state: 'Metro Manila', region: 'NCR', postal: '1603', lat: 14.5672, lng: 121.0601,
      type: 'Indoor', surface: 'acrylic', courts: 3, price: 480, hours: 'Daily 6:00 AM - 11:00 PM', open: '06:00', close: '23:00',
      amenities: ['Lights', 'Parking', 'Restrooms', 'Water Station'],
      phone: '+63 2 8555 0130', email: 'hello@kapitolyopickle.example.com', website: 'https://kapitolyopickle.example.com',
      images: ['1511067007398-7e4b90cfa4bc', '1554068865-24cecd4e34b8'], age: 150,
      description: 'Neighborhood indoor courts surrounded by Kapitolyo food spots. Sunday open play is the friendliest in the east.',
    },
    {
      key: 'alabang-1', owner: ID.owner, name: 'Alabang Paddle Park', area: 'Ayala Alabang, Muntinlupa',
      address: 'Madrigal Ave., Ayala Alabang', barangay: 'Ayala Alabang', city: 'Muntinlupa',
      state: 'Metro Manila', region: 'NCR', postal: '1780', lat: 14.4195, lng: 121.0261,
      type: 'Outdoor', surface: 'sport_court', courts: 4, price: 400, hours: 'Daily 6:00 AM - 9:00 PM', open: '06:00', close: '21:00',
      amenities: ['Lights', 'Parking', 'Shaded Seating', 'Restrooms', 'Kids Area'],
      phone: '+63 2 8555 0140', email: 'courts@alabangpaddle.example.com', website: null,
      images: ['1554068865-24cecd4e34b8', '1599586120429-48281b6f0ece'], age: 90,
      description: 'Four shaded outdoor courts with wind screens, a kids corner and plenty of parking in Ayala Alabang.',
    },
    {
      key: 'qc-1', owner: null, name: 'Diliman Community Courts', area: 'Teachers Village, Quezon City',
      address: 'Maginhawa St., Teachers Village', barangay: 'Teachers Village East', city: 'Quezon City',
      state: 'Metro Manila', region: 'NCR', postal: '1101', lat: 14.6448, lng: 121.0614,
      type: 'Outdoor', surface: 'concrete', courts: 2, price: 0, hours: 'Daily 5:00 AM - 9:00 PM', open: '05:00', close: '21:00',
      amenities: ['Lights', 'Restrooms'],
      phone: '+63 2 8555 0150', email: null, website: null,
      images: ['1560743641-3914f2c45636'], age: 400,
      description: 'Two free public courts maintained by the barangay. First come, first served; lights stay on until 9 PM.',
    },
    {
      key: 'cebu-1', owner: ID.kevin, name: 'Lahug Pickle Yard', area: 'Lahug, Cebu City',
      address: 'Salinas Dr., Lahug', barangay: 'Lahug', city: 'Cebu City',
      state: 'Cebu', region: 'Central Visayas', postal: '6000', lat: 10.3304, lng: 123.9058,
      type: 'Outdoor', surface: 'acrylic', courts: 3, price: 350, hours: 'Daily 6:00 AM - 10:00 PM', open: '06:00', close: '22:00',
      amenities: ['Lights', 'Snack Bar', 'Restrooms', 'Paddle Rental'],
      phone: '+63 32 555 0161', email: 'yard@lahugpickle.example.com', website: null,
      images: ['1593113598332-cd288d649433', '1622279457486-62dcc4a431d6'], age: 260,
      description: 'Open-air courts near the IT Park with a snack counter and a lively Wednesday night open play.',
    },
    {
      key: 'cebu-2', owner: ID.kevin, name: 'Mandaue Paddle Club', area: 'Banilad, Mandaue City',
      address: 'A.S. Fortuna St., Banilad', barangay: 'Banilad', city: 'Mandaue City',
      state: 'Cebu', region: 'Central Visayas', postal: '6014', lat: 10.334, lng: 123.922,
      type: 'Indoor', surface: 'acrylic', courts: 2, price: 420, hours: 'Daily 8:00 AM - 11:00 PM', open: '08:00', close: '23:00',
      amenities: ['Air-conditioned', 'Paddle Rental', 'Parking'],
      phone: '+63 32 555 0162', email: 'club@mandauepaddle.example.com', website: 'https://mandauepaddle.example.com',
      images: ['1622279457486-62dcc4a431d6', '1593113598332-cd288d649433'], age: 120,
      description: 'Air-conditioned indoor courts with paddle rentals, open late on weekdays.',
    },
  ];

  const locations = venues.map((v) => ({
    id: `location-${v.key}`,
    owner_id: v.owner,
    name: v.name,
    description: v.description,
    address: v.address,
    city: v.city,
    state: v.state,
    postal_code: v.postal,
    latitude: v.lat,
    longitude: v.lng,
    amenities: [...v.amenities],
    phone: v.phone,
    base_cleaning_time: 10,
    is_active: true,
    court_type: v.type,
    image_url: photo(v.images[0]),
    region: v.region,
    barangay: v.barangay,
    status: 'Active',
    opening_time: v.open,
    closing_time: v.close,
    google_place_id: null,
    google_rating: null,
    google_rating_count: null,
    source: 'manual',
    created_at: daysFromNow(-v.age),
    updated_at: daysFromNow(-Math.min(v.age, 14)),
  }));

  const courts = venues.map((v) => ({
    id: `court-${v.key}`,
    owner_id: v.owner,
    location_id: `location-${v.key}`,
    name: v.name,
    description: v.description,
    // Flat copies of the location that screens read off the court row (not in the real schema).
    // getCourts() replaces `location` with the embedded location object.
    location: v.area,
    address: v.address,
    city: v.city,
    country: 'Philippines',
    latitude: v.lat,
    longitude: v.lng,
    num_courts: v.courts,
    number_of_courts: v.courts,
    surface_type: v.surface,
    surface: v.surface,
    court_type: v.type,
    type: v.type,
    base_price: v.price,
    price_per_hour: v.price,
    is_free: v.price === 0,
    requires_booking: v.price > 0,
    amenities: [...v.amenities],
    hours_of_operation: v.hours,
    phone_number: v.phone,
    email: v.email,
    website: v.website,
    image_url: photo(v.images[0]),
    cover_image: photo(v.images[0]),
    images: v.images.map((id) => photo(id)),
    cleaning_time_minutes: 10,
    is_active: true,
    status: 'Available',
    created_at: daysFromNow(-v.age),
    updated_at: daysFromNow(-Math.min(v.age, 14)),
  }));
  const courtById = Object.fromEntries(courts.map((c) => [c.id, c]));
  const placeOf = (courtId) => `${courtById[courtId].name}, ${courtById[courtId].city}`;

  /* ---------- bookings ---------- */

  // Total = court fee + 10% service fee, as BookingScreen charges.
  const booking = (id, courtKey, playerId, day, hour, status, payment, bookedDaysBefore = 3) => {
    const courtId = `court-${courtKey}`;
    const total = Math.round(courtById[courtId].base_price * 110) / 100;
    const date = dateOnly(day);
    const createdAt = daysFromNow(Math.min(day, 0) - bookedDaysBefore, 12, 30);
    return {
      id,
      court_id: courtId,
      player_id: playerId,
      user_id: playerId,
      date,
      booking_date: date,
      start_time: clock(hour),
      end_time: clock(hour + 1),
      total_price: total,
      total_amount: total,
      status,
      payment_status: payment,
      payment_method: payment === 'unpaid' ? 'cash' : 'gcash',
      is_checked_in: status === 'completed',
      notes: null,
      cancelled_reason: status === 'cancelled' ? 'Schedule conflict at work' : null,
      cancelled_at: status === 'cancelled' ? daysFromNow(day - 1, 18) : null,
      amount_tendered: null,
      change_amount: null,
      created_at: createdAt,
      updated_at: createdAt,
    };
  };

  const bookings = [
    // The player: two upcoming, two past.
    booking('bk-1001', 'bgc-1', ID.player, 2, 18, 'confirmed', 'paid'),
    booking('bk-1002', 'makati-1', ID.player, 5, 7, 'pending', 'unpaid', 1),
    booking('bk-1003', 'pasig-1', ID.player, -6, 19, 'completed', 'paid'),
    booking('bk-1004', 'bgc-1', ID.player, -13, 8, 'completed', 'paid', 5),
    // Other members at the owner's courts.
    booking('bk-1005', 'bgc-1', ID.bea, 1, 19, 'confirmed', 'paid'),
    booking('bk-1006', 'bgc-1', ID.trisha, 3, 6, 'confirmed', 'paid'),
    booking('bk-1007', 'makati-1', ID.miguel, 2, 17, 'confirmed', 'paid'),
    booking('bk-1008', 'pasig-1', ID.manager, 4, 20, 'pending', 'unpaid', 1),
    booking('bk-1009', 'alabang-1', ID.bea, -3, 16, 'completed', 'paid'),
    booking('bk-1010', 'bgc-1', ID.coach, -2, 9, 'completed', 'paid'),
    booking('bk-1011', 'makati-1', ID.admin, -8, 18, 'cancelled', 'refunded'),
    booking('bk-1012', 'alabang-1', ID.liza, 6, 15, 'confirmed', 'paid'),
    // Kevin's Cebu courts.
    booking('bk-1013', 'cebu-1', ID.josh, 1, 17, 'confirmed', 'paid'),
    booking('bk-1014', 'cebu-2', ID.josh, -4, 18, 'completed', 'paid'),
  ];

  /* ---------- court reviews ---------- */

  const courtReview = (id, courtKey, userId, rating, title, comment, daysAgo, bookingId = null) => ({
    id,
    court_id: `court-${courtKey}`,
    user_id: userId,
    booking_id: bookingId,
    rating,
    title,
    comment,
    created_at: daysFromNow(-daysAgo, 21),
  });

  const court_reviews = [
    courtReview('review-01', 'bgc-1', ID.player, 5, 'Worth every peso', 'The air-con actually works and the acrylic surface plays true. Already booked again.', 12, 'bk-1004'),
    courtReview('review-02', 'bgc-1', ID.bea, 4, 'Great courts, busy evenings', 'Excellent lights and surface. Weeknights after 7 fill up fast, so book early.', 20),
    courtReview('review-03', 'bgc-1', ID.coach, 5, 'My go-to for lessons', 'Clean, quiet, and the staff help set up the ball machine for drills.', 2, 'bk-1010'),
    courtReview('review-04', 'makati-1', ID.admin, 4, 'Solid indoor option in Makati', 'Good bounce and easy parking. Wish they had showers.', 40),
    courtReview('review-05', 'makati-1', ID.miguel, 5, 'Tournament-grade', 'Consistent bounce on every court. Perfect for advanced drills.', 25),
    courtReview('review-06', 'pasig-1', ID.trisha, 4, 'Friendly Kapitolyo crowd', 'Sunday open play is a great way to meet people, and the food stalls nearby are a bonus.', 15),
    courtReview('review-07', 'alabang-1', ID.bea, 4, 'Breezy outdoor courts', 'Nice wind screens and shade. Gets hot around noon, so go early.', 3, 'bk-1009'),
    courtReview('review-08', 'qc-1', ID.trisha, 3, 'Free but crowded', 'Great that it is free, but expect a wait after 5 PM. Bring your own water.', 30),
    courtReview('review-09', 'qc-1', ID.player, 4, 'Best free courts in QC', 'Super welcoming to beginners and the lights stay on until 9.', 18),
    courtReview('review-10', 'cebu-1', ID.josh, 5, 'Best spot in Cebu', 'Well-kept courts, a nice evening breeze and cold drinks at the counter.', 10),
    courtReview('review-11', 'cebu-2', ID.josh, 4, 'Good courts, tricky parking', 'Great surface and air-con. Parking fills up on weekends.', 4, 'bk-1014'),
  ];

  /* ---------- tournaments ---------- */

  const rosters = {
    'tour-bgc-open': [ID.player, ID.bea, ID.trisha, ID.manager, ID.admin, ID.kevin],
    'tour-cebu-classic': [ID.josh, ID.miguel, ID.liza],
    'tour-makati-mixed': [ID.player, ID.bea, ID.miguel, ID.coach, ID.admin, ID.josh, ID.liza, ID.trisha],
    'tour-qc-round-robin': [ID.player, ID.trisha, ID.manager, ID.owner],
  };

  const tournament = (t) => ({
    owner_id: t.organizer_id,
    location: placeOf(t.court_id),
    location_id: courtById[t.court_id].location_id,
    start_time: '08:00',
    check_in_time: '07:30',
    num_courts: courtById[t.court_id].num_courts,
    registered_count: rosters[t.id].length,
    is_approved: true,
    is_featured: false,
    rules: 'Games to 11, win by 2, side-out scoring. Check in 30 minutes before your first match. USA Pickleball-approved paddles only.',
    registration_mode: 'individual',
    tournament_mode: 'competitive',
    roster_lock_timing: null,
    require_email_verified: true,
    require_phone_verified: false,
    require_id_verified: false,
    require_skill_verified: false,
    updated_at: t.created_at,
    ...t,
  });

  const tournaments = [
    tournament({
      id: 'tour-bgc-open', name: 'BGC Fall Doubles Open', organizer_id: ID.owner, court_id: 'court-bgc-1',
      description: 'Round-robin pools in the morning, single-elimination playoffs after lunch. Partners can register separately.',
      date: daysFromNow(9, 8), registration_deadline: daysFromNow(6, 23, 59), status: 'UPCOMING',
      skill_level: 'Intermediate', category: 'intermediate', format: 'round_robin', event_type: 'doubles', max_players: 32,
      prize_pool: '₱50,000', prizes: 'Gold ₱25,000 · Silver ₱15,000 · Bronze ₱10,000',
      image_url: photo('1626224583764-f87db24ac4ea'), is_featured: true, created_at: daysFromNow(-20),
    }),
    tournament({
      id: 'tour-cebu-classic', name: 'Cebu Island Classic', organizer_id: ID.kevin, court_id: 'court-cebu-1',
      description: 'The biggest pickleball weekend in the Visayas. Double elimination for 4.0+ teams.',
      date: daysFromNow(23, 7), registration_deadline: daysFromNow(16, 23, 59), status: 'UPCOMING',
      skill_level: 'Advanced', category: 'advanced', format: 'double_elim', event_type: 'doubles', max_players: 48,
      prize_pool: '₱80,000', prizes: 'Gold ₱40,000 · Silver ₱25,000 · Bronze ₱15,000',
      image_url: photo('1599586120429-48281b6f0ece'), require_skill_verified: true, created_at: daysFromNow(-14),
    }),
    tournament({
      id: 'tour-makati-mixed', name: 'Makati Mixed Doubles Showdown', organizer_id: ID.owner, court_id: 'court-makati-1',
      description: 'One-day mixed doubles bracket. Matches are running now; follow the live bracket at the front desk.',
      date: daysFromNow(0, 8), registration_deadline: daysFromNow(-3, 23, 59), status: 'LIVE',
      skill_level: 'Open', category: 'open', format: 'single_elim', event_type: 'mixed_doubles', max_players: 16,
      prize_pool: '₱30,000', prizes: 'Champions ₱20,000 · Runners-up ₱10,000',
      image_url: photo('1511067007398-7e4b90cfa4bc'), created_at: daysFromNow(-30),
    }),
    tournament({
      id: 'tour-qc-round-robin', name: 'QC Community Round Robin', organizer_id: ID.admin, court_id: 'court-qc-1',
      description: 'A relaxed community event at the Diliman public courts. Everyone plays at least five games.',
      date: daysFromNow(-12, 7), registration_deadline: daysFromNow(-15, 23, 59), status: 'COMPLETED',
      skill_level: 'Open', category: 'open', format: 'round_robin', event_type: 'doubles', max_players: 12,
      prize_pool: 'Medals + paddle vouchers', prizes: 'Medals for the top three teams, paddle vouchers for the winners',
      image_url: photo('1519315901367-f34ff9154487'), tournament_mode: 'casual', created_at: daysFromNow(-40),
    }),
  ];
  const tournamentById = Object.fromEntries(tournaments.map((t) => [t.id, t]));

  const tournament_registrations = Object.entries(rosters).flatMap(([tournamentId, players]) =>
    players.map((playerId, i) => {
      const t = tournamentById[tournamentId];
      const registeredAt = new Date(new Date(t.created_at).getTime() + (i + 1) * DAY).toISOString();
      return {
        id: `${tournamentId.replace('tour-', 'treg-')}-${i + 1}`,
        tournament_id: tournamentId,
        player_id: playerId,
        status: 'confirmed',
        team_id: null,
        checked_in: t.status !== 'UPCOMING',
        application_message: null,
        rejection_reason: null,
        approved_by: t.organizer_id,
        registered_at: registeredAt,
        registration_date: registeredAt,
        created_at: registeredAt,
      };
    })
  );

  /* ---------- community ---------- */

  const post = (id, profileId, content, ageHours, tags, image = null) => ({
    id,
    profile_id: profileId,
    content,
    image_url: image,
    tags,
    is_edited: false,
    created_at: hoursAgo(ageHours),
    updated_at: hoursAgo(ageHours),
  });

  const community_posts = [
    post('post-01', ID.coach, 'Drill of the week: third-shot drops. Feed 20 balls cross-court from the baseline and count how many land in the kitchen. Aim for 14/20 before taking it to live play.', 3, ['Tips']),
    post('post-02', ID.bea, 'Looking for a doubles partner this Saturday, 7-9 AM at BGC Pickle Hub. DUPR 3.5-4.0, friendly but competitive. Comment below!', 6, ['Looking for Partner']),
    post('post-03', ID.owner, 'New LED lights are up at Kapitolyo Pickleball Center. Night sessions now run until 11 PM, and weekday bookings before 4 PM get 15% off this month.', 26, ['Announcement'], photo('1511067007398-7e4b90cfa4bc')),
    post('post-04', ID.josh, 'Cebu crew! Open play every Wednesday at 6 PM at Lahug Pickle Yard. All levels welcome, we rotate every game.', 50, ['Meetup'], photo('1593113598332-cd288d649433')),
    post('post-05', ID.miguel, 'Clinic recap: most of the points we lost today came from speeding up balls below the net. If it is at your knees, reset it into the kitchen. Patience wins.', 75, ['Tips']),
    post('post-06', ID.trisha, 'Beginner question: which paddle should I get for under ₱5,000? I have been borrowing a friend\'s and want my own.', 98, ['Gear']),
    post('post-07', ID.player, 'Gold at the QC Community Round Robin with Trisha! Three months ago I could not keep a dink rally going. Thank you Coach Mika for the drills.', 269, ['Achievement'], photo('1617883861744-5a4d5c632f72')),
  ];

  const likesByPost = {
    'post-01': [ID.player, ID.bea, ID.trisha, ID.miguel, ID.manager, ID.admin],
    'post-02': [ID.player, ID.trisha],
    'post-03': [ID.player, ID.bea, ID.admin, ID.kevin],
    'post-04': [ID.kevin, ID.liza, ID.miguel],
    'post-05': [ID.coach, ID.player, ID.josh],
    'post-06': [ID.bea],
    'post-07': [ID.coach, ID.trisha, ID.bea, ID.manager, ID.owner, ID.admin, ID.josh],
  };
  const community_post_likes = Object.entries(likesByPost).flatMap(([postId, likers]) => {
    // Spread the likes evenly between the post time and now.
    const postedAt = new Date(community_posts.find((p) => p.id === postId).created_at).getTime();
    const step = (Date.now() - postedAt) / (likers.length + 1);
    return likers.map((profileId, i) => ({
      id: `${postId.replace('post-', 'like-')}-${i + 1}`,
      post_id: postId,
      profile_id: profileId,
      created_at: new Date(postedAt + step * (i + 1)).toISOString(),
    }));
  });

  const comment = (id, postId, profileId, content, ageHours) => ({
    id,
    post_id: postId,
    profile_id: profileId,
    parent_id: null,
    content,
    created_at: hoursAgo(ageHours),
    updated_at: hoursAgo(ageHours),
  });

  const community_post_comments = [
    comment('comment-01', 'post-01', ID.player, 'Tried this yesterday and landed 9/20. Long way to go!', 2),
    comment('comment-02', 'post-01', ID.coach, 'That is a solid start! Keep the paddle face open and lift, don\'t push.', 1),
    comment('comment-03', 'post-02', ID.trisha, 'I am 3.3 but happy to be your fourth if you need one!', 5),
    comment('comment-04', 'post-02', ID.bea, 'Perfect, see you at 7!', 4),
    comment('comment-05', 'post-03', ID.admin, 'Great news for the after-work crowd.', 20),
    comment('comment-06', 'post-04', ID.kevin, 'Mandaue Paddle Club is open late too if Lahug is full.', 40),
    comment('comment-07', 'post-06', ID.coach, 'Start with a mid-weight polymer-core paddle. You can try mine at the Saturday clinic.', 90),
    comment('comment-08', 'post-06', ID.josh, 'Agree with Coach Mika. Do not overspend on your first one.', 85),
    comment('comment-09', 'post-07', ID.coach, 'So proud of you! All those drills paid off.', 260),
    comment('comment-10', 'post-07', ID.trisha, 'Best partner! Rematch at the next one.', 255),
  ];

  // Each member belongs to one squad (squad_members.user_id is unique in the real schema).
  const squadRosters = {
    'squad-bgc-dinkers': [[ID.bea, 'admin', 120], [ID.player, 'member', 60], [ID.manager, 'member', 30], [ID.admin, 'member', 14]],
    'squad-cebu-kitchen': [[ID.josh, 'admin', 200], [ID.kevin, 'member', 150]],
    'squad-diliman-early': [[ID.trisha, 'admin', 90], [ID.miguel, 'member', 45], [ID.coach, 'member', 20]],
  };

  const squad = ({ image, ...s }) => {
    const members = squadRosters[s.id];
    const ratings = members.map(([userId]) => profileById[userId].dupr_rating);
    return {
      image_url: photo(image, 200),
      avatar_url: photo(image, 200),
      is_private: false,
      is_official: false,
      require_approval: false,
      members_count: members.length,
      avg_rating: Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 100) / 100,
      created_by: members[0][0],
      created_at: daysFromNow(-members[0][2]),
      updated_at: daysFromNow(-members[members.length - 1][2]),
      ...s,
    };
  };

  const squads = [
    squad({
      id: 'squad-bgc-dinkers', name: 'BGC Dinkers', slug: 'bgc-dinkers', invite_code: 'BGCDNK',
      description: 'Weeknight doubles crew in BGC. Intermediate players chasing 4.0.',
      image: '1617883861744-5a4d5c632f72', location: 'Taguig', tags: ['Doubles', 'Intermediate'], wins: 14, losses: 6,
    }),
    squad({
      id: 'squad-cebu-kitchen', name: 'Cebu Kitchen Crew', slug: 'cebu-kitchen-crew', invite_code: 'CEBUKC',
      description: 'Open play and friendly ladders around Cebu City and Mandaue.',
      image: '1546483875-ad9014c88eba', location: 'Cebu City', tags: ['Open Play', 'Cebu'], wins: 9, losses: 4,
    }),
    squad({
      id: 'squad-diliman-early', name: 'Diliman Early Birds', slug: 'diliman-early-birds', invite_code: 'DLMN6A',
      description: '6 AM sessions before work or class. Beginners welcome; coaches drop by on Saturdays.',
      image: '1599586120429-48281b6f0ece', location: 'Quezon City', tags: ['Morning', 'All Levels'], wins: 5, losses: 7,
    }),
  ];

  const squad_members = Object.entries(squadRosters).flatMap(([squadId, members]) =>
    members.map(([userId, role, joinedDaysAgo], i) => ({
      id: `${squadId.replace('squad-', 'member-')}-${i + 1}`,
      squad_id: squadId,
      user_id: userId,
      role,
      status: 'active',
      joined_at: daysFromNow(-joinedDaysAgo, 19),
      created_at: daysFromNow(-joinedDaysAgo, 19),
    }))
  );

  /* ---------- coaching: lessons, clinics, reviews ---------- */

  const lesson = (id, coachId, studentId, day, time, type, courtKey, status, price, rating = null, notes = null) => ({
    id,
    coach_id: coachId,
    student_id: studentId,
    court_id: `court-${courtKey}`,
    date: dateOnly(day),
    time,
    duration: type === 'Group' ? '90 min' : '60 min',
    type,
    location: placeOf(`court-${courtKey}`),
    status,
    price,
    rating,
    notes,
    created_at: daysFromNow(Math.min(day, 0) - 4, 10),
    updated_at: daysFromNow(Math.min(day, -1), 20),
  });

  const lessons = [
    // Mika (coach account): four students.
    lesson('lesson-01', ID.coach, ID.player, -10, '07:00', 'Private', 'bgc-1', 'completed', 1500, 5, 'Worked on third-shot drops and split-step timing.'),
    lesson('lesson-02', ID.coach, ID.player, 3, '07:00', 'Private', 'bgc-1', 'confirmed', 1500, null, 'Follow-up: resets from the transition zone.'),
    lesson('lesson-03', ID.coach, ID.bea, -5, '18:00', 'Semi-Private', 'bgc-1', 'completed', 1000, 4),
    lesson('lesson-04', ID.coach, ID.trisha, -15, '09:00', 'Private', 'pasig-1', 'completed', 1500, 5, 'Serve and return depth.'),
    lesson('lesson-05', ID.coach, ID.trisha, 6, '08:00', 'Private', 'pasig-1', 'pending', 0),
    lesson('lesson-06', ID.coach, ID.manager, 2, '19:00', 'Group', 'bgc-1', 'confirmed', 800),
    // Miguel.
    lesson('lesson-07', ID.miguel, ID.admin, -7, '17:00', 'Private', 'makati-1', 'completed', 2000, 5, 'Stacking and poaching patterns.'),
    lesson('lesson-08', ID.miguel, ID.bea, 4, '17:00', 'Private', 'makati-1', 'confirmed', 2000),
    // Liza.
    lesson('lesson-09', ID.liza, ID.manager, -20, '16:00', 'Private', 'alabang-1', 'completed', 1200, 4),
  ];

  const clinicRosters = {
    'clinic-01': [ID.player, ID.bea, ID.trisha, ID.manager, ID.admin],
    'clinic-02': [ID.admin, ID.owner, ID.manager],
    'clinic-03': [ID.player, ID.bea, ID.trisha, ID.admin],
    'clinic-04': [ID.bea, ID.josh, ID.coach],
    'clinic-05': [ID.manager, ID.trisha],
  };

  const clinic = (id, coachId, title, description, level, capacity, day, time, courtKey, price, status) => ({
    id,
    coach_id: coachId,
    court_id: `court-${courtKey}`,
    title,
    description,
    level,
    capacity,
    participants: clinicRosters[id].length,
    date: dateOnly(day),
    time,
    location: placeOf(`court-${courtKey}`),
    price,
    status,
    created_at: daysFromNow(Math.min(day, 0) - 14, 11),
    updated_at: daysFromNow(Math.min(day, 0) - 2, 11),
  });

  const clinics = [
    clinic('clinic-01', ID.coach, 'Third-Shot Drop Bootcamp', 'Two hours of drop drills, live-ball games and video feedback.', 'Intermediate', 8, 4, '8:00 AM', 'bgc-1', 800, 'active'),
    clinic('clinic-02', ID.coach, 'Pickleball 101: First Steps', 'Rules, scoring, grips and your first rallies. Paddles provided.', 'Intro', 12, 10, '9:00 AM', 'qc-1', 500, 'active'),
    clinic('clinic-03', ID.coach, 'Dink Consistency Drills', 'Cross-court dinks, Erne footwork and patience games.', 'Intermediate', 8, -9, '7:00 AM', 'pasig-1', 700, 'completed'),
    clinic('clinic-04', ID.miguel, 'Stacking and Poaching for 4.0+', 'Advanced doubles positioning, signals and when to poach.', 'Advanced', 6, 7, '6:30 PM', 'makati-1', 1200, 'active'),
    clinic('clinic-05', ID.liza, 'Junior Picklers Intro Clinic', 'A fun first clinic for kids aged 9-15. Parents welcome to watch.', 'Intro', 10, 12, '3:00 PM', 'alabang-1', 400, 'active'),
  ];
  const clinicById = Object.fromEntries(clinics.map((c) => [c.id, c]));

  const clinic_participants = Object.entries(clinicRosters).flatMap(([clinicId, players]) =>
    players.map((playerId, i) => {
      const enrolledAt = new Date(new Date(clinicById[clinicId].created_at).getTime() + (i + 1) * DAY).toISOString();
      return {
        id: `${clinicId.replace('clinic-', 'enrollment-')}-${i + 1}`,
        clinic_id: clinicId,
        player_id: playerId,
        status: 'enrolled',
        enrolled_at: enrolledAt,
        created_at: enrolledAt,
      };
    })
  );

  const coachReview = (id, lessonId, rating, comment) => {
    const l = lessons.find((x) => x.id === lessonId);
    return {
      id,
      coach_id: l.coach_id,
      student_id: l.student_id,
      lesson_id: lessonId,
      rating,
      comment,
      // The evening after the lesson.
      created_at: new Date(new Date(l.date).getTime() + 36 * HOUR).toISOString(),
    };
  };

  const coach_reviews = [
    coachReview('coach-review-01', 'lesson-01', 5, 'Mika spotted my backswing issue in five minutes. My drops finally land.'),
    coachReview('coach-review-02', 'lesson-03', 4, 'Great drills and very clear feedback. The session ran a little short.'),
    coachReview('coach-review-03', 'lesson-04', 5, 'Patient and super organized. Came away with a practice plan for the week.'),
    coachReview('coach-review-04', 'lesson-07', 5, 'Miguel makes advanced tactics simple. Our stacking finally clicks.'),
    coachReview('coach-review-05', 'lesson-09', 4, 'Perfect for a beginner like me. Liza never rushes you.'),
  ];

  // coach_students and coaching_sessions mirror the lessons so CoachScreen and the Pro Dashboard agree.
  const pairs = new Map();
  lessons.forEach((l) => {
    const key = `${l.coach_id}|${l.student_id}`;
    const entry = pairs.get(key) || { coachId: l.coach_id, studentId: l.student_id, sessions: 0, since: l.created_at };
    if (l.status !== 'pending') entry.sessions += 1;
    if (l.created_at < entry.since) entry.since = l.created_at;
    pairs.set(key, entry);
  });
  const coach_students = [...pairs.values()].map((p, i) => {
    const student = profileById[p.studentId];
    return {
      id: `coach-student-${String(i + 1).padStart(2, '0')}`,
      coach_id: p.coachId,
      student_id: p.studentId,
      name: student.full_name,
      avatar_url: student.avatar_url,
      skill_level: student.skill_level,
      dupr_rating: student.dupr_rating,
      sessions_count: p.sessions,
      status: 'active',
      started_at: p.since,
      created_at: p.since,
    };
  });

  const coaching_sessions = lessons
    .filter((l) => l.status === 'completed' || l.status === 'confirmed')
    .map((l) => {
      const hour = Number(l.time.slice(0, 2));
      const minutes = l.duration === '90 min' ? 90 : 60;
      return {
        id: l.id.replace('lesson-', 'session-'),
        coach_id: l.coach_id,
        student_id: l.student_id,
        court_id: l.court_id,
        lesson_id: l.id,
        session_date: l.date,
        start_time: clock(hour),
        end_time: minutes === 90 ? `${String(hour + 1).padStart(2, '0')}:30:00` : clock(hour + 1),
        duration_minutes: minutes,
        session_type: l.type,
        status: l.status === 'completed' ? 'COMPLETED' : 'SCHEDULED',
        price: l.price,
        notes: l.notes,
        created_at: l.created_at,
      };
    });

  /* ---------- professional applications ---------- */

  const application = (id, profileId, role, status, summary, submittedDaysAgo, processedDaysAgo = null) => ({
    id,
    profile_id: profileId,
    requested_role: role,
    status,
    experience_summary: summary,
    document_url: `applications/${role}/${profileId}_certificate.pdf`,
    admin_notes: status === 'APPROVED' ? 'Documents verified.' : null,
    submitted_at: daysFromNow(-submittedDaysAgo, 14),
    processed_at: processedDaysAgo == null ? null : daysFromNow(-processedDaysAgo, 10),
    processed_by: processedDaysAgo == null ? null : ID.admin,
  });

  const professional_applications = [
    application('application-01', ID.coach, 'COACH', 'APPROVED', 'PPR Level 2 certified, six years of coaching 3.0-4.5 players in Makati and BGC.', 390, 385),
    application('application-02', ID.owner, 'COURT_OWNER', 'APPROVED', 'Owner of four pickleball venues in BGC, Makati, Pasig and Alabang. DTI and mayor\'s permits attached.', 370, 366),
    application('application-03', ID.miguel, 'COACH', 'APPROVED', 'Former collegiate tennis player, IPTPA certified, 9 years of racquet coaching.', 450, 447),
    application('application-04', ID.liza, 'COACH', 'APPROVED', 'Junior and beginner programs at Alabang since 2022. First-aid certified.', 320, 316),
    application('application-05', ID.kevin, 'COURT_OWNER', 'APPROVED', 'Operator of Lahug Pickle Yard and Mandaue Paddle Club in Cebu.', 270, 266),
    application('application-06', ID.trisha, 'COACH', 'PENDING', 'Two years of volunteer coaching for the Diliman Early Birds. Taking the PPR exam next month.', 3),
  ];

  /* ---------- per-user profile extras ---------- */

  const STYLES = ['All-court', 'Dinker', 'Banger', 'Counter-puncher'];
  const POSITIONS = ['Either side', 'Forehand side', 'Backhand side'];
  const thisYear = new Date().getFullYear();

  const player_profiles = profiles.map((p, i) => ({
    id: `player-profile-${String(i + 1).padStart(2, '0')}`,
    user_id: p.id,
    skill_level: p.skill_level,
    dupr_rating: p.dupr_rating,
    play_style: STYLES[i % STYLES.length],
    dominant_hand: p.id === ID.bea ? 'Left' : 'Right',
    preferred_position: POSITIONS[i % POSITIONS.length],
    years_playing: Math.max(1, thisYear - Number(p.playing_since.slice(0, 4))),
    play_frequency: p.play_frequency,
    looking_for_partner: p.availability_status === 'available',
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));

  const NOTIFICATION_DEFAULTS = {
    gameInvites: true,
    courtUpdates: true,
    matchResults: true,
    friendActivity: true,
    promotions: false,
    pushNotifications: true,
    emailNotifications: true,
    smsNotifications: false,
  };
  const user_preferences = [
    [ID.player, {}],
    [ID.coach, { smsNotifications: true }],
    [ID.owner, { promotions: true, friendActivity: false }],
    [ID.manager, { emailNotifications: false }],
    [ID.admin, { gameInvites: false }],
  ].map(([userId, overrides], i) => ({
    id: `preferences-${String(i + 1).padStart(2, '0')}`,
    user_id: userId,
    notification_settings: { ...NOTIFICATION_DEFAULTS, ...overrides },
    preferred_court_type: profileById[userId].preferred_court_type,
    language: 'en',
    currency: 'PHP',
    distance_unit: 'km',
    created_at: profileById[userId].created_at,
    updated_at: daysFromNow(-7),
  }));

  const user_statistics = profiles.map((p, i) => ({
    id: `statistics-${String(i + 1).padStart(2, '0')}`,
    user_id: p.id,
    matches_played: p.matches_played,
    matches_won: p.matches_won,
    matches_lost: p.matches_lost,
    win_rate: p.win_rate,
    tournaments_played: p.tournaments_played,
    tournaments_won: p.tournaments_won,
    total_bookings: p.bookings_completed,
    hours_played: p.bookings_completed + Math.round(p.matches_played / 3),
    current_streak: p.matches_won % 5,
    longest_streak: 3 + (p.matches_won % 7),
    points: p.points,
    updated_at: hoursAgo(6),
  }));

  return {
    profiles,
    courts,
    locations,
    court_reviews,
    bookings,
    tournaments,
    tournament_registrations,
    community_posts,
    community_post_likes,
    community_post_comments,
    squads,
    squad_members,
    lessons,
    clinics,
    clinic_participants,
    coach_reviews,
    coach_students,
    coaching_sessions,
    professional_applications,
    player_profiles,
    user_preferences,
    user_statistics,
  };
}
