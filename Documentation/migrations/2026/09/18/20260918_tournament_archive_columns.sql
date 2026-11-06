-- Immediate archive support for cancelled tournaments.
-- archived_at is set when an admin archives now (or after the 3-day grace period via job/client).

ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tournaments.cancelled_at IS 'When the tournament was rejected or soft-terminated';
COMMENT ON COLUMN public.tournaments.archived_at IS 'When the tournament was moved to Archived (null = not archived yet)';
