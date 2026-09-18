/**
 * Confirm pending registrations on open (no-upload) tournaments.
 * Usage from web/: npx tsx scripts/confirm-open-tournament-regs.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local'), override: true });

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!url || (!serviceKey && !anonKey)) {
  console.error('Missing Supabase env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey || anonKey!);

function shouldAutoConfirm(rules?: string | null, mode?: string | null) {
  if (rules?.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rules);
      const reqs = parsed?.registrationRequirements;
      if (reqs && typeof reqs === 'object') {
        return !(reqs.requireValidId || reqs.requireProofOfResidency || reqs.requirePaymentReceipt);
      }
    } catch {
      /* ignore */
    }
  }
  return mode === 'casual';
}

async function main() {
  const { data: tournaments, error } = await supabase
    .from('tournaments')
    .select('id, name, rules, tournament_mode')
    .eq('is_approved', true);

  if (error) throw error;

  const openIds = (tournaments || [])
    .filter((t) => shouldAutoConfirm(t.rules, t.tournament_mode))
    .map((t) => t.id);

  if (openIds.length === 0) {
    console.log('No open tournaments found.');
    return;
  }

  const now = new Date().toISOString();
  const { data, error: updErr } = await supabase
    .from('tournament_registrations')
    .update({ status: 'confirmed', approved_at: now })
    .in('tournament_id', openIds)
    .eq('status', 'pending')
    .select('id, tournament_id, player_id');

  if (updErr) throw updErr;
  console.log(`Confirmed ${data?.length ?? 0} pending registration(s) on open tournaments.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
