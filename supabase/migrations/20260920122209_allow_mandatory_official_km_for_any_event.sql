create or replace function private.validate_ride_log()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.odometer_end <= new.odometer_start then
    raise exception 'Odometer akhir harus lebih besar dari odometer awal';
  end if;

  if new.event_id is not null and not exists (
    select 1
    from public.events e
    where e.id = new.event_id
      and (
        e.type in (
          'riding'::public.event_type,
          'touring'::public.event_type,
          'voyager'::public.event_type
        )
        or (
          new.source_type = 'official_agenda'
          and e.counts_as_mandatory = true
        )
      )
      and e.status in (
        'published'::public.event_status,
        'completed'::public.event_status
      )
  ) then
    raise exception 'Agenda riding tidak valid atau tidak aktif';
  end if;

  new.distance_km := new.odometer_end - new.odometer_start;
  return new;
end;
$function$;
