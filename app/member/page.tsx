"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import { useDataCache } from "@/context/data-cache-context";
import {
  MEMBER_BY_ID,
  REVOLT_MEMBERS_DATA,
} from "@/lib/data/member-touring-data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Compass,
  Gauge,
  Route,
  Search,
  ShieldAlert,
  Users,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type MemberDisplay = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  club_role: string | null;
  total_km: number;
  city?: string | null;
  address?: string | null;
  birth_place_date?: string | null;
  join_date_label?: string | null;
  touring_records?: { no: number; title: string; km: number | null }[];
};

export default function MemberPage() {
  const { user, loading: authLoading, fetchWithCache } = useDataCache();
  const [members, setMembers] = useState<MemberDisplay[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberDisplay | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMembers() {
      if (authLoading) return;
      if (!user) {
        if (active) {
          setLoading(false);
          setMembers([]);
        }
        return;
      }

      try {
        const data = await fetchWithCache<MemberDisplay[]>(
          "member_profiles_list",
          async () => {
            const supabase = getSupabaseBrowserClient();
            const { data: result, error: fetchErr } = await supabase
              .from("member_profiles")
              .select("member_external_id,full_name,nickname,club_role,total_km,city")
              .order("full_name");

            if (fetchErr) throw fetchErr;

            // If Supabase returns records, enrich with touring & bio data
            if (result && result.length > 0) {
              type MemberDbRow = {
                member_external_id: string;
                full_name: string;
                nickname: string | null;
                club_role: string | null;
                total_km: number | string | null;
                city: string | null;
              };
              return (result as MemberDbRow[]).map((row) => {
                const official = MEMBER_BY_ID.get(row.member_external_id);
                return {
                  member_external_id: row.member_external_id,
                  full_name: row.full_name || official?.full_name || "",
                  nickname: row.nickname || official?.nickname || null,
                  club_role: row.club_role || official?.club_role || null,
                  total_km: Number(row.total_km) || official?.total_km || 0,
                  city: row.city || official?.city || null,
                  address: official?.address || null,
                  birth_place_date: official?.birth_place_date || null,
                  join_date_label: official?.join_date_label || null,
                  touring_records: official?.touring_records || [],
                };
              });
            }

            // Fallback to official dataset from DataMember.md
            return REVOLT_MEMBERS_DATA.map((m) => ({
              member_external_id: m.member_external_id,
              full_name: m.full_name,
              nickname: m.nickname,
              club_role: m.club_role,
              total_km: m.total_km,
              city: m.city,
              address: m.address,
              birth_place_date: m.birth_place_date,
              join_date_label: m.join_date_label,
              touring_records: m.touring_records,
            }));
          },
          { ttlMs: 3 * 60 * 1000 },
        );

        if (active) {
          setMembers(data);
          setError("");
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Direktori member belum dapat dimuat. Coba lagi beberapa saat.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadMembers();
    return () => {
      active = false;
    };
  }, [authLoading, user, fetchWithCache]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const target = `${m.full_name} ${m.nickname ?? ""} ${m.member_external_id} ${m.club_role ?? ""} ${m.city ?? ""}`.toLowerCase();
      return target.includes(q);
    });
  }, [members, query]);

  const totalKmCombined = useMemo(() => {
    return members.reduce((sum, m) => sum + (Number(m.total_km) || 0), 0);
  }, [members]);

  const getInitials = (name: string, nickname: string | null) => {
    const text = (nickname || name || "RR").trim();
    const parts = text.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return text.slice(0, 2).toUpperCase();
  };

  const getRoleClass = (role: string | null) => {
    const r = (role ?? "").toUpperCase().trim();
    if (r === "PRESIDENT") return "badge-president";
    if (r === "FOUNDER") return "badge-founder";
    if (r === "EXCECUTOR" || r === "EXECUTOR") return "badge-executor";
    if (r === "NEGOSIATOR") return "badge-negosiator";
    if (r === "CAPROS") return "badge-capros";
    if (r === "PROSPEK") return "badge-prospek";
    if (r === "VIRGIN") return "badge-virgin";
    if (r === "LIFE MEMBER" || r === "LIFEMEMBER") return "badge-lifemember";
    if (r.includes("CAPTAIN")) return "badge-rc";
    if (
      r.includes("ADMIN") ||
      r.includes("KETUA") ||
      r.includes("SEKRETARIS") ||
      r.includes("BENDAHARA")
    )
      return "badge-admin";
    return "";
  };

  const openDetail = (member: MemberDisplay) => {
    setSelectedMember(member);
    setSheetOpen(true);
  };

  const closeDetail = () => {
    setSheetOpen(false);
  };

  return (
    <AppShell active="Member" title="Member">
      <div className="page-wrap">
        <div className="page-intro">
          <div>
            <em>DIREKTORI RESMI</em>
            <h2>Member Revolt</h2>
            <p>
              Data 27 member aktif dan valid komunitas Revolt Riders Situbondo.
              Klik kartu member untuk melihat detail profil & riwayat touring.
            </p>
          </div>
        </div>

        {!user && !authLoading ? (
          <section className="empty-state card">
            <ShieldAlert />
            <h2>Akses member internal</h2>
            <p>
              Silakan masuk ke akun Anda untuk melihat direktori lengkap member
              komunitas.
            </p>
            <a className="primary-action" href="/login">
              MASUK KE AKUN
            </a>
          </section>
        ) : loading ? (
          <section className="empty-state card">
            <UsersRound />
            <h2>Memuat direktori member…</h2>
            <p>Menyiapkan data profil member Revolt Riders.</p>
          </section>
        ) : error ? (
          <section className="empty-state card">
            <UsersRound />
            <h2>{error}</h2>
            <p>Terjadi kendala saat menghubungkan ke database.</p>
          </section>
        ) : (
          <>
            <div className="member-directory-stats">
              <article className="member-stat-chip">
                <Users />
                <span>
                  <small>Total Member</small>
                  <b>{members.length} Riders</b>
                </span>
              </article>
              <article className="member-stat-chip">
                <Gauge />
                <span>
                  <small>Total Kilometer</small>
                  <b>
                    {new Intl.NumberFormat("id-ID", {
                      maximumFractionDigits: 0,
                    }).format(totalKmCombined)}{" "}
                    KM
                  </b>
                </span>
              </article>
            </div>

            <div className="search-box member-search-bar">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama, panggilan, jabatan, kota, atau RR-ID…"
              />
            </div>

            {filtered.length === 0 ? (
              <section className="empty-state card">
                <UsersRound />
                <h2>Tidak ada member ditemukan</h2>
                <p>
                  Tidak ada hasil yang sesuai dengan kata kunci &quot;{query}
                  &quot;.
                </p>
              </section>
            ) : (
              <div className="member-grid">
                {filtered.map((m) => {
                  const displayName = m.nickname ? m.nickname : m.full_name;
                  const secondaryName = m.nickname ? m.full_name : null;
                  const roleName = m.club_role || "Member";
                  const roleClass = getRoleClass(m.club_role);
                  const touringCount = m.touring_records?.length ?? 0;

                  return (
                    <button
                      type="button"
                      className="member-card"
                      key={m.member_external_id}
                      onClick={() => openDetail(m)}
                      aria-label={`Lihat detail ${m.full_name}`}
                    >
                      <div className="member-avatar">
                        {getInitials(m.full_name, m.nickname)}
                      </div>
                      <div className="member-info">
                        <div className="member-header-row">
                          <span className="member-name" title={displayName}>
                            {displayName}
                          </span>
                          <span className={`member-role-badge ${roleClass}`}>
                            {roleName}
                          </span>
                        </div>
                        <span
                          className="member-sub"
                          title={secondaryName || m.city || "Revolt Riders"}
                        >
                          {secondaryName
                            ? `${secondaryName}${m.city ? ` · ${m.city}` : ""}`
                            : m.city || "Revolt Riders"}
                        </span>
                        <div className="member-meta-row">
                          <span className="member-id-tag">
                            {m.member_external_id}
                          </span>
                          {touringCount > 0 && (
                            <span className="member-tour-count">
                              <Compass />
                              {touringCount} Sowan
                            </span>
                          )}
                          <span className="member-km-tag">
                            <Route />
                            {new Intl.NumberFormat("id-ID", {
                              maximumFractionDigits: 1,
                            }).format(m.total_km)}{" "}
                            km
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <p className="last-updated">
          Data sensitif nomor kontak dan identitas privat dilindungi. Klik kartu
          member untuk melihat riwayat touring dan informasi komunitas.
        </p>
      </div>

      {/* Modal Sheet Detail Member & Riwayat Touring */}
      <ModalSheet
        open={sheetOpen}
        onClose={closeDetail}
        eyebrow="REVOLT RIDERS · PROFIL"
        title={
          selectedMember
            ? `${selectedMember.nickname || selectedMember.full_name} (${selectedMember.member_external_id})`
            : "Detail Member"
        }
      >
        {selectedMember && (
          <div className="member-detail-sheet-content">
            {/* Header Hero Box */}
            <div className="member-detail-hero">
              <div className="member-detail-avatar">
                {getInitials(selectedMember.full_name, selectedMember.nickname)}
              </div>
              <div className="member-detail-hero-info">
                <div className="member-detail-title-row">
                  <h3 className="member-detail-name">
                    {selectedMember.full_name}
                  </h3>
                  <span
                    className={`member-role-badge ${getRoleClass(selectedMember.club_role)}`}
                  >
                    {selectedMember.club_role || "Member"}
                  </span>
                </div>
                <span className="member-detail-sub">
                  <span className="member-id-tag">
                    {selectedMember.member_external_id}
                  </span>
                  {selectedMember.nickname && (
                    <span>&bull; Panggilan: <b>{selectedMember.nickname}</b></span>
                  )}
                  {selectedMember.city && (
                    <span>&bull; {selectedMember.city}</span>
                  )}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="member-detail-stats-grid">
              <div className="member-detail-stat-box">
                <Gauge />
                <span>
                  <small>Total Kilometer</small>
                  <b>
                    {new Intl.NumberFormat("id-ID", {
                      maximumFractionDigits: 1,
                    }).format(selectedMember.total_km)}{" "}
                    KM
                  </b>
                </span>
              </div>
              <div className="member-detail-stat-box">
                <Compass />
                <span>
                  <small>Riwayat Sowan / Touring</small>
                  <b>{selectedMember.touring_records?.length ?? 0} Agenda</b>
                </span>
              </div>
            </div>

            {/* Biodata Info Card */}
            <div className="member-detail-bio-card">
              <dl className="member-detail-bio-list">
                <div className="member-detail-bio-item">
                  <dt>Domisili / Kota</dt>
                  <dd>
                    {selectedMember.city || "Situbondo"}
                  </dd>
                </div>
                <div className="member-detail-bio-item">
                  <dt>Bergabung Sejak</dt>
                  <dd>
                    {selectedMember.join_date_label || "Anggota Resmi"}
                  </dd>
                </div>
                {selectedMember.birth_place_date && (
                  <div className="member-detail-bio-item">
                    <dt>Tempat & Tanggal Lahir</dt>
                    <dd>{selectedMember.birth_place_date}</dd>
                  </div>
                )}
                {selectedMember.address && (
                  <div className="member-detail-bio-item full-width">
                    <dt>Alamat</dt>
                    <dd>{selectedMember.address}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Riwayat Touring Table */}
            <div className="member-touring-section">
              <div className="member-touring-header">
                <h4>Riwayat Touring & Sowan</h4>
                <span className="member-touring-count-badge">
                  {selectedMember.touring_records?.length ?? 0} Kegiatan
                </span>
              </div>

              {!selectedMember.touring_records ||
              selectedMember.touring_records.length === 0 ? (
                <p className="system-message">
                  Belum ada catatan touring resmi yang terdata untuk member ini.
                </p>
              ) : (
                <div className="member-touring-table-wrap">
                  <table className="member-touring-table">
                    <thead>
                      <tr>
                        <th style={{ width: "38px" }}>No</th>
                        <th>Kegiatan / Destinasi</th>
                        <th style={{ textAlign: "right" }}>Jarak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMember.touring_records.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ color: "var(--muted)", fontWeight: 700 }}>
                            {item.no}
                          </td>
                          <td style={{ fontWeight: 600 }}>{item.title}</td>
                          <td style={{ textAlign: "right" }}>
                            {item.km !== null ? (
                              <span className="member-touring-km-tag">
                                {new Intl.NumberFormat("id-ID", {
                                  maximumFractionDigits: 1,
                                }).format(item.km)}{" "}
                                km
                              </span>
                            ) : (
                              <span style={{ color: "var(--muted)" }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </ModalSheet>
    </AppShell>
  );
}
