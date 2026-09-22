-- RLS evaluates policy helper functions as the requesting database role.
-- Keep this helper private to the API, while allowing signed-in members to
-- execute it only as part of feed policy evaluation.
grant execute on function private.feed_active_member() to authenticated;
