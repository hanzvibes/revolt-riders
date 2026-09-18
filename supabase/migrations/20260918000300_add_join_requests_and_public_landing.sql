-- ==============================================================================
-- REVOLT RIDERS: PUBLIC LANDING, JOIN REQUESTS, AND CLUB GALLERY
-- 1. Table public.join_requests (Independent table for candidate recruitment)
-- 2. Add is_public column to public.events
-- 3. Table public.club_gallery for public touring & ride showcase
-- 4. RPCs: submit_join_request, accept_join_request, confirm_join_request,
--          reject_join_request, activate_join_request, get_public_club_stats
-- ==============================================================================

-- 1. Table: public.join_requests
create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  birth_place text not null,
  birth_date date not null,
  city text not null,
  instagram text not null,
  whatsapp text not null,
  agreement boolean not null default true,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'confirmed', 'active', 'rejected', 'expired')),
  confirmation_token text unique,
  accepted_at timestamptz,
  confirmed_at timestamptz,
  activated_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  assigned_member_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Partial unique index to prevent duplicate active applications for the same WhatsApp number.
-- Expired or rejected applicants can re-apply freely!
create unique index if not exists idx_join_requests_active_whatsapp
  on public.join_requests (whatsapp)
  where status in ('pending', 'accepted', 'confirmed');

create index if not exists idx_join_requests_status on public.join_requests(status);
create index if not exists idx_join_requests_token on public.join_requests(confirmation_token);

-- 2. Add is_public column to public.events
alter table public.events
  add column if not exists is_public boolean not null default true;

create index if not exists idx_events_is_public on public.events(is_public) where status = 'published';

-- 3. Table: public.club_gallery
create table if not exists public.club_gallery (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text not null,
  location text,
  ride_date date default current_date,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_club_gallery_public on public.club_gallery(is_public, ride_date desc);

-- Seed initial public gallery entries
insert into public.club_gallery (title, description, image_url, location, ride_date, is_public)
values
  ('Kopdar Akbar & Sowan Situbondo', 'Silaturahmi dan kumpul bareng seluruh member Revolt Riders di Kota Santri Situbondo.', '/bold-riders-situbondo.jpg', 'Situbondo Kota', current_date - interval '14 days', true),
  ('Touring Persaudaraan Banyuwangi–Bali', 'Touring resmi melintasi pesisir timur Jawa hingga Pulau Dewata.', '/frtn.jpg', 'Banyuwangi - Buleleng', current_date - interval '30 days', true),
  ('Rolling Thunder & Bakti Sosial', 'Kegiatan sosial dan rolling thunder bersama komunitas Bold Riders.', '/revolt-riders-logo.jpg', 'Besuki - Bondowoso', current_date - interval '60 days', true)
on conflict do nothing;

-- 4. Enable RLS
alter table public.join_requests enable row level security;
alter table public.club_gallery enable row level security;

-- Policies for club_gallery
drop policy if exists "Public can view public gallery" on public.club_gallery;
create policy "Public can view public gallery" on public.club_gallery
  for select using (is_public = true);

drop policy if exists "Staff can manage club gallery" on public.club_gallery;
create policy "Staff can manage club gallery" on public.club_gallery
  for all to authenticated
  using (
    exists (
      select 1 from public.member_accounts ma
      where ma.user_id = auth.uid()
        and ma.status = 'active'
        and ma.role in ('admin', 'superadmin', 'road_captain')
    )
  );

grant select on public.club_gallery to anon, authenticated;
grant all on public.club_gallery to authenticated;

-- Policies for join_requests
-- Public cannot view all requests directly; only admin/superadmin/road_captain can view
drop policy if exists "Staff can view and manage join requests" on public.join_requests;
create policy "Staff can view and manage join requests" on public.join_requests
  for all to authenticated
  using (
    exists (
      select 1 from public.member_accounts ma
      where ma.user_id = auth.uid()
        and ma.status = 'active'
        and ma.role in ('admin', 'superadmin', 'road_captain')
    )
  );

grant select, insert, update on public.join_requests to authenticated;

-- Public can submit join requests (for direct fallback insert)
drop policy if exists "Public can submit join request" on public.join_requests;
create policy "Public can submit join request" on public.join_requests
  for insert to anon, authenticated
  with check (true);

grant insert on public.join_requests to anon;

-- Public can query by confirmation_token for candidate confirmation
drop policy if exists "Public can view join request by token" on public.join_requests;
create policy "Public can view join request by token" on public.join_requests
  for select to anon, authenticated
  using (confirmation_token is not null);

grant select on public.join_requests to anon;

-- Update events policy to ensure anon can view public published events
drop policy if exists "Public can view published events" on public.events;
create policy "Public can view published events" on public.events
  for select using (status = 'published');

grant select on public.events to anon, authenticated;

-- ==============================================================================
-- 5. RPC Functions
-- ==============================================================================

-- A. Submit Join Request (Publicly Accessible)
create or replace function public.submit_join_request(
  p_full_name text,
  p_birth_place text,
  p_birth_date date,
  p_city text,
  p_instagram text,
  p_whatsapp text,
  p_agreement boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_wa text;
  v_clean_ig text;
  v_token text;
  v_new_id uuid;
begin
  if not p_agreement then
    raise exception 'Anda harus menyetujui syarat & ketentuan komunitas';
  end if;

  if length(trim(coalesce(p_full_name, ''))) < 3 then
    raise exception 'Nama lengkap minimal 3 karakter';
  end if;

  if length(trim(coalesce(p_birth_place, ''))) < 2 then
    raise exception 'Tempat lahir wajib diisi';
  end if;

  if p_birth_date is null or p_birth_date > current_date - interval '15 years' then
    raise exception 'Tanggal lahir tidak valid (usia minimal 15 tahun)';
  end if;

  if length(trim(coalesce(p_city, ''))) < 2 then
    raise exception 'Domisili kota wajib diisi';
  end if;

  -- Clean and normalize WhatsApp number (digits only, standardize to 628...)
  v_clean_wa := regexp_replace(trim(p_whatsapp), '[^0-9]', '', 'g');
  if v_clean_wa like '08%' then
    v_clean_wa := '628' || substr(v_clean_wa, 3);
  elsif v_clean_wa like '+62%' then
    v_clean_wa := substr(v_clean_wa, 2);
  end if;

  if length(v_clean_wa) < 10 or length(v_clean_wa) > 16 then
    raise exception 'Nomor WhatsApp tidak valid (contoh: 081234567890)';
  end if;

  -- Clean Instagram handle
  v_clean_ig := trim(p_instagram);
  if v_clean_ig like '@%' then
    v_clean_ig := substr(v_clean_ig, 2);
  end if;

  -- Check duplicate active request
  if exists (
    select 1 from public.join_requests
    where whatsapp = v_clean_wa
      and status in ('pending', 'accepted', 'confirmed')
  ) then
    raise exception 'Nomor WhatsApp ini sudah memiliki pendaftaran yang sedang diproses. Silakan hubungi admin via WhatsApp jika butuh bantuan.';
  end if;

  -- Generate confirmation token for later (using native gen_random_uuid)
  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  insert into public.join_requests (
    full_name, birth_place, birth_date, city,
    instagram, whatsapp, agreement, status,
    confirmation_token, created_at, updated_at
  )
  values (
    trim(p_full_name), trim(p_birth_place), p_birth_date, trim(p_city),
    v_clean_ig, v_clean_wa, true, 'pending',
    v_token, now(), now()
  )
  returning id into v_new_id;

  return jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'message', 'Pendaftaran Anda berhasil dikirim dan berstatus Pending. Pengurus akan segera memverifikasi formulir Anda.'
  );
end;
$$;

revoke all on function public.submit_join_request(text, text, date, text, text, text, boolean) from public;
grant execute on function public.submit_join_request(text, text, date, text, text, text, boolean) to anon, authenticated;

-- B. Accept Join Request (Staff Only)
create or replace function public.accept_join_request(
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_token text;
  v_rec record;
begin
  select ma.role into v_role from public.member_accounts ma
  where ma.user_id = auth.uid() and ma.status = 'active';

  if v_role not in ('admin', 'superadmin', 'road_captain') then
    raise exception 'Akses pengurus diperlukan untuk menyetujui pendaftaran';
  end if;

  select * into v_rec from public.join_requests where id = p_request_id;
  if not found then
    raise exception 'Permohonan pendaftaran tidak ditemukan';
  end if;

  if v_rec.status <> 'pending' then
    raise exception 'Hanya pendaftaran berstatus Pending yang dapat disetujui';
  end if;

  v_token := coalesce(v_rec.confirmation_token, replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''));

  update public.join_requests
  set status = 'accepted',
      accepted_at = now(),
      confirmation_token = v_token,
      updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'success', true,
    'token', v_token,
    'whatsapp', v_rec.whatsapp,
    'full_name', v_rec.full_name
  );
end;
$$;

revoke all on function public.accept_join_request(uuid) from public;
grant execute on function public.accept_join_request(uuid) to authenticated;

-- C. Confirm Join Request by Candidate (Publicly Accessible with Token)
create or replace function public.confirm_join_request(
  p_token text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rec record;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    raise exception 'Token konfirmasi tidak valid';
  end if;

  select * into v_rec from public.join_requests
  where confirmation_token = trim(p_token);

  if not found then
    raise exception 'Data pendaftaran tidak ditemukan atau token sudah kadaluarsa';
  end if;

  -- If status is already confirmed or active
  if v_rec.status = 'confirmed' then
    return jsonb_build_object(
      'success', true,
      'status', 'confirmed',
      'full_name', v_rec.full_name,
      'message', 'Pendaftaran Anda sudah dikonfirmasi sebelumnya. Menunggu aktivasi resmi oleh pengurus.'
    );
  elsif v_rec.status = 'active' then
    return jsonb_build_object(
      'success', true,
      'status', 'active',
      'full_name', v_rec.full_name,
      'assigned_member_id', v_rec.assigned_member_id,
      'message', 'Selamat! Anda sudah resmi menjadi member aktif Revolt Riders.'
    );
  end if;

  if v_rec.status <> 'accepted' then
    raise exception 'Status pendaftaran saat ini: % (bukan Accepted)', v_rec.status;
  end if;

  -- Expiration check: 7 days from accepted_at
  if v_rec.accepted_at is not null and v_rec.accepted_at < now() - interval '7 days' then
    update public.join_requests
    set status = 'expired', updated_at = now()
    where id = v_rec.id;

    raise exception 'Batas waktu konfirmasi 7 hari telah habis (Expired). Anda dapat mengajukan pendaftaran ulang melalui Landing Page.';
  end if;

  update public.join_requests
  set status = 'confirmed',
      confirmed_at = now(),
      updated_at = now()
  where id = v_rec.id;

  return jsonb_build_object(
    'success', true,
    'status', 'confirmed',
    'full_name', v_rec.full_name,
    'message', 'Terima kasih! Konfirmasi komitmen Anda telah diterima. Pengurus akan mengaktivasi dan menerbitkan Nomor Anggota (ID RR) resmi Anda.'
  );
end;
$$;

revoke all on function public.confirm_join_request(text) from public;
grant execute on function public.confirm_join_request(text) to anon, authenticated;

-- D. Reject Join Request (Staff Only)
create or replace function public.reject_join_request(
  p_request_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  select ma.role into v_role from public.member_accounts ma
  where ma.user_id = auth.uid() and ma.status = 'active';

  if v_role not in ('admin', 'superadmin', 'road_captain') then
    raise exception 'Akses pengurus diperlukan';
  end if;

  update public.join_requests
  set status = 'rejected',
      rejected_at = now(),
      rejection_reason = trim(p_reason),
      updated_at = now()
  where id = p_request_id;
end;
$$;

revoke all on function public.reject_join_request(uuid, text) from public;
grant execute on function public.reject_join_request(uuid, text) to authenticated;

-- E. Activate Join Request (Admin/Superadmin Only)
create or replace function public.activate_join_request(
  p_request_id uuid,
  p_member_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_clean_id text;
  v_rec record;
begin
  select ma.role into v_role from public.member_accounts ma
  where ma.user_id = auth.uid() and ma.status = 'active';

  if v_role not in ('admin', 'superadmin') then
    raise exception 'Akses admin diperlukan untuk aktivasi member';
  end if;

  v_clean_id := upper(trim(p_member_id));
  if v_clean_id !~ '^RR-[0-9]{3,}$' then
    raise exception 'Format ID RR harus berupa RR-XXX (contoh: RR-028)';
  end if;

  -- Check if ID RR is already taken
  if exists (
    select 1 from public.member_profiles
    where member_external_id = v_clean_id
  ) then
    raise exception 'Member ID % sudah digunakan oleh anggota lain', v_clean_id;
  end if;

  select * into v_rec from public.join_requests where id = p_request_id;
  if not found then
    raise exception 'Pendaftaran tidak ditemukan';
  end if;

  if v_rec.status not in ('confirmed', 'accepted') then
    raise exception 'Hanya pendaftaran yang berstatus Confirmed atau Accepted yang dapat diaktivasi';
  end if;

  -- 1. Insert into official member_profiles
  insert into public.member_profiles (
    member_external_id,
    full_name,
    nickname,
    city,
    join_date,
    club_role,
    total_km,
    source_file,
    updated_at
  )
  values (
    v_clean_id,
    v_rec.full_name,
    split_part(v_rec.full_name, ' ', 1),
    v_rec.city,
    current_date,
    'VIRGIN',
    0,
    'JOIN_REQUEST',
    now()
  );

  -- 2. Update join_request status to 'active'
  update public.join_requests
  set status = 'active',
      activated_at = now(),
      assigned_member_id = v_clean_id,
      updated_at = now()
  where id = p_request_id;

  return jsonb_build_object(
    'success', true,
    'member_external_id', v_clean_id,
    'full_name', v_rec.full_name,
    'message', 'Member berhasil diaktivasi dengan ID ' || v_clean_id
  );
end;
$$;

revoke all on function public.activate_join_request(uuid, text) from public;
grant execute on function public.activate_join_request(uuid, text) to authenticated;

-- F. Public Club Stats (Accessible by Anon & Authenticated)
create or replace function public.get_public_club_stats()
returns table(
  total_members bigint,
  total_rides bigint,
  total_km numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select
    (select count(*) from public.member_profiles)::bigint as total_members,
    (select count(*) from public.ride_logs where status = 'approved')::bigint as total_rides,
    (select coalesce(sum(total_km), 0) from public.member_profiles)::numeric as total_km;
end;
$$;

revoke all on function public.get_public_club_stats() from public;
grant execute on function public.get_public_club_stats() to anon, authenticated;
