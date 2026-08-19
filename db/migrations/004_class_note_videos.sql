-- Optional video lesson URL for each published class note.
-- Run this migration in the Supabase SQL editor before using the video field.
alter table public.class_notes
  add column if not exists video_url text;

create index if not exists idx_class_notes_video_url
  on public.class_notes(video_url)
  where video_url is not null;
