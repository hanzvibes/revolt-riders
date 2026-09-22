alter table public.feed_posts
  add column if not exists like_count integer not null default 0,
  add column if not exists comment_count integer not null default 0;

alter table public.feed_posts
  drop constraint if exists feed_posts_like_count_nonnegative,
  drop constraint if exists feed_posts_comment_count_nonnegative;

alter table public.feed_posts
  add constraint feed_posts_like_count_nonnegative check (like_count >= 0),
  add constraint feed_posts_comment_count_nonnegative check (comment_count >= 0);

create or replace function private.prepare_feed_post_update()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_counter_only boolean;
begin
  v_counter_only :=
    (
      new.like_count is distinct from old.like_count
      or new.comment_count is distinct from old.comment_count
    )
    and new.body is not distinct from old.body
    and new.link_url is not distinct from old.link_url
    and new.status is not distinct from old.status
    and new.is_pinned is not distinct from old.is_pinned
    and new.comments_locked is not distinct from old.comments_locked
    and new.author_id is not distinct from old.author_id
    and new.author_name is not distinct from old.author_name
    and new.author_role is not distinct from old.author_role
    and new.published_at is not distinct from old.published_at
    and new.created_at is not distinct from old.created_at
    and new.event_id is not distinct from old.event_id;

  if not v_counter_only then
    new.updated_at := now();
  end if;

  if new.status = 'published'::public.feed_post_status
     and old.published_at is null then
    new.published_at := now();
  end if;

  if new.is_pinned and not old.is_pinned then
    update public.feed_posts
    set is_pinned = false,
        updated_at = now()
    where id <> new.id
      and is_pinned = true;
  end if;

  return new;
end;
$function$;

drop trigger if exists audit_feed_posts on public.feed_posts;
drop trigger if exists audit_feed_posts_update on public.feed_posts;

create trigger audit_feed_posts
  after insert or delete on public.feed_posts
  for each row
  execute function private.write_audit_log();

create trigger audit_feed_posts_update
  after update on public.feed_posts
  for each row
  when (
    old.body is distinct from new.body
    or old.link_url is distinct from new.link_url
    or old.status is distinct from new.status
    or old.is_pinned is distinct from new.is_pinned
    or old.comments_locked is distinct from new.comments_locked
    or old.author_id is distinct from new.author_id
    or old.author_name is distinct from new.author_name
    or old.author_role is distinct from new.author_role
    or old.published_at is distinct from new.published_at
    or old.event_id is distinct from new.event_id
  )
  execute function private.write_audit_log();

update public.feed_posts p
set
  like_count = (
    select count(*)::integer
    from public.feed_post_likes l
    where l.post_id = p.id
  ),
  comment_count = (
    select count(*)::integer
    from public.feed_post_comments c
    where c.post_id = p.id
  );

create or replace function private.sync_feed_post_like_count()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts
    set like_count = like_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.feed_posts
  set like_count = greatest(0, like_count - 1)
  where id = old.post_id;
  return old;
end;
$function$;

create or replace function private.sync_feed_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if tg_op = 'INSERT' then
    update public.feed_posts
    set comment_count = comment_count + 1
    where id = new.post_id;
    return new;
  end if;

  update public.feed_posts
  set comment_count = greatest(0, comment_count - 1)
  where id = old.post_id;
  return old;
end;
$function$;

revoke all on function private.sync_feed_post_like_count() from public;
revoke all on function private.sync_feed_post_comment_count() from public;

drop trigger if exists feed_post_likes_counter_after_change
  on public.feed_post_likes;
create trigger feed_post_likes_counter_after_change
  after insert or delete on public.feed_post_likes
  for each row
  execute function private.sync_feed_post_like_count();

drop trigger if exists feed_post_comments_counter_after_change
  on public.feed_post_comments;
create trigger feed_post_comments_counter_after_change
  after insert or delete on public.feed_post_comments
  for each row
  execute function private.sync_feed_post_comment_count();
