\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users (id, email, raw_user_meta_data)
SELECT
  account.id::uuid, account.email,
  jsonb_build_object('full_name', 'Test student', 'student_id', account.student_id,
    'campus_id', campus.id, 'faculty_id', faculty.id, 'year_of_study', account.study_year)
FROM (VALUES
  ('10000000-0000-0000-0000-000000000001', 'student@example.test', 'TEST-001', 2),
  ('10000000-0000-0000-0000-000000000002', 'other@example.test', 'TEST-002', 1),
  ('10000000-0000-0000-0000-000000000003', 'staff@example.test', 'TEST-003', 3)
) AS account(id, email, student_id, study_year)
CROSS JOIN public.campuses AS campus
CROSS JOIN public.faculties AS faculty
WHERE campus.code = 'RANGSIT' AND faculty.code = 'LAW';

INSERT INTO public.clubs (id, name, slug, status)
VALUES ('20000000-0000-0000-0000-000000000001', 'Demo Club', 'demo-club', 'active');
INSERT INTO public.club_members (club_id, user_id, role)
VALUES ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'event_manager');
INSERT INTO public.events (id, club_id, title, starts_at, ends_at, capacity, status)
VALUES ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
        'Demo Event', now() + interval '1 hour', now() + interval '2 hours', 1, 'published');
INSERT INTO public.events (id, club_id, title, starts_at, ends_at, capacity, status)
VALUES ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001',
        'Open Event', now() + interval '1 hour', now() + interval '2 hours', 20, 'published');
INSERT INTO public.event_eligibility_rules (event_id, rule_type, operator, rule_value)
SELECT '30000000-0000-0000-0000-000000000001', 'campus', 'equals', to_jsonb(id)
FROM public.campuses WHERE code = 'RANGSIT';

INSERT INTO public.event_eligibility_rules (event_id, rule_type, operator, rule_value)
VALUES ('30000000-0000-0000-0000-000000000001', 'year_of_study', 'gte', '2');
INSERT INTO public.registration_questions (id, event_id, question_text, question_type, is_required)
VALUES ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001',
        'Why do you want to join?', 'short_text', true);

UPDATE public.profiles
SET campus_id = (SELECT id FROM public.campuses WHERE code = 'THA_PRACHAN')
WHERE id = '10000000-0000-0000-0000-000000000002';

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
DO $$
BEGIN
  BEGIN
    PERFORM public.tugather_register('30000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Ineligible student unexpectedly registered';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Your profile does not meet the event requirements' THEN RAISE; END IF;
  END;
END $$;
UPDATE public.profiles
SET campus_id = (SELECT id FROM public.campuses WHERE code = 'RANGSIT')
WHERE id = auth.uid();

DO $$
BEGIN
  ASSERT (SELECT year_of_study FROM public.profiles WHERE id = auth.uid()) = 1;
  BEGIN
    PERFORM public.tugather_register('30000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Ineligible year unexpectedly registered';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Your profile does not meet the event requirements' THEN RAISE; END IF;
  END;
END $$;
UPDATE public.profiles SET year_of_study = 2 WHERE id = auth.uid();

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
DO $$
DECLARE
  event_id uuid := '30000000-0000-0000-0000-000000000001';
  ticket_id uuid;
  scanned_code uuid;
BEGIN
  ASSERT public.tugather_available_seats(event_id) = 1;
  ASSERT (SELECT count(*) FROM public.tugather_check_in_events()) = 0;
  ASSERT (SELECT count(*) FROM public.registration_questions WHERE id = '40000000-0000-0000-0000-000000000001') = 1;
  ASSERT (SELECT student_id FROM public.profiles WHERE id = auth.uid()) = 'TEST-001';
  BEGIN
    PERFORM public.tugather_register(event_id);
    RAISE EXCEPTION 'Missing required answer unexpectedly accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Answer required:%' THEN RAISE; END IF;
  END;
  ASSERT public.tugather_available_seats(event_id) = 1;
  ticket_id := public.tugather_register(event_id, '{"40000000-0000-0000-0000-000000000001":"  To learn  "}');
  ASSERT ticket_id IS NOT NULL;
  ASSERT public.tugather_register(event_id) = ticket_id;
  ASSERT public.tugather_available_seats(event_id) = 0;
  SELECT ticket_code INTO STRICT scanned_code FROM public.tickets WHERE id = ticket_id;
  PERFORM set_config('tugather.test_code', scanned_code::text, true);
  BEGIN
    PERFORM public.tugather_check_in(event_id, scanned_code);
    RAISE EXCEPTION 'Student check-in unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
DO $$
BEGIN
  ASSERT (SELECT count(*) FROM public.tickets) = 0;
  ASSERT (SELECT count(*) FROM public.registrations) = 0;
  BEGIN
    PERFORM public.tugather_register('30000000-0000-0000-0000-000000000001');
    RAISE EXCEPTION 'Full event registration unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'No seats available' THEN RAISE; END IF;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
DO $$
DECLARE
  event_id uuid := '30000000-0000-0000-0000-000000000001';
  scanned_code uuid := current_setting('tugather.test_code')::uuid;
BEGIN
  ASSERT (SELECT count(*) FROM public.tugather_check_in_events()) = 2;
  ASSERT EXISTS (SELECT 1 FROM public.tugather_check_in_events() AS event WHERE event.id = event_id);
  BEGIN
    PERFORM public.tugather_check_in('30000000-0000-0000-0000-000000000002', scanned_code);
    RAISE EXCEPTION 'Wrong event check-in unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Ticket is invalid or has already been used' THEN RAISE; END IF;
  END;
  ASSERT public.tugather_check_in(event_id, scanned_code) IS NOT NULL;
  BEGIN
    PERFORM public.tugather_check_in(event_id, scanned_code);
    RAISE EXCEPTION 'Duplicate check-in unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Ticket is invalid or has already been used' THEN RAISE; END IF;
  END;
END $$;

SELECT set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
DO $$ BEGIN
  ASSERT (SELECT status FROM public.tickets) = 'used';
  ASSERT public.tugather_register('30000000-0000-0000-0000-000000000002', '{}'::jsonb) IS NOT NULL;
  ASSERT public.tugather_available_seats('30000000-0000-0000-0000-000000000002') = 19;
END $$;

RESET ROLE;
DO $$ BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  );
  ASSERT (SELECT answer_text FROM public.registration_answers
    WHERE question_id = '40000000-0000-0000-0000-000000000001') = 'To learn';
END $$;

ROLLBACK;
