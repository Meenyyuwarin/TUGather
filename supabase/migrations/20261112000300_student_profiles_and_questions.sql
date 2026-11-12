BEGIN;

GRANT UPDATE (student_id, faculty_id, major, year_of_study) ON public.profiles TO authenticated;

CREATE POLICY tugather_published_questions_read ON public.registration_questions
FOR SELECT TO anon, authenticated USING (
  EXISTS (
    SELECT 1 FROM public.events AS event
    WHERE event.id = registration_questions.event_id AND event.status = 'published'
  )
);

GRANT SELECT ON public.registration_questions, public.event_eligibility_rules TO anon, authenticated;
GRANT SELECT ON public.registrations, public.tickets, public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.tugather_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  fields jsonb := NEW.raw_user_meta_data;
BEGIN
  INSERT INTO public.profiles(id, email, display_name, student_id, campus_id, faculty_id, major, year_of_study)
  VALUES (
    NEW.id, NEW.email, coalesce(nullif(btrim(fields->>'full_name'), ''), NEW.email),
    nullif(btrim(fields->>'student_id'), ''),
    (SELECT id FROM public.campuses WHERE id::text = fields->>'campus_id' AND campus_type = 'physical' AND is_active),
    (SELECT id FROM public.faculties WHERE id::text = fields->>'faculty_id' AND is_active),
    nullif(btrim(fields->>'major'), ''),
    CASE WHEN fields->>'year_of_study' ~ '^[1-8]$' THEN (fields->>'year_of_study')::smallint END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.tugather_register(target_event_id uuid, answers jsonb)
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
  question public.registration_questions%ROWTYPE;
  answer text;
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
  IF NOT FOUND OR student.campus_id IS NULL OR student.faculty_id IS NULL OR student.year_of_study IS NULL
    OR nullif(btrim(student.display_name), '') IS NULL OR nullif(btrim(student.student_id), '') IS NULL THEN
    RAISE EXCEPTION 'Complete your student profile before registering';
  END IF;
  IF event.status <> 'published' OR event.starts_at <= now()
    OR event.registration_opens_at > now() OR event.registration_closes_at < now()
    OR event.application_mode <> 'automatic' OR NOT event.is_free THEN
    RAISE EXCEPTION 'Instant registration is unavailable for this event';
  END IF;
  IF jsonb_typeof(answers) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Invalid registration answers';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(answers) AS supplied(question_key)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.registration_questions AS configured
      WHERE configured.event_id = target_event_id AND configured.id::text = supplied.question_key
    )
  ) THEN
    RAISE EXCEPTION 'A question does not belong to this event';
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
  FOR question IN SELECT * FROM public.registration_questions WHERE event_id = target_event_id
  LOOP
    IF answers ? question.id::text AND jsonb_typeof(answers -> question.id::text) <> 'string' THEN
      RAISE EXCEPTION 'Answer must be text';
    END IF;
    answer := nullif(btrim(answers ->> question.id::text), '');
    IF question.is_required AND answer IS NULL THEN
      RAISE EXCEPTION 'Answer required: %', question.question_text;
    END IF;
    IF answer IS NOT NULL THEN
      IF question.question_type NOT IN ('short_text', 'long_text') OR char_length(answer) > 2000 THEN
        RAISE EXCEPTION 'Invalid answer: %', question.question_text;
      END IF;
      INSERT INTO public.registration_answers(registration_id, question_id, answer_text)
      VALUES (registration.id, question.id, answer);
    END IF;
  END LOOP;

  INSERT INTO public.tickets (registration_id)
  VALUES (registration.id) RETURNING id INTO ticket_id;
  RETURN ticket_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tugather_register(target_event_id uuid)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$
  SELECT public.tugather_register(target_event_id, '{}'::jsonb);
$$;

REVOKE EXECUTE ON FUNCTION public.tugather_register(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tugather_register(uuid, jsonb) TO authenticated;

COMMIT;
