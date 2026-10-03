import { Gauge, Pencil, UsersRound } from "lucide-react";
import {
  getInitials,
  getRoleClass,
  type Detail,
  type Member,
  type MemberAccount,
} from "./member-admin-model";

type MemberAdminDirectoryProps = {
  results: Member[];
  detailByMember: Map<string, Detail>;
  accountByMember: Map<string, MemberAccount>;
  onEdit: (member: Member) => void;
};

export function MemberAdminDesktopTable({
  results,
  detailByMember,
  accountByMember,
  onEdit,
}: MemberAdminDirectoryProps) {
  return (
    <div className="admin-member-table-card">
      <div className="admin-member-table-wrap">
        <table className="admin-member-table">
          <thead>
            <tr>
              <th>Rider</th>
              <th>ID Registrasi</th>
              <th>Jabatan Club</th>
              <th>Motor & Kota</th>
              <th>Total KM</th>
              <th>Status Akun</th>
              <th style={{ textAlign: "right" }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px 16px" }}>
                  <UsersRound size={36} style={{ color: "var(--red)", margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: 800, fontSize: "0.86rem", color: "var(--ink)" }}>
                    Member Tidak Ditemukan
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 3 }}>
                    Tidak ada data member yang cocok dengan kata kunci atau filter saat ini.
                  </div>
                </td>
              </tr>
            ) : (
              results.map((member) => {
                const detail = detailByMember.get(member.member_external_id);
                const memberAccount = accountByMember.get(member.member_external_id);
                const displayName =
                  detail?.nickname_override ||
                  member.nickname ||
                  member.full_name;
                const hasDifferentFullName =
                  member.full_name && member.full_name !== displayName;
                const initials = getInitials(member.full_name, member.nickname);
                const roleClass = getRoleClass(member.club_role);

                return (
                  <tr key={member.member_external_id}>
                    <td>
                      <div className="admin-table-rider-cell">
                        <div
                          className="member-avatar"
                          style={{ width: 34, height: 34, fontSize: "0.68rem" }}
                        >
                          {initials}
                        </div>
                        <div className="admin-table-rider-names">
                          <span className="admin-table-rider-name" title={displayName}>
                            {displayName}
                          </span>
                          {hasDifferentFullName ? (
                            <span className="admin-table-rider-sub" title={member.full_name}>
                              {member.full_name}
                            </span>
                          ) : (
                            <span className="admin-table-rider-sub" style={{ color: "#94a3b8" }}>
                              {member.nickname ? `@${member.nickname}` : "Official Member"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className="member-id-tag"
                        style={{
                          background: "rgba(229, 29, 42, 0.08)",
                          color: "var(--red)",
                          border: "1px solid rgba(229, 29, 42, 0.22)",
                          padding: "2px 7px",
                          borderRadius: "4px",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {member.member_external_id}
                      </span>
                    </td>
                    <td>
                      {member.club_role ? (
                        <span className={`member-role-badge ${roleClass}`}>
                          {member.club_role}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.7rem" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: "0.72rem" }}>
                        <span style={{ fontWeight: 700, color: "#1e293b" }}>
                          {detail?.motorcycle || (
                            <span style={{ color: "#94a3b8", fontWeight: 400 }}>Motor belum diatur</span>
                          )}
                        </span>
                        <span style={{ color: "#64748b", fontSize: "0.68rem" }}>
                          {member.city || (
                            <span style={{ color: "#cbd5e1" }}>Kota belum diatur</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 800,
                          color: "var(--ink)",
                          fontSize: "0.74rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Gauge size={12} style={{ color: "var(--red)" }} />
                        {new Intl.NumberFormat("id-ID").format(member.total_km)} KM
                      </span>
                    </td>
                    <td>
                      {memberAccount ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: "0.66rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "5px",
                            background:
                              memberAccount.status === "active" ? "#f0fdf4" : "#fef2f2",
                            color:
                              memberAccount.status === "active" ? "#15803d" : "#b91c1c",
                            border:
                              memberAccount.status === "active"
                                ? "1px solid #bbf7d0"
                                : "1px solid #fecaca",
                            whiteSpace: "nowrap",
                          }}
                          title={`Akun: ${memberAccount.role.replace("_", " ")} (${
                            memberAccount.status === "active" ? "Aktif" : "Nonaktif"
                          })`}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background:
                                memberAccount.status === "active" ? "#16a34a" : "#dc2626",
                              flexShrink: 0,
                            }}
                          />
                          {memberAccount.role.replace("_", " ")} ({memberAccount.status === "active" ? "Aktif" : "Nonaktif"})
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: "5px",
                            background: "#f8fafc",
                            color: "#94a3b8",
                            border: "1px solid #e2e8f0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Belum Ada Akun
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="admin-table-edit-btn"
                        onClick={() => onEdit(member)}
                        aria-label={`Edit data ${displayName}`}
                      >
                        <Pencil size={12} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MemberAdminMobileCards({
  results,
  detailByMember,
  accountByMember,
  onEdit,
}: MemberAdminDirectoryProps) {
  return (
    <div className="admin-member-cards-mobile">
      {results.length === 0 ? (
        <section className="empty-state card">
          <UsersRound size={40} style={{ color: "var(--red)", margin: "0 auto 10px" }} />
          <h3>Member Tidak Ditemukan</h3>
          <p>Tidak ada data anggota yang cocok dengan kata kunci atau filter saat ini.</p>
        </section>
      ) : (
        results.map((member) => {
          const detail = detailByMember.get(member.member_external_id);
          const memberAccount = accountByMember.get(member.member_external_id);
          const displayName =
            detail?.nickname_override ||
            member.nickname ||
            member.full_name;
          const initials = getInitials(member.full_name, member.nickname);
          const roleClass = getRoleClass(member.club_role);
          const subParts = [
            member.full_name && member.full_name !== displayName ? member.full_name : null,
            detail?.motorcycle || null,
            member.city || null,
          ].filter(Boolean);
          const subText = subParts.length > 0 ? subParts.join(" · ") : "Data motor/domisili belum diatur";

          return (
            <article
              key={member.member_external_id}
              className="admin-mobile-card"
              onClick={() => onEdit(member)}
            >
              <div className="admin-mobile-card-head">
                <div
                  className="member-avatar"
                  style={{ width: 36, height: 36, fontSize: "0.7rem", flexShrink: 0 }}
                >
                  {initials}
                </div>
                <div className="admin-mobile-card-title">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <span
                      style={{
                        fontSize: "0.86rem",
                        fontWeight: 800,
                        color: "var(--ink)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={displayName}
                    >
                      {displayName}
                    </span>
                    <span
                      className="member-id-tag"
                      style={{
                        background: "rgba(229, 29, 42, 0.08)",
                        color: "var(--red)",
                        border: "1px solid rgba(229, 29, 42, 0.22)",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "0.66rem",
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {member.member_external_id}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                    {member.club_role && (
                      <span className={`member-role-badge ${roleClass}`} style={{ flexShrink: 0 }}>
                        {member.club_role}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: subParts.length > 0 ? "#64748b" : "#94a3b8",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {subText}
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-mobile-card-footer">
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flexWrap: "wrap" }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      fontWeight: 800,
                      color: "var(--ink)",
                    }}
                  >
                    <Gauge size={11} style={{ color: "var(--red)" }} />
                    {new Intl.NumberFormat("id-ID").format(member.total_km)} KM
                  </span>
                  <span style={{ color: "#cbd5e1" }}>•</span>
                  {memberAccount ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "var(--rr-type-caption)",
                        fontWeight: 700,
                        padding: "1px 5px",
                        borderRadius: "4px",
                        background:
                          memberAccount.status === "active" ? "#f0fdf4" : "#fef2f2",
                        color:
                          memberAccount.status === "active" ? "#15803d" : "#b91c1c",
                        border:
                          memberAccount.status === "active"
                            ? "1px solid #bbf7d0"
                            : "1px solid #fecaca",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          background:
                            memberAccount.status === "active" ? "#16a34a" : "#dc2626",
                        }}
                      />
                      {memberAccount.role.replace("_", " ")} ({memberAccount.status === "active" ? "Aktif" : "Nonaktif"})
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "var(--rr-type-caption)",
                        fontWeight: 600,
                        padding: "1px 5px",
                        borderRadius: "4px",
                        background: "#f8fafc",
                        color: "#94a3b8",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      Belum Ada Akun
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="admin-table-edit-btn"
                  onClick={(event) => {
                    event.stopPropagation();
                    onEdit(member);
                  }}
                  aria-label={`Edit ${displayName}`}
                  style={{ padding: "4px 8px", flexShrink: 0 }}
                >
                  <Pencil size={11} />
                  <span>Edit</span>
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
