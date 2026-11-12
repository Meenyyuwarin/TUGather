BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE public.campuses (
 id bigint generated always as identity primary key, code text not null unique,
 name text not null, campus_type text not null default 'physical'
 check(campus_type in ('physical','online','other')),
 description text, is_active boolean not null default true,
 sort_order integer not null default 0);
CREATE TABLE public.faculties (
 id bigint generated always as identity primary key, code text not null unique,
 name text not null unique, is_active boolean not null default true,
 sort_order integer not null default 0);
CREATE TABLE public.event_categories (
 id bigint generated always as identity primary key, slug text not null unique,
 name text not null unique, description text, icon text,
 is_active boolean not null default true, sort_order integer not null default 0);
CREATE TABLE public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique, student_id text unique, student_card_name text,
 display_name text, email text, avatar_url text, bio text,
 faculty_id bigint references public.faculties(id) on delete set null,
 major text, year_of_study smallint check(year_of_study between 1 and 8),
 campus_id bigint references public.campuses(id) on delete set null,
 student_status text not null default 'current_student'
 check(student_status in ('current_student','alumni','staff','external')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
CREATE TABLE public.clubs (
 id uuid primary key default gen_random_uuid(), name text not null,
 slug text not null unique, description text, logo_url text, cover_url text,
 faculty_id bigint references public.faculties(id) on delete set null,
 campus_id bigint references public.campuses(id) on delete set null,
 created_by uuid references public.profiles(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','active','suspended','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
CREATE TABLE public.club_members (
 club_id uuid not null references public.clubs(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null default 'member' check(role in ('owner','admin','event_manager','member')),
 status text not null default 'active' check(status in ('invited','active','removed')),
 joined_at timestamptz not null default now(), primary key(club_id,user_id));
CREATE TABLE public.events (
 id uuid primary key default gen_random_uuid(),
 club_id uuid references public.clubs(id) on delete set null,
 created_by uuid references public.profiles(id) on delete set null,
 title text not null, slug text unique, description text, cover_url text,
 category_id bigint references public.event_categories(id) on delete set null,
 campus_id bigint references public.campuses(id) on delete set null,
 location_name text, location_detail text, online_url text,
 starts_at timestamptz not null, ends_at timestamptz not null,
 registration_opens_at timestamptz, registration_closes_at timestamptz,
 capacity integer check(capacity is null or capacity>0),
 application_mode text not null default 'automatic' check(application_mode in ('automatic','approval')),
 status text not null default 'draft' check(status in ('draft','published','cancelled','completed')),
 is_free boolean not null default true, price numeric(10,2) not null default 0 check(price>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(ends_at>starts_at),
 check(registration_opens_at is null or registration_closes_at is null or registration_closes_at>=registration_opens_at));
CREATE TABLE public.event_category_links (
 event_id uuid not null references public.events(id) on delete cascade,
 category_id bigint not null references public.event_categories(id) on delete cascade,
 primary key(event_id,category_id));
CREATE TABLE public.event_eligibility_rules (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 rule_type text not null check(rule_type in ('faculty','year_of_study','campus','student_status','custom')),
 operator text not null default 'in' check(operator in ('equals','in','gte','lte')),
 rule_value jsonb not null, description text, is_active boolean not null default true);
CREATE TABLE public.registration_questions (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 question_text text not null, question_type text not null
 check(question_type in ('short_text','long_text','single_choice','multiple_choice','number','checkbox','date','file_upload')),
 options jsonb, is_required boolean not null default false, sort_order integer not null default 0);
CREATE TABLE public.registrations (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected','waitlisted','cancelled')),
 submitted_at timestamptz not null default now(), reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz, review_note text, unique(event_id,user_id));
CREATE TABLE public.registration_answers (
 id uuid primary key default gen_random_uuid(),
 registration_id uuid not null references public.registrations(id) on delete cascade,
 question_id uuid not null references public.registration_questions(id) on delete cascade,
 answer_text text, answer_json jsonb, file_path text,
 unique(registration_id,question_id));
CREATE TABLE public.tickets (
 id uuid primary key default gen_random_uuid(),
 registration_id uuid not null unique references public.registrations(id) on delete cascade,
 ticket_code uuid not null unique default gen_random_uuid(),
 status text not null default 'valid' check(status in ('valid','used','cancelled')),
 issued_at timestamptz not null default now(), checked_in_at timestamptz,
 checked_in_by uuid references public.profiles(id) on delete set null);
CREATE TABLE public.event_favorites (
 user_id uuid not null references public.profiles(id) on delete cascade,
 event_id uuid not null references public.events(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(user_id,event_id));
CREATE TABLE public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 event_id uuid references public.events(id) on delete set null,
 title text not null, body text,
 notification_type text not null default 'general'
 check(notification_type in ('general','registration_update','event_update','ticket','club')),
 is_read boolean not null default false, created_at timestamptz not null default now());

INSERT INTO public.campuses(code,name,campus_type,description,sort_order) VALUES
('RANGSIT','รังสิต','physical','ศูนย์รังสิต',1),
('THA_PRACHAN','ท่าพระจันทร์','physical','พื้นที่ท่าพระจันทร์',2),
('LAMPANG','ลำปาง','physical','ศูนย์ลำปาง',3),
('PATTAYA','พัทยา','physical','พื้นที่พัทยา (ตัวเลือกโครงการ โปรดตรวจสอบสถานะทางการ)',4),
('ONLINE','ออนไลน์','online','กิจกรรมออนไลน์',5),
('OTHER','อื่น ๆ','other','สถานที่อื่น',6);
INSERT INTO public.faculties(code,name,sort_order) VALUES
('LAW','นิติศาสตร์',1),('COMMERCE','พาณิชยศาสตร์และการบัญชี',2),
('POLSCI','รัฐศาสตร์',3),('ECON','เศรษฐศาสตร์',4),
('SOCIO','สังคมวิทยาและมานุษยวิทยา',5),('LIBARTS','ศิลปศาสตร์',6),
('JOURNALISM','วารสารศาสตร์และสื่อสารมวลชน',7),('SOCIALWORK','สังคมสงเคราะห์ศาสตร์',8),
('SCI','วิทยาศาสตร์และเทคโนโลยี',9),('ENG','วิศวกรรมศาสตร์',10),
('ARCH','สถาปัตยกรรมศาสตร์และการผังเมือง',11),('MED','แพทยศาสตร์',12),
('DENT','ทันตแพทยศาสตร์',13),('NURSING','พยาบาลศาสตร์',14),
('ALLIEDHEALTH','สหเวชศาสตร์',15),('PHARM','เภสัชศาสตร์',16),
('PUBLICHEALTH','สาธารณสุขศาสตร์',17),('SIIT','สถาบันเทคโนโลยีนานาชาติสิรินธร',18),
('PUEY','วิทยาลัยพัฒนศาสตร์ ป๋วย อึ๊งภากรณ์',19),('INNOVATION','วิทยาลัยนวัตกรรม',20),
('PRIDI','วิทยาลัยนานาชาติปรีดี พนมยงค์',21),('GLOBAL','วิทยาลัยโลกคดีศึกษา',22),
('LEARNING','วิทยาลัยการเรียนรู้',23),('CIS','วิทยาลัยสหวิทยาการ',24),
('OTHER','อื่น ๆ',25);
INSERT INTO public.event_categories(slug,name,description,icon,sort_order) VALUES
('music','ดนตรี','คอนเสิร์ตและการแสดงดนตรี','music',1),
('workshop','เวิร์กช็อป','ฝึกทักษะและลงมือทำ','palette',2),
('volunteer','จิตอาสา','กิจกรรมอาสาสมัครและเพื่อสังคม','heart-handshake',3),
('sports','กีฬา','การแข่งขันและออกกำลังกาย','trophy',4),
('academic','วิชาการ','ติว สัมมนา และวิชาการ','book-open',5),
('arts-culture','ศิลปะและวัฒนธรรม','นิทรรศการและวัฒนธรรม','landmark',6),
('career','อาชีพและการฝึกงาน','แนะแนวงานและฝึกงาน','briefcase-business',7),
('social','สังคมและพบปะ','พบปะและสร้างเครือข่าย','users',8),
('competition','การแข่งขัน','ประกวดและ Hackathon','medal',9),
('talk','บรรยายพิเศษ','ทอล์กและเสวนา','mic',10),
('other','อื่น ๆ','กิจกรรมประเภทอื่น','calendar-days',11);

CREATE INDEX idx_profiles_faculty ON public.profiles(faculty_id);
CREATE INDEX idx_profiles_campus ON public.profiles(campus_id);
CREATE INDEX idx_clubs_campus ON public.clubs(campus_id);
CREATE INDEX idx_events_campus ON public.events(campus_id);
CREATE INDEX idx_events_category ON public.events(category_id);
CREATE INDEX idx_events_status_start ON public.events(status,starts_at);
CREATE INDEX idx_registrations_user ON public.registrations(user_id);
CREATE INDEX idx_registrations_event ON public.registrations(event_id);

CREATE OR REPLACE FUNCTION public.tugather_set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
 FOR EACH ROW EXECUTE FUNCTION public.tugather_set_updated_at();
CREATE TRIGGER clubs_updated BEFORE UPDATE ON public.clubs
 FOR EACH ROW EXECUTE FUNCTION public.tugather_set_updated_at();
CREATE TRIGGER events_updated BEFORE UPDATE ON public.events
 FOR EACH ROW EXECUTE FUNCTION public.tugather_set_updated_at();

-- Auth trigger: preserve existing Supabase Auth accounts and create profiles for new signups.
CREATE OR REPLACE FUNCTION public.tugather_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.profiles(id,email,display_name)
 VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',NEW.email))
 ON CONFLICT (id) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION public.tugather_handle_new_user();
-- Restore profiles for users created before this reset.
INSERT INTO public.profiles(id,email,display_name)
SELECT id,email,COALESCE(raw_user_meta_data->>'full_name',email)
FROM auth.users ON CONFLICT(id) DO NOTHING;

-- RLS: reference data is public-read; other app data is private until policies are added.
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_category_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_eligibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY campuses_read ON public.campuses FOR SELECT TO anon,authenticated USING(is_active);
CREATE POLICY faculties_read ON public.faculties FOR SELECT TO anon,authenticated USING(is_active);
CREATE POLICY categories_read ON public.event_categories FOR SELECT TO anon,authenticated USING(is_active);
CREATE POLICY own_profile_read ON public.profiles FOR SELECT TO authenticated USING(id=(select auth.uid()));
CREATE POLICY own_profile_update ON public.profiles FOR UPDATE TO authenticated
 USING(id=(select auth.uid())) WITH CHECK(id=(select auth.uid()));
CREATE POLICY published_events_read ON public.events FOR SELECT TO anon,authenticated USING(status='published');
CREATE POLICY active_clubs_read ON public.clubs FOR SELECT TO anon,authenticated USING(status='active');
COMMIT;
