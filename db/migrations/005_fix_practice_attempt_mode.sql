-- Practice sessions are created with zero duration and one subject.
-- Keep the database mode aligned with the UI even if an older client sends cbt.

create or replace function public.normalize_practice_attempt_mode()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.mode = 'cbt'::attempt_mode
     and coalesce(new.duration_seconds, 0) = 0
     and coalesce(array_length(new.subject_ids, 1), 0) = 1
     and coalesce(nullif(new.config->>'question_count', '')::integer, 0) between 1 and 50
     and new.config->>'cbt' is null then
    new.mode := 'practice'::attempt_mode;
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_practice_attempt_mode on public.exam_attempts;

create trigger normalize_practice_attempt_mode
before insert or update of mode, duration_seconds, subject_ids, config
on public.exam_attempts
for each row
execute function public.normalize_practice_attempt_mode();

-- Repair practice attempts that were previously stored as cbt by the buggy route.
update public.exam_attempts
set mode = 'practice'::attempt_mode
where mode = 'cbt'::attempt_mode
  and coalesce(duration_seconds, 0) = 0
  and coalesce(array_length(subject_ids, 1), 0) = 1
  and coalesce(nullif(config->>'question_count', '')::integer, 0) between 1 and 50
  and config->>'cbt' is null;
