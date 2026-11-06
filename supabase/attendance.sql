-- ============================================================================
-- Attendance Module migration.
--
-- STEP 0 — RUN THIS STATEMENT ALONE FIRST, BEFORE THE REST OF THIS FILE:
--
--   alter type public.user_role add value if not exists 'hr';
--
-- Postgres cannot use a new enum value in the same transaction that adds it,
-- so the Supabase SQL editor (which wraps a pasted script in one transaction)
-- will fail if this line runs together with anything below that reads or
-- writes a row typed 'hr'. Run it by itself, confirm it commits, then run
-- everything from here down as a second statement/script.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.offices (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  latitude double precision not null,
  longitude double precision not null,
  radius_meters int not null default 100 check (radius_meters > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(name) between 1 and 120),
  start_time time not null,
  end_time time not null,
  grace_minutes int not null default 15 check (grace_minutes >= 0),
  half_day_hours numeric not null default 4 check (half_day_hours > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One row per employee. Auto-provisioned when a profile is created; HR edits
-- office/shift/work_mode. verification_method has exactly one valid value —
-- the phone's own fingerprint or Face Unlock, via expo-local-authentication
-- (PRD 5.2 change, 2026-11-05 — see docs/attendance-decisions.md).
create table public.attendance_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  work_mode text not null default 'office' check (work_mode in ('office', 'wfh')),
  office_id uuid references public.offices(id) on delete set null,
  shift_id uuid references public.shifts(id) on delete set null,
  verification_method text not null default 'biometric'
    check (verification_method in ('biometric')),
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Holidays and weekends. A row here means "no punch required, no absence."
create table public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  kind text not null check (kind in ('weekend', 'holiday')),
  name text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- One accepted check-in + check-out per employee per day. The unique
-- constraint is the real once-per-day guarantee; record_punch()'s own
-- lookup is just the fast path.
create table public.attendance_punches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  punch_date date not null,
  work_mode text not null check (work_mode in ('office', 'wfh')),
  check_in_at timestamptz,
  check_in_method text check (check_in_method is null or check_in_method in ('biometric', 'regularized')),
  check_in_lat double precision,
  check_in_lng double precision,
  check_out_at timestamptz,
  check_out_method text check (check_out_method is null or check_out_method in ('biometric', 'regularized')),
  check_out_lat double precision,
  check_out_lng double precision,
  created_at timestamptz not null default now(),
  unique (user_id, punch_date),
  constraint check_out_requires_check_in check (check_out_at is null or check_in_at is not null)
);

-- Rejected/blocked punch attempts, for admin review. Written by
-- record_punch() on server-detected rejections, and directly by the client
-- for rejections only it can see (permission denied, biometric failed).
create table public.attendance_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('check_in', 'check_out')),
  reason text not null,
  lat double precision,
  lng double precision,
  distance_meters double precision,
  created_at timestamptz not null default now()
);

create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  annual_days numeric not null check (annual_days >= 0),
  is_paid boolean not null default true
);

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  year int not null,
  allocated numeric not null default 0,
  used numeric not null default 0,
  unique (user_id, leave_type_id, year)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id),
  from_date date not null,
  to_date date not null check (to_date >= from_date),
  half_day boolean not null default false,
  reason text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'manager_approved', 'approved', 'rejected')),
  manager_id uuid references public.profiles(id) on delete set null,
  manager_decided_at timestamptz,
  manager_comment text,
  hr_id uuid references public.profiles(id) on delete set null,
  hr_decided_at timestamptz,
  hr_comment text,
  created_at timestamptz not null default now()
);

create table public.regularization_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  punch_date date not null,
  type text not null check (type in ('check_in', 'check_out')),
  requested_time timestamptz not null,
  reason text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'manager_approved', 'approved', 'rejected')),
  manager_id uuid references public.profiles(id) on delete set null,
  manager_decided_at timestamptz,
  manager_comment text,
  hr_id uuid references public.profiles(id) on delete set null,
  hr_decided_at timestamptz,
  hr_comment text,
  created_at timestamptz not null default now()
);

create table public.consents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  accepted_at timestamptz not null default now()
);

-- Read-only audit trail. Written only by triggers below.
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create function public.is_hr()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'hr');
$$;

create function public.is_attendance_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_manager() or public.is_hr();
$$;

-- Haversine distance in metres. Mirrored by src/attendance/rules.ts for the
-- app's own on-screen "you look X m away" hint; the server copy here is the
-- one that actually decides whether a punch is accepted.
create function public.distance_meters(
  lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision
) returns double precision language sql immutable as $$
  select 6371000 * acos(
    least(1.0, greatest(-1.0,
      cos(radians(lat1)) * cos(radians(lat2)) * cos(radians(lng2) - radians(lng1)) +
      sin(radians(lat1)) * sin(radians(lat2))
    ))
  );
$$;

create function public.ist_date(ts timestamptz default now())
returns date language sql stable as $$
  select (ts at time zone 'Asia/Kolkata')::date;
$$;

-- Day-level attendance status for one employee. Used by the admin dashboard
-- and reports; the app's rules.ts implements the same table from PRD 5.4 for
-- rows it already has in memory, so the two must stay in sync by hand.
create function public.attendance_status_for(p_user_id uuid, p_date date)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  v_punch record;
  v_shift record;
  v_on_leave boolean;
  v_checkin_minutes int;
  v_shift_start_minutes int;
  v_shift_end_minutes int;
  v_now_minutes int;
  v_worked_minutes int;
begin
  if exists (select 1 from calendar_days where date = p_date) then
    return 'holiday_weekend';
  end if;

  select exists (
    select 1 from leave_requests lr
    where lr.user_id = p_user_id and lr.status = 'approved'
      and p_date between lr.from_date and lr.to_date
  ) into v_on_leave;
  if v_on_leave then
    return 'on_leave';
  end if;

  select * into v_punch from attendance_punches
  where user_id = p_user_id and punch_date = p_date;

  if v_punch is null or v_punch.check_in_at is null then
    return 'absent';
  end if;

  select s.* into v_shift
  from attendance_settings st
  join shifts s on s.id = st.shift_id
  where st.user_id = p_user_id;

  if v_shift is null then
    return 'present';
  end if;

  v_shift_start_minutes := extract(hour from v_shift.start_time)::int * 60
    + extract(minute from v_shift.start_time)::int;
  v_shift_end_minutes := extract(hour from v_shift.end_time)::int * 60
    + extract(minute from v_shift.end_time)::int;
  v_checkin_minutes := extract(hour from (v_punch.check_in_at at time zone 'Asia/Kolkata'))::int * 60
    + extract(minute from (v_punch.check_in_at at time zone 'Asia/Kolkata'))::int;

  if v_punch.check_out_at is null then
    v_now_minutes := extract(hour from (now() at time zone 'Asia/Kolkata'))::int * 60
      + extract(minute from (now() at time zone 'Asia/Kolkata'))::int;
    if p_date < public.ist_date() or v_now_minutes > (v_shift_end_minutes + v_shift.grace_minutes) then
      return 'missing_checkout';
    end if;
  else
    v_worked_minutes := extract(epoch from (v_punch.check_out_at - v_punch.check_in_at)) / 60;
    if v_worked_minutes < (v_shift.half_day_hours * 60) then
      return 'half_day';
    end if;
  end if;

  if v_checkin_minutes > (v_shift_start_minutes + v_shift.grace_minutes) then
    return 'late';
  end if;

  return 'present';
end;
$$;

-- ---------------------------------------------------------------------------
-- Attendance: punches and attempts
-- ---------------------------------------------------------------------------

create function public.log_attendance_attempt(
  p_type text, p_reason text, p_lat double precision default null, p_lng double precision default null,
  p_distance_meters double precision default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  insert into attendance_attempts (user_id, type, reason, lat, lng, distance_meters)
  values (auth.uid(), p_type, p_reason, p_lat, p_lng, p_distance_meters);
end;
$$;

-- The one entry point the app calls to punch in/out. Every rejection comes
-- back as {ok:false, reason, message} — never a raised exception — so the
-- client can show a specific reason without parsing a Postgres error.
create function public.record_punch(
  p_punch_type text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_method text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_date date := public.ist_date();
  v_settings record;
  v_office record;
  v_punch record;
  v_distance double precision;
begin
  if p_punch_type not in ('check_in', 'check_out') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_type', 'message', 'Unknown punch type.');
  end if;

  -- The only accepted verification method is the phone's own biometric
  -- check (PRD 5.2 change, 2026-11-05) — regularized punches never go
  -- through this function, so there is no other value to allow here.
  if p_method is distinct from 'biometric' then
    perform public.log_attendance_attempt(p_punch_type, 'invalid_method', p_lat, p_lng);
    return jsonb_build_object('ok', false, 'reason', 'invalid_method', 'message', 'Verify with fingerprint or Face Unlock.');
  end if;

  if exists (select 1 from calendar_days where date = v_date) then
    perform public.log_attendance_attempt(p_punch_type, 'non_working_day', p_lat, p_lng);
    return jsonb_build_object('ok', false, 'reason', 'non_working_day', 'message', 'No punch is required today.');
  end if;

  select * into v_settings from attendance_settings where user_id = v_uid;
  if v_settings is null then
    perform public.log_attendance_attempt(p_punch_type, 'no_settings', p_lat, p_lng);
    return jsonb_build_object('ok', false, 'reason', 'no_settings', 'message', 'Attendance is not set up for your account yet.');
  end if;

  if v_settings.work_mode = 'office' then
    if p_lat is null or p_lng is null then
      perform public.log_attendance_attempt(p_punch_type, 'location_denied', p_lat, p_lng);
      return jsonb_build_object('ok', false, 'reason', 'location_denied', 'message', 'Location is required to punch.');
    end if;

    select * into v_office from offices where id = v_settings.office_id;
    if v_office is null then
      perform public.log_attendance_attempt(p_punch_type, 'no_office', p_lat, p_lng);
      return jsonb_build_object('ok', false, 'reason', 'no_office', 'message', 'No office is assigned to your account.');
    end if;

    v_distance := public.distance_meters(p_lat, p_lng, v_office.latitude, v_office.longitude);
    if v_distance > v_office.radius_meters then
      perform public.log_attendance_attempt(p_punch_type, 'outside_radius', p_lat, p_lng, v_distance);
      return jsonb_build_object(
        'ok', false, 'reason', 'outside_radius',
        'message', 'You are outside the office radius.',
        'distance_meters', v_distance
      );
    end if;
  end if;

  select * into v_punch from attendance_punches where user_id = v_uid and punch_date = v_date;

  if p_punch_type = 'check_in' then
    if v_punch is not null and v_punch.check_in_at is not null then
      perform public.log_attendance_attempt(p_punch_type, 'already_checked_in', p_lat, p_lng);
      return jsonb_build_object('ok', false, 'reason', 'already_checked_in', 'message', 'You already checked in today.');
    end if;

    if v_punch is null then
      insert into attendance_punches (
        user_id, punch_date, work_mode, check_in_at, check_in_method, check_in_lat, check_in_lng
      ) values (
        v_uid, v_date, v_settings.work_mode, now(), p_method, p_lat, p_lng
      ) returning * into v_punch;
    else
      update attendance_punches set
        check_in_at = now(), check_in_method = p_method, check_in_lat = p_lat, check_in_lng = p_lng,
        work_mode = v_settings.work_mode
      where id = v_punch.id
      returning * into v_punch;
    end if;

    return jsonb_build_object('ok', true, 'punch_id', v_punch.id, 'check_in_at', v_punch.check_in_at);
  else
    if v_punch is null or v_punch.check_in_at is null then
      perform public.log_attendance_attempt(p_punch_type, 'no_check_in', p_lat, p_lng);
      return jsonb_build_object('ok', false, 'reason', 'no_check_in', 'message', 'Check in before checking out.');
    end if;

    if v_punch.check_out_at is not null then
      perform public.log_attendance_attempt(p_punch_type, 'already_checked_out', p_lat, p_lng);
      return jsonb_build_object('ok', false, 'reason', 'already_checked_out', 'message', 'You already checked out today.');
    end if;

    update attendance_punches set
      check_out_at = now(), check_out_method = p_method, check_out_lat = p_lat, check_out_lng = p_lng
    where id = v_punch.id
    returning * into v_punch;

    return jsonb_build_object('ok', true, 'punch_id', v_punch.id, 'check_out_at', v_punch.check_out_at);
  end if;
exception
  when unique_violation then
    perform public.log_attendance_attempt(p_punch_type, 'already_checked_in', p_lat, p_lng);
    return jsonb_build_object('ok', false, 'reason', 'already_checked_in', 'message', 'You already checked in today.');
  when others then
    perform public.log_attendance_attempt(p_punch_type, 'error', p_lat, p_lng);
    return jsonb_build_object('ok', false, 'reason', 'error', 'message', 'Something went wrong. Please try again.');
end;
$$;

-- ---------------------------------------------------------------------------
-- Leave: apply + two-step approval (manager, then HR)
-- ---------------------------------------------------------------------------

create function public.apply_leave_request(
  p_leave_type_id uuid, p_from date, p_to date, p_half_day boolean, p_reason text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_overlap boolean;
begin
  if p_to < p_from then
    return jsonb_build_object('ok', false, 'reason', 'invalid_dates', 'message', 'End date must be on or after the start date.');
  end if;

  select exists (
    select 1 from leave_requests
    where user_id = v_uid
      and status in ('pending', 'manager_approved', 'approved')
      and daterange(from_date, to_date, '[]') && daterange(p_from, p_to, '[]')
  ) into v_overlap;

  if v_overlap then
    return jsonb_build_object('ok', false, 'reason', 'overlap', 'message', 'This overlaps a pending or approved request.');
  end if;

  insert into leave_requests (user_id, leave_type_id, from_date, to_date, half_day, reason, status)
  values (v_uid, p_leave_type_id, p_from, p_to, coalesce(p_half_day, false), coalesce(p_reason, ''), 'pending')
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create function public.decide_leave_request(
  p_request_id uuid, p_stage text, p_decision text, p_comment text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_req record;
  v_days numeric;
  v_year int;
  v_balance record;
begin
  if p_stage not in ('manager', 'hr') or p_decision not in ('approve', 'reject') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input', 'message', 'Invalid stage or decision.');
  end if;

  select * into v_req from leave_requests where id = p_request_id;
  if v_req is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'Request not found.');
  end if;

  if p_stage = 'manager' then
    if not exists (select 1 from profiles where id = auth.uid() and role = 'manager') then
      return jsonb_build_object('ok', false, 'reason', 'forbidden', 'message', 'Only a manager can give stage-1 approval.');
    end if;
    if v_req.status <> 'pending' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_state', 'message', 'This request is not pending.');
    end if;

    update leave_requests set
      status = case when p_decision = 'approve' then 'manager_approved' else 'rejected' end,
      manager_id = auth.uid(), manager_decided_at = now(), manager_comment = p_comment
    where id = p_request_id;

    return jsonb_build_object('ok', true);
  end if;

  -- stage = hr
  if not exists (select 1 from profiles where id = auth.uid() and role = 'hr') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden', 'message', 'Only HR can give final approval.');
  end if;
  if v_req.status <> 'manager_approved' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_state', 'message', 'This request needs manager approval first.');
  end if;

  if p_decision = 'reject' then
    update leave_requests set
      status = 'rejected', hr_id = auth.uid(), hr_decided_at = now(), hr_comment = p_comment
    where id = p_request_id;
    return jsonb_build_object('ok', true);
  end if;

  v_days := case when v_req.half_day then 0.5 else (v_req.to_date - v_req.from_date + 1)::numeric end;
  v_year := extract(year from v_req.from_date);

  select * into v_balance from leave_balances
  where user_id = v_req.user_id and leave_type_id = v_req.leave_type_id and year = v_year;

  if v_balance is null or (v_balance.allocated - v_balance.used) < v_days then
    return jsonb_build_object('ok', false, 'reason', 'insufficient_balance', 'message', 'Not enough leave balance remaining.');
  end if;

  update leave_balances set used = used + v_days where id = v_balance.id;

  update leave_requests set
    status = 'approved', hr_id = auth.uid(), hr_decided_at = now(), hr_comment = p_comment
  where id = p_request_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- HR-only bulk action: "Leave types and yearly balance initialisation" (PRD 5.8).
create function public.initialize_leave_balances(p_year int)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'hr') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden', 'message', 'Only HR can initialise balances.');
  end if;

  insert into leave_balances (user_id, leave_type_id, year, allocated, used)
  select p.id, lt.id, p_year, lt.annual_days, 0
  from profiles p
  cross join leave_types lt
  on conflict (user_id, leave_type_id, year) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Regularization: apply + two-step approval (manager, then HR)
-- ---------------------------------------------------------------------------

create function public.apply_regularization_request(
  p_punch_date date, p_type text, p_requested_time timestamptz, p_reason text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_punch record;
begin
  if p_type not in ('check_in', 'check_out') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_type', 'message', 'Unknown punch type.');
  end if;

  select * into v_punch from attendance_punches where user_id = v_uid and punch_date = p_punch_date;

  if p_type = 'check_in' and v_punch is not null and v_punch.check_in_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_recorded', 'message', 'A check-in already exists for that date.');
  end if;
  if p_type = 'check_out' and v_punch is not null and v_punch.check_out_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_recorded', 'message', 'A check-out already exists for that date.');
  end if;

  insert into regularization_requests (user_id, punch_date, type, requested_time, reason, status)
  values (v_uid, p_punch_date, p_type, p_requested_time, coalesce(p_reason, ''), 'pending')
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create function public.decide_regularization_request(
  p_request_id uuid, p_stage text, p_decision text, p_comment text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_req record;
  v_punch record;
begin
  if p_stage not in ('manager', 'hr') or p_decision not in ('approve', 'reject') then
    return jsonb_build_object('ok', false, 'reason', 'invalid_input', 'message', 'Invalid stage or decision.');
  end if;

  select * into v_req from regularization_requests where id = p_request_id;
  if v_req is null then
    return jsonb_build_object('ok', false, 'reason', 'not_found', 'message', 'Request not found.');
  end if;

  if p_stage = 'manager' then
    if not exists (select 1 from profiles where id = auth.uid() and role = 'manager') then
      return jsonb_build_object('ok', false, 'reason', 'forbidden', 'message', 'Only a manager can give stage-1 approval.');
    end if;
    if v_req.status <> 'pending' then
      return jsonb_build_object('ok', false, 'reason', 'invalid_state', 'message', 'This request is not pending.');
    end if;

    update regularization_requests set
      status = case when p_decision = 'approve' then 'manager_approved' else 'rejected' end,
      manager_id = auth.uid(), manager_decided_at = now(), manager_comment = p_comment
    where id = p_request_id;

    return jsonb_build_object('ok', true);
  end if;

  if not exists (select 1 from profiles where id = auth.uid() and role = 'hr') then
    return jsonb_build_object('ok', false, 'reason', 'forbidden', 'message', 'Only HR can give final approval.');
  end if;
  if v_req.status <> 'manager_approved' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_state', 'message', 'This request needs manager approval first.');
  end if;

  if p_decision = 'reject' then
    update regularization_requests set
      status = 'rejected', hr_id = auth.uid(), hr_decided_at = now(), hr_comment = p_comment
    where id = p_request_id;
    return jsonb_build_object('ok', true);
  end if;

  select * into v_punch from attendance_punches where user_id = v_req.user_id and punch_date = v_req.punch_date;

  if v_req.type = 'check_in' then
    if v_punch is null then
      insert into attendance_punches (user_id, punch_date, work_mode, check_in_at, check_in_method)
      values (
        v_req.user_id, v_req.punch_date,
        coalesce((select work_mode from attendance_settings where user_id = v_req.user_id), 'office'),
        v_req.requested_time, 'regularized'
      );
    elsif v_punch.check_in_at is null then
      update attendance_punches set check_in_at = v_req.requested_time, check_in_method = 'regularized'
      where id = v_punch.id;
    else
      return jsonb_build_object('ok', false, 'reason', 'already_recorded', 'message', 'A check-in already exists for that date.');
    end if;
  else
    if v_punch is null or v_punch.check_in_at is null then
      return jsonb_build_object('ok', false, 'reason', 'no_check_in', 'message', 'There is no check-in on that date to pair with.');
    elsif v_punch.check_out_at is null then
      update attendance_punches set check_out_at = v_req.requested_time, check_out_method = 'regularized'
      where id = v_punch.id;
    else
      return jsonb_build_object('ok', false, 'reason', 'already_recorded', 'message', 'A check-out already exists for that date.');
    end if;
  end if;

  update regularization_requests set
    status = 'approved', hr_id = auth.uid(), hr_decided_at = now(), hr_comment = p_comment
  where id = p_request_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Provisioning + enforcement triggers
-- ---------------------------------------------------------------------------

-- Every new profile gets a default attendance_settings row (office mode,
-- the seeded "General" shift) so HR only has to adjust it, not create it,
-- per employee.
create function public.provision_attendance_settings()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_shift_id uuid;
begin
  select id into v_shift_id from shifts where name = 'General' limit 1;
  insert into attendance_settings (user_id, work_mode, shift_id, verification_method)
  values (new.id, 'office', v_shift_id, 'biometric')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger profiles_provision_attendance
  after insert on public.profiles
  for each row execute function public.provision_attendance_settings();

-- Office, shift, and work mode on this row are HR-only.
create function public.enforce_attendance_settings_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_hr() then
    return new;
  end if;
  if (new.work_mode, new.office_id, new.shift_id, new.user_id, new.is_active) is distinct from
     (old.work_mode, old.office_id, old.shift_id, old.user_id, old.is_active) then
    raise exception 'Only HR can change office, shift, work mode, or active status.';
  end if;
  return new;
end;
$$;

create trigger attendance_settings_enforce_update
  before update on public.attendance_settings
  for each row execute function public.enforce_attendance_settings_update();

-- ---------------------------------------------------------------------------
-- Audit log triggers (PRD 5.8: every change to offices, shifts, settings,
-- calendar, leave types, and leave/regularization decisions).
-- ---------------------------------------------------------------------------

create function public.log_audit_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (actor_id, action, entity, entity_id, old_data, new_data)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger offices_audit after insert or update or delete on public.offices
  for each row execute function public.log_audit_change();
create trigger shifts_audit after insert or update or delete on public.shifts
  for each row execute function public.log_audit_change();
create trigger calendar_days_audit after insert or update or delete on public.calendar_days
  for each row execute function public.log_audit_change();
create trigger leave_types_audit after insert or update or delete on public.leave_types
  for each row execute function public.log_audit_change();
create trigger attendance_settings_audit after update on public.attendance_settings
  for each row execute function public.log_audit_change();
create trigger leave_requests_audit after update on public.leave_requests
  for each row execute function public.log_audit_change();
create trigger regularization_requests_audit after update on public.regularization_requests
  for each row execute function public.log_audit_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.offices enable row level security;
alter table public.shifts enable row level security;
alter table public.attendance_settings enable row level security;
alter table public.calendar_days enable row level security;
alter table public.attendance_punches enable row level security;
alter table public.attendance_attempts enable row level security;
alter table public.leave_types enable row level security;
alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;
alter table public.regularization_requests enable row level security;
alter table public.consents enable row level security;
alter table public.audit_logs enable row level security;

-- Offices, shifts, leave types, calendar: read-only company reference data
-- for everyone signed in; only HR writes them (via plain table writes, so
-- RLS enforces it directly rather than through a function).
create policy "offices select" on public.offices for select to authenticated using (true);
create policy "offices write" on public.offices for all to authenticated
  using (public.is_hr()) with check (public.is_hr());

create policy "shifts select" on public.shifts for select to authenticated using (true);
create policy "shifts write" on public.shifts for all to authenticated
  using (public.is_hr()) with check (public.is_hr());

create policy "leave types select" on public.leave_types for select to authenticated using (true);
create policy "leave types write" on public.leave_types for all to authenticated
  using (public.is_hr()) with check (public.is_hr());

-- Calendar is the one setup table managers may also write (PRD Part 5,
-- 2026-11-05 change — every other setup table stays HR-only).
create policy "calendar select" on public.calendar_days for select to authenticated using (true);
create policy "calendar write" on public.calendar_days for all to authenticated
  using (public.is_attendance_admin()) with check (public.is_attendance_admin());

-- attendance_settings: self or admin can read; update policy lets an
-- employee through (the trigger above then restricts which columns they
-- may actually change), HR through unconditionally. No insert/delete
-- policy — rows are created only by the provisioning trigger.
create policy "attendance settings select" on public.attendance_settings for select to authenticated
  using (user_id = auth.uid() or public.is_attendance_admin());
create policy "attendance settings update" on public.attendance_settings for update to authenticated
  using (user_id = auth.uid() or public.is_hr())
  with check (user_id = auth.uid() or public.is_hr());

-- attendance_punches: self or admin read-only. All writes go through
-- record_punch()/decide_regularization_request(), which run as the table
-- owner and so bypass RLS — there is deliberately no insert/update policy.
create policy "punches select" on public.attendance_punches for select to authenticated
  using (user_id = auth.uid() or public.is_attendance_admin());

-- attendance_attempts: admin-only read (per PRD 5.2, "for admin review").
create policy "attempts select" on public.attendance_attempts for select to authenticated
  using (public.is_attendance_admin());

-- leave_balances: self or admin read-only; written only via
-- initialize_leave_balances()/decide_leave_request().
create policy "leave balances select" on public.leave_balances for select to authenticated
  using (user_id = auth.uid() or public.is_attendance_admin());

-- leave_requests / regularization_requests: self or admin read-only;
-- written only via apply_*/decide_*() functions above.
create policy "leave requests select" on public.leave_requests for select to authenticated
  using (user_id = auth.uid() or public.is_attendance_admin());

create policy "regularization requests select" on public.regularization_requests for select to authenticated
  using (user_id = auth.uid() or public.is_attendance_admin());

-- consents: the employee records their own consent once (and may re-submit
-- if asked to re-consent later).
create policy "consents select" on public.consents for select to authenticated
  using (user_id = auth.uid() or public.is_attendance_admin());
create policy "consents insert" on public.consents for insert to authenticated
  with check (user_id = auth.uid());
create policy "consents update" on public.consents for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_logs: admin read-only, written only by triggers.
create policy "audit logs select" on public.audit_logs for select to authenticated
  using (public.is_attendance_admin());

-- ---------------------------------------------------------------------------
-- Seed data (PRD 10.2, 10.3, 5.3, 5.5)
-- ---------------------------------------------------------------------------

insert into public.leave_types (name, annual_days, is_paid) values
  ('Casual Leave', 12, true),
  ('Leave Without Pay', 6, false)
on conflict (name) do nothing;

insert into public.shifts (name, start_time, end_time, grace_minutes, half_day_hours) values
  ('General', '10:30', '19:30', 15, 4)
on conflict (name) do nothing;
