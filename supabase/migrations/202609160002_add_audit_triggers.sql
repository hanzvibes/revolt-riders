create or replace function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_entity_id text;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_entity_id := coalesce(v_row ->> 'id', v_row ->> 'member_external_id', v_row ->> 'event_id', null);

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values ((select auth.uid()), lower(tg_op), tg_table_name, v_entity_id, jsonb_build_object('source', 'database_trigger'));

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.write_audit_log() from public;

drop trigger if exists audit_events on public.events;
create trigger audit_events after insert or update or delete on public.events for each row execute function private.write_audit_log();
drop trigger if exists audit_member_accounts on public.member_accounts;
create trigger audit_member_accounts after insert or update or delete on public.member_accounts for each row execute function private.write_audit_log();
drop trigger if exists audit_event_rsvps on public.event_rsvps;
create trigger audit_event_rsvps after insert or update or delete on public.event_rsvps for each row execute function private.write_audit_log();
drop trigger if exists audit_event_attendance on public.event_attendance;
create trigger audit_event_attendance after insert or update or delete on public.event_attendance for each row execute function private.write_audit_log();
drop trigger if exists audit_ride_logs on public.ride_logs;
create trigger audit_ride_logs after insert or update or delete on public.ride_logs for each row execute function private.write_audit_log();
drop trigger if exists audit_club_cash_transactions on public.club_cash_transactions;
create trigger audit_club_cash_transactions after insert or update or delete on public.club_cash_transactions for each row execute function private.write_audit_log();
drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements after insert or update or delete on public.announcements for each row execute function private.write_audit_log();
