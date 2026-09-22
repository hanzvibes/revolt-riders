drop policy if exists feed_media_manage on public.feed_post_media;
drop policy if exists feed_media_read on public.feed_post_media;
drop policy if exists feed_media_insert on public.feed_post_media;
drop policy if exists feed_media_update on public.feed_post_media;
drop policy if exists feed_media_delete on public.feed_post_media;

create policy feed_media_read
  on public.feed_post_media
  for select
  to authenticated
  using (
    private.feed_active_member()
    or exists (
      select 1
      from public.feed_posts fp
      where fp.id = feed_post_media.post_id
        and (
          fp.author_id = (select auth.uid())
          or private.has_role(array['admin'::public.app_role, 'superadmin'::public.app_role])
        )
    )
  );

create policy feed_media_insert
  on public.feed_post_media
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.feed_posts fp
      where fp.id = feed_post_media.post_id
        and (
          fp.author_id = (select auth.uid())
          or private.has_role(array['admin'::public.app_role, 'superadmin'::public.app_role])
        )
    )
  );

create policy feed_media_update
  on public.feed_post_media
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.feed_posts fp
      where fp.id = feed_post_media.post_id
        and (
          fp.author_id = (select auth.uid())
          or private.has_role(array['admin'::public.app_role, 'superadmin'::public.app_role])
        )
    )
  )
  with check (
    exists (
      select 1
      from public.feed_posts fp
      where fp.id = feed_post_media.post_id
        and (
          fp.author_id = (select auth.uid())
          or private.has_role(array['admin'::public.app_role, 'superadmin'::public.app_role])
        )
    )
  );

create policy feed_media_delete
  on public.feed_post_media
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.feed_posts fp
      where fp.id = feed_post_media.post_id
        and (
          fp.author_id = (select auth.uid())
          or private.has_role(array['admin'::public.app_role, 'superadmin'::public.app_role])
        )
    )
  );
