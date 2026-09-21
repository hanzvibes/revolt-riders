"use client";

import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  Check,
  ExternalLink,
  MapPin,
  MessageSquare,
  UsersRound,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type PublicInvitation = {
  event_id: string;
  event_title: string;
  event_description: string | null;
  location_name: string | null;
  location_url: string | null;
  start_at: string;
  member_external_id: string;
  rsvp_status: "attending" | "declined" | "maybe" | null;
  guest_count: number;
};

type Attendee = {
  member_external_id: string;
  display_name: string;
  guest_count: number;
  rsvp_status: "attending" | "maybe";
};

const formatEventDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));

const formatEventClock = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(new Date(value)) + " WIB";

const rsvpLabel: Record<NonNullable<PublicInvitation["rsvp_status"]>, string> = {
  attending: "Hadir",
  maybe: "Mungkin hadir",
  declined: "Tidak hadir",
};

export default function InvitationPage() {
  const params = useParams<{ token: string }>();
  const token = String(params.token ?? "");
  const [data, setData] = useState<PublicInvitation | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [guestCount, setGuestCount] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(
    async (initial = false) => {
      const supabase = getSupabaseBrowserClient();
      const [invitationResult, attendeeResult] = await Promise.all([
        supabase.rpc("get_public_invitation", { p_token: token }),
        supabase.rpc("get_public_event_attendees", { p_token: token }),
      ]);

      if (invitationResult.error) {
        setError(invitationResult.error.message);
      } else {
        const invitation =
          ((invitationResult.data ?? [])[0] as PublicInvitation | undefined) ??
          null;
        setData(invitation);
        if (initial) setGuestCount(invitation?.guest_count ?? 0);
      }

      if (!attendeeResult.error) {
        setAttendees((attendeeResult.data ?? []) as Attendee[]);
      }

      if (initial) setLoading(false);
    },
    [token],
  );

  useEffect(() => {
    void load(true);
    const refresh = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(refresh);
  }, [load]);

  const answer = async (
    status: "attending" | "declined" | "maybe",
  ) => {
    setSaving(true);
    setError("");
    setSuccess("");

    const result = await getSupabaseBrowserClient().rpc(
      "submit_invitation_rsvp",
      {
        p_token: token,
        p_status: status,
        p_guest_count: status === "attending" ? guestCount : 0,
        p_note: note.trim() || null,
      },
    );

    if (result.error) {
      setError(result.error.message);
    } else {
      setSuccess(
        status === "attending"
          ? "Kehadiranmu sudah dikonfirmasi. Sampai jumpa di lokasi!"
          : status === "maybe"
            ? "Respons mungkin hadir sudah tersimpan."
            : "Responsmu sudah tersimpan. Terima kasih sudah mengabari.",
      );
      await load(true);
    }

    setSaving(false);
  };

  const confirmed = attendees.filter(
    (attendee) => attendee.rsvp_status === "attending",
  );

  return (
    <main className="invitation-page invitation-page-v2">
      <article className="invitation-card invitation-card-v2">
        <header className="invitation-hero-v2">
          <div className="invitation-hero-top-v2">
            <div className="invitation-brand-v2">
              <Image
                src="/revolt-riders-logo.jpg"
                alt="Revolt Riders"
                width={72}
                height={72}
                priority
              />
              <span>
                <strong>REVOLT RIDERS</strong>
                <small>Personal invitation</small>
              </span>
            </div>

            <span className="invitation-member-id-v2">
              {data?.member_external_id ?? "RR"}
            </span>
          </div>

          {loading ? (
            <div className="invitation-state-v2">
              <span className="invitation-loading-dot" />
              <h1>Memuat undangan…</h1>
              <p>Sedang menyiapkan detail agenda untukmu.</p>
            </div>
          ) : !data ? (
            <div className="invitation-state-v2">
              <h1>Undangan tidak ditemukan</h1>
              <p>Token mungkin tidak valid atau agenda sudah tidak aktif.</p>
            </div>
          ) : (
            <>
              <div className="invitation-heading-v2">
                <span className="invitation-kicker-v2">UNDANGAN PERSONAL</span>
                <h1>{data.event_title}</h1>
                <p>
                  {data.event_description ??
                    "Kehadiranmu adalah bagian penting dari perjalanan kita."}
                </p>
              </div>

              <div className="invitation-event-grid-v2">
                <div className="invitation-event-item-v2">
                  <span className="invitation-event-icon-v2">
                    <CalendarDays />
                  </span>
                  <span>
                    <small>Tanggal & waktu</small>
                    <strong>{formatEventDate(data.start_at)}</strong>
                    <em className="invitation-event-time-v2">
                      {formatEventClock(data.start_at)}
                    </em>
                  </span>
                </div>

                <div className="invitation-event-item-v2">
                  <span className="invitation-event-icon-v2">
                    <MapPin />
                  </span>
                  <span>
                    <small>Lokasi</small>
                    <strong>
                      {data.location_name ?? "Lokasi akan diumumkan"}
                    </strong>
                  </span>
                </div>
              </div>

              {data.location_url && (
                <a
                  className="invitation-location-action-v2"
                  href={data.location_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin />
                  <span>Buka lokasi</span>
                  <ExternalLink />
                </a>
              )}
            </>
          )}
        </header>

        {!loading && data && (
          <div className="invitation-content-v2">
            <section className="invitation-rsvp-panel-v2">
              <div className="invitation-section-head-v2">
                <span>
                  <small>RSVP</small>
                  <h2>Konfirmasi kehadiran</h2>
                  <p>Pilih respons yang paling sesuai dengan rencanamu.</p>
                </span>

                {data.rsvp_status && (
                  <span className="invitation-current-rsvp-v2">
                    <Check />
                    {rsvpLabel[data.rsvp_status]}
                  </span>
                )}
              </div>

              <div className="rsvp-actions rsvp-actions-three invitation-rsvp-actions-v2">
                <button
                  type="button"
                  disabled={saving}
                  className={data.rsvp_status === "attending" ? "selected" : ""}
                  onClick={() => void answer("attending")}
                >
                  <Check />
                  <span>
                    <strong>Hadir</strong>
                    <small>Saya akan datang</small>
                  </span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  className={data.rsvp_status === "maybe" ? "selected" : ""}
                  onClick={() => void answer("maybe")}
                >
                  <UsersRound />
                  <span>
                    <strong>Mungkin</strong>
                    <small>Belum bisa memastikan</small>
                  </span>
                </button>

                <button
                  type="button"
                  disabled={saving}
                  className={data.rsvp_status === "declined" ? "selected" : ""}
                  onClick={() => void answer("declined")}
                >
                  <X />
                  <span>
                    <strong>Tidak hadir</strong>
                    <small>Saya tidak bisa datang</small>
                  </span>
                </button>
              </div>

              <div className="invitation-extra invitation-extra-v2">
                <label className="invitation-field-v2">
                  <span>
                    <UsersRound />
                    <b>Jumlah tamu tambahan</b>
                  </span>
                  <select
                    value={guestCount}
                    onChange={(event) =>
                      setGuestCount(Number(event.target.value))
                    }
                    disabled={saving || data.rsvp_status === "declined"}
                  >
                    {Array.from({ length: 11 }, (_, value) => (
                      <option key={value} value={value}>
                        {value} tamu
                      </option>
                    ))}
                  </select>
                </label>

                <label className="invitation-field-v2 invitation-note-field-v2">
                  <span>
                    <MessageSquare />
                    <b>Catatan untuk pengurus</b>
                  </span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    maxLength={500}
                    placeholder="Opsional, misalnya datang menyusul."
                  />
                </label>
              </div>

              {saving && (
                <p className="invitation-saving-v2">Menyimpan respons…</p>
              )}

              {success && (
                <p className="success-message invitation-message-v2">
                  <Check />
                  {success}
                </p>
              )}

              {error && (
                <p className="error-message invitation-message-v2">{error}</p>
              )}
            </section>

            <section className="attendee-preview attendee-preview-v2">
              <div className="attendee-preview-head-v2">
                <span className="attendee-preview-icon-v2">
                  <UsersRound />
                </span>
                <span>
                  <small>WHO&apos;S COMING</small>
                  <h2>{confirmed.length} member hadir</h2>
                  <p>
                    Respons kehadiran member diperbarui secara otomatis.
                  </p>
                </span>
              </div>

              {attendees.length === 0 ? (
                <div className="attendee-empty-v2">
                  Belum ada member yang mengonfirmasi kehadiran.
                </div>
              ) : (
                <div className="attendee-chips attendee-chips-v2">
                  {attendees.slice(0, 18).map((attendee) => (
                    <span
                      key={attendee.member_external_id}
                      title={attendee.member_external_id}
                    >
                      <i>
                        {attendee.display_name.slice(0, 2).toUpperCase()}
                      </i>
                      <b>{attendee.display_name}</b>
                      {attendee.guest_count > 0 && (
                        <small>+{attendee.guest_count}</small>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {!loading && !data && error && (
          <p className="error-message invitation-message-v2">{error}</p>
        )}

        <footer className="invitation-footer-v2">
          <span>REVOLT RIDERS</span>
          <i />
          <span>RR XXII</span>
          <i />
          <span>SITUBONDO</span>
        </footer>
      </article>
    </main>
  );
}
