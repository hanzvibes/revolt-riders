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

  return new;
end;
$function$;

create or replace function private.enforce_feed_pin_limit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not new.is_pinned
     or new.status <> 'published'::public.feed_post_status then
    return new;
  end if;

  update public.feed_posts
  set is_pinned = false
  where id in (
    select fp.id
    from public.feed_posts fp
    where fp.id <> new.id
      and fp.is_pinned = true
      and fp.status = 'published'::public.feed_post_status
    order by coalesce(fp.published_at, fp.created_at) desc,
             fp.created_at desc,
             fp.id desc
    offset 1
  );

  return new;
end;
$function$;

revoke all on function private.enforce_feed_pin_limit() from public;

drop trigger if exists feed_post_pin_limit_after_insert
  on public.feed_posts;
create trigger feed_post_pin_limit_after_insert
  after insert on public.feed_posts
  for each row
  when (
    new.is_pinned = true
    and new.status = 'published'::public.feed_post_status
  )
  execute function private.enforce_feed_pin_limit();

drop trigger if exists feed_post_pin_limit_after_update
  on public.feed_posts;
create trigger feed_post_pin_limit_after_update
  after update of is_pinned, status on public.feed_posts
  for each row
  when (
    new.is_pinned = true
    and new.status = 'published'::public.feed_post_status
    and (
      old.is_pinned is distinct from new.is_pinned
      or old.status is distinct from new.status
    )
  )
  execute function private.enforce_feed_pin_limit();
