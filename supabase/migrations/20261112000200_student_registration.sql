BEGIN;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, campus_id) ON public.profiles TO authenticated;

CREATE POLICY tugather_own_registrations_read ON public.registrations
FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY tugather_own_tickets_read ON public.tickets
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.registrations AS registration
    WHERE registration.id = tickets.registration_id
      AND registration.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY tugather_published_eligibility_read ON public.event_eligibility_rules
FOR SELECT TO anon, authenticated USING (
  is_active AND EXISTS (
    SELECT 1 FROM public.events AS event
    WHERE event.id = event_eligibility_rules.event_id AND event.status = 'published'
  )
);

CREATE FUNCTION public.tugather_available_seats(target_event_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT greatest(event.capacity - count(registration.id)::integer, 0)
  FROM public.events AS event
  LEFT JOIN public.registrations AS registration
    ON registration.event_id = event.id AND registration.status = 'approved'
  WHERE event.id = target_event_id AND event.status = 'published' AND event.capacity IS NOT NULL
  GROUP BY event.id;
$$;

CREATE FUNCTION public.tugather_register(target_event_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  applicant_id uuid := auth.uid();
  student public.profiles%ROWTYPE;
  event public.events%ROWTYPE;
  registration public.registrations%ROWTYPE;
  rule public.event_eligibility_rules%ROWTYPE;
  student_value jsonb;
  eligible boolean;
  ticket_id uuid;
BEGIN
  IF applicant_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to register' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO event FROM public.events WHERE id = target_event_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  SELECT * INTO registration
  FROM public.registrations WHERE event_id = target_event_id AND user_id = applicant_id;
  IF FOUND THEN
    SELECT id INTO ticket_id FROM public.tickets
    WHERE registration_id = registration.id AND status IN ('valid', 'used');
    IF registration.status = 'approved' AND ticket_id IS NOT NULL THEN
      RETURN ticket_id;
    END IF;
    RAISE EXCEPTION 'A registration already exists';
  END IF;

  SELECT * INTO student FROM public.profiles WHERE id = applicant_id;
  IF NOT FOUND OR student.campus_id IS NULL OR nullif(trim(student.display_name), '') IS NULL THEN
    RAISE EXCEPTION 'Complete your name and campus before registering';
  END IF;
  IF event.status <> 'published' OR event.starts_at <= now()
    OR event.registration_opens_at > now() OR event.registration_closes_at < now()
    OR event.application_mode <> 'automatic' OR NOT event.is_free THEN
    RAISE EXCEPTION 'Instant registration is unavailable for this event';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.registration_questions WHERE event_id = target_event_id AND is_required
  ) THEN
    RAISE EXCEPTION 'This event requires extra registration answers';
  END IF;

  FOR rule IN
    SELECT * FROM public.event_eligibility_rules WHERE event_id = target_event_id AND is_active
  LOOP
    student_value := CASE rule.rule_type
      WHEN 'campus' THEN to_jsonb(student.campus_id)
      WHEN 'faculty' THEN to_jsonb(student.faculty_id)
      WHEN 'year_of_study' THEN to_jsonb(student.year_of_study)
      WHEN 'student_status' THEN to_jsonb(student.student_status)
    END;
    eligible := CASE rule.operator
      WHEN 'equals' THEN student_value = rule.rule_value
      WHEN 'in' THEN jsonb_typeof(rule.rule_value) = 'array'
        AND rule.rule_value @> jsonb_build_array(student_value)
      WHEN 'gte' THEN jsonb_typeof(student_value) = 'number'
        AND jsonb_typeof(rule.rule_value) = 'number' AND student_value >= rule.rule_value
      WHEN 'lte' THEN jsonb_typeof(student_value) = 'number'
        AND jsonb_typeof(rule.rule_value) = 'number' AND student_value <= rule.rule_value
    END;
    IF student_value IS NULL OR eligible IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Your profile does not meet the event requirements';
    END IF;
  END LOOP;

  IF public.tugather_available_seats(target_event_id) = 0 THEN
    RAISE EXCEPTION 'No seats available';
  END IF;

  INSERT INTO public.registrations (event_id, user_id, status)
  VALUES (target_event_id, applicant_id, 'approved')
  RETURNING * INTO registration;
  INSERT INTO public.tickets (registration_id)
  VALUES (registration.id) RETURNING id INTO ticket_id;
  RETURN ticket_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tugather_available_seats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tugather_available_seats(uuid) TO anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tugather_register(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tugather_register(uuid) TO authenticated;

CREATE FUNCTION public.tugather_check_in(target_event_id uuid, scanned_code uuid)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  staff_id uuid := auth.uid();
  scanned_at timestamptz;
BEGIN
  IF staff_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.events AS event
    JOIN public.club_members AS membership ON membership.club_id = event.club_id
    WHERE event.id = target_event_id
      AND event.status = 'published'
      AND membership.user_id = staff_id
      AND membership.status = 'active'
      AND membership.role IN ('owner', 'admin', 'event_manager')
  ) THEN
    RAISE EXCEPTION 'You cannot check in this event' USING ERRCODE = '42501';
  END IF;

  UPDATE public.tickets AS ticket
  SET status = 'used', checked_in_at = now(), checked_in_by = staff_id
  FROM public.registrations AS registration
  WHERE registration.id = ticket.registration_id
    AND registration.event_id = target_event_id
    AND registration.status = 'approved'
    AND ticket.ticket_code = scanned_code
    AND ticket.status = 'valid'
  RETURNING ticket.checked_in_at INTO scanned_at;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket is invalid or has already been used';
  END IF;
  RETURN scanned_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tugather_check_in(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tugather_check_in(uuid, uuid) TO authenticated;

COMMIT;
