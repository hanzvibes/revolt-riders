"use client";

import { ModalSheet } from "@/components/modal-sheet";
import { InstagramIcon } from "@/components/icons/instagram";
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
      {/* 1. Header / Navigation (Clean MVP Style) */}
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

      {/* Main Content Sections */}
      <main className="landing-main">
        {/* 2. Hero: Dark Carbon Speedometer Hero */}
        <section className="hero landing-hero-card">
          {/* Subtle Watermark Crest */}
          <Image
            src="/revolt-riders-logo.jpg"
            alt=""
            width={195}
            height={195}
            className="hero-mark"
            aria-hidden="true"
          />

          <div className="landing-hero-content">
            <span className="landing-hero-eyebrow">
              <Sparkles size={13} />
              KOMUNITAS MOTOR RESMI · SITUBONDO
            </span>

            <h1>
              <em>SATU ASPAL.</em>
              SATU PERSAUDARAAN.
            </h1>

            <p>
              Revolt Riders adalah wadah persaudaraan roda dua di Situbondo yang menjunjung tinggi kebersamaan, rasa saling
              menghormati di jalan raya, dan jiwa sosial tanpa membeda-bedakan kasta kendaraan.
            </p>

            <div className="landing-hero-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => {
                  setFormSuccess(false);
                  setFormError("");
                  setIsJoinModalOpen(true);
                }}
              >
                <UserPlus size={16} />
                <span>GABUNG BERSAMA KAMI</span>
              </button>

              <Link href={user ? "/dashboard" : "/login"} className="dark-action">
                <LogIn size={16} />
                <span>PORTAL ANGGOTA</span>
              </Link>
            </div>
          </div>

          {/* Signature Speedometer Dial */}
          <div className="dial" aria-hidden="true">
            <small>SPEED OF BROTHERHOOD</small>
            <b>360°</b>
            <span>SOLIDARITAS</span>
          </div>
        </section>

        {/* 3. Club Live Statistics Grid */}
        <section className="stats landing-stats" id="stats" aria-label="Statistik Komunitas">
          <article>
            <UsersRound className="landing-stats-icon" size={22} />
            <span>
              <span className="landing-stats-label">MEMBER RESMI AKTIF</span>
              <b className="landing-stats-val">{totalMembers}</b>
              <small className="landing-stats-desc">Anggota terverifikasi Situbondo</small>
            </span>
          </article>

          <article>
            <Gauge className="landing-stats-icon" size={22} />
            <span>
              <span className="landing-stats-label">TOTAL JARAK TEMPUH</span>
              <b className="landing-stats-val">{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(totalKm)} KM</b>
              <small className="landing-stats-desc">Akumulasi odometer sowan & touring</small>
            </span>
          </article>

          <article>
            <Route className="landing-stats-icon" size={22} />
            <span>
              <span className="landing-stats-label">SOWAN & TOURING RESMI</span>
              <b className="landing-stats-val">{totalRides}+</b>
              <small className="landing-stats-desc">Riding resmi & agenda terdata</small>
            </span>
          </article>
        </section>

        {/* 4. About Section */}
        <section className="landing-section" id="about">
          <div className="landing-section-head">
            <em>MENGENAL LEBIH DEKAT</em>
            <h2>Filosofi & Nilai Komunitas</h2>
            <p>
              Berawal dari kecintaan terhadap dunia otomotif dan aspal jalanan, Revolt Riders Situbondo dibangun atas dasar
              persaudaraan tulus dan kepedulian sosial.
            </p>
          </div>

          <div className="landing-about-grid">
            <div className="card landing-about-card">
              <h3>Bukan Sekadar Riding, Kami Bersaudara</h3>
              <p>
                Di Revolt Riders, helm dan jaket kami mungkin berbeda, namun aspal yang kami pijak adalah sama. Kami
                berkomitmen mengedepankan etika berkendara santun, zero-accident mindset, dan aksi nyata bagi masyarakat
                sekitar melalui bakti sosial berkala.
              </p>

              <div className="landing-pillar-grid">
                <div className="landing-pillar">
                  <div className="landing-pillar-icon">
                    <HeartHandshake size={18} />
                  </div>
                  <strong>Solidaritas Tanpa Batas</strong>
                  <small>Satu senang semua tersenyum, satu terkendala semua siap mengulurkan tangan.</small>
                </div>

                <div className="landing-pillar">
                  <div className="landing-pillar-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <strong>Safety First</strong>
                  <small>Tertib berlalu lintas, kelengkapan riding gear standar, dan santun di jalan.</small>
                </div>

                <div className="landing-pillar">
                  <div className="landing-pillar-icon">
                    <Compass size={18} />
                  </div>
                  <strong>Eksplorasi & Touring</strong>
                  <small>Menjelajahi keindahan panorama nusantara dalam setiap kilometer perjalanan sowan.</small>
                </div>

                <div className="landing-pillar">
                  <div className="landing-pillar-icon">
                    <Sparkles size={18} />
                  </div>
                  <strong>Terbuka Semua Merk</strong>
                  <small>Tanpa batasan kapasitas cc ataupun pabrikan. Semua roda dua bersaudara.</small>
                </div>
              </div>
            </div>

            {/* Official Support Grid */}
            <div className="card support landing-support-card">
              <div className="section-title">
                <div>
                  <em>SUPPORT & KEMITRAAN</em>
                  <h3>Aliansi Resmi</h3>
                </div>
              </div>

              <div className="support-grid">
                <figure>
                  <div className="support-logo bold-riders">
                    <Image
                      src="/bold-riders-situbondo.jpg"
                      alt="Bold Riders Situbondo"
                      fill
                      sizes="(max-width: 600px) 100vw, 200px"
                    />
                  </div>
                  <figcaption>Bold Riders Situbondo</figcaption>
                </figure>

                <figure>
                  <div className="support-logo frtn">
                    <Image
                      src="/frtn.jpg"
                      alt="FRTN"
                      fill
                      sizes="(max-width: 600px) 100vw, 200px"
                    />
                  </div>
                  <figcaption>FRTN Situbondo</figcaption>
                </figure>
              </div>

              <div className="landing-club-meta">
                <div className="landing-club-meta-item">
                  <span>Home Base</span>
                  <strong>Situbondo, Jawa Timur</strong>
                </div>
                <div className="landing-club-meta-item">
                  <span>Prinsip Keanggotaan</span>
                  <strong>Brotherhood Tanpa Sekat</strong>
                </div>
                <div className="landing-club-meta-item">
                  <span>Fokus Kegiatan</span>
                  <strong>Touring, Kopdar, & Baksos</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Public Agenda Section */}
        <section className="landing-section" id="agenda">
          <div className="landing-section-head">
            <em>AGENDA TERBUKA</em>
            <h2>Kopdar & Jadwal Kegiatan</h2>
            <p>Jadwal kopdar, touring sowan, dan kegiatan publik terbuka untuk dihadiri calon anggota & rekan riders.</p>
          </div>

          {publicEvents.length === 0 ? (
            <div className="landing-agenda-empty">
              <CalendarDays size={36} />
              <h3>Belum Ada Agenda Publik Mendatang</h3>
              <p>
                Agenda touring dan kopdar selanjutnya akan diumumkan pengurus di sini. Pantau terus update Instagram resmi kami!
              </p>
            </div>
          ) : (
            <div className="landing-agenda-list">
              {publicEvents.map((evt) => {
                const d = formatShortDate(evt.start_at);
                return (
                  <article className="landing-agenda-item" key={evt.id}>
                    <time>
                      <b>{d.day}</b>
                      <small>{d.month}</small>
                    </time>

                    <div className="landing-agenda-info">
                      <em>{evt.type}</em>
                      <h3>{evt.title}</h3>
                      <p>{evt.description || "Informasi agenda resmi komunitas motor Revolt Riders Situbondo."}</p>

                      <div className="landing-agenda-meta">
                        <span>
                          <MapPin size={13} style={{ color: "var(--red)" }} />
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
        </section>

        {/* 6. Recent Rides & Gallery */}
        <section className="landing-section" id="gallery">
          <div className="landing-section-head">
            <em>DOKUMENTASI TOURING</em>
            <h2>Recent Rides & Galeri</h2>
            <p>Cuplikan momen kebersamaan dan perjalanan sowan yang telah kami lalui bersama.</p>
          </div>

          <div className="landing-gallery-grid">
            {gallery.map((item) => (
              <article className="card landing-gallery-card" key={item.id}>
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
                      <MapPin size={12} style={{ color: "var(--red)" }} />
                      {item.location || "Situbondo"}
                    </span>
                    {item.ride_date && (
                      <span>
                        <CalendarDays size={12} />
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
        <section className="landing-section">
          <div className="landing-instagram-card">
            <div className="landing-instagram-left">
              <div className="landing-instagram-icon">
                <InstagramIcon size={24} />
              </div>
              <div className="landing-instagram-text">
                <h3>Ikuti Perjalanan Kami di Instagram</h3>
                <p>Dokumentasi touring, video reels perjalanan, dan pengumuman resmi di @revoltriders_</p>
              </div>
            </div>

            <a
              href="https://www.instagram.com/revoltriders_"
              target="_blank"
              rel="noreferrer"
              className="btn-instagram-follow"
            >
              <InstagramIcon size={16} />
              <span>Follow @revoltriders_</span>
            </a>
          </div>
        </section>

        {/* 8. FAQ Section */}
        <section className="landing-section" id="faq">
          <div className="landing-section-head">
            <em>TANYA JAWAB</em>
            <h2>Pertanyaan yang Sering Diajukan</h2>
            <p>Informasi seputar pendaftaran, ketentuan keanggotaan, dan aktivitas Revolt Riders.</p>
          </div>

          <div className="landing-faq-list">
            {FAQS.map((faq, idx) => (
              <details className="landing-faq-item" key={idx}>
                <summary className="landing-faq-question">
                  <span>{faq.q}</span>
                  <ChevronDown size={17} />
                </summary>
                <div className="landing-faq-answer">{faq.a}</div>
              </details>
            ))}
          </div>
        </section>

        {/* 9. Final Call to Action */}
        <section className="landing-cta-banner">
          <em>MULAI LANGKAH ANDA</em>
          <h2>Siap Menjelajahi Aspal Bersama Kami?</h2>
          <p>
            Daftarkan diri Anda hari ini melalui alur pendaftaran resmi. Pengurus kami akan segera meninjau dan memandu
            proses registrasi keanggotaan Anda.
          </p>
          <button
            type="button"
            className="primary-action"
            onClick={() => {
              setFormSuccess(false);
              setFormError("");
              setIsJoinModalOpen(true);
            }}
          >
            <UserPlus size={16} />
            <span>JOIN WITH US SEKARANG</span>
          </button>
        </section>
      </main>

      {/* 10. Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-container">
          <div className="landing-footer-brand">
            <Image src="/revolt-riders-logo.jpg" alt="Logo Revolt Riders" width={32} height={32} />
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
              onClick={() => setIsJoinModalOpen(true)}
            >
              Join With Us
            </button>
          </div>
        </div>
      </footer>

      {/* 11. Join With Us Native Modal Sheet */}
      <ModalSheet
        open={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        eyebrow="PENDAFTARAN ANGGOTA BARU"
        title="Join With Revolt Riders"
      >
        <div className="join-modal-body">
          {formSuccess ? (
            <div className="join-success-card">
              <CheckCircle2 size={54} />
              <h3>Pendaftaran Berhasil Dikirim!</h3>
              <p>
                Terima kasih, <b>{fullName}</b>! Formulir pendaftaran Anda telah tersimpan dengan status <b>Pending</b>.
                Pengurus Revolt Riders akan segera meninjau data Anda dan mengirimkan instruksi konfirmasi via WhatsApp ke
                nomor <b>{whatsapp}</b>.
              </p>
              <button
                type="button"
                className="primary-action"
                style={{ width: "100%", maxWidth: 260 }}
                onClick={resetForm}
              >
                Selesai
              </button>
            </div>
          ) : (
            <>
              <p className="join-modal-intro">
                Isi formulir pendaftaran di bawah ini secara lengkap dan benar. Data Anda akan disimpan sebagai Join Request
                dan ditinjau langsung oleh Pengurus Revolt Riders.
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
                    Saya menyatakan data ini benar dan bersedia mematuhi kode etik, nilai persaudaraan, dan standar
                    keselamatan berkendara Revolt Riders.
                  </label>
                </div>

                {formError && (
                  <div className="error-message">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-action"
                  style={{ width: "100%", marginTop: 8 }}
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
