-- Internal community feed: only active members can read, while club officers publish.
create type public.feed_post_status as enum ('draft', 'published', 'archived');

create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  link_url text check (link_url is null or link_url ~* '^https?://'),
  status public.feed_post_status not null default 'draft',
  is_pinned boolean not null default false,
  comments_locked boolean not null default false,
  author_id uuid not null references auth.users(id) on delete restrict,
  author_name text not null,
  author_role public.app_role not null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feed_posts_timeline_idx
  on public.feed_posts (is_pinned desc, published_at desc)
  where status = 'published';

create table public.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  object_path text not null unique,
  alt_text text not null default 'Dokumentasi Revolt Riders',
  sort_order smallint not null default 0 check (sort_order between 0 and 3),
  created_at timestamptz not null default now(),
  unique (post_id, sort_order)
);

create index feed_post_media_post_idx on public.feed_post_media (post_id, sort_order);

create table public.feed_post_likes (
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index feed_post_likes_post_idx on public.feed_post_likes (post_id, created_at desc);

create table public.feed_post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_role public.app_role not null,
  created_at timestamptz not null default now()
);

create index feed_post_comments_post_idx on public.feed_post_comments (post_id, created_at desc);

create or replace function private.feed_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
  );
$$;

revoke all on function private.feed_active_member() from public;

create or replace function private.populate_feed_post_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_role public.app_role;
begin
  select coalesce(md.nickname_override, mp.nickname, mp.full_name, ma.member_external_id), ma.role
  into v_name, v_role
  from public.member_accounts ma
  left join public.member_profiles mp on mp.member_external_id = ma.member_external_id
  left join public.member_details md on md.member_external_id = ma.member_external_id
  where ma.user_id = (select auth.uid())
    and ma.status = 'active'::public.account_status;

  if v_role is null or v_role not in ('road_captain'::public.app_role, 'admin'::public.app_role, 'superadmin'::public.app_role) then
    raise exception 'Hanya pengurus aktif yang dapat membuat post.';
  end if;

  new.author_id := (select auth.uid());
  new.author_name := coalesce(v_name, 'Pengurus Revolt');
  new.author_role := v_role;
  new.updated_at := now();
  if new.status = 'published'::public.feed_post_status and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create or replace function private.prepare_feed_post_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'published'::public.feed_post_status and old.published_at is null then
    new.published_at := now();
  end if;
  if new.is_pinned then
    update public.feed_posts
    set is_pinned = false, updated_at = now()
    where id <> new.id and is_pinned = true;
  end if;
  return new;
end;
$$;

create or replace function private.populate_feed_comment_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_role public.app_role;
  v_locked boolean;
  v_published boolean;
begin
  if not private.feed_active_member() then
    raise exception 'Akun member aktif diperlukan untuk berkomentar.';
  end if;

  select comments_locked, status = 'published'::public.feed_post_status
  into v_locked, v_published
  from public.feed_posts
  where id = new.post_id;

  if not coalesce(v_published, false) or coalesce(v_locked, false) then
    raise exception 'Komentar untuk post ini sedang ditutup.';
  end if;

  select coalesce(md.nickname_override, mp.nickname, mp.full_name, ma.member_external_id), ma.role
  into v_name, v_role
  from public.member_accounts ma
  left join public.member_profiles mp on mp.member_external_id = ma.member_external_id
  left join public.member_details md on md.member_external_id = ma.member_external_id
  where ma.user_id = (select auth.uid())
    and ma.status = 'active'::public.account_status;

  new.author_id := (select auth.uid());
  new.author_name := coalesce(v_name, 'Member Revolt');
  new.author_role := v_role;
  return new;
end;
$$;

revoke all on function private.populate_feed_post_author() from public;
revoke all on function private.prepare_feed_post_update() from public;
revoke all on function private.populate_feed_comment_author() from public;

create trigger feed_post_author_before_insert
  before insert on public.feed_posts
  for each row execute function private.populate_feed_post_author();

create trigger feed_post_prepare_before_update
  before update on public.feed_posts
  for each row execute function private.prepare_feed_post_update();

create trigger feed_comment_author_before_insert
  before insert on public.feed_post_comments
  for each row execute function private.populate_feed_comment_author();

alter table public.feed_posts enable row level security;
alter table public.feed_post_media enable row level security;
alter table public.feed_post_likes enable row level security;
alter table public.feed_post_comments enable row level security;

grant select, insert, update on public.feed_posts to authenticated;
grant select, insert, delete on public.feed_post_media to authenticated;
grant select, insert, delete on public.feed_post_likes to authenticated;
grant select, insert, delete on public.feed_post_comments to authenticated;

create policy feed_posts_read on public.feed_posts
for select to authenticated using (
  private.feed_active_member()
  and (
    status = 'published'::public.feed_post_status
    or author_id = (select auth.uid())
    or private.has_role(array['admin','superadmin']::public.app_role[])
  )
);

create policy feed_posts_create on public.feed_posts
for insert to authenticated with check (
  private.has_role(array['road_captain','admin','superadmin']::public.app_role[])
  and author_id = (select auth.uid())
);

create policy feed_posts_update on public.feed_posts
for update to authenticated using (
  author_id = (select auth.uid())
  or private.has_role(array['admin','superadmin']::public.app_role[])
) with check (
  private.has_role(array['road_captain','admin','superadmin']::public.app_role[])
  and (
    author_id = (select auth.uid())
    or private.has_role(array['admin','superadmin']::public.app_role[])
  )
);

create policy feed_media_read on public.feed_post_media
for select to authenticated using (private.feed_active_member());

create policy feed_media_manage on public.feed_post_media
for all to authenticated using (
  exists (
    select 1 from public.feed_posts fp
    where fp.id = feed_post_media.post_id
      and (fp.author_id = (select auth.uid()) or private.has_role(array['admin','superadmin']::public.app_role[]))
  )
) with check (
  exists (
    select 1 from public.feed_posts fp
    where fp.id = feed_post_media.post_id
      and (fp.author_id = (select auth.uid()) or private.has_role(array['admin','superadmin']::public.app_role[]))
  )
);

create policy feed_likes_read on public.feed_post_likes
for select to authenticated using (private.feed_active_member());

create policy feed_likes_create on public.feed_post_likes
for insert to authenticated with check (
  private.feed_active_member() and user_id = (select auth.uid())
);

create policy feed_likes_remove on public.feed_post_likes
for delete to authenticated using (user_id = (select auth.uid()));

create policy feed_comments_read on public.feed_post_comments
for select to authenticated using (private.feed_active_member());

create policy feed_comments_create on public.feed_post_comments
for insert to authenticated with check (
  private.feed_active_member() and author_id = (select auth.uid())
);

create policy feed_comments_remove on public.feed_post_comments
for delete to authenticated using (
  author_id = (select auth.uid())
  or private.has_role(array['road_captain','admin','superadmin']::public.app_role[])
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-feed', 'community-feed', false, 8388608,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Active members can read feed media"
on storage.objects for select to authenticated using (
  bucket_id = 'community-feed' and private.feed_active_member()
);

create policy "Officers can upload feed media"
on storage.objects for insert to authenticated with check (
  bucket_id = 'community-feed'
  and private.has_role(array['road_captain','admin','superadmin']::public.app_role[])
);

create policy "Officers can delete feed media"
on storage.objects for delete to authenticated using (
  bucket_id = 'community-feed'
  and (
    owner_id = (select auth.uid()::text)
    or private.has_role(array['admin','superadmin']::public.app_role[])
  )
);

create trigger audit_feed_posts after insert or update or delete on public.feed_posts
  for each row execute function private.write_audit_log();
create trigger audit_feed_post_comments after insert or update or delete on public.feed_post_comments
  for each row execute function private.write_audit_log();
