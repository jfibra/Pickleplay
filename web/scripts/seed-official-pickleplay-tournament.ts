/**
 * Seed the official PicklePlay open tournament (approved + featured).
 *
 * Usage (from web/):
 *   npx tsx scripts/seed-official-pickleplay-tournament.ts
 *
 * Requires VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY
 * with an admin session — service role recommended).
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || (!serviceKey && !anonKey)) {
  console.error('Missing Supabase URL or keys in .env / .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey || anonKey!);

const TOURNAMENT_NAME = 'PicklePlay Open Community Cup';

function buildRules() {
  const mk = (
    categoryName: string,
    eventType: 'singles' | 'doubles',
    gender: 'mens' | 'womens' | 'mixed' | 'open',
  ) => ({
    id: randomUUID(),
    categoryName,
    eventType,
    gender,
    skillBracket: 'open' as const,
    ageBracket: 'open' as const,
    playersPerEntry: eventType === 'singles' ? 1 : 2,
    format: 'single_elim' as const,
    maxTeams: 32,
    registrationFee: 0,
  });

  return JSON.stringify({
    version: 1,
    eligibility: 'open_to_all',
    endDate: '2026-12-31',
    registrationRequirements: {
      requireValidId: false,
      requireProofOfResidency: false,
      requirePaymentReceipt: false,
    },
    divisions: [
      mk("Men's Open Singles", 'singles', 'mens'),
      mk("Women's Open Singles", 'singles', 'womens'),
      mk("Men's Open Doubles", 'doubles', 'mens'),
      mk("Women's Open Doubles", 'doubles', 'womens'),
      mk('Mixed Open Doubles', 'doubles', 'mixed'),
      mk('Open Doubles', 'doubles', 'open'),
    ],
  });
}

async function main() {
  const { data: existing } = await supabase
    .from('tournaments')
    .select('id, name')
    .eq('name', TOURNAMENT_NAME)
    .maybeSingle();

  if (existing?.id) {
    console.log('Official tournament already exists:', existing.id);
    console.log(`Open: /tournaments/${existing.id}`);
    return;
  }

  // Prefer an admin profile as organizer when using service role
  let organizerId: string | null = null;
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, roles')
    .contains('roles', ['ADMIN'])
    .limit(1)
    .maybeSingle();

  if (adminProfile?.id) {
    organizerId = adminProfile.id;
  } else {
    const { data: anyProfile } = await supabase.from('profiles').select('id').limit(1).maybeSingle();
    organizerId = anyProfile?.id ?? null;
  }

  if (!organizerId) {
    console.error('No profile found to set as organizer. Create an admin account first.');
    process.exit(1);
  }

  const startDate = new Date('2026-10-18T08:00:00+08:00').toISOString();
  const payload = {
    owner_id: organizerId,
    organizer_id: organizerId,
    name: TOURNAMENT_NAME,
    date: startDate,
    location: 'Philippines — venue TBA',
    prize_pool: '',
    skill_level: 'All Levels Welcome',
    max_players: 192,
    image_url: '/images/home-images/pb20.jpg',
    status: 'UPCOMING',
    description:
      'Welcome to the official PicklePlay community tournament!\n\nPick the division that fits you, register in a few taps, and we will shape brackets and schedules based on who joins.\n\nNo paperwork. No fees to sign up. Just play.',
    format: 'single_elim',
    event_type: 'doubles',
    category: 'open',
    start_time: '08:00',
    registration_deadline: null,
    num_courts: 4,
    rules: buildRules(),
    prizes: '',
    registration_mode: 'individual',
    tournament_mode: 'casual',
    is_approved: true,
    is_featured: true,
    announcement: 'Open registration — choose your division and join us!',
  };

  const { data, error } = await supabase.from('tournaments').insert(payload).select('id, name').single();
  if (error) {
    console.error('Failed to create tournament:', error.message);
    process.exit(1);
  }

  console.log('Created official tournament:', data.name);
  console.log('ID:', data.id);
  console.log(`Player link: /tournaments/${data.id}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
