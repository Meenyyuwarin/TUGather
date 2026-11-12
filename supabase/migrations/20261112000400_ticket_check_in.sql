BEGIN;

CREATE FUNCTION public.tugather_check_in_events()
RETURNS TABLE (id uuid, title text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT event.id, event.title
  FROM public.events AS event
  WHERE event.status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.club_members AS membership
      WHERE membership.club_id = event.club_id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.status = 'active'
        AND membership.role IN ('owner', 'admin', 'event_manager')
    )
  ORDER BY event.starts_at, event.id;
$$;

REVOKE EXECUTE ON FUNCTION public.tugather_check_in_events() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tugather_check_in_events() TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
  END IF;
END;
$$;

COMMIT;
