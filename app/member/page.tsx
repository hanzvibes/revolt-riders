"use client";

import { AppShell } from "@/components/app-shell";
import { ModalSheet } from "@/components/modal-sheet";
import {
  RideLogEditModal,
  type RideLogEditData,
} from "@/components/ride-log-edit-modal";
import { CardSkeleton, StatsGridSkeleton } from "@/components/skeleton";
import { useDataCache } from "@/context/data-cache-context";
import { deleteRideLog } from "@/lib/services/ride-log-service";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Compass,
  Gauge,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  UsersRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type MemberDisplay = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  club_role: string | null;
  total_km: number;
  city?: string | null;
  motorcycle?: string | null;
  join_date?: string | null;
  join_date_label?: string | null;
  touring_count: number;
};

type TouringItem = {
  id: string;
  no: number;
  title: string;
  km: number | null;
  odometer_start?: number | null;
  odometer_end?: number | null;
  date?: string | null;
  source: "ride_log" | "event_attendance";
};

export default function MemberPage() {
  const { user, account, loading: authLoading, fetchWithCache, invalidateCache } =
    useDataCache();
  const [members, setMembers] = useState<MemberDisplay[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMember, setSelectedMember] = useState<MemberDisplay | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [touringRecords, setTouringRecords] = useState<TouringItem[]>([]);
  const [loadingTouring, setLoadingTouring] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalData, setEditModalData] = useState<RideLogEditData | null>(null);

  const loadMembers = useCallback(async () => {
    if (authLoading) return;

    try {
      setLoading(true);
      const data = await fetchWithCache<MemberDisplay[]>(
        "member_profiles_list",
        async () => {
          const supabase = getSupabaseBrowserClient();
          const [profilesRes, detailsRes, rideCountsRes] = await Promise.all([
            supabase
              .from("member_profiles")
              .select("member_external_id,full_name,nickname,club_role,total_km,city,join_date")
              .order("full_name"),
            supabase
              .from("member_details")
              .select("member_external_id,nickname_override,motorcycle,city_override"),
            supabase
              .from("ride_logs")
              .select("member_external_id")
              .eq("status", "approved"),
          ]);

          type DetailRow = {
            member_external_id: string;
            nickname_override: string | null;
            motorcycle: string | null;
            city_override: string | null;
          };

          const detailMap = new Map<string, DetailRow>(
            ((detailsRes.data ?? []) as DetailRow[]).map((d) => [d.member_external_id, d]),
          );

          const rideCountByMember = new Map<string, number>();
          for (const r of (rideCountsRes.data ?? []) as { member_external_id: string }[]) {
            if (r.member_external_id) {
              rideCountByMember.set(
                r.member_external_id,
                (rideCountByMember.get(r.member_external_id) || 0) + 1,
              );
            }
          }

          type MemberDbRow = {
            member_external_id: string;
            full_name: string;
            nickname: string | null;
            club_role: string | null;
            total_km: number | string | null;
            city: string | null;
            join_date: string | null;
          };

          return ((profilesRes.data ?? []) as MemberDbRow[]).map((row) => {
            const detail = detailMap.get(row.member_external_id);
            const nickname = detail?.nickname_override || row.nickname || null;
            const city = detail?.city_override || row.city || null;
            const motorcycle = detail?.motorcycle || null;
            const joinDate = row.join_date;
            let joinDateLabel = joinDate;
            if (joinDate) {
              try {
                joinDateLabel = new Intl.DateTimeFormat("id-ID", {
                  dateStyle: "long",
                }).format(new Date(joinDate));
              } catch {
                joinDateLabel = joinDate;
              }
            }

            return {
              member_external_id: row.member_external_id,
              full_name: row.full_name,
              nickname,
              club_role: row.club_role || null,
              total_km: Number(row.total_km) || 0,
              city,
              motorcycle,
              join_date: joinDate,
              join_date_label: joinDateLabel,
              touring_count: rideCountByMember.get(row.member_external_id) || 0,
            };
          });
        },
        { ttlMs: 3 * 60 * 1000 },
      );

      setMembers(data);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Direktori member belum dapat dimuat. Coba lagi beberapa saat.",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, fetchWithCache]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const target = `${m.full_name} ${m.nickname ?? ""} ${m.member_external_id} ${m.club_role ?? ""} ${m.city ?? ""} ${m.motorcycle ?? ""}`.toLowerCase();
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

  const openDetail = async (member: MemberDisplay) => {
    setSelectedMember(member);
    setSheetOpen(true);
    setLoadingTouring(true);
    setTouringRecords([]);

    try {
      const supabase = getSupabaseBrowserClient();
      const [rideLogsRes, attendanceRes] = await Promise.all([
        supabase
          .from("ride_logs")
          .select("id,event_id,title,distance_km,odometer_start,odometer_end,created_at,status")
          .eq("member_external_id", member.member_external_id)
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
        supabase
          .from("event_attendance")
          .select("event_id,checked_in_at")
          .eq("member_external_id", member.member_external_id)
          .order("checked_in_at", { ascending: false }),
      ]);

      type RideLogItem = {
        id: string;
        event_id: string | null;
        title?: string | null;
        distance_km: number | string | null;
        odometer_start?: number | string | null;
        odometer_end?: number | string | null;
        created_at: string;
        status: string;
      };
      type AttendanceItem = {
        event_id: string;
        checked_in_at: string;
      };

      const rides = (rideLogsRes.data ?? []) as RideLogItem[];
      const attendance = (attendanceRes.data ?? []) as AttendanceItem[];

      const eventIds: string[] = [
        ...new Set(
          [...rides.map((r) => r.event_id), ...attendance.map((a) => a.event_id)].filter(
            (id): id is string => Boolean(id),
          ),
        ),
      ];

      const eventsRes = eventIds.length
        ? await supabase.from("events").select("id,title").in("id", eventIds)
        : { data: [] };

      const eventTitleMap = new Map<string, string>(
        ((eventsRes.data ?? []) as { id: string; title: string }[]).map((e) => [e.id, e.title]),
      );

      const items: TouringItem[] = [];
      let counter = 1;

      // Approved ride logs
      for (const ride of rides) {
        const title =
          ride.title && !["Ride Mandiri", "Ride mandiri"].includes(ride.title.trim())
            ? ride.title
            : ride.event_id
            ? eventTitleMap.get(ride.event_id) || "Agenda Riding"
            : "Touring / Sowan Mandiri";
        items.push({
          id: `ride-${ride.id}`,
          no: counter++,
          title,
          km: ride.distance_km !== null ? Number(ride.distance_km) : null,
          odometer_start:
            ride.odometer_start !== null && ride.odometer_start !== undefined
              ? Number(ride.odometer_start)
              : null,
          odometer_end:
            ride.odometer_end !== null && ride.odometer_end !== undefined
              ? Number(ride.odometer_end)
              : null,
          date: ride.created_at,
          source: "ride_log",
        });
      }

      // Event attendance not duplicate with ride logs
      const coveredEventIds = new Set(rides.map((r) => r.event_id).filter(Boolean));
      for (const att of attendance) {
        if (!att.event_id || coveredEventIds.has(att.event_id)) continue;
        const title = eventTitleMap.get(att.event_id) || "Kegiatan Komunitas";
        items.push({
          id: `att-${att.event_id}-${att.checked_in_at}`,
          no: counter++,
          title,
          km: null,
          date: att.checked_in_at,
          source: "event_attendance",
        });
      }

      setTouringRecords(items);
    } catch {
      // ignore
    } finally {
      setLoadingTouring(false);
    }
  };

  const closeDetail = () => {
    setSheetOpen(false);
  };

  const canEditTouring = useMemo(() => {
    if (!account || account.status !== "active" || !selectedMember) return false;
    const isStaff = ["admin", "superadmin", "road_captain"].includes(account.role);
    const isOwner = account.member_external_id === selectedMember.member_external_id;
    return isStaff || isOwner;
  }, [account, selectedMember]);

  const handleTourUpdated = (newTotalKm?: number) => {
    if (selectedMember) {
      const updatedKm =
        newTotalKm !== undefined ? newTotalKm : selectedMember.total_km;
      const updatedMember = { ...selectedMember, total_km: updatedKm };
      setSelectedMember(updatedMember);
      setMembers((prev) =>
        prev.map((m) =>
          m.member_external_id === selectedMember.member_external_id
            ? { ...m, total_km: updatedKm }
            : m,
        ),
      );
      void openDetail(updatedMember);
    }
    invalidateCache("member_profiles_list");
    invalidateCache("riding_leaderboard_data");
    invalidateCache("dashboard_club_stats");
    invalidateCache("admin_dashboard_overview");
  };

  return (
    <AppShell active="Member" title="Member">
      <div className="page-wrap">
        <div className="page-intro native-page-head">
          <div>
            <em>DIREKTORI RESMI</em>
            <h2>Member Revolt</h2>
            <p>
              Data member resmi Revolt Riders yang tersinkron langsung ke Supabase.
              Klik kartu member untuk melihat detail profil & riwayat touring.
            </p>
          </div>
          <button
            type="button"
            className="outline-action"
            onClick={() => {
              invalidateCache("member_profiles_list");
              void loadMembers();
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <RefreshCw className={loading ? "spin" : ""} style={{ width: 14, height: 14 }} />
            <span>REFRESH DATA</span>
          </button>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
            <StatsGridSkeleton count={3} />
            <CardSkeleton height="280px" />
          </div>
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
                placeholder="Cari nama, panggilan, jabatan, motor, kota, atau RR-ID…"
              />
            </div>

            {filtered.length === 0 ? (
              <section className="empty-state card">
                <UsersRound />
                <h2>Tidak ada member ditemukan</h2>
                <p>
                  Tidak ada hasil yang sesuai dengan kata kunci &quot;{query}&quot;.
                </p>
              </section>
            ) : (
              <div className="member-grid">
                {filtered.map((m) => {
                  const displayName = m.nickname ? m.nickname : m.full_name;
                  const secondaryName = m.nickname ? m.full_name : null;
                  const roleName = m.club_role || "Member";
                  const roleClass = getRoleClass(m.club_role);
                  const subParts = [secondaryName, m.motorcycle, m.city].filter(Boolean);

                  return (
                    <button
                      type="button"
                      className="member-card"
                      key={m.member_external_id}
                      onClick={() => void openDetail(m)}
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
                          title={subParts.join(" · ") || "Revolt Riders"}
                        >
                          {subParts.join(" · ") || "Revolt Riders"}
                        </span>
                        <div className="member-meta-row">
                          <span className="member-id-tag">
                            {m.member_external_id}
                          </span>
                          {m.touring_count > 0 && (
                            <span className="member-tour-count">
                              <Compass />
                              {m.touring_count} Sowan
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
          Data member tersinkron langsung ke Supabase. Klik kartu member untuk melihat
          riwayat touring dan aktivitas terverifikasi.
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
                  {selectedMember.motorcycle && (
                    <span>&bull; {selectedMember.motorcycle}</span>
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
                  <small>Riwayat Sowan / Agenda</small>
                  <b>{touringRecords.length} Agenda</b>
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
                  <dt>Kendaraan / Motor</dt>
                  <dd>
                    {selectedMember.motorcycle || "Belum dicatat"}
                  </dd>
                </div>
                <div className="member-detail-bio-item">
                  <dt>Bergabung Sejak</dt>
                  <dd>
                    {selectedMember.join_date_label || "Anggota Resmi"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Riwayat Touring Table */}
            <div className="member-touring-section">
              <div className="member-touring-header">
                <h4>Riwayat Touring & Sowan Terverifikasi</h4>
                <div className="member-touring-header-actions">
                  <span className="member-touring-count-badge">
                    {touringRecords.length} Kegiatan
                  </span>
                  {canEditTouring && (
                    <button
                      type="button"
                      className="member-add-tour-btn"
                      onClick={() => {
                        setEditModalData({
                          memberExternalId: selectedMember.member_external_id,
                          memberName:
                            selectedMember.nickname || selectedMember.full_name,
                          title: "",
                          km: 0,
                          date: new Date().toISOString().slice(0, 10),
                        });
                        setEditModalOpen(true);
                      }}
                    >
                      <Plus /> Tambah
                    </button>
                  )}
                </div>
              </div>

              {loadingTouring ? (
                <p className="system-message">Memuat riwayat kegiatan dari Supabase…</p>
              ) : touringRecords.length === 0 ? (
                <p className="system-message">
                  Belum ada catatan touring resmi atau check-in yang terdata di Supabase untuk member ini.
                </p>
              ) : (
                <div className="member-touring-table-wrap">
                  <table className="member-touring-table">
                    <thead>
                      <tr>
                        <th style={{ width: "38px" }}>No</th>
                        <th>Kegiatan / Destinasi</th>
                        <th style={{ textAlign: "right" }}>Jarak</th>
                        {canEditTouring && (
                          <th style={{ width: "68px", textAlign: "right" }}>
                            Aksi
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {touringRecords.map((item) => (
                        <tr key={item.id}>
                          <td style={{ color: "var(--muted)", fontWeight: 700 }}>
                            {item.no}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{item.title}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center", marginTop: "2px" }}>
                              {item.date && (
                                <small style={{ color: "var(--muted)", fontSize: "0.6rem" }}>
                                  {new Intl.DateTimeFormat("id-ID", {
                                    dateStyle: "medium",
                                  }).format(new Date(item.date))}
                                </small>
                              )}
                              {item.odometer_start !== null && item.odometer_end !== null && item.odometer_start !== undefined && item.odometer_end !== undefined && (
                                <small style={{ color: "#6c757d", fontSize: "0.6rem", background: "#f8f9fa", padding: "0 4px", borderRadius: "3px", border: "1px solid #e9ecef" }}>
                                  Odo: {item.odometer_start} → {item.odometer_end}
                                </small>
                              )}
                            </div>
                          </td>
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
                          {canEditTouring && (
                            <td className="member-tour-action-cell">
                              {item.source === "ride_log" ? (
                                <div className="member-tour-action-group">
                                  <button
                                    type="button"
                                    className="member-tour-action"
                                    title="Edit riwayat touring"
                                    onClick={() => {
                                      const rawId = item.id.replace(/^ride-/, "");
                                      setEditModalData({
                                        id: rawId,
                                        memberExternalId:
                                          selectedMember.member_external_id,
                                        memberName:
                                          selectedMember.nickname ||
                                          selectedMember.full_name,
                                        title: item.title,
                                        km: item.km || 0,
                                        date:
                                          item.date ||
                                          new Date().toISOString().slice(0, 10),
                                      });
                                      setEditModalOpen(true);
                                    }}
                                  >
                                    <Pencil />
                                  </button>
                                  <button
                                    type="button"
                                    className="member-tour-action delete"
                                    title="Hapus riwayat touring"
                                    onClick={async () => {
                                      if (
                                        !confirm(
                                          `Yakin ingin menghapus catatan "${item.title}"?`,
                                        )
                                      )
                                        return;
                                      const rawId = item.id.replace(/^ride-/, "");
                                      try {
                                        const res = await deleteRideLog(
                                          rawId,
                                          selectedMember.member_external_id,
                                        );
                                        handleTourUpdated(res.totalKm);
                                      } catch (err) {
                                        alert(
                                          err instanceof Error
                                            ? err.message
                                            : "Gagal menghapus riwayat.",
                                        );
                                      }
                                    }}
                                  >
                                    <Trash2 />
                                  </button>
                                </div>
                              ) : (
                                <span
                                  title="Berasal dari check-in agenda"
                                  style={{
                                    fontSize: "0.58rem",
                                    color: "var(--muted)",
                                  }}
                                >
                                  Check-in
                                </span>
                              )}
                            </td>
                          )}
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

      <RideLogEditModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        data={editModalData}
        onSaved={(km) => handleTourUpdated(km)}
        onDeleted={(km) => handleTourUpdated(km)}
      />
    </AppShell>
  );
}
