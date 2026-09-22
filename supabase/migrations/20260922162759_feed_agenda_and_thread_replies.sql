alter table public.feed_posts
  add column if not exists event_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feed_posts_event_id_fkey'
      and conrelid = 'public.feed_posts'::regclass
  ) then
    alter table public.feed_posts
      add constraint feed_posts_event_id_fkey
      foreign key (event_id)
      references public.events(id)
      on delete set null;
  end if;
end $$;

create index if not exists feed_posts_event_id_idx
  on public.feed_posts(event_id)
  where event_id is not null;

alter table public.feed_post_comments
  add column if not exists parent_comment_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'feed_post_comments_parent_comment_id_fkey'
      and conrelid = 'public.feed_post_comments'::regclass
  ) then
    alter table public.feed_post_comments
      add constraint feed_post_comments_parent_comment_id_fkey
      foreign key (parent_comment_id)
      references public.feed_post_comments(id)
      on delete cascade;
  end if;
end $$;

create index if not exists feed_post_comments_parent_comment_id_idx
  on public.feed_post_comments(parent_comment_id)
  where parent_comment_id is not null;
