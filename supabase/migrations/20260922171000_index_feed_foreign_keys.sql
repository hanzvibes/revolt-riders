create index if not exists feed_post_comments_author_id_idx
  on public.feed_post_comments(author_id);

create index if not exists feed_post_likes_user_id_idx
  on public.feed_post_likes(user_id);

create index if not exists feed_posts_author_id_idx
  on public.feed_posts(author_id);
