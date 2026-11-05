-- ============================================================================
-- Attendance Module acceptance tests (PRD section 14).
--
-- Run this ONLY against a local or disposable test Supabase project, as the
-- postgres (owner) role, AFTER supabase/schema.sql, supabase/activity.sql,
-- and supabase/attendance.sql (including its step-0 statement) have been
-- applied. The whole script runs inside one transaction that is rolled back
-- at the end, so it never leaves fixture data behind — safe to re-run.
--
-- Not covered here (not DB-testable in isolation):
--   AC1  "checked only on first login" is app/client behavior (AttendanceGate
--        runs once on sign-in/cold start), not a database rule.
--   AC10 "public sign-up unavailable" is a Supabase Auth dashboard setting.
--   AC12 "all existing task features work as before" is covered by the
--        existing jest suite (npm test) and manual regression, not this file.
-- ============================================================================

begin;

do $$
declare
  v_emp_radius uuid := gen_random_uuid();
  v_emp_once uuid := gen_random_uuid();
  v_emp_wfh uuid := gen_random_uuid();
  v_emp_missing uuid := gen_random_uuid();
  v_emp_holiday uuid := gen_random_uuid();
  v_emp_leave uuid := gen_random_uuid();
  v_manager uuid := gen_random_uuid();
  v_hr uuid := gen_random_uuid();
  v_office_id uuid;
  v_shift_id uuid;
  v_leave_type_id uuid;
  v_result jsonb;
  v_req_id uuid;
  v_count int;
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_yesterday date := v_today - 1;
begin
  -- -------------------------------------------------------------------
  -- Fixtures. Inserting into auth.users fires handle_new_user() (creates
  -- the profile) and, via that, provision_attendance_settings() (creates
  -- the settings row) — so we only UPDATE profiles/attendance_settings
  -- below, never INSERT them directly.
  -- -------------------------------------------------------------------
  insert into auth.users (id, email) values
    (v_emp_radius, 'radius@test.local'),
    (v_emp_once, 'once@test.local'),
    (v_emp_wfh, 'wfh@test.local'),
    (v_emp_missing, 'missing@test.local'),
    (v_emp_holiday, 'holiday@test.local'),
    (v_emp_leave, 'leave@test.local'),
    (v_manager, 'manager@test.local'),
    (v_hr, 'hr@test.local');

  update public.profiles set full_name = 'Radius Test', role = 'employee' where id = v_emp_radius;
  update public.profiles set full_name = 'Once Test', role = 'employee' where id = v_emp_once;
  update public.profiles set full_name = 'WFH Test', role = 'employee' where id = v_emp_wfh;
  update public.profiles set full_name = 'Missing Checkout Test', role = 'employee' where id = v_emp_missing;
  update public.profiles set full_name = 'Holiday Test', role = 'employee' where id = v_emp_holiday;
  update public.profiles set full_name = 'Leave Test', role = 'employee' where id = v_emp_leave;
  update public.profiles set full_name = 'Manager One', role = 'manager' where id = v_manager;
  update public.profiles set full_name = 'HR One', role = 'hr' where id = v_hr;

  select id into v_shift_id from public.shifts where name = 'General';
  insert into public.offices (name, latitude, longitude, radius_meters)
  values ('Test HQ', 12.9716, 77.5946, 100)
  returning id into v_office_id;

  -- Impersonate HR (via jwt claims only — these are plain superuser UPDATEs,
  -- so RLS is irrelevant; is_hr() inside the settings trigger is what must
  -- see an HR actor to allow changing office/shift/work_mode).
  perform set_config('request.jwt.claims', json_build_object('sub', v_hr, 'role', 'authenticated')::text, true);
  update public.attendance_settings set office_id = v_office_id, work_mode = 'office', shift_id = v_shift_id
    where user_id in (v_emp_radius, v_emp_once, v_emp_missing, v_emp_holiday, v_emp_leave);
  update public.attendance_settings set work_mode = 'wfh', shift_id = v_shift_id where user_id = v_emp_wfh;
  perform set_config('request.jwt.claims', 'null', true);

  select id into v_leave_type_id from public.leave_types where name = 'Casual Leave';
  insert into public.leave_balances (user_id, leave_type_id, year, allocated, used)
  values (v_emp_leave, v_leave_type_id, extract(year from v_today)::int, 2, 0);

  -- -------------------------------------------------------------------
  -- AC2: an office employee outside the radius is blocked and logged,
  -- and can still open tasks (the rejection is a normal jsonb return,
  -- never a raised exception, so the app never crashes on it).
  -- -------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_emp_radius, 'role', 'authenticated')::text, true);
  select public.record_punch('check_in', 13.2000, 77.9000, 'fingerprint') into v_result;
  if (v_result->>'ok') = 'false' and v_result->>'reason' = 'outside_radius' then
    select count(*) into v_count from public.attendance_attempts
      where user_id = v_emp_radius and reason = 'outside_radius';
    if v_count = 1 then
      raise notice 'PASS AC2: outside-radius check-in rejected and logged';
    else
      raise notice 'FAIL AC2: rejected but attempt not logged (count=%)', v_count;
    end if;
  else
    raise notice 'FAIL AC2: expected outside_radius rejection, got %', v_result;
  end if;

  -- -------------------------------------------------------------------
  -- AC4: two check-ins on the same day create exactly one accepted record.
  -- -------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_emp_once, 'role', 'authenticated')::text, true);
  select public.record_punch('check_in', 12.9716, 77.5946, 'fingerprint') into v_result;
  if (v_result->>'ok') = 'true' then
    raise notice 'PASS AC4a: first check-in of the day accepted';
  else
    raise notice 'FAIL AC4a: first check-in rejected: %', v_result;
  end if;

  select public.record_punch('check_in', 12.9716, 77.5946, 'fingerprint') into v_result;
  select count(*) into v_count from public.attendance_punches where user_id = v_emp_once and punch_date = v_today;
  if (v_result->>'ok') = 'false' and v_count = 1 then
    raise notice 'PASS AC4b: second same-day check-in rejected; exactly one accepted record exists';
  else
    raise notice 'FAIL AC4b: second attempt result=%, record count=%', v_result, v_count;
  end if;

  -- -------------------------------------------------------------------
  -- AC3: a WFH employee can punch from anywhere; the record shows
  -- work mode WFH, with no radius check applied.
  -- -------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_emp_wfh, 'role', 'authenticated')::text, true);
  select public.record_punch('check_in', 1.0, 1.0, 'selfie') into v_result;
  select count(*) into v_count from public.attendance_punches
    where user_id = v_emp_wfh and punch_date = v_today and work_mode = 'wfh';
  if (v_result->>'ok') = 'true' and v_count = 1 then
    raise notice 'PASS AC3: WFH check-in from an arbitrary location accepted, recorded as WFH';
  else
    raise notice 'FAIL AC3: result=%, wfh record count=%', v_result, v_count;
  end if;

  -- -------------------------------------------------------------------
  -- AC5: a missing check-out appears (for a past day with no check-out).
  -- -------------------------------------------------------------------
  insert into public.attendance_punches (user_id, punch_date, work_mode, check_in_at, check_in_method)
  values (v_emp_missing, v_yesterday, 'office', (v_yesterday::timestamp + interval '10 hours 45 minutes') at time zone 'Asia/Kolkata', 'fingerprint');

  if public.attendance_status_for(v_emp_missing, v_yesterday) = 'missing_checkout' then
    raise notice 'PASS AC5: a check-in with no check-out on a past day is flagged missing_checkout';
  else
    raise notice 'FAIL AC5: status = %', public.attendance_status_for(v_emp_missing, v_yesterday);
  end if;

  -- -------------------------------------------------------------------
  -- AC6: no punch is required and no absence is marked on a holiday.
  -- (Marks TODAY as a holiday — run last among punch tests, since every
  -- later check-in attempt in this transaction will now also be blocked.)
  -- -------------------------------------------------------------------
  insert into public.calendar_days (date, kind, name) values (v_today, 'holiday', 'Test Holiday');

  perform set_config('request.jwt.claims', json_build_object('sub', v_emp_holiday, 'role', 'authenticated')::text, true);
  select public.record_punch('check_in', 12.9716, 77.5946, 'fingerprint') into v_result;
  if (v_result->>'ok') = 'false' and v_result->>'reason' = 'non_working_day'
     and public.attendance_status_for(v_emp_holiday, v_today) = 'holiday_weekend' then
    raise notice 'PASS AC6: no punch required/accepted on a holiday, and no absence is marked';
  else
    raise notice 'FAIL AC6: punch result=%, status=%', v_result, public.attendance_status_for(v_emp_holiday, v_today);
  end if;

  -- -------------------------------------------------------------------
  -- AC7: an employee cannot view another employee's attendance
  -- (requires RLS, so this probe actually switches Postgres role).
  -- -------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_emp_once, 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into v_count from public.attendance_punches where user_id = v_emp_wfh;
  reset role;

  if v_count = 0 then
    raise notice 'PASS AC7: an employee cannot see another employee''s attendance rows under RLS';
  else
    raise notice 'FAIL AC7: employee could see % row(s) belonging to another employee', v_count;
  end if;

  -- -------------------------------------------------------------------
  -- AC8 + AC9: leave flow, two-step approval, balance deduction, and
  -- the balance cap. v_emp_leave has a 2-day Casual Leave balance.
  -- -------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_emp_leave, 'role', 'authenticated')::text, true);
  select public.apply_leave_request(v_leave_type_id, v_today + 10, v_today + 10, false, 'Personal') into v_result;
  v_req_id := (v_result->>'id')::uuid;

  -- Manager cannot give final (HR-stage) approval.
  perform set_config('request.jwt.claims', json_build_object('sub', v_manager, 'role', 'authenticated')::text, true);
  select public.decide_leave_request(v_req_id, 'hr', 'approve', null) into v_result;
  if (v_result->>'ok') = 'false' and v_result->>'reason' = 'forbidden' then
    raise notice 'PASS AC8a: a manager cannot give the final (HR-stage) approval';
  else
    raise notice 'FAIL AC8a: manager HR-stage call returned %', v_result;
  end if;

  select public.decide_leave_request(v_req_id, 'manager', 'approve', 'Looks fine') into v_result;
  perform set_config('request.jwt.claims', json_build_object('sub', v_hr, 'role', 'authenticated')::text, true);
  select public.decide_leave_request(v_req_id, 'hr', 'approve', 'Approved') into v_result;

  select used into v_count from public.leave_balances
    where user_id = v_emp_leave and leave_type_id = v_leave_type_id and year = extract(year from v_today)::int;
  if (v_result->>'ok') = 'true' and v_count = 1 then
    raise notice 'PASS AC8b: employee applies, manager approves, HR approves, and 1 day is deducted from balance';
  else
    raise notice 'FAIL AC8b: final decision=%, balance used=%', v_result, v_count;
  end if;

  -- AC9: a second request for 3 days exceeds the 1 remaining day.
  perform set_config('request.jwt.claims', json_build_object('sub', v_emp_leave, 'role', 'authenticated')::text, true);
  select public.apply_leave_request(v_leave_type_id, v_today + 20, v_today + 22, false, 'Trip') into v_result;
  v_req_id := (v_result->>'id')::uuid;

  perform set_config('request.jwt.claims', json_build_object('sub', v_manager, 'role', 'authenticated')::text, true);
  perform public.decide_leave_request(v_req_id, 'manager', 'approve', null);

  perform set_config('request.jwt.claims', json_build_object('sub', v_hr, 'role', 'authenticated')::text, true);
  select public.decide_leave_request(v_req_id, 'hr', 'approve', null) into v_result;
  if (v_result->>'ok') = 'false' and v_result->>'reason' = 'insufficient_balance' then
    raise notice 'PASS AC9: HR cannot approve leave that would exceed the available balance';
  else
    raise notice 'FAIL AC9: result=%', v_result;
  end if;

  -- -------------------------------------------------------------------
  -- AC11: employees cannot open attendance admin screens or call
  -- approval functions (checked here at the function/RLS layer).
  -- -------------------------------------------------------------------
  perform set_config('request.jwt.claims', json_build_object('sub', v_emp_once, 'role', 'authenticated')::text, true);
  select public.decide_leave_request(gen_random_uuid(), 'manager', 'approve', null) into v_result;
  if (v_result->>'ok') = 'false' and v_result->>'reason' = 'forbidden' then
    raise notice 'PASS AC11a: an employee calling decide_leave_request is refused';
  else
    raise notice 'FAIL AC11a: result=%', v_result;
  end if;

  set local role authenticated;
  update public.offices set radius_meters = 999 where id = v_office_id;
  reset role;

  select radius_meters into v_count from public.offices where id = v_office_id;
  if v_count = 100 then
    raise notice 'PASS AC11b: an employee cannot write to offices directly (RLS silently blocks the row)';
  else
    raise notice 'FAIL AC11b: an employee changed offices.radius_meters to %', v_count;
  end if;

  raise notice '--- attendance acceptance tests complete ---';
end;
$$;

rollback;
