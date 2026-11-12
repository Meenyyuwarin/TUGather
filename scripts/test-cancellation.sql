\set ON_ERROR_STOP on
BEGIN;

INSERT INTO auth.users(id,email,raw_user_meta_data)
SELECT '4f8a5b6d-bb6d-4a08-9121-e4ee5253c266', 'cancel-test@example.test',
  jsonb_build_object('student_id','CANCELTEST','full_name','Test student','campus_id',c.id,'faculty_id',f.id,'year_of_study',2)
FROM public.campuses c CROSS JOIN public.faculties f
WHERE c.code='RANGSIT' AND f.code='LAW';

INSERT INTO public.events (id,title,starts_at,ends_at,capacity,status)
VALUES
  ('840cb378-0be0-46d0-b840-7db36346cb4e','Future with one seat',now()+interval '1 day',now()+interval '2 days',1,'published'),
  ('54789d88-3788-4ca5-ab1c-c4fc523b7133','Past event',now()-interval '2 days',now()-interval '1 day',12,'published'),
  ('69202f75-d146-4ee8-8d12-e59a32b069c7','Unlimited seats',now()+interval '1 day',now()+interval '2 days',NULL,'published');

SET LOCAL ROLE anon;
DO $$ BEGIN
  ASSERT EXISTS (SELECT 1 FROM public.tugather_open_events() WHERE title = 'Future with one seat');
  ASSERT NOT EXISTS (SELECT 1 FROM public.tugather_open_events() WHERE title = 'Past event');
  ASSERT EXISTS (SELECT 1 FROM public.tugather_open_events() WHERE title = 'Unlimited seats');
END $$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','4f8a5b6d-bb6d-4a08-9121-e4ee5253c266',true);
DO $$
DECLARE
  chosen_event uuid := '840cb378-0be0-46d0-b840-7db36346cb4e';
  selected_ticket uuid;
  previous_code uuid;
BEGIN
  selected_ticket := public.tugather_register(chosen_event, '{}'::jsonb);
  SELECT ticket_code INTO STRICT previous_code FROM public.tickets WHERE id = selected_ticket;
  ASSERT public.tugather_available_seats(chosen_event) = 0;
  ASSERT NOT EXISTS (SELECT 1 FROM public.tugather_open_events() WHERE id = chosen_event);
  PERFORM public.tugather_cancel_registration(chosen_event);
  PERFORM public.tugather_cancel_registration(chosen_event);
  ASSERT (SELECT status FROM public.tickets WHERE id = selected_ticket) = 'cancelled';
  ASSERT (SELECT status FROM public.registrations WHERE event_id = chosen_event) = 'cancelled';
  ASSERT public.tugather_available_seats(chosen_event) = 1;
  ASSERT EXISTS (SELECT 1 FROM public.tugather_open_events() WHERE id = chosen_event);
  ASSERT public.tugather_register(chosen_event, '{}'::jsonb) = selected_ticket;
  ASSERT (SELECT status FROM public.tickets WHERE id = selected_ticket) = 'valid';
  ASSERT (SELECT ticket_code FROM public.tickets WHERE id = selected_ticket) <> previous_code;
  ASSERT public.tugather_available_seats(chosen_event) = 0;
END;
$$;

RESET ROLE;
UPDATE public.tickets SET status = 'used' WHERE registration_id IN (
  SELECT id FROM public.registrations WHERE event_id = '840cb378-0be0-46d0-b840-7db36346cb4e'
);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.tugather_cancel_registration('840cb378-0be0-46d0-b840-7db36346cb4e');
    RAISE EXCEPTION 'Checked-in ticket cancellation unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Only an unused ticket can be cancelled' THEN RAISE; END IF;
  END;
END $$;
ROLLBACK;
