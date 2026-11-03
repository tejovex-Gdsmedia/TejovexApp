-- Roles and statuses
create type public.user_role as enum ('manager', 'employee');

-- Profiles: one per auth user
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'employee',
  created_at timestamptz not null default now()
);

-- Tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  task_number bigint generated always as identity,
  title text not null check (length(title) between 1 and 200),
  description text not null default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'complete')),
  due_date timestamptz,
  end_date timestamptz,
  frequency text not null default 'none' check (frequency in ('none', 'daily', 'weekly', 'monthly')),
  frequency_note text not null default '',
  category text not null default '',
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Checklist items
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  text text not null check (length(text) between 1 and 300),
  is_done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- Subscribers (people who follow a task without being assigned)
create table public.task_subscribers (
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (task_id, user_id)
);

-- Reminders configured on a task
create table public.task_reminders (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  channel text not null check (channel in ('mobile', 'whatsapp')),
  offset_minutes int not null check (offset_minutes > 0)
);

-- Comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- Task Updates (activity log). Written only by triggers, never by the client.
create table public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- New sign-ups are always employees. The role is never read from the client.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'New user'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helpers (security definer so they can read tables without recursive RLS checks)
create function public.is_manager()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'manager');
$$;

create function public.can_view_task(tid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select public.is_manager()
    or exists (select 1 from public.tasks t where t.id = tid and t.assignee_id = auth.uid())
    or exists (select 1 from public.task_subscribers s where s.task_id = tid and s.user_id = auth.uid());
$$;

-- Employees may change only the status of tasks assigned to them
create function public.enforce_task_update()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if public.is_manager() then
    return new;
  end if;
  if (new.title, new.description, new.priority, new.due_date, new.end_date,
      new.frequency, new.frequency_note, new.category, new.assignee_id, new.created_by)
     is distinct from
     (old.title, old.description, old.priority, old.due_date, old.end_date,
      old.frequency, old.frequency_note, old.category, old.assignee_id, old.created_by) then
    raise exception 'Employees can only change the status of their tasks';
  end if;
  return new;
end;
$$;

create trigger tasks_enforce_update
  before update on public.tasks
  for each row execute function public.enforce_task_update();

-- Employees may only tick checklist items; managers edit the text
create function public.enforce_checklist_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.is_manager() then
    return new;
  end if;
  if (new.text, new.position, new.task_id) is distinct from (old.text, old.position, old.task_id) then
    raise exception 'Employees can only tick checklist items';
  end if;
  return new;
end;
$$;

create trigger checklist_enforce_update
  before update on public.checklist_items
  for each row execute function public.enforce_checklist_update();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.checklist_items enable row level security;
alter table public.task_subscribers enable row level security;
alter table public.task_reminders enable row level security;
alter table public.comments enable row level security;
alter table public.task_activity enable row level security;

-- Users can change their own name, never their role
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "own profile update" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "tasks select" on public.tasks for select to authenticated
  using (public.can_view_task(id));
create policy "managers create tasks" on public.tasks for insert to authenticated
  with check (public.is_manager() and created_by = auth.uid());
create policy "tasks update" on public.tasks for update to authenticated
  using (public.is_manager() or assignee_id = auth.uid())
  with check (public.is_manager() or assignee_id = auth.uid());
create policy "managers delete tasks" on public.tasks for delete to authenticated
  using (public.is_manager());

create policy "checklist select" on public.checklist_items for select to authenticated
  using (public.can_view_task(task_id));
create policy "managers add checklist" on public.checklist_items for insert to authenticated
  with check (public.is_manager());
create policy "checklist tick" on public.checklist_items for update to authenticated
  using (public.can_view_task(task_id)) with check (public.can_view_task(task_id));
create policy "managers delete checklist" on public.checklist_items for delete to authenticated
  using (public.is_manager());

create policy "subscribers select" on public.task_subscribers for select to authenticated
  using (public.can_view_task(task_id));
create policy "managers manage subscribers" on public.task_subscribers for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "reminders select" on public.task_reminders for select to authenticated
  using (public.can_view_task(task_id));
create policy "managers manage reminders" on public.task_reminders for all to authenticated
  using (public.is_manager()) with check (public.is_manager());

create policy "comments select" on public.comments for select to authenticated
  using (public.can_view_task(task_id));
create policy "comments insert" on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.can_view_task(task_id));
create policy "comments delete" on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_manager());

create policy "activity select" on public.task_activity for select to authenticated
  using (public.can_view_task(task_id));
-- No insert, update, or delete policies on task_activity: triggers write it.
