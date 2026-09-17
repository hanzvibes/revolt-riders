"use client";

import { AppShell } from "@/components/app-shell";
import { useDataCache } from "@/context/data-cache-context";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Gauge, Route, Search, ShieldAlert, Users, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Member = {
  member_external_id: string;
  full_name: string;
  nickname: string | null;
  club_role: string | null;
  total_km: number;
  city?: string | null;
};

export default function MemberPage() {
  const { user, loading: authLoading, fetchWithCache } = useDataCache();
  const [members, setMembers] = useState<Member[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
        const data = await fetchWithCache<Member[]>(
          "member_profiles_list",
          async () => {
            const supabase = getSupabaseBrowserClient();
            const { data: result, error: fetchErr } = await supabase
              .from("member_profiles")
              .select("member_external_id,full_name,nickname,club_role,total_km,city")
              .order("full_name");
            if (fetchErr) throw fetchErr;
            return (result ?? []) as Member[];
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
      const target = `${m.full_name} ${m.nickname ?? ""} ${m.member_external_id} ${m.club_role ?? ""}`.toLowerCase();
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
    const r = (role ?? "").toLowerCase();
    if (r.includes("road captain") || r.includes("captain")) return "badge-rc";
    if (r.includes("admin") || r.includes("ketua") || r.includes("sekretaris") || r.includes("bendahara")) return "badge-admin";
    return "";
  };

  return (
    <AppShell active="Member" title="Member">
      <div className="page-wrap">
        <div className="page-intro">
          <div>
            <em>DIREKTORI RESMI</em>
            <h2>Member Revolt</h2>
            <p>Data member aktif dan valid komunitas Revolt Riders Situbondo.</p>
          </div>
        </div>

        {!user && !authLoading ? (
          <section className="empty-state card">
            <ShieldAlert />
            <h2>Akses member internal</h2>
            <p>Silakan masuk ke akun Anda untuk melihat direktori lengkap member komunitas.</p>
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
                  <b>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(totalKmCombined)} KM</b>
                </span>
              </article>
            </div>

            <div className="search-box member-search-bar">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari berdasarkan nama, nickname, atau RR-ID…"
              />
            </div>

            {filtered.length === 0 ? (
              <section className="empty-state card">
                <UsersRound />
                <h2>Tidak ada member ditemukan</h2>
                <p>Tidak ada hasil yang sesuai dengan kata kunci &quot;{query}&quot;.</p>
              </section>
            ) : (
              <div className="member-grid">
                {filtered.map((m) => {
                  const displayName = m.nickname ? m.nickname : m.full_name;
                  const secondaryName = m.nickname ? m.full_name : null;
                  const roleName = m.club_role || "Member";
                  const roleClass = getRoleClass(m.club_role);

                  return (
                    <article className="member-card" key={m.member_external_id}>
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
                        <span className="member-sub" title={secondaryName || m.city || "Revolt Riders"}>
                          {secondaryName ? `${secondaryName}${m.city ? ` · ${m.city}` : ""}` : m.city || "Revolt Riders"}
                        </span>
                        <div className="member-meta-row">
                          <span className="member-id-tag">{m.member_external_id}</span>
                          <span className="member-km-tag">
                            <Route />
                            {new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(m.total_km)} km
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}

        <p className="last-updated">
          Data sensitif seperti nomor kontak dan alamat privat tidak ditampilkan dalam direktori umum.
        </p>
      </div>
    </AppShell>
  );
}

