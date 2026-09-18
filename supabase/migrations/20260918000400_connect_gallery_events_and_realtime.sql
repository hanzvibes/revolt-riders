-- ==============================================================================
-- REVOLT RIDERS: CONNECT GALLERY TO EVENTS & ENABLE REALTIME PUBLICATION
-- 1. Add event_id foreign key to public.club_gallery
-- 2. Add public.events & public.club_gallery to supabase_realtime publication
-- 3. Set REPLICA IDENTITY FULL for complete Realtime update/delete payloads
-- ==============================================================================

-- 1. Add event_id to public.club_gallery
alter table public.club_gallery
  add column if not exists event_id uuid references public.events(id) on delete set null;

create index if not exists idx_club_gallery_event_id on public.club_gallery(event_id);

-- 2. Add tables to supabase_realtime publication safely
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'club_gallery'
  ) then
    alter publication supabase_realtime add table public.club_gallery;
  end if;
end;
$$;

-- 3. Set REPLICA IDENTITY FULL for full payload on updates/deletes
alter table public.events replica identity full;
alter table public.club_gallery replica identity full;

-- 4. Optionally link existing gallery items to known events if matched
update public.club_gallery
set event_id = (select id from public.events where slug like 'baluran-fun-fight%' limit 1)
where (title ilike '%banyuwangi%' or title ilike '%rolling%')
  and event_id is null;
