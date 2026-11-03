-- Task Updates (activity log) triggers.
-- Each function is security definer with search_path = public because
-- clients have no insert/update/delete policy on public.task_activity;
-- only these triggers may write to it.

-- Task created
create function public.log_task_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.task_activity (task_id, actor_id, kind, message)
  values (new.id, auth.uid(), 'created', 'Task created');
  return new;
end;
$$;

create trigger task_activity_created
  after insert on public.tasks
  for each row execute function public.log_task_created();

-- Status changed / due date changed / assignee changed
create function public.log_task_updated()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  assignee_name text;
begin
  if new.status is distinct from old.status then
    insert into public.task_activity (task_id, actor_id, kind, message)
    values (
      new.id, auth.uid(), 'status',
      'Status changed from ' || old.status || ' to ' || new.status
    );
  end if;

  if new.due_date is distinct from old.due_date then
    insert into public.task_activity (task_id, actor_id, kind, message)
    values (
      new.id, auth.uid(), 'due_date',
      case
        when new.due_date is null then 'Due date removed'
        else 'Due date changed to ' || to_char(new.due_date, 'YYYY-MM-DD HH24:MI')
      end
    );
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    if new.assignee_id is null then
      assignee_name := null;
    else
      select full_name into assignee_name from public.profiles where id = new.assignee_id;
    end if;

    insert into public.task_activity (task_id, actor_id, kind, message)
    values (
      new.id, auth.uid(), 'assignee',
      case
        when assignee_name is null then 'Unassigned'
        else 'Assigned to ' || assignee_name
      end
    );
  end if;

  return new;
end;
$$;

create trigger task_activity_updated
  after update on public.tasks
  for each row execute function public.log_task_updated();

-- Checklist item added
create function public.log_checklist_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.task_activity (task_id, actor_id, kind, message)
  values (new.task_id, auth.uid(), 'checklist', 'New point added (' || new.text || ')');
  return new;
end;
$$;

create trigger task_activity_checklist_created
  after insert on public.checklist_items
  for each row execute function public.log_checklist_created();

-- Checklist item ticked or unticked
create function public.log_checklist_updated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_done is distinct from old.is_done then
    insert into public.task_activity (task_id, actor_id, kind, message)
    values (
      new.task_id, auth.uid(), 'checklist',
      case
        when new.is_done then 'Marked done (' || new.text || ')'
        else 'Marked not done (' || new.text || ')'
      end
    );
  end if;
  return new;
end;
$$;

create trigger task_activity_checklist_updated
  after update on public.checklist_items
  for each row execute function public.log_checklist_updated();

-- Comment added
create function public.log_comment_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.task_activity (task_id, actor_id, kind, message)
  values (new.task_id, auth.uid(), 'comment', 'Comment added');
  return new;
end;
$$;

create trigger task_activity_comment_created
  after insert on public.comments
  for each row execute function public.log_comment_created();
