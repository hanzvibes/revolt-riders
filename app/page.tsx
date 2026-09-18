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
  Gauge,
  HeartHandshake,
  LogIn,
  MapPin,
  Phone,
  Route,
  User,
  UserPlus,
  UsersRound,
  Wrench,
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
    description: "Kumpul rutin santai bareng keluarga besar Revolt Riders.",
    image_url: "/bold-riders-situbondo.jpg",
    location: "Situbondo Kota",
    ride_date: "2026-03-01",
  },
  {
    id: "g-2",
    title: "Touring Silaturahmi Jalur Timur",
    description: "Riding santai nyusuri aspal pesisir timur Jawa bareng saudara aspal.",
    image_url: "/frtn.jpg",
    location: "Banyuwangi - Buleleng",
    ride_date: "2026-02-15",
  },
  {
    id: "g-3",
    title: "Rolling Thunder & Aksi Sosial",
    description: "Bagi-bagi senyum dan kepedulian bareng rekan komunitas roda dua.",
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
      setFormError("Centang persetujuan dulu ya biar kita sama-sama enak.");
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
            throw new Error("Nomor WhatsApp ini udah pernah daftar dan lagi diproses nih.");
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
          setFormError("Sistem pendaftaran lagi disinkronkan. Hubungi pengurus atau coba beberapa saat lagi ya.");
        } else if (rawMsg.includes("whatsapp") || rawMsg.includes("unique")) {
          setFormError("Nomor WhatsApp ini udah pernah daftar dan lagi diproses.");
        } else if (rawMsg) {
          setFormError(rawMsg);
        } else {
          setFormError("Gagal ngirim pendaftaran. Cek lagi data kamu ya!");
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
            <Image src="/revolt-riders-logo.jpg" alt="Logo Revolt Riders" width={40} height={40} priority />
            <div className="landing-brand-text">
              <strong>REVOLT RIDERS</strong>
              <small>SITUBONDO · EAST JAVA</small>
            </div>
          </Link>

          <ul className="landing-nav-links">
            <li><a href="#stats">Statistik</a></li>
            <li><a href="#agenda">Agenda</a></li>
            <li><a href="#gallery">Galeri</a></li>
            <li><a href="#profil">Tentang Kami</a></li>
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
              <span>Gabung RR</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-main">
        {/* 2. Hero: Clean Spacious Carbon Card (No 360 circle, No Kicker) */}
        <motion.section
          className="landing-hero-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image
            src="/revolt-riders-logo.jpg"
            alt=""
            width={320}
            height={320}
            className="landing-hero-mark"
            aria-hidden="true"
          />

          <div className="landing-hero-content">
            <h1>
              <em>REVOLT RIDERS</em>
              MOTOR CUSTOM SITUBONDO
            </h1>

            <p>
              Revolt Riders adalah wadah bagi para pecinta motor custom di Kabupaten Situbondo. Didirikan pada 22 Desember 2022, komunitas ini beroperasi dengan prinsip mandiri, terbuka, dan sosial untuk membangun kepedulian tanpa berafiliasi dengan kepentingan politik atau mencari keuntungan, serta mempererat persaudaraan di antara seluruh anggotanya dan komunitas motor lainnya di Situbondo.
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
                <span>GABUNG BARENG KAMI</span>
              </button>

              <Link href={user ? "/dashboard" : "/login"} className="btn-hero-secondary">
                <LogIn size={16} />
                <span>PORTAL ANGGOTA</span>
              </Link>
            </div>
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
              <small className="landing-stat-desc">Riders resmi terdaftar</small>
            </div>
          </article>

          <article className="landing-stat-tile">
            <div className="landing-stat-icon-wrap">
              <Gauge size={22} />
            </div>
            <div className="landing-stat-info">
              <span className="landing-stat-label">TOTAL JARAK TEMPUH</span>
              <b className="landing-stat-val">{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(totalKm)} KM</b>
              <small className="landing-stat-desc">Kilometer yang udah ditempuh</small>
            </div>
          </article>

          <article className="landing-stat-tile">
            <div className="landing-stat-icon-wrap">
              <Route size={22} />
            </div>
            <div className="landing-stat-info">
              <span className="landing-stat-label">SOWAN & TOURING</span>
              <b className="landing-stat-val">{totalRides}+ Kali</b>
              <small className="landing-stat-desc">Rolling & agenda terlaksana</small>
            </div>
          </article>
        </motion.section>

        {/* 4. Agenda Section (No Kicker) */}
        <motion.section
          className="landing-section"
          id="agenda"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="landing-section-head">
            <h2>Jadwal Riding & Kopdar Terdekat</h2>
            <p>Agenda kumpul dan sowan yang bisa kamu ikutin. Gas bareng yuk!</p>
          </div>

          {publicEvents.length === 0 ? (
            <div className="landing-agenda-empty">
              <CalendarDays size={32} />
              <h3>Belum Ada Jadwal Kumpul Baru</h3>
              <p>Jadwal riding atau kopdar berikutnya bakal diumumin di sini sama di Instagram kita ya.</p>
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
                      <p>{evt.description || "Agenda resmi kumpul santai bareng Revolt Riders Situbondo."}</p>

                      <div className="landing-agenda-meta">
                        <span>
                          <MapPin size={12} style={{ color: "var(--red)" }} />
                          {evt.location_name || "Situbondo"}
                        </span>
                        {evt.location_url && (
                          <a href={evt.location_url} target="_blank" rel="noreferrer">
                            Cek Maps ↗
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

        {/* 5. Galeri Pilihan (No Kicker) */}
        <motion.section
          className="landing-section"
          id="gallery"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="landing-section-head">
            <h2>Momen Seru di Jalan</h2>
            <p>Cuplikan keseruan pas sowan dan touring bareng nyusuri aspal nusantara.</p>
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

        {/* 6. Profil & Storytelling (Visual Storytelling, Highlight & Minimalist Values) */}
        <motion.section
          className="landing-section"
          id="profil"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="landing-section-head">
            <h2>Tentang Revolt Riders</h2>
            <p>Kisah singkat, fondasi persaudaraan, dan semangat gotong-royong kami di Situbondo.</p>
          </div>

          {/* Special Highlight: EST. 22.12.2022 & Minimalist Values */}
          <div className="story-manifesto-card">
            <div className="story-origin-badge">
              <span className="story-est">EST. 22.12.2022</span>
              <span className="story-dot">/</span>
              <span className="story-loc">SITUBONDO, EAST JAVA</span>
            </div>

            <div className="story-values-bar">
              <span className="story-values-line">MANDIRI • TERBUKA • SOSIAL</span>
              <span className="story-values-line accent">SOLIDARITAS • PERSAUDARAAN</span>
            </div>
          </div>

          {/* Storytelling Visual Blocks */}
          <div className="story-grid">
            {/* Block 1: Motor Custom & Prinsip Independen */}
            <article className="story-card">
              <div className="story-card-icon" aria-hidden="true">
                <Wrench size={22} />
              </div>
              <h3>Rumah Motor Custom Situbondo</h3>
              <div className="story-points">
                <div className="story-point-item">
                  <strong>Wadah Kreasi & Hobi</strong>
                  <p>
                    Didirikan pada 22 Desember 2022 sebagai ruang kumpul bersama bagi para penikmat dan penggiat motor custom di Kabupaten Situbondo.
                  </p>
                </div>
                <div className="story-point-item">
                  <strong>Mandiri, Terbuka & Sosial</strong>
                  <p>
                    Murni persaudaraan tanpa afiliasi politik dan tidak mencari keuntungan. Bergerak bersama dengan semangat gotong-royong demi merangkul sesama roda dua.
                  </p>
                </div>
              </div>
            </article>

            {/* Block 2: Solidaritas Bikers yang Abadi */}
            <article className="story-card">
              <div className="story-card-icon" aria-hidden="true">
                <HeartHandshake size={22} />
              </div>
              <h3>Solidaritas Bikers yang Abadi</h3>
              <div className="story-points">
                <div className="story-point-item">
                  <strong>Lebih Dari Sekadar Hobi</strong>
                  <p>
                    Bagi kami, menjadi bikers adalah tentang menjunjung tinggi solidaritas tulus yang sangat kuat dan tak lekang oleh waktu di setiap perjalanan.
                  </p>
                </div>
                <div className="story-point-item">
                  <strong>Merangkul Semua Kalangan</strong>
                  <p>
                    Dari anak muda hingga kaum profesional, baik yang sudah berkeluarga maupun masih lajang—semua melebur dalam rasa saling menghargai.
                  </p>
                </div>
              </div>
            </article>
          </div>

          {/* Official Partners Banner */}
          <div className="story-partners-strip">
            <div className="story-partners-title">
              <strong>Kemitraan & Rekanan Resmi</strong>
              <small>Mempererat persaudaraan antar komunitas motor di Situbondo</small>
            </div>

            <div className="story-partners-logos">
              <figure className="story-partner-logo">
                <Image
                  src="/bold-riders-situbondo.jpg"
                  alt="Bold Riders Situbondo"
                  fill
                  sizes="140px"
                />
              </figure>
              <figure className="story-partner-logo">
                <Image
                  src="/frtn.jpg"
                  alt="FRTN"
                  fill
                  sizes="140px"
                />
              </figure>
            </div>
          </div>
        </motion.section>

        {/* 7. Instagram Showcase (Minimalist Monochrome SVG) */}
        <motion.section
          className="landing-section"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div className="landing-instagram-card">
            <div className="landing-instagram-left">
              <div className="landing-instagram-icon" aria-hidden="true">
                <InstagramIcon size={22} />
              </div>
              <div className="landing-instagram-text">
                <h3>Ngintip Keseruan Kita di Instagram</h3>
                <p>Pantau dokumentasi riding, video reels, sama update tongkrongan di @revoltriders_</p>
              </div>
            </div>

            <a
              href="https://www.instagram.com/revoltriders_"
              target="_blank"
              rel="noreferrer"
              className="btn-instagram-follow"
            >
              <InstagramIcon size={15} />
              <span>Follow @revoltriders_ ↗</span>
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
            © {new Date().getFullYear()} Revolt Riders Situbondo · Satu Aspal, Satu Persaudaraan.
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
              Gabung RR
            </button>
          </div>
        </div>
      </footer>

      {/* 9. Join With Us Native Modal Sheet */}
      <ModalSheet
        open={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        eyebrow=""
        title="Gabung Bareng Revolt Riders"
      >
        <div className="join-modal-body">
          {formSuccess ? (
            <div className="join-success-card">
              <CheckCircle2 size={52} />
              <h3>Mantap, Pendaftaran Masuk!</h3>
              <p>
                Makasih udah daftar, <b>{fullName}</b>! Formulir kamu udah kita terima. Tunggu chat santai dari pengurus
                Revolt Riders di WhatsApp <b>{whatsapp}</b> ya!
              </p>
              <button
                type="button"
                className="btn-hero-primary"
                style={{ width: "100%", maxWidth: 220, justifyContent: "center" }}
                onClick={resetForm}
              >
                Oke, Siap!
              </button>
            </div>
          ) : (
            <>
              <p className="join-modal-intro">
                Isi data singkat kamu di bawah buat kenalan ya. Nanti pengurus bakal nyapa kamu langsung lewat WhatsApp.
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
                    <small>Buat dihubungin pengurus</small>
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
                    Gue nyatain data ini bener dan siap riding santun serta patuh kode etik Revolt Riders.
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
