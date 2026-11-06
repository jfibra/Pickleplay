-- Soft delete for admin user management.
-- deleted_at is set when an admin moves an account to Deleted Users; the auth user is banned
-- at the same time. Restoring clears these columns. Permanent delete removes the auth user.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at
  ON public.profiles (deleted_at)
  WHERE deleted_at IS NOT NULL;

COMMENT ON COLUMN public.profiles.deleted_at IS 'When an admin soft-deleted the account (null = not deleted)';
COMMENT ON COLUMN public.profiles.deleted_by IS 'Admin profile that soft-deleted the account';
COMMENT ON COLUMN public.profiles.deletion_reason IS 'Optional reason recorded at soft delete';
