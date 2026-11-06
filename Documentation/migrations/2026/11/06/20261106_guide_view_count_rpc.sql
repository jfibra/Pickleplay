-- Count guide views without letting browsers UPDATE public.guides.
--
-- Before this migration the web client did a read-modify-write from the browser:
--   update guides set view_count = <value read earlier> + 1 where id = ...
-- That needs an UPDATE grant/policy for anon users on the whole guides row (title, content, ...),
-- and concurrent readers overwrite each other's increments. This function only touches
-- view_count, runs atomically, and only for published guides.

CREATE OR REPLACE FUNCTION public.increment_guide_view(p_slug TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.guides
     SET view_count = COALESCE(view_count, 0) + 1
   WHERE slug = p_slug
     AND is_published = TRUE;
$$;

REVOKE ALL ON FUNCTION public.increment_guide_view(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_guide_view(TEXT) TO anon, authenticated;

-- After deploying the client that calls increment_guide_view, browsers no longer need UPDATE on
-- public.guides. Review the existing policies and drop any that let anon/authenticated users update it:
--
--   SELECT policyname, cmd, roles, qual, with_check
--     FROM pg_policies
--    WHERE schemaname = 'public' AND tablename = 'guides';
--
--   -- e.g. DROP POLICY "<policy name>" ON public.guides;   (keep admin-only write policies)
