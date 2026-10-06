import { ModalSheet } from "@/components/modal-sheet";
import { Plus, Route, Search } from "lucide-react";
import { filterMembers, type EventFormState, type ManagedEvent, type Member } from "./events-model";

type EventsFormModalProps = {
  open: boolean;
  editing: ManagedEvent | null;
  form: EventFormState;
  members: Member[];
  saving: boolean;
  syncing: boolean;
  error: string;
  onChange: (patch: Partial<EventFormState>) => void;
  onToggleParticipant: (memberId: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onSyncOfficialKm: () => void;
  onClose: () => void;
};

export function EventsFormModal({
  open,
  editing,
  form,
  members,
  saving,
  syncing,
  error,
  onChange,
  onToggleParticipant,
  onSubmit,
  onSyncOfficialKm,
  onClose,
}: EventsFormModalProps) {
  const filteredMembers = filterMembers(members, form.participantQuery);

  return (
    <ModalSheet
      open={open}
      onClose={onClose}
      eyebrow={editing ? "EDIT AGENDA" : "AGENDA BARU"}
      title={editing ? "Perbarui agenda" : "Buat draft agenda"}
    >
      <form className="event-create-form sheet-form" onSubmit={onSubmit}>
        <label className="field-title">
          Judul agenda
          <input
            value={form.title}
            onChange={(event) => onChange({ title: event.target.value })}
            minLength={3}
            maxLength={120}
            required
          />
        </label>

        <label className="field-type">
          Jenis agenda
          <select
            value={form.type}
            onChange={(event) => onChange({ type: event.target.value })}
          >
            <option value="kopdar">Kopdar</option>
            <option value="riding">Riding</option>
            <option value="touring">Touring</option>
            <option value="social">Social</option>
            <option value="voyager">Voyager</option>
            <option value="other">Lainnya</option>
          </select>
        </label>

        <label className="field-location">
          Lokasi
          <input
            value={form.location}
            onChange={(event) => onChange({ location: event.target.value })}
            maxLength={180}
          />
        </label>

        <label className="field-url">
          Link Maps (opsional)
          <input
            type="url"
            value={form.locationUrl}
            onChange={(event) => onChange({ locationUrl: event.target.value })}
          />
        </label>

        <label className="field-start">
          Waktu mulai
          <input
            type="datetime-local"
            value={form.start}
            onChange={(event) => onChange({ start: event.target.value })}
            required
          />
        </label>

        <label className="field-meetup">
          Meetup (opsional)
          <input
            type="datetime-local"
            value={form.meetup}
            onChange={(event) => onChange({ meetup: event.target.value })}
          />
        </label>

        <label className="field-end">
          Waktu selesai (opsional)
          <input
            type="datetime-local"
            value={form.end}
            onChange={(event) => onChange({ end: event.target.value })}
          />
        </label>

        <label className="field-description entry-description">
          Deskripsi
          <textarea
            value={form.description}
            onChange={(event) => onChange({ description: event.target.value })}
            maxLength={2000}
            rows={3}
          />
        </label>

        <label
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#f8fafc",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(event) => onChange({ isPublic: event.target.checked })}
            style={{ width: 18, height: 18, accentColor: "var(--red)", cursor: "pointer" }}
          />
          <span style={{ display: "flex", flexDirection: "column" }}>
            <strong style={{ fontSize: "0.78rem", color: "var(--ink)" }}>
              Publik (Tampil di Landing Page)
            </strong>
            <small style={{ color: "var(--muted)", fontSize: "0.68rem" }}>
              {form.isPublic
                ? "Agenda ini dapat dilihat masyarakat umum di Landing Page."
                : "Agenda internal (hanya terlihat member yang login)."}
            </small>
          </span>
        </label>

        <section className="voyager-admin-activity-fields">
          <div className="section-title">
            <span>
              <em>Official ride</em>
              <h3>Mandatory Ride & Participant</h3>
            </span>
            <b>{form.participantIds.length} member</b>
          </div>

          <label className="voyager-switch">
            <input
              type="checkbox"
              checked={form.countsAsMandatory}
              onChange={(event) => onChange({ countsAsMandatory: event.target.checked })}
            />
            <span>
              <b>Count as Mandatory Ride</b>
              <small>Agenda apa pun boleh dihitung Mandatory jika pengurus mengaktifkannya.</small>
            </span>
          </label>

          {(form.countsAsMandatory || form.type === "voyager") && (
            <>
              <label className="voyager-admin-distance">
                Official Trip Distance
                <div className="voyager-distance-input">
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={form.officialDistance}
                    onChange={(event) => onChange({ officialDistance: event.target.value })}
                    placeholder="184"
                  />
                  <span>KM</span>
                </div>
                <small>Tidak ada minimum KM. Semua participant mendapat jarak yang sama.</small>
              </label>

              <label className="voyager-member-search">
                <Search />
                <input
                  aria-label="Cari participant agenda"
                  value={form.participantQuery}
                  onChange={(event) => onChange({ participantQuery: event.target.value })}
                  placeholder="Cari participant berdasarkan nama atau ID RR"
                />
              </label>

              <div className="voyager-member-picker">
                {filteredMembers.map((member) => (
                  <label key={member.member_external_id}>
                    <input
                      type="checkbox"
                      checked={form.participantIds.includes(member.member_external_id)}
                      onChange={() => onToggleParticipant(member.member_external_id)}
                    />
                    <span>
                      <b>{member.nickname || member.full_name}</b>
                      <small>
                        {member.member_external_id}
                        {member.city ? ` · ${member.city}` : ""}
                      </small>
                    </span>
                  </label>
                ))}
              </div>

              <small className="voyager-admin-helper">
                Participant dipilih manual oleh pengurus dan tidak bergantung pada RSVP atau Check-in.
              </small>

              {editing && form.countsAsMandatory && (
                <button
                  type="button"
                  className="voyager-admin-sync"
                  disabled={
                    syncing ||
                    saving ||
                    editing.status === "draft" ||
                    form.participantIds.length === 0 ||
                    Number(form.officialDistance) <= 0
                  }
                  onClick={onSyncOfficialKm}
                >
                  <Route />
                  {syncing ? "SINKRONISASI…" : "SYNC OFFICIAL KM"}
                </button>
              )}
            </>
          )}
        </section>

        {error && <p className="error-message" role="alert">{error}</p>}

        <div className="sheet-actions">
          <button className="primary-action" disabled={saving}>
            {saving ? (
              "MENYIMPAN…"
            ) : editing ? (
              "SIMPAN PERUBAHAN"
            ) : (
              <>
                <Plus />
                SIMPAN DRAFT
              </>
            )}
          </button>
          <button type="button" className="outline-action" onClick={onClose}>
            BATAL
          </button>
        </div>
      </form>
    </ModalSheet>
  );
}
