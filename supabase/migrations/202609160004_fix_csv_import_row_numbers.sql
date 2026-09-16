create or replace function public.import_member_csv(p_source_file text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if (select auth.uid()) is null or not (select private.has_role(array['admin','superadmin']::public.app_role[])) then raise exception 'Akses Admin atau Superadmin diperlukan'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'Data CSV tidak valid'; end if;
  v_count := jsonb_array_length(p_rows);
  if v_count < 1 or v_count > 1000 then raise exception 'Jumlah baris harus antara 1 dan 1000'; end if;
  if nullif(trim(p_source_file), '') is null or length(p_source_file) > 200 then raise exception 'Nama file tidak valid'; end if;
  insert into public.member_profiles(member_external_id,full_name,nickname,city,join_date,club_role,total_km,source_file,source_row,updated_at)
  select upper(trim(row.member_external_id)),trim(row.full_name),nullif(trim(row.nickname),''),nullif(trim(row.city),''),nullif(row.join_date,'')::date,nullif(trim(row.club_role),''),coalesce(nullif(row.total_km,'')::numeric,0),p_source_file,(row_number() over ())::integer,now()
  from jsonb_to_recordset(p_rows) as row(member_external_id text,full_name text,nickname text,city text,join_date text,club_role text,total_km text)
  where upper(trim(row.member_external_id)) ~ '^RR-[0-9]{3,}$' and length(trim(row.full_name)) > 1
  on conflict(member_external_id) do update set full_name=excluded.full_name,nickname=excluded.nickname,city=excluded.city,join_date=excluded.join_date,club_role=excluded.club_role,total_km=excluded.total_km,source_file=excluded.source_file,source_row=excluded.source_row,updated_at=now();
  get diagnostics v_count = row_count;
  insert into public.import_batches(source_file,imported_by,status,record_count,notes) values(p_source_file,(select auth.uid()),'completed',v_count,'Member CSV import');
  insert into public.audit_logs(actor_id,action,entity_type,metadata) values((select auth.uid()),'import','member_profiles',jsonb_build_object('source_file',p_source_file,'record_count',v_count));
  return jsonb_build_object('record_count',v_count);
end; $$;

create or replace function public.import_cash_csv(p_source_file text, p_rows jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_count integer; v_batch_id uuid;
begin
  if (select auth.uid()) is null or not (select private.has_role(array['treasurer','admin','superadmin']::public.app_role[])) then raise exception 'Akses Treasurer, Admin, atau Superadmin diperlukan'; end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then raise exception 'Data CSV tidak valid'; end if;
  v_count := jsonb_array_length(p_rows);
  if v_count < 1 or v_count > 1000 then raise exception 'Jumlah baris harus antara 1 dan 1000'; end if;
  if nullif(trim(p_source_file), '') is null or length(p_source_file) > 200 then raise exception 'Nama file tidak valid'; end if;
  insert into public.import_batches(source_file,imported_by,status,record_count,notes) values(p_source_file,(select auth.uid()),'completed',v_count,'Cash CSV import') returning id into v_batch_id;
  insert into public.cash_transactions(import_batch_id,source_file,source_sheet,source_row,transaction_type,transaction_date,source_date_text,description,amount)
  select v_batch_id,p_source_file,'CSV',item.ordinality::integer,(item.value->>'transaction_type')::public.cash_transaction_type,nullif(item.value->>'transaction_date','')::date,item.value->>'transaction_date',trim(item.value->>'description'),(item.value->>'amount')::numeric
  from jsonb_array_elements(p_rows) with ordinality as item(value,ordinality)
  where item.value->>'transaction_type' in ('income','expense') and coalesce((item.value->>'amount')::numeric,0)>0 and length(trim(item.value->>'description'))>0;
  get diagnostics v_count = row_count;
  update public.import_batches set record_count=v_count where id=v_batch_id;
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values((select auth.uid()),'import','cash_transactions',v_batch_id::text,jsonb_build_object('source_file',p_source_file,'record_count',v_count));
  return jsonb_build_object('batch_id',v_batch_id,'record_count',v_count);
end; $$;

revoke all on function public.import_member_csv(text,jsonb) from public,anon,authenticated;
revoke all on function public.import_cash_csv(text,jsonb) from public,anon,authenticated;
grant execute on function public.import_member_csv(text,jsonb) to authenticated;
grant execute on function public.import_cash_csv(text,jsonb) to authenticated;
