/**
 * Prototype sign-in accounts, used only when EXPO_PUBLIC_USE_MOCKS=true.
 * Any password of 6+ characters works. An email not listed here signs in as the player.
 */
export const MOCK_PASSWORD_MIN = 6;

export const MOCK_ACCOUNTS = {
  player: {
    id: '00000000-0000-4000-a000-000000000001',
    email: 'player@pickleplay.test',
    fullName: 'Paolo Reyes',
    roles: ['PLAYER'],
  },
  /** Sees the Pro Dashboard's coach tab: students, lessons and clinics. */
  coach: {
    id: '00000000-0000-4000-a000-000000000002',
    email: 'coach@pickleplay.test',
    fullName: 'Mika Santos',
    roles: ['PLAYER', 'COACH'],
  },
  /** Sees the Pro Dashboard's owner tab: courts and their bookings. */
  owner: {
    id: '00000000-0000-4000-a000-000000000003',
    email: 'owner@pickleplay.test',
    fullName: 'Carlo Mendoza',
    roles: ['PLAYER', 'COURT_OWNER'],
  },
  /** The mobile app has no manager screens yet; behaves like a player. */
  manager: {
    id: '00000000-0000-4000-a000-000000000004',
    email: 'manager@pickleplay.test',
    fullName: 'Jenny Lim',
    roles: ['PLAYER', 'COURT_MANAGER'],
  },
  /** The mobile app has no admin screens yet; behaves like a player. */
  admin: {
    id: '00000000-0000-4000-a000-000000000005',
    email: 'admin@pickleplay.test',
    fullName: 'Ana Villanueva',
    roles: ['PLAYER', 'ADMIN'],
  },
};

export function mockAccountForEmail(email) {
  const lower = String(email || '').trim().toLowerCase();
  return Object.values(MOCK_ACCOUNTS).find((a) => a.email === lower) || null;
}
