"use client";

import { ModalSheet } from "@/components/modal-sheet";
import { InstagramIcon } from "@/components/icons/instagram";
import { useDataCache } from "@/context/data-cache-context";
import type { EventRecord } from "@/lib/domain";
import { formatShortDate } from "@/lib/domain";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Compass,
  Gauge,
  HeartHandshake,
  LogIn,
  MapPin,
  Phone,
  Route,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  location: string | null;
  ride_date: string | null;
};

const DEFAULT_GALLERY: GalleryItem[] = [
  {
    id: "g-1",
    title: "Kopdar Akbar & Silaturahmi",
    description: "Pertemuan rutin mempererat solidaritas antar anggota roda dua.",
    image_url: "/bold-riders-situbondo.jpg",
    location: "Situbondo Kota",
    ride_date: "2026-03-01",
  },
  {
    id: "g-2",
    title: "Touring Persaudaraan Jalur Timur",
    description: "Sowan dan touring resmi menyusuri keindahan aspal timur Jawa.",
    image_url: "/frtn.jpg",
    location: "Banyuwangi - Buleleng",
    ride_date: "2026-02-15",
  },
  {
    id: "g-3",
    title: "Rolling Thunder & Bakti Sosial",
    description: "Aksi kepedulian sosial santun bersama rekan komunitas riders.",
    image_url: "/revolt-riders-logo.jpg",
    location: "Besuki - Bondowoso",
    ride_date: "2026-01-20",
  },
];

export default function PublicLandingPage() {
  const { user } = useDataCache();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  // Live Stats State
  const [totalMembers, setTotalMembers] = useState(27);
  const [totalKm, setTotalKm] = useState(19177);
  const [totalRides, setTotalRides] = useState(194);

  // Agenda & Gallery State
  const [publicEvents, setPublicEvents] = useState<EventRecord[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>(DEFAULT_GALLERY);

  // Form State
  const [fullName, setFullName] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [agreement, setAgreement] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // Load Public Data
  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const supabase = getSupabaseBrowserClient();

        // 1. Fetch public stats
        const { data: statsData, error: statsErr } = await supabase.rpc("get_public_club_stats");
        if (!statsErr && statsData?.[0]) {
          if (active) {
            setTotalMembers(Number(statsData[0].total_members) || 27);
            setTotalRides(Number(statsData[0].total_rides) || 194);
            setTotalKm(Number(statsData[0].total_km) || 19177);
          }
        } else {
          const { count } = await supabase.from("member_profiles").select("member_external_id", { count: "exact", head: true });
          if (count && active) setTotalMembers(count);
        }

        // 2. Fetch public events (limit 2)
        const { data: eventsData } = await supabase
          .from("events")
          .select("id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status")
          .eq("status", "published")
          .order("start_at", { ascending: true })
          .limit(2);

        if (eventsData && active) {
          setPublicEvents(eventsData as EventRecord[]);
        }

        // 3. Fetch gallery (limit 3)
        const { data: galleryData, error: galErr } = await supabase
          .from("club_gallery")
          .select("id,title,description,image_url,location,ride_date")
          .eq("is_public", true)
          .order("ride_date", { ascending: false })
          .limit(3);

        if (!galErr && galleryData && galleryData.length > 0 && active) {
          setGallery(galleryData as GalleryItem[]);
        }
      } catch (err) {
        console.warn("Public landing data notice:", err);
      }
    }

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  // Form Submission
  const handleSubmitJoin = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!agreement) {
      setFormError("Anda harus menyetujui pernyataan & ketentuan komunitas.");
      return;
    }
    setFormSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();

      const { error } = await supabase.rpc("submit_join_request", {
        p_full_name: fullName.trim(),
        p_birth_place: birthPlace.trim(),
        p_birth_date: birthDate,
        p_city: city.trim(),
        p_instagram: instagram.trim().replace(/^@/, ""),
        p_whatsapp: whatsapp.trim(),
        p_agreement: true,
      });

      if (error) throw error;

      setFormSuccess(true);
    } catch (err) {
      try {
        const supabase = getSupabaseBrowserClient();
        let cleanWa = whatsapp.replace(/[^0-9]/g, "");
        if (cleanWa.startsWith("08")) cleanWa = "628" + cleanWa.slice(2);
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

        const { error: insErr } = await supabase.from("join_requests").insert({
          full_name: fullName.trim(),
          birth_place: birthPlace.trim(),
          birth_date: birthDate,
          city: city.trim(),
          instagram: instagram.trim().replace(/^@/, ""),
          whatsapp: cleanWa,
          agreement: true,
          status: "pending",
          confirmation_token: token,
        });

        if (insErr) {
          if (insErr.message.includes("whatsapp") || insErr.message.includes("unique")) {
            throw new Error("Nomor WhatsApp ini sudah memiliki pendaftaran yang sedang diproses.");
          }
          throw insErr;
        }

        setFormSuccess(true);
      } catch (innerErr) {
        const rawMsg =
          (innerErr as { message?: string })?.message ||
          (err as { message?: string })?.message ||
          "";
        if (rawMsg.includes("join_requests") || rawMsg.includes("schema cache")) {
          setFormError("Sistem pendaftaran sedang disinkronkan ke database. Silakan hubungi pengurus atau coba beberapa saat lagi.");
        } else if (rawMsg.includes("whatsapp") || rawMsg.includes("unique")) {
          setFormError("Nomor WhatsApp ini sudah memiliki pendaftaran yang sedang diproses.");
        } else if (rawMsg) {
          setFormError(rawMsg);
        } else {
          setFormError("Pendaftaran gagal dikirim. Silakan periksa kembali data Anda.");
        }
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFullName("");
    setBirthPlace("");
    setBirthDate("");
    setCity("");
    setInstagram("");
    setWhatsapp("");
    setAgreement(false);
    setFormError("");
    setFormSuccess(false);
    setIsJoinModalOpen(false);
  };

  return (
    <div className="landing-page">
      {/* 1. Header / Navigation */}
      <header className="landing-header">
        <div className="landing-nav-container">
          <Link href="/" className="landing-brand">
            <Image src="/revolt-riders-logo.jpg" alt="Logo Revolt Riders" width={42} height={42} priority />
            <div className="landing-brand-text">
              <strong>REVOLT RIDERS</strong>
              <small>SITUBONDO · EAST JAVA</small>
            </div>
          </Link>

          <ul className="landing-nav-links">
            <li><a href="#stats">Statistik</a></li>
            <li><a href="#agenda">Agenda</a></li>
            <li><a href="#gallery">Galeri</a></li>
            <li><a href="#profil">Profil & Aliansi</a></li>
          </ul>

          <div className="landing-nav-actions">
            <Link href={user ? "/dashboard" : "/login"} className="btn-nav-portal">
              <LogIn size={15} />
              <span>{user ? "Portal Member" : "Masuk Member"}</span>
            </Link>

            <button
              type="button"
              className="btn-nav-join"
              onClick={() => {
                setFormSuccess(false);
                setFormError("");
                setIsJoinModalOpen(true);
              }}
            >
              <UserPlus size={15} />
              <span>Join With Us</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-main">
        {/* 2. Hero: 2-Column Balanced Carbon Card */}
        <motion.section
          className="landing-hero-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src="/revolt-riders-logo.jpg"
            alt=""
            width={280}
            height={280}
            className="landing-hero-mark"
            aria-hidden="true"
          />

          <div className="landing-hero-content">
            <span className="landing-hero-badge">
              <Sparkles size={12} />
              KOMUNITAS MOTOR RESMI · SITUBONDO
            </span>

            <h1>
              <em>SATU ASPAL.</em>
              SATU PERSAUDARAAN.
            </h1>

            <p>
              Wadah persaudaraan roda dua di Situbondo yang menjunjung tinggi kebersamaan, etika berkendara santun, dan aksi sosial tanpa membedakan kasta kendaraan.
            </p>

            <div className="landing-hero-actions">
              <button
                type="button"
                className="btn-hero-primary"
                onClick={() => {
                  setFormSuccess(false);
                  setFormError("");
                  setIsJoinModalOpen(true);
                }}
              >
                <UserPlus size={16} />
                <span>GABUNG BERSAMA KAMI</span>
              </button>

              <Link href={user ? "/dashboard" : "/login"} className="btn-hero-secondary">
                <LogIn size={16} />
                <span>PORTAL ANGGOTA</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Speedometer Gauge */}
          <div className="landing-hero-gauge-wrap">
            <motion.div
              className="landing-speedo-gauge"
              aria-hidden="true"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
            >
              <small>SPEED OF BROTHERHOOD</small>
              <b>360°</b>
              <span>SOLIDARITAS</span>
            </motion.div>
          </div>
        </motion.section>

        {/* 3. Live Statistics Grid */}
        <motion.section
          className="landing-stats"
          id="stats"
          aria-label="Statistik Komunitas"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <article className="landing-stat-tile">
            <div className="landing-stat-icon-wrap">
              <UsersRound size={22} />
            </div>
            <div className="landing-stat-info">
              <span className="landing-stat-label">MEMBER AKTIF</span>
              <b className="landing-stat-val">{totalMembers}</b>
              <small className="landing-stat-desc">Anggota resmi terverifikasi</small>
            </div>
          </article>

          <article className="landing-stat-tile">
            <div className="landing-stat-icon-wrap">
              <Gauge size={22} />
            </div>
            <div className="landing-stat-info">
              <span className="landing-stat-label">TOTAL JARAK TEMPUH</span>
              <b className="landing-stat-val">{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(totalKm)} KM</b>
              <small className="landing-stat-desc">Akumulasi odometer touring</small>
            </div>
          </article>

          <article className="landing-stat-tile">
            <div className="landing-stat-icon-wrap">
              <Route size={22} />
            </div>
            <div className="landing-stat-info">
              <span className="landing-stat-label">SOWAN & TOURING</span>
              <b className="landing-stat-val">{totalRides}+</b>
              <small className="landing-stat-desc">Kegiatan resmi terlaksana</small>
            </div>
          </article>
        </motion.section>

        {/* 4. Agenda Terbuka (Max 2 Cards) */}
        <motion.section
          className="landing-section"
          id="agenda"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="landing-section-head">
            <em>AGENDA TERBUKA</em>
            <h2>Kopdar & Jadwal Terdekat</h2>
            <p>Jadwal sowan, touring, dan kegiatan publik terbuka untuk dihadiri calon anggota & rekan riders.</p>
          </div>

          {publicEvents.length === 0 ? (
            <div className="landing-agenda-empty">
              <CalendarDays size={32} />
              <h3>Belum Ada Agenda Publik Mendatang</h3>
              <p>Agenda touring dan kopdar selanjutnya akan diumumkan di sini & Instagram resmi.</p>
            </div>
          ) : (
            <div className="landing-agenda-list">
              {publicEvents.map((evt) => {
                const d = formatShortDate(evt.start_at);
                return (
                  <article className="landing-agenda-card" key={evt.id}>
                    <time>
                      <b>{d.day}</b>
                      <small>{d.month}</small>
                    </time>

                    <div className="landing-agenda-info">
                      <span className="landing-agenda-badge">{evt.type}</span>
                      <h3>{evt.title}</h3>
                      <p>{evt.description || "Agenda resmi komunitas motor Revolt Riders Situbondo."}</p>

                      <div className="landing-agenda-meta">
                        <span>
                          <MapPin size={12} style={{ color: "var(--red)" }} />
                          {evt.location_name || "Situbondo"}
                        </span>
                        {evt.location_url && (
                          <a href={evt.location_url} target="_blank" rel="noreferrer">
                            Peta Lokasi ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </motion.section>

        {/* 5. Galeri Pilihan (Max 3 Curated Photos) */}
        <motion.section
          className="landing-section"
          id="gallery"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="landing-section-head">
            <em>DOKUMENTASI TOURING</em>
            <h2>Momen Perjalanan</h2>
            <p>Dokumentasi kebersamaan sowan & touring resmi menyusuri aspal nusantara.</p>
          </div>

          <div className="landing-gallery-grid">
            {gallery.map((item) => (
              <article className="landing-gallery-card" key={item.id}>
                <div className="landing-gallery-media">
                  <Image
                    src={item.image_url}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                  />
                </div>
                <div className="landing-gallery-body">
                  <div className="landing-gallery-meta">
                    <span>
                      <MapPin size={11} style={{ color: "var(--red)" }} />
                      {item.location || "Situbondo"}
                    </span>
                    {item.ride_date && (
                      <span>
                        <CalendarDays size={11} />
                        {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.ride_date))}
                      </span>
                    )}
                  </div>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                </div>
              </article>
            ))}
          </div>
        </motion.section>

        {/* 6. Profil & Aliansi Resmi (Unified Card) */}
        <motion.section
          className="landing-section"
          id="profil"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="landing-section-head">
            <em>IDENTITAS RESMI</em>
            <h2>Profil & Aliansi Komunitas</h2>
            <p>Prinsip dasar kebersamaan dan kemitraan resmi komunitas Revolt Riders.</p>
          </div>

          <div className="landing-profil-card">
            <div className="landing-profil-left">
              <h3>Satu Aspal Tanpa Sekat</h3>
              <p>
                Revolt Riders Situbondo berdiri di atas prinsip persaudaraan tulus. Tidak membedakan tipe atau pabrikan motor—semua pengendara beretika santun dan berjiwa sosial disambut hangat sebagai saudara.
              </p>

              <div className="landing-chips-grid">
                <div className="landing-chip">
                  <HeartHandshake size={16} />
                  <span>Solidaritas Tulus</span>
                </div>
                <div className="landing-chip">
                  <ShieldCheck size={16} />
                  <span>Safety First Mindset</span>
                </div>
                <div className="landing-chip">
                  <Compass size={16} />
                  <span>Eksplorasi Sowan</span>
                </div>
                <div className="landing-chip">
                  <Sparkles size={16} />
                  <span>Terbuka Semua Merk</span>
                </div>
              </div>
            </div>

            <div className="landing-profil-right">
              <div className="landing-profil-right-title">
                <em>KEMITRAAN RESMI</em>
                <small>Situbondo · East Java</small>
              </div>

              <div className="landing-partner-row">
                <div className="landing-partner-item">
                  <Image
                    src="/bold-riders-situbondo.jpg"
                    alt="Bold Riders Situbondo"
                    fill
                    sizes="(max-width: 600px) 100vw, 180px"
                  />
                </div>
                <div className="landing-partner-item">
                  <Image
                    src="/frtn.jpg"
                    alt="FRTN"
                    fill
                    sizes="(max-width: 600px) 100vw, 180px"
                  />
                </div>
              </div>

              <div className="landing-partner-captions">
                <span>Bold Riders Situbondo</span>
                <span>FRTN Situbondo</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* 7. Instagram Showcase */}
        <motion.section
          className="landing-section"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="landing-instagram-card">
            <div className="landing-instagram-left">
              <div className="landing-instagram-icon">
                <InstagramIcon size={22} />
              </div>
              <div className="landing-instagram-text">
                <h3>Ikuti Dokumentasi di Instagram</h3>
                <p>Update kegiatan, video reels perjalanan, dan pengumuman resmi di @revoltriders_</p>
              </div>
            </div>

            <a
              href="https://www.instagram.com/revoltriders_"
              target="_blank"
              rel="noreferrer"
              className="btn-instagram-follow"
            >
              <InstagramIcon size={15} />
              <span>Follow @revoltriders_</span>
            </a>
          </div>
        </motion.section>
      </main>

      {/* 8. Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-brand">
            <Image src="/revolt-riders-logo.jpg" alt="Logo Revolt Riders" width={30} height={30} />
            <span>REVOLT RIDERS SITUBONDO</span>
          </div>

          <div className="landing-footer-copy">
            © {new Date().getFullYear()} Revolt Riders Situbondo. Satu Aspal, Satu Persaudaraan.
          </div>

          <div className="landing-footer-links">
            <Link href={user ? "/dashboard" : "/login"}>Portal Member</Link>
            <a href="https://www.instagram.com/revoltriders_" target="_blank" rel="noreferrer">Instagram</a>
            <button
              type="button"
              onClick={() => {
                setFormSuccess(false);
                setFormError("");
                setIsJoinModalOpen(true);
              }}
            >
              Join With Us
            </button>
          </div>
        </div>
      </footer>

      {/* 9. Join With Us Native Modal Sheet */}
      <ModalSheet
        open={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        eyebrow="PENDAFTARAN ANGGOTA BARU"
        title="Join With Revolt Riders"
      >
        <div className="join-modal-body">
          {formSuccess ? (
            <div className="join-success-card">
              <CheckCircle2 size={52} />
              <h3>Pendaftaran Berhasil Dikirim!</h3>
              <p>
                Terima kasih, <b>{fullName}</b>! Formulir pendaftaran Anda telah tersimpan dengan status <b>Pending</b>.
                Pengurus Revolt Riders akan segera meninjau formulir dan mengirimkan instruksi konfirmasi via WhatsApp ke
                nomor <b>{whatsapp}</b>.
              </p>
              <button
                type="button"
                className="btn-hero-primary"
                style={{ width: "100%", maxWidth: 240, justifyContent: "center" }}
                onClick={resetForm}
              >
                Selesai
              </button>
            </div>
          ) : (
            <>
              <p className="join-modal-intro">
                Lengkapi formulir di bawah ini untuk peninjauan pengurus. Data Anda disimpan aman sebagai Join Request.
              </p>

              <form className="join-form-stack" onSubmit={handleSubmitJoin}>
                <div className="join-field-group">
                  <label className="join-field-label">
                    <span>Nama Lengkap</span>
                    <small>Sesuai KTP/SIM</small>
                  </label>
                  <div className="join-input-wrap">
                    <User />
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      required
                      minLength={3}
                    />
                  </div>
                </div>

                <div className="join-form-row">
                  <div className="join-field-group">
                    <label className="join-field-label">
                      <span>Tempat Lahir</span>
                    </label>
                    <div className="join-input-wrap">
                      <MapPin />
                      <input
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        placeholder="Situbondo"
                        required
                      />
                    </div>
                  </div>

                  <div className="join-field-group">
                    <label className="join-field-label">
                      <span>Tanggal Lahir</span>
                    </label>
                    <div className="join-input-wrap">
                      <CalendarDays />
                      <input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="join-form-row">
                  <div className="join-field-group">
                    <label className="join-field-label">
                      <span>Domisili / Kota</span>
                    </label>
                    <div className="join-input-wrap">
                      <MapPin />
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Contoh: Situbondo Kota"
                        required
                      />
                    </div>
                  </div>

                  <div className="join-field-group">
                    <label className="join-field-label">
                      <span>Akun Instagram</span>
                    </label>
                    <div className="join-input-wrap">
                      <InstagramIcon />
                      <input
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@username"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="join-field-group">
                  <label className="join-field-label">
                    <span>Nomor WhatsApp Aktif</span>
                    <small>Untuk konfirmasi pengurus</small>
                  </label>
                  <div className="join-input-wrap">
                    <Phone />
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="081234567890"
                      required
                      minLength={10}
                    />
                  </div>
                </div>

                <div className="join-agreement-box">
                  <input
                    type="checkbox"
                    id="agreement-check"
                    checked={agreement}
                    onChange={(e) => setAgreement(e.target.checked)}
                    required
                  />
                  <label htmlFor="agreement-check">
                    Saya menyatakan data ini benar dan bersedia mematuhi kode etik, nilai persaudaraan, dan standar keselamatan berkendara Revolt Riders.
                  </label>
                </div>

                {formError && (
                  <div className="error-message">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-join-submit"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? "Mengirim Pendaftaran…" : "KIRIM PENDAFTARAN"}
                </button>
              </form>
            </>
          )}
        </div>
      </ModalSheet>
    </div>
  );
}
