-- ==============================================================================
-- REVOLT RIDERS: MIGRASI DATA TOURING & PERMISSIONS KE SUPABASE
-- Jalankan seluruh script ini di SQL Editor dashboard Supabase Anda.
-- ==============================================================================

-- 1. Pastikan kolom title ada dan submitted_by nullable untuk record historis
alter table public.ride_logs add column if not exists title text;
alter table public.ride_logs alter column submitted_by drop not null;

-- 2. Konfigurasi Hak Akses (Permissions & RLS) agar data bisa dibaca publik
grant usage on schema public to anon, authenticated;

alter table public.member_profiles enable row level security;
drop policy if exists "Public can view member profiles" on public.member_profiles;
create policy "Public can view member profiles" on public.member_profiles for select using (true);
grant select on public.member_profiles to anon, authenticated;

alter table public.member_details enable row level security;
drop policy if exists "Public can view member details" on public.member_details;
create policy "Public can view member details" on public.member_details for select using (true);
grant select on public.member_details to anon, authenticated;

alter table public.ride_logs enable row level security;
drop policy if exists "Public can view approved ride logs" on public.ride_logs;
create policy "Public can view approved ride logs" on public.ride_logs for select using (status = 'approved');
grant select on public.ride_logs to anon, authenticated;

grant execute on function public.get_riding_leaderboard to anon, authenticated;

-- 3. Upsert Profil Member Resmi (27 Members)
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
values
  ('RR-001', 'Teguh Bhakti Sanjaya', 'Teguh', 'Besuki', '2025-01-25', 'EXCECUTOR', 1198, 'DataMember.md', now()),
  ('RR-002', 'Rafly Prayoga Pratama', 'Rafly', 'Bondowoso', '2024-06-01', 'PRESIDENT', 1087, 'DataMember.md', now()),
  ('RR-003', 'Akbar Irfansyah', 'Akbar', 'Situbondo', '2023-09-01', 'FOUNDER', 2498, 'DataMember.md', now()),
  ('RR-004', 'Revan Fachu Rohman', 'Revan', 'Situbondo', '2022-10-01', 'FOUNDER', 1365, 'DataMember.md', now()),
  ('RR-005', 'Muhammad Fiqri Muharik', 'Fiqri', 'Situbondo', '2025-01-05', 'NEGOSIATOR', 268, 'DataMember.md', now()),
  ('RR-006', 'Pra Leonando Fajri Juliansyah', 'Nando', 'Situbondo', '2025-04-01', 'VIRGIN', 516, 'DataMember.md', now()),
  ('RR-007', 'Ferdi Yanto', 'Ferdi', 'Situbondo', '2024-01-01', 'VIRGIN', 477, 'DataMember.md', now()),
  ('RR-008', 'MENTENK', 'Mentenk', 'Pekalongan', '2022-12-01', 'LIFE MEMBER', 0, 'DataMember.md', now()),
  ('RR-009', 'Ferdi Alvianda', 'Alvi', 'Pasuruan', '2024-03-01', 'LIFE MEMBER', 100, 'DataMember.md', now()),
  ('RR-010', 'Faris Hamdani', 'Faris', 'Situbondo', '2022-10-01', 'FOUNDER', 860, 'DataMember.md', now()),
  ('RR-011', 'Angel Monica', 'Angel', 'Bondowoso', '2023-11-01', 'LIFE MEMBER', 980, 'DataMember.md', now()),
  ('RR-012', 'Raihan Ramadhani Alfan Arisha Putra', 'Raihan', 'Situbondo', '2025-05-28', 'VIRGIN', 523, 'DataMember.md', now()),
  ('RR-013', 'Rafi Nanda Pratama', 'Rafi', 'Situbondo', '2025-03-28', 'LIFE MEMBER', 783, 'DataMember.md', now()),
  ('RR-014', 'Ahmad Faisal', 'Faisal', 'Buleleng', '2025-01-01', 'VIRGIN', 1164, 'DataMember.md', now()),
  ('RR-015', 'Abdurrahman Ramzi Wahyudi', 'Ramzi', 'Situbondo', '2023-06-01', 'CAPROS', 684, 'DataMember.md', now()),
  ('RR-016', 'Dinar Danu Ega', 'Dinar', 'Situbondo', '2024-12-01', 'FOUNDER', 200, 'DataMember.md', now()),
  ('RR-017', 'Mikha Arontha Sitepu', 'Mikha', 'Surabaya', '2025-06-01', 'VIRGIN', 305, 'DataMember.md', now()),
  ('RR-018', 'IYOK', 'Iyok', 'Situbondo', '2023-01-01', 'PROSPEK', 560, 'DataMember.md', now()),
  ('RR-019', 'MAHFUD', 'Mahfud', 'Situbondo', '2024-01-01', 'VIRGIN', 74, 'DataMember.md', now()),
  ('RR-020', 'Bintang Juniawan Hartono', 'Bintang', 'Situbondo', '2025-09-14', 'PROSPEK', 95, 'DataMember.md', now()),
  ('RR-021', 'Rafly Maulana Zidane', 'Zidane', 'Bondowoso', '2025-10-01', 'PROSPEK', 114, 'DataMember.md', now()),
  ('RR-022', 'Agung Zainudin', 'Agung', 'Situbondo', '2025-09-01', 'PROSPEK', 326, 'DataMember.md', now()),
  ('RR-023', 'Hendika Alif Sabila', 'Hendika', 'Situbondo', '2022-12-01', 'FOUNDER', 1449, 'DataMember.md', now()),
  ('RR-024', 'Abdur Rahman', 'Abdur', 'Situbondo', '2022-12-01', 'FOUNDER', 1745, 'DataMember.md', now()),
  ('RR-025', 'Rhafiel Roozan Putra Yusubhan', 'Rhafiel', 'Bondowoso', '2025-12-01', 'PROSPEK', 497, 'DataMember.md', now()),
  ('RR-026', 'Surya Maulana', 'Surya', 'Situbondo', '2025-09-01', 'PROSPEK', 235, 'DataMember.md', now()),
  ('RR-027', 'Ismail Jufri', 'Ismail', 'Situbondo', '2026-01-05', 'PROSPEK', 449, 'DataMember.md', now())
on conflict (member_external_id) do update set
  full_name = excluded.full_name,
  nickname = excluded.nickname,
  city = excluded.city,
  join_date = excluded.join_date,
  club_role = excluded.club_role,
  total_km = excluded.total_km,
  source_file = excluded.source_file,
  updated_at = now();

-- 4. Nonaktifkan trigger validasi sementara untuk bulk insert historis
do $$ begin alter table public.ride_logs disable trigger validate_ride_log; exception when others then null; end $$;
do $$ begin alter table public.ride_logs disable trigger audit_ride_logs; exception when others then null; end $$;

-- Hapus data historis lama jika script pernah dijalankan sebelumnya
delete from public.ride_logs where (title is not null and submitted_by is null);

-- 5. Insert 190 Catatan Touring / Sowan Resmi ke ride_logs
-- Catatan: Kolom distance_km TIDAK dimasukkan di sini karena merupakan GENERATED COLUMN (dihitung otomatis dari odometer_end - odometer_start)
insert into public.ride_logs (
  member_external_id,
  title,
  odometer_start,
  odometer_end,
  status,
  created_at,
  reviewed_at
)
values
  ('RR-001', 'Touring Anniv JBI 2025', 0, 80, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Voyager Probolinggo–Pasuruan 2025', 80, 180, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Sowan Maverick Pertama 2025', 180, 238, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Sowan Maverick Kedua 2025', 238, 296, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Sowan Wolf Road 2025', 296, 331, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Qurban Bold Riders', 331, 371, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Voyager 6 Kota', 371, 747, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Anniversary Dewata Rocker Jember 2025', 747, 817, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Sowan Maverick', 817, 875, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Deklar Wolf Road', 875, 914, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Anniv MACI Probolinggo', 914, 1014, 'approved'::public.ride_status, now(), now()),
  ('RR-001', 'Anniv BBMC', 1014, 1198, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Anniv DR JBR 2024', 0, 69, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Declar Gear Custom JBR 2024', 69, 139, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Sowan Wolf Road BWS 2024', 139, 179, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Bukbernas Bold Riders 2025', 179, 184, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Berkah Ramadhan 2025', 184, 207, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Opening Miracafe Tapen 2025', 207, 227, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Anniv JBI 2025', 227, 305, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Sunday Enthusiast LMJ 2025', 305, 443, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Anniv MMC BWI', 443, 544, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Voyager 6 Kota', 544, 920, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Anniversary Dewata Rocker Jember 2025', 920, 990, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Sowan Maverick', 990, 1048, 'approved'::public.ride_status, now(), now()),
  ('RR-002', 'Deklar Wolf Road', 1048, 1087, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Batik Ride Jember 2023', 0, 69, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Camp Ijen Desember 2023', 69, 148, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Berkah Ramadhan Maret 2024', 148, 175, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Sowan Wolf Road Mei 2024', 175, 215, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Anniv Dewata Jember Agustus 2024', 215, 284, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Berkah Ramadhan Maret 2025', 284, 307, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Bukbernas 2025', 307, 312, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Kopdargab Maverick Madlads Paiton', 312, 373, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Qurban Bold Riders', 373, 412, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Opening Mira Cafe', 412, 432, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Anniv Dewata Bali', 432, 652, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Voyager BWS & Sowan Wolf Road', 652, 692, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Anniv MMC BWI', 692, 793, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Voyager 6 Kota', 793, 1169, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Anniversary Dewata Rocker Jember 2025', 1169, 1239, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'National Conference Bold Rider at Bandung', 1239, 2118, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Sowan Maverick', 2118, 2176, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Deklar Wolf Road', 2176, 2215, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Anniv MACI Probolinggo', 2215, 2315, 'approved'::public.ride_status, now(), now()),
  ('RR-003', 'Anniv BBMC', 2315, 2499, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Batik Ride Jember Okt 2022', 0, 77, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Batik Ride Jember Okt 2023', 77, 147, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Ijen Camp & Ride Des 2023', 147, 226, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Anniv Dewata Rockers Jember Agt 2024', 226, 300, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Berkah Ramadhan Bungatan Mar 2024', 300, 333, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Sowan Wolf Road Mei 2024', 333, 367, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Sowan MACI, Krakken, WCMC Lumajang Des 2024', 367, 519, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Berkah Ramadhan Jangkar Mar 2025', 519, 544, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Kopdargab Maverick–Madlads Paiton Apr 2025', 544, 605, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Anniv JBI Tobacco Jember Mei 2025', 605, 684, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Anniv Dewata Rockers, Voyager, Sowan Roda Liar Bali Jun 2025', 684, 906, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Voyager Bondowoso Jul 2025', 906, 946, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Voyager Probolinggo–Pasuruan, Sowan Madlads Jul 2025', 946, 1093, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Custom War Bali', 1093, 1115, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Sowan MMC & Extremite Banyuwangi', 1115, 1293, 'approved'::public.ride_status, now(), now()),
  ('RR-004', 'Gentleman Ride 2026', 1293, 1365, 'approved'::public.ride_status, now(), now()),
  ('RR-005', 'Anniversary JBI', 0, 84, 'approved'::public.ride_status, now(), now()),
  ('RR-005', 'Sowan Wolfroad dan Voyager BWS', 84, 123, 'approved'::public.ride_status, now(), now()),
  ('RR-005', 'Anniversary Dewata Rocker Jember 2025', 123, 193, 'approved'::public.ride_status, now(), now()),
  ('RR-005', 'Batik Ride 2025', 193, 268, 'approved'::public.ride_status, now(), now()),
  ('RR-006', 'Kopdargab Maverick Madlads Paiton', 0, 61, 'approved'::public.ride_status, now(), now()),
  ('RR-006', 'Voyager BWS & Sowan Wolf Road', 61, 101, 'approved'::public.ride_status, now(), now()),
  ('RR-006', 'Voyager Probolinggo & Pasuruan', 101, 236, 'approved'::public.ride_status, now(), now()),
  ('RR-006', 'Anniv MMC BWI', 236, 337, 'approved'::public.ride_status, now(), now()),
  ('RR-006', 'Anniversary Dewata Rocker Jember 2025', 337, 407, 'approved'::public.ride_status, now(), now()),
  ('RR-006', 'Batik Ride 2025', 407, 477, 'approved'::public.ride_status, now(), now()),
  ('RR-006', 'Deklar Wolf Road', 477, 516, 'approved'::public.ride_status, now(), now()),
  ('RR-007', 'Deklar Gear Custom', 0, 69, 'approved'::public.ride_status, now(), now()),
  ('RR-007', 'Berkah Ramadhan 2025', 69, 92, 'approved'::public.ride_status, now(), now()),
  ('RR-007', 'Bukbernas 2025', 92, 102, 'approved'::public.ride_status, now(), now()),
  ('RR-007', 'Sowan Maverick', 102, 163, 'approved'::public.ride_status, now(), now()),
  ('RR-007', 'Kopdargab Maverick Madlads', 163, 224, 'approved'::public.ride_status, now(), now()),
  ('RR-007', 'Anniversary Dewata Rocker Jember 2025', 224, 294, 'approved'::public.ride_status, now(), now()),
  ('RR-007', 'Anniv Carte De Machinas Jember', 294, 369, 'approved'::public.ride_status, now(), now()),
  ('RR-007', 'Batik Ride 2025', 369, 437, 'approved'::public.ride_status, now(), now()),
  ('RR-007', 'Deklar Wolf Road', 437, 476, 'approved'::public.ride_status, now(), now()),
  ('RR-008', 'Mesir', 0, 0, 'approved'::public.ride_status, now(), now()),
  ('RR-009', 'Sowan Wolfroad 2024', 0, 35, 'approved'::public.ride_status, now(), now()),
  ('RR-009', 'Sevenvolt DR Jember', 35, 100, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Batik Ride DR Jember 2022', 0, 77, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Touring Baluran with DR Jember Des 2022', 77, 145, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Batik Ride Jember 2023', 145, 215, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Ijen Camp & Ride Des 2023', 215, 294, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Anniv DR Jember Agustus 2024', 294, 368, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Sowan Madlads Undangan Des 2024', 368, 478, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Bukbernas Bold Rider 2025', 478, 483, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Anniv JBI 2025', 483, 561, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Sowan Maverick ke-2', 561, 622, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Opening Mira Cafe', 622, 642, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Anniv Dewata Bali', 642, 677, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Custom War Bali', 677, 717, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Deklar Wolf Road', 717, 756, 'approved'::public.ride_status, now(), now()),
  ('RR-010', 'Valko Malang Anniv', 756, 860, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Batik Ride Jember 2023', 0, 69, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Anniv JBI Tobacco Jember 2025', 69, 138, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Anniv Dewata Jember Agustus 2024', 138, 207, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Deklarasi Gear Custom September 2024', 207, 276, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Deklarasi Valkoblaze Malang November 2024', 276, 424, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Bukbernas 2025', 424, 424, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Voyager BWS & Sowan Wolfroad', 424, 464, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Anniv MMC BWI', 464, 565, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Customland Bali', 565, 756, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Deklar Wolf Road', 756, 795, 'approved'::public.ride_status, now(), now()),
  ('RR-011', 'Anniv BBMC', 795, 979, 'approved'::public.ride_status, now(), now()),
  ('RR-012', 'Batik Ride Jember Okt 2022', 0, 77, 'approved'::public.ride_status, now(), now()),
  ('RR-012', 'Voyager 6 Kota', 77, 453, 'approved'::public.ride_status, now(), now()),
  ('RR-012', 'Anniversary Dewata Rocker Jember 2025', 453, 523, 'approved'::public.ride_status, now(), now()),
  ('RR-013', 'Anniv JBI 2025', 0, 80, 'approved'::public.ride_status, now(), now()),
  ('RR-013', 'Sowan Maverick Pertama', 80, 140, 'approved'::public.ride_status, now(), now()),
  ('RR-013', 'Sowan Maverick Kedua', 140, 200, 'approved'::public.ride_status, now(), now()),
  ('RR-013', 'Qurban Bold Riders', 200, 240, 'approved'::public.ride_status, now(), now()),
  ('RR-013', 'Voyager 6 Kota', 240, 616, 'approved'::public.ride_status, now(), now()),
  ('RR-013', 'Anniversary Dewata Rocker Jember 2025', 616, 686, 'approved'::public.ride_status, now(), now()),
  ('RR-013', 'Sowan Maverick', 686, 744, 'approved'::public.ride_status, now(), now()),
  ('RR-013', 'Deklar Wolf Road', 744, 783, 'approved'::public.ride_status, now(), now()),
  ('RR-014', 'Voyager BR Jember (Bondowoso)', 0, 34.9, 'approved'::public.ride_status, now(), now()),
  ('RR-014', 'Anniv MMC BWI', 34.9, 135.9, 'approved'::public.ride_status, now(), now()),
  ('RR-014', 'National Conference Bold Rider at Bandung', 135.9, 1014.9, 'approved'::public.ride_status, now(), now()),
  ('RR-014', 'Anniv BBMC', 1014.9, 1198.9, 'approved'::public.ride_status, now(), now()),
  ('RR-015', 'Batik Ride Jember 2023', 0, 69, 'approved'::public.ride_status, now(), now()),
  ('RR-015', 'Camp Ijen Desember 2023', 69, 148, 'approved'::public.ride_status, now(), now()),
  ('RR-015', 'Sowan Wolf Road Mei 2024', 148, 188, 'approved'::public.ride_status, now(), now()),
  ('RR-015', 'Solo Riding & Sowan to Dewata Rockers Jember 2024', 188, 257, 'approved'::public.ride_status, now(), now()),
  ('RR-015', 'Anniv Dewata Jember Agustus 2024', 257, 326, 'approved'::public.ride_status, now(), now()),
  ('RR-015', 'Ride to BWI kirim undangan declar Revolt Des 2024', 326, 424, 'approved'::public.ride_status, now(), now()),
  ('RR-015', 'Ride to Anniv Aspal Kiri Mei 2025', 424, 512, 'approved'::public.ride_status, now(), now()),
  ('RR-015', 'Anniv MMC BWI', 512, 613, 'approved'::public.ride_status, now(), now()),
  ('RR-015', 'Anniversary Dewata Rocker Jember 2025', 613, 683, 'approved'::public.ride_status, now(), now()),
  ('RR-016', 'Touring Resmi Founder', 0, 200, 'approved'::public.ride_status, now(), now()),
  ('RR-017', 'Voyager BWS & Sowan Wolf Road', 0, 39.9, 'approved'::public.ride_status, now(), now()),
  ('RR-017', 'Voyager Kantor Djarum Probolinggo & Pasuruan', 39.9, 173.9, 'approved'::public.ride_status, now(), now()),
  ('RR-017', 'Anniv MMC BWI', 173.9, 274.9, 'approved'::public.ride_status, now(), now()),
  ('RR-017', 'Anniversary Dewata Rocker Jember 2025', 274.9, 344.9, 'approved'::public.ride_status, now(), now()),
  ('RR-018', 'Songgon Sunride', 0, 124, 'approved'::public.ride_status, now(), now()),
  ('RR-018', 'Gentleman Ride Blambangan', 124, 210, 'approved'::public.ride_status, now(), now()),
  ('RR-018', 'Batik Ride Blambangan', 210, 306, 'approved'::public.ride_status, now(), now()),
  ('RR-018', 'Anniversary Dewata Rocker Jember 2025', 306, 376, 'approved'::public.ride_status, now(), now()),
  ('RR-018', 'Anniv BBMC', 376, 560, 'approved'::public.ride_status, now(), now()),
  ('RR-019', 'Sowan Wolf Road 2024', 0, 35, 'approved'::public.ride_status, now(), now()),
  ('RR-019', 'Deklar Wolf Road', 35, 74, 'approved'::public.ride_status, now(), now()),
  ('RR-020', 'Sowan Banyuwangi Kota', 0, 95, 'approved'::public.ride_status, now(), now()),
  ('RR-021', 'Anniv Carte De Machinas Jember', 0, 75, 'approved'::public.ride_status, now(), now()),
  ('RR-021', 'Deklar Wolf Road', 75, 114, 'approved'::public.ride_status, now(), now()),
  ('RR-022', 'Anniv Dewata Rocker Jember 2025', 0, 69, 'approved'::public.ride_status, now(), now()),
  ('RR-022', 'Sowan Extremite 2025', 69, 167, 'approved'::public.ride_status, now(), now()),
  ('RR-022', 'Sowan Maverick', 167, 225, 'approved'::public.ride_status, now(), now()),
  ('RR-022', 'Sowan Madlads', 225, 326, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Sowan Chopper Jogja 2021', 0, 506, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Sowan Caferacer Malang 2021', 506, 721, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Batik Ride Jember 2021', 721, 791, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Batik Ride Jember 2022', 791, 861, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Sowan Dewata Jember 2022', 861, 930, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Sowan Wolf Road 2023', 930, 966, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Sowan Club Jember 2023', 966, 1036, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Sowan Maverick 2024', 1036, 1098, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Voyager Pasuruan 2025', 1098, 1232, 'approved'::public.ride_status, now(), now()),
  ('RR-023', 'Anniv Dewata Bali', 1232, 1449, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Sowan Chopper Jogja 2021', 0, 506, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Sowan Caferacer Malang 2021', 506, 721, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Batik Ride Jember 2021', 721, 791, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Batik Ride Jember 2022', 791, 861, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Batik Ride Jember Okt 2023', 861, 935, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Anniv Dewata Rockers Jember Agt 2024', 935, 1009, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Berkah Ramadhan Bungatan Mar 2024', 1009, 1042, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Sowan Wolf Road Mei 2024', 1042, 1076, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Sowan Dewata Rockers, Carte, Gear Des 2024', 1076, 1228, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Declar Gear Custom', 1228, 1298, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Anniv JBI Tobacco Jember Mei 2025', 1298, 1377, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Anniv Dewata Rockers, Voyager, Sowan Roda Liar Bali Jun 2025', 1377, 1597, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Qurban Bold Riders', 1597, 1636, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Anniv Dewata Rockers Jember 2025', 1636, 1706, 'approved'::public.ride_status, now(), now()),
  ('RR-024', 'Deklar Wolf Road', 1706, 1745, 'approved'::public.ride_status, now(), now()),
  ('RR-025', 'Sowan Dewata Rockers', 0, 71, 'approved'::public.ride_status, now(), now()),
  ('RR-025', 'Sowan Hubtown Rockers', 71, 113, 'approved'::public.ride_status, now(), now()),
  ('RR-025', 'Sowan Teenagers Madiun', 113, 425, 'approved'::public.ride_status, now(), now()),
  ('RR-025', 'Gentleman Ride Jember', 425, 497, 'approved'::public.ride_status, now(), now()),
  ('RR-026', 'Anniv Dewata Rockers', 0, 75, 'approved'::public.ride_status, now(), now()),
  ('RR-026', 'Anniv Wolf Road', 75, 119, 'approved'::public.ride_status, now(), now()),
  ('RR-026', 'Bold Sijile', 119, 165, 'approved'::public.ride_status, now(), now()),
  ('RR-026', 'Sowan JBI', 165, 235, 'approved'::public.ride_status, now(), now()),
  ('RR-027', 'Deklar Wolf Road', 0, 39, 'approved'::public.ride_status, now(), now()),
  ('RR-027', 'Bold Sijile', 39, 85, 'approved'::public.ride_status, now(), now()),
  ('RR-027', 'Sowan JBI Tobacco', 85, 155, 'approved'::public.ride_status, now(), now()),
  ('RR-027', 'Sowan MMC & Extremite Banyuwangi', 155, 265, 'approved'::public.ride_status, now(), now()),
  ('RR-027', 'Anniv BBMC', 265, 449, 'approved'::public.ride_status, now(), now());

-- 6. Aktifkan kembali trigger validasi
do $$ begin alter table public.ride_logs enable trigger validate_ride_log; exception when others then null; end $$;
do $$ begin alter table public.ride_logs enable trigger audit_ride_logs; exception when others then null; end $$;

-- 7. Sinkronisasi ulang total_km di member_profiles berdasarkan akumulasi ride_logs
update public.member_profiles mp
set total_km = coalesce((
  select sum(rl.distance_km)
  from public.ride_logs rl
  where rl.member_external_id = mp.member_external_id
    and rl.status = 'approved'::public.ride_status
), mp.total_km)
where exists (
  select 1 from public.ride_logs rl
  where rl.member_external_id = mp.member_external_id
);
