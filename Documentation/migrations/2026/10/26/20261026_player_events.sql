-- Lightweight product analytics for admin Player Analytics.
-- Rows are written only by the server (/api/events, service role) and read by admin endpoints.
-- RLS is enabled with no policies so anon/authenticated clients cannot read or write directly.

CREATE TABLE IF NOT EXISTS public.player_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT NULL,
  session_id TEXT NULL,
  event_name TEXT NOT NULL,
  category TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  path TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_player_events_created_at ON public.player_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_events_user_created ON public.player_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_events_name_created ON public.player_events (event_name, created_at DESC);

ALTER TABLE public.player_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.player_events IS 'Player struggle/funnel events (booking blockers, failed searches, auth failures, client errors). Service role only.';
