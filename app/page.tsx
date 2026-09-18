"use client";

import { useDataCache } from "@/context/data-cache-context";
import type { EventRecord } from "@/lib/domain";
import { formatShortDate } from "@/lib/domain";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
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
  X,
} from "lucide-react";
import { InstagramIcon } from "@/components/icons/instagram";
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
    title: "Kopdar Akbar & Silaturahmi Situbondo",
    description: "Pertemuan rutin seluruh member Revolt Riders mempererat solidaritas antar anggota.",
    image_url: "/bold-riders-situbondo.jpg",
    location: "Situbondo Kota",
    ride_date: "2026-03-01",
  },
  {
    id: "g-2",
    title: "Touring Persaudaraan Jalur Timur",
    description: "Perjalanan sowan dan touring resmi menyusuri keindahan aspal timur Pulau Jawa.",
    image_url: "/frtn.jpg",
    location: "Banyuwangi - Buleleng",
    ride_date: "2026-02-15",
  },
  {
    id: "g-3",
    title: "Rolling Thunder & Bakti Sosial",
    description: "Aksi kepedulian sosial dan rolling thunder santun bersama rekan komunitas.",
    image_url: "/revolt-riders-logo.jpg",
    location: "Besuki - Bondowoso",
    ride_date: "2026-01-20",
  },
];

const FAQS = [
  {
    q: "Apa saja syarat utama untuk bergabung dengan Revolt Riders?",
    a: "Syarat utama adalah memiliki sepeda motor yang layak jalan dan sesuai standar keselamatan, memiliki SIM C aktif, berdomisili di Situbondo atau sekitarnya, serta berkomitmen menjunjung tinggi nilai persaudaraan, saling menghargai, dan etika berkendara santun di jalan raya.",
  },
  {
    q: "Apakah ada batasan kapasitas mesin (CC) atau jenis motor tertentu?",
    a: "Tidak ada batasan CC maupun merk/tipe motor. Revolt Riders berdiri di atas prinsip 'Tanpa Sekat' — baik matic, bebek, naked, sport, maupun classic, semua disambut hangat sebagai saudara aspal.",
  },
  {
    q: "Bagaimana tahapan alur seleksi dan pendaftaran anggota?",
    a: "Alur rekrutmen kami transparan: 1) Anda mengisi formulir Join With Us di website ini (Status: Pending). 2) Pengurus memverifikasi data dan menyetujui (Status: Accepted). 3) Anda menerima tautan WhatsApp untuk mengonfirmasi komitmen bergabung (Status: Confirmed). 4) Pengurus menerbitkan Nomor Anggota (ID RR) resmi Anda (Status: Active).",
  },
  {
    q: "Kapan dan di mana jadwal kopdar rutin Revolt Riders diadakan?",
    a: "Kopdar rutin biasanya diadakan berkala di titik kumpul resmi area Situbondo. Jadwal dan lokasi kopdar publik selalu diperbarui pada seksi Agenda di landing page ini.",
  },
  {
    q: "Apakah calon anggota yang permohonannya pernah ditolak/expired boleh mendaftar lagi?",
    a: "Tentu boleh! Jika pendaftaran sebelumnya kedaluwarsa karena tidak sempat konfirmasi dalam 7 hari atau pernah ditolak, Anda dipersilakan mengajukan pendaftaran baru kapan saja.",
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
          // Fallback stats query
          const { count } = await supabase.from("member_profiles").select("member_external_id", { count: "exact", head: true });
          if (count && active) setTotalMembers(count);
        }

        // 2. Fetch public events
        const { data: eventsData } = await supabase
          .from("events")
          .select("id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status")
          .eq("status", "published")
          .order("start_at", { ascending: true })
          .limit(3);

        if (eventsData && active) {
          setPublicEvents(eventsData as EventRecord[]);
        }

        // 3. Fetch gallery
        const { data: galleryData, error: galErr } = await supabase
          .from("club_gallery")
          .select("id,title,description,image_url,location,ride_date")
          .eq("is_public", true)
          .order("ride_date", { ascending: false })
          .limit(6);

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

      // Call RPC
      const { data, error } = await supabase.rpc("submit_join_request", {
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
      // Fallback direct insert if RPC pending
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
          setFormError("Sistem pendaftaran sedang disinkronkan ke database (migrasi join_requests). Silakan hubungi pengurus atau coba beberapa saat lagi.");
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
            <Image src="/revolt-riders-logo.jpg" alt="Logo Revolt Riders" width={44} height={44} priority />
            <div className="landing-brand-text">
              <strong>REVOLT RIDERS</strong>
              <small>SITUBONDO · EAST JAVA</small>
            </div>
          </Link>

          <ul className="landing-nav-links">
            <li><a href="#about">Tentang Kami</a></li>
            <li><a href="#stats">Statistik</a></li>
            <li><a href="#agenda">Agenda</a></li>
            <li><a href="#gallery">Galeri</a></li>
            <li><a href="#faq">FAQ</a></li>
          </ul>

          <div className="landing-nav-actions">
            <Link href={user ? "/dashboard" : "/login"} className="btn-portal-member">
              <LogIn size={15} />
              <span>{user ? "Portal Member" : "Masuk Member"}</span>
            </Link>

            <button
              type="button"
              className="btn-join-cta"
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

      {/* 2. Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-badge">
          <Sparkles size={13} />
          <span>Komunitas Motor Resmi · Situbondo</span>
        </div>

        <h1>
          <span className="gradient-text">SATU ASPAL.</span>
          <span className="accent-text">SATU PERSAUDARAAN.</span>
        </h1>

        <p className="landing-hero-desc">
          Revolt Riders adalah wadah persaudaraan roda dua di Situbondo yang menjunjung tinggi kebersamaan, rasa saling
          menghormati di jalan raya, dan jiwa sosial tanpa membeda-bedakan kasta kendaraan.
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
            <UserPlus size={18} />
            <span>GABUNG BERSAMA KAMI</span>
          </button>

          <Link href={user ? "/dashboard" : "/login"} className="btn-hero-secondary">
            <LogIn size={18} />
            <span>PORTAL ANGGOTA</span>
          </Link>
        </div>

        {/* 3. Club Live Statistics */}
        <div className="landing-stats-grid" id="stats">
          <article className="landing-stat-card">
            <i><UsersRound size={22} /></i>
            <b>{totalMembers}</b>
            <span>Member Resmi Aktif</span>
          </article>

          <article className="landing-stat-card">
            <i><Gauge size={22} /></i>
            <b>{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(totalKm)} KM</b>
            <span>Total Jarak Tempuh</span>
          </article>

          <article className="landing-stat-card">
            <i><Route size={22} /></i>
            <b>{totalRides}+</b>
            <span>Sowan & Touring Resmi</span>
          </article>
        </div>
      </section>

      {/* 4. About Section */}
      <section className="landing-section" id="about">
        <div className="section-head">
          <em>MENGENAL LEBIH DEKAT</em>
          <h2>Filosofi & Nilai Komunitas</h2>
          <p>
            Berawal dari kecintaan terhadap dunia otomotif dan aspal jalanan, Revolt Riders Situbondo dibangun atas dasar
            persaudaraan tulus dan kepedulian sosial.
          </p>
        </div>

        <div className="about-grid">
          <div className="about-card-left">
            <h3>Bukan Sekadar Riding, Kami Bersaudara</h3>
            <p>
              Di Revolt Riders, helm dan jaket kami mungkin berbeda, namun aspal yang kami pijak adalah sama. Kami
              berkomitmen mengedepankan etika berkendara santun, zero-accident mindset, dan aksi nyata bagi masyarakat
              sekitar melalui bakti sosial berkala.
            </p>

            <div className="about-pillars">
              <div className="about-pillar">
                <HeartHandshake />
                <strong>Solidaritas Tanpa Batas</strong>
                <small>Satu senang semua tersenyum, satu terkendala semua siap mengulurkan tangan.</small>
              </div>

              <div className="about-pillar">
                <ShieldCheck />
                <strong>Safety First</strong>
                <small>Tertib berlalu lintas, kelengkapan riding gear standar, dan menghargai pengguna jalan lain.</small>
              </div>

              <div className="about-pillar">
                <Compass />
                <strong>Eksplorasi & Touring</strong>
                <small>Menjelajahi keindahan panorama nusantara dalam setiap kilometer perjalanan sowan.</small>
              </div>

              <div className="about-pillar">
                <Sparkles />
                <strong>Terbuka Semua Merk</strong>
                <small>Tidak memandang cc atau merk motor, semua pengendara berjiwa baik adalah saudara.</small>
              </div>
            </div>
          </div>

          <div className="about-card-right">
            <div className="partner-box">
              <small>KEMITRAAN & SUPPORT RESMI</small>
              <div className="partner-logos">
                <div className="partner-logo-item">
                  <Image
                    src="/bold-riders-situbondo.jpg"
                    alt="Bold Riders Situbondo"
                    fill
                    sizes="(max-width: 600px) 100vw, 200px"
                  />
                </div>
                <div className="partner-logo-item">
                  <Image
                    src="/frtn.jpg"
                    alt="FRTN"
                    fill
                    sizes="(max-width: 600px) 100vw, 200px"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Public Agenda Section */}
      <section className="landing-section" id="agenda">
        <div className="section-head">
          <em>AGENDA TERBUKA</em>
          <h2>Kopdar & Jadwal Kegiatan</h2>
          <p>Berikut jadwal kopdar, touring, dan kegiatan publik terbaru yang terbuka untuk dihadiri.</p>
        </div>

        {publicEvents.length === 0 ? (
          <div className="partner-box" style={{ maxWidth: 640, margin: "0 auto" }}>
            <CalendarDays size={32} style={{ color: "var(--landing-red)", margin: "0 auto 12px" }} />
            <h3 style={{ color: "#fff", fontSize: "1.1rem", margin: "0 0 6px" }}>Belum Ada Agenda Publik Mendatang</h3>
            <p style={{ color: "var(--landing-text-secondary)", fontSize: "0.82rem", margin: 0 }}>
              Agenda touring dan kopdar selanjutnya akan diumumkan pengurus di sini. Pantau terus Instagram resmi kami!
            </p>
          </div>
        ) : (
          <div className="agenda-grid">
            {publicEvents.map((evt) => {
              const d = formatShortDate(evt.start_at);
              return (
                <article className="landing-agenda-card" key={evt.id}>
                  <div className="agenda-card-top">
                    <span className="agenda-type-badge">{evt.type}</span>
                    <span className="agenda-date-pill">
                      <CalendarDays size={14} />
                      {d.day} {d.month}
                    </span>
                  </div>

                  <h3>{evt.title}</h3>
                  <p>{evt.description || "Informasi agenda resmi Revolt Riders Situbondo."}</p>

                  <div className="agenda-card-meta">
                    <span>
                      <MapPin size={14} style={{ color: "var(--landing-red)" }} />
                      {evt.location_name || "Situbondo"}
                    </span>
                    {evt.location_url && (
                      <a href={evt.location_url} target="_blank" rel="noreferrer" style={{ color: "var(--landing-red)", fontWeight: 700 }}>
                        Peta Lokasi ↗
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Recent Rides & Gallery */}
      <section className="landing-section" id="gallery">
        <div className="section-head">
          <em>DOKUMENTASI TOURING</em>
          <h2>Recent Rides & Galeri</h2>
          <p>Cuplikan momen kebersamaan dan perjalanan sowan yang telah kami lalui bersama.</p>
        </div>

        <div className="gallery-grid">
          {gallery.map((item) => (
            <article className="gallery-card" key={item.id}>
              <div className="gallery-image-wrap">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 360px"
                />
              </div>
              <div className="gallery-card-body">
                <div className="gallery-card-meta">
                  <span>
                    <MapPin size={13} style={{ color: "var(--landing-red)" }} />
                    {item.location || "Situbondo"}
                  </span>
                  {item.ride_date && (
                    <span>
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
      </section>

      {/* 7. Instagram Showcase */}
      <section className="landing-section" style={{ paddingTop: 20 }}>
        <div className="instagram-banner">
          <InstagramIcon className="ig-icon" />
          <h3>Ikuti Perjalanan Kami di Instagram</h3>
          <p>Dapatkan update dokumentasi touring, video reels perjalanan, dan pengumuman resmi di @revoltriders_</p>
          <a
            href="https://www.instagram.com/revoltriders_"
            target="_blank"
            rel="noreferrer"
            className="btn-instagram"
          >
            <InstagramIcon size={17} />
            <span>Follow @revoltriders_</span>
          </a>
        </div>
      </section>

      {/* 8. FAQ Section */}
      <section className="landing-section" id="faq">
        <div className="section-head">
          <em>TANYA JAWAB</em>
          <h2>Pertanyaan yang Sering Diajukan</h2>
          <p>Informasi seputar pendaftaran, ketentuan keanggotaan, dan aktivitas Revolt Riders.</p>
        </div>

        <div className="faq-list">
          {FAQS.map((faq, idx) => (
            <details className="faq-item" key={idx}>
              <summary className="faq-question">
                <span>{faq.q}</span>
                <ChevronDown size={18} />
              </summary>
              <div className="faq-answer">{faq.a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* 9. CTA Bottom Banner */}
      <section className="landing-section" style={{ textAlign: "center", paddingTop: 40, paddingBottom: 100 }}>
        <div className="about-card-left" style={{ maxWidth: 840, margin: "0 auto", textAlign: "center" }}>
          <em>MULAI LANGKAH ANDA</em>
          <h2 style={{ fontSize: "2.1rem", margin: "10px 0 16px", color: "#fff" }}>
            Siap Menjelajahi Aspal Bersama Kami?
          </h2>
          <p style={{ maxWidth: 600, margin: "0 auto 28px", color: "var(--landing-text-secondary)" }}>
            Daftarkan diri Anda hari ini melalui alur resmi. Pengurus kami akan menyambut dan memandu proses registrasi Anda.
          </p>
          <button
            type="button"
            className="btn-hero-primary"
            onClick={() => {
              setFormSuccess(false);
              setFormError("");
              setIsJoinModalOpen(true);
            }}
          >
            <UserPlus size={18} />
            <span>JOIN WITH US SEKARANG</span>
          </button>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="footer-brand">
            <Image src="/revolt-riders-logo.jpg" alt="Logo Revolt Riders" width={36} height={36} />
            <span>REVOLT RIDERS SITUBONDO</span>
          </div>

          <div className="footer-copy">
            © {new Date().getFullYear()} Revolt Riders. Brotherhood Tanpa Batas.
          </div>

          <div className="footer-links">
            <Link href={user ? "/dashboard" : "/login"}>Portal Member</Link>
            <a href="https://www.instagram.com/revoltriders_" target="_blank" rel="noreferrer">Instagram</a>
            <button
              type="button"
              style={{ background: "none", border: 0, color: "inherit", cursor: "pointer", fontSize: "inherit" }}
              onClick={() => setIsJoinModalOpen(true)}
            >
              Pendaftaran
            </button>
          </div>
        </div>
      </footer>

      {/* 11. Join With Us Modal Dialog */}
      {isJoinModalOpen && (
        <div className="join-modal-overlay" onClick={() => setIsJoinModalOpen(false)}>
          <div className="join-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="join-modal-close"
              onClick={() => setIsJoinModalOpen(false)}
              aria-label="Tutup"
            >
              <X size={18} />
            </button>

            {formSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 10px" }}>
                <CheckCircle2 size={56} style={{ color: "#16a34a", margin: "0 auto 16px" }} />
                <h2 style={{ fontSize: "1.45rem", fontWeight: 850, margin: "0 0 10px", color: "#0f172a" }}>
                  Pendaftaran Berhasil Dikirim!
                </h2>
                <p style={{ color: "#475569", fontSize: "0.84rem", lineHeight: 1.6, marginBottom: 24 }}>
                  Terima kasih, <b>{fullName}</b>! Data Anda telah tersimpan dengan status <b>Pending</b>. Pengurus Revolt
                  Riders akan segera meninjau formulir dan mengirimkan instruksi konfirmasi via WhatsApp ke nomor{" "}
                  <b>{whatsapp}</b>.
                </p>
                <button type="button" className="btn-join-submit" onClick={resetForm}>
                  Selesai
                </button>
              </div>
            ) : (
              <>
                <div className="join-modal-header">
                  <em>PENDAFTARAN ANGGOTA BARU</em>
                  <h2>Join With Revolt Riders</h2>
                  <p>Isi data diri Anda secara lengkap dan benar untuk peninjauan pengurus.</p>
                </div>

                <form className="join-form" onSubmit={handleSubmitJoin}>
                  <div className="join-field">
                    <label>
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
                    <div className="join-field">
                      <label><span>Tempat Lahir</span></label>
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

                    <div className="join-field">
                      <label><span>Tanggal Lahir</span></label>
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
                    <div className="join-field">
                      <label><span>Domisili / Kota</span></label>
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

                    <div className="join-field">
                      <label><span>Akun Instagram</span></label>
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

                  <div className="join-field">
                    <label>
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
                      Saya menyatakan data ini benar dan bersedia mematuhi kode etik, nilai persaudaraan, dan standar
                      keselamatan berkendara Revolt Riders.
                    </label>
                  </div>

                  {formError && (
                    <p style={{ color: "#dc2626", fontSize: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 12px", borderRadius: 8, margin: 0 }}>
                      {formError}
                    </p>
                  )}

                  <button type="submit" className="btn-join-submit" disabled={formSubmitting}>
                    {formSubmitting ? "Mengirim Formulir…" : "KIRIM PENDAFTARAN"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
