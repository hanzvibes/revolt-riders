-- Performance hardening: preserve existing authorization semantics while
-- reducing per-row auth evaluation and adding covering indexes for foreign keys.

create index if not exists cash_transactions_import_batch_id_idx
  on public.cash_transactions (import_batch_id);
create index if not exists club_cash_transactions_created_by_idx
  on public.club_cash_transactions (created_by);
create index if not exists club_cash_transactions_voided_by_idx
  on public.club_cash_transactions (voided_by);
create index if not exists events_cancelled_by_idx
  on public.events (cancelled_by);
create index if not exists import_batches_imported_by_idx
  on public.import_batches (imported_by);
create index if not exists imported_ride_history_import_batch_id_idx
  on public.imported_ride_history (import_batch_id);
create index if not exists member_details_updated_by_idx
  on public.member_details (updated_by);
create index if not exists member_dues_import_batch_id_idx
  on public.member_dues (import_batch_id);
create index if not exists member_motorcycles_updated_by_idx
  on public.member_motorcycles (updated_by);
create index if not exists member_name_aliases_member_external_id_idx
  on public.member_name_aliases (member_external_id);

drop policy if exists "imported_rides_own_or_staff_read" on public.imported_ride_history;
create policy "imported_rides_own_or_staff_read"
on public.imported_ride_history
for select
to authenticated
using (
  exists (
    select 1
    from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.member_external_id = imported_ride_history.member_external_id
  )
  or private.has_role(array[
    'road_captain'::public.app_role,
    'admin'::public.app_role,
    'superadmin'::public.app_role
  ])
);

drop policy if exists "member_dues_own_or_staff_read" on public.member_dues;
create policy "member_dues_own_or_staff_read"
on public.member_dues
for select
to authenticated
using (
  exists (
    select 1
    from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.member_external_id = member_dues.member_external_id
  )
  or private.has_role(array[
    'treasurer'::public.app_role,
    'admin'::public.app_role,
    'superadmin'::public.app_role
  ])
);

drop policy if exists "Staff can manage club gallery" on public.club_gallery;
create policy "Staff can manage club gallery"
on public.club_gallery
for all
to authenticated
using (
  exists (
    select 1
    from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
      and ma.role = any(array[
        'admin'::public.app_role,
        'superadmin'::public.app_role,
        'road_captain'::public.app_role
      ])
  )
);

drop policy if exists "Staff can view and manage join requests" on public.join_requests;
create policy "Staff can view and manage join requests"
on public.join_requests
for all
to authenticated
using (
  exists (
    select 1
    from public.member_accounts ma
    where ma.user_id = (select auth.uid())
      and ma.status = 'active'::public.account_status
      and ma.role = any(array[
        'admin'::public.app_role,
        'superadmin'::public.app_role,
        'road_captain'::public.app_role
      ])
  )
);
