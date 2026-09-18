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
  ChevronDown,
  Flag,
  Globe,
  Handshake,
  Link2,
  LogIn,
  MapPin,
  Menu,
  Phone,
  Shield,
  User,
  UserPlus,
  Users,
  Wrench,
  X,
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
    description: "Pertemuan rutin dan silaturahmi keluarga besar Revolt Riders di Situbondo.",
    image_url: "/bold-riders-situbondo.jpg",
    location: "Situbondo Kota",
    ride_date: "2026-03-01",
  },
  {
    id: "g-2",
    title: "Touring Silaturahmi Jalur Timur",
    description: "Perjalanan touring menyusuri pesisir timur Jawa bersama rekan komunitas.",
    image_url: "/frtn.jpg",
    location: "Banyuwangi - Buleleng",
    ride_date: "2026-02-15",
  },
  {
    id: "g-3",
    title: "Rolling Thunder & Aksi Sosial",
    description: "Kegiatan bakti sosial dan kepedulian bersama komunitas roda dua.",
    image_url: "/revolt-riders-logo.jpg",
    location: "Besuki - Bondowoso",
    ride_date: "2026-01-20",
  },
];

export default function PublicLandingPage() {
  const { user } = useDataCache();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

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

  // Scroll listener for Navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

        // 2. Fetch public events (limit 4)
        const { data: eventsData } = await supabase
          .from("events")
          .select("id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status")
          .eq("status", "published")
          .order("start_at", { ascending: true })
          .limit(4);

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
      setFormError("Harap menyetujui pernyataan komitmen pendaftaran terlebih dahulu.");
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
            throw new Error("Nomor WhatsApp ini sudah pernah terdaftar dan sedang dalam proses verifikasi.");
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
          setFormError("Sistem pendaftaran sedang dalam proses sinkronisasi. Silakan hubungi pengurus atau coba beberapa saat lagi.");
        } else if (rawMsg.includes("whatsapp") || rawMsg.includes("unique")) {
          setFormError("Nomor WhatsApp ini sudah pernah terdaftar dan sedang dalam proses verifikasi.");
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

  const currentYear = new Date().getFullYear();
  const yearsBrotherhood = Math.max(currentYear - 2022, 1);

  return (
    <div className="landing-page selection:bg-white selection:text-black">
      {/* Global Noise Overlay */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* 1. Navigation Bar */}
      <nav className={`dark-navbar ${isScrolled ? "scrolled" : ""}`}>
        <Link href="/" className="dark-nav-brand">
          <Image
            src="/revolt-riders-logo.jpg"
            alt="Revolt Riders Logo"
            width={40}
            height={40}
            className="dark-nav-logo"
            priority
          />
          <div>
            <span className="dark-brand-title">REVOLT RIDERS</span>
            <span className="dark-brand-badge">SITUBONDO · EAST JAVA</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <ul className="dark-nav-links">
          <li><a href="#about" className="dark-nav-link">ABOUT</a></li>
          <li><a href="#brotherhood" className="dark-nav-link">BROTHERHOOD</a></li>
          <li><a href="#values" className="dark-nav-link">CORE VALUES</a></li>
          <li><a href="#gallery" className="dark-nav-link">GALLERY</a></li>
          <li><a href="#events" className="dark-nav-link">ACTIVITIES</a></li>
        </ul>

        {/* Desktop Actions */}
        <div className="dark-nav-actions">
          <Link href={user ? "/dashboard" : "/login"} className="btn-nav-portal">
            <LogIn size={14} />
            <span>{user ? "PORTAL MEMBER" : "MASUK MEMBER"}</span>
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
            <UserPlus size={14} />
            <span>JOIN US</span>
          </button>
        </div>

        {/* Mobile Toggle Button */}
        <button
          type="button"
          className="dark-mobile-btn"
          aria-label={isMobileMenuOpen ? "Tutup menu" : "Buka menu"}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      <div className={`dark-mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}>
        <a href="#about" onClick={() => setIsMobileMenuOpen(false)}>ABOUT</a>
        <a href="#brotherhood" onClick={() => setIsMobileMenuOpen(false)}>BROTHERHOOD</a>
        <a href="#values" onClick={() => setIsMobileMenuOpen(false)}>CORE VALUES</a>
        <a href="#gallery" onClick={() => setIsMobileMenuOpen(false)}>GALLERY</a>
        <a href="#events" onClick={() => setIsMobileMenuOpen(false)}>ACTIVITIES</a>

        <Link
          href={user ? "/dashboard" : "/login"}
          onClick={() => setIsMobileMenuOpen(false)}
          style={{ marginTop: "16px", color: "var(--brand-light)" }}
        >
          {user ? "PORTAL MEMBER" : "MASUK MEMBER"}
        </Link>

        <button
          type="button"
          className="btn-hero-primary"
          style={{ marginTop: "12px", width: "100%", maxWidth: "260px", justifyContent: "center" }}
          onClick={() => {
            setIsMobileMenuOpen(false);
            setFormSuccess(false);
            setFormError("");
            setIsJoinModalOpen(true);
          }}
        >
          JOIN US
        </button>
      </div>

      {/* 2. Hero Section */}
      <header className="industrial-hero">
        <Image
          src="/revolt-riders-logo.jpg"
          alt=""
          width={600}
          height={600}
          className="industrial-hero-watermark"
          aria-hidden="true"
          priority
        />

        <motion.div
          className="hero-inner"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="hero-pretitle">REVOLT RIDERS SITUBONDO</p>
          <h1 className="hero-title">
            YOUR MOTORCYCLE,<br />
            <span className="hero-title-gradient">YOURSELF EXPRESSION</span>
          </h1>

          <p className="hero-desc">
            Bukan sekadar kendaraan. Ini adalah medium untuk menunjukkan karakter, kreativitas, dan identitas pengendara di atas aspal.
          </p>

          <div className="hero-actions">
            <a href="#about" className="btn-hero-primary">
              EXPLORE REVOLT RIDERS
            </a>

            <button
              type="button"
              className="btn-hero-secondary"
              onClick={() => {
                setFormSuccess(false);
                setFormError("");
                setIsJoinModalOpen(true);
              }}
            >
              JOIN THE RIDE
            </button>

            <Link href={user ? "/dashboard" : "/login"} className="btn-hero-portal">
              <LogIn size={15} />
              <span>PORTAL MEMBER</span>
            </Link>
          </div>
        </motion.div>

        <div className="hero-scroll-indicator" aria-hidden="true">
          <ChevronDown size={20} />
        </div>
      </header>

      {/* 3. About Revolt Riders Section */}
      <section id="about" className="industrial-section">
        <div className="about-watermark text-outline" aria-hidden="true">
          SINCE 2022
        </div>

        <div className="about-grid">
          <motion.div
            className="about-left"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55 }}
          >
            <h2>
              ESTABLISHED IN<br />SITUBONDO, 2022.
            </h2>
            <div className="about-line" />
            <p className="about-quote">
              Wadah independen bagi para pecinta motor custom. Beroperasi dengan prinsip mandiri, terbuka, dan sosial.
            </p>
          </motion.div>

          <motion.div
            className="about-right"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, delay: 0.1 }}
          >
            <div className="about-paragraphs">
              <p>
                <strong>Revolt Riders</strong> lahir dari semangat yang sama di jalanan Kabupaten Situbondo. Kami bukan sekadar kumpulan motor, melainkan entitas yang bertujuan membangun kepedulian di antara para penyuka motor custom.
              </p>
              <p>
                Kami berdiri independen. Tanpa afiliasi politik, tanpa mencari keuntungan komersial. Fokus kami murni pada kultur custom, etika berkendara, dan persaudaraan sejati.
              </p>
            </div>

            <div className="about-highlight-card">
              <span className="about-card-badge">EST. 22 DESEMBER 2022</span>
              <h3 className="about-card-title">GOTONG ROYONG & PERSAUDARAAN</h3>
              <p className="about-card-desc">
                Berlandaskan asas mandiri, terbuka, dan sosial demi mempererat persaudaraan antar-pengguna roda dua di Situbondo.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 4. Brotherhood / Our Spirit */}
      <section id="brotherhood" className="brotherhood-section">
        <motion.div
          className="brotherhood-inner"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55 }}
        >
          <h2>
            BUILT BY MOTORCYCLES.<br />
            <span>CONNECTED BY BROTHERHOOD.</span>
          </h2>
          <p>
            Menjadi bagian dari komunitas bikers bukan hanya tentang mesin yang kita kendarai. Ini tentang solidaritas di jalan, rasa saling menghargai sesama pengendara, dan tangan yang selalu siap membantu saat dibutuhkan.
          </p>
        </motion.div>
      </section>

      {/* 5. Our Foundation & Core Values */}
      <section id="values" className="industrial-section alt-bg">
        <div className="section-head-center">
          <span className="section-tag">OUR FOUNDATION</span>
          <h2 className="section-title">CORE VALUES</h2>
        </div>

        <div className="values-grid">
          <motion.article
            className="value-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="value-icon-box">
              <Handshake size={24} />
            </div>
            <h4>BROTHERHOOD</h4>
            <p>Persaudaraan tanpa batas, di atas dan di luar aspal.</p>
          </motion.article>

          <motion.article
            className="value-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.08 }}
          >
            <div className="value-icon-box">
              <Link2 size={24} />
            </div>
            <h4>SOLIDARITY</h4>
            <p>Saling mendukung dan bergerak sebagai satu kesatuan yang solid.</p>
          </motion.article>

          <motion.article
            className="value-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.16 }}
          >
            <div className="value-icon-box">
              <Flag size={24} />
            </div>
            <h4>INDEPENDENCE</h4>
            <p>Mandiri, bebas dari kepentingan politik & tujuan komersial.</p>
          </motion.article>

          <motion.article
            className="value-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.24 }}
          >
            <div className="value-icon-box">
              <Shield size={24} />
            </div>
            <h4>RESPECT</h4>
            <p>Saling menghargai antar anggota dan seluruh pengguna jalan raya.</p>
          </motion.article>

          <motion.article
            className="value-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.32 }}
          >
            <div className="value-icon-box">
              <Wrench size={24} />
            </div>
            <h4>CUSTOM CULTURE</h4>
            <p>Merayakan kreativitas seni rancang bangun motor custom.</p>
          </motion.article>

          <motion.article
            className="value-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <div className="value-icon-box">
              <Globe size={24} />
            </div>
            <h4>SOCIAL RESPONSIBILITY</h4>
            <p>Memberikan kontribusi dan dampak positif bagi masyarakat sekitar.</p>
          </motion.article>
        </div>
      </section>

      {/* 6. Gallery / Ride Stories */}
      <section id="gallery" className="industrial-section">
        <div className="gallery-container">
          <div className="gallery-head-row">
            <div>
              <span className="section-tag">VISUAL ARCHIVE</span>
              <h2 className="section-title">RIDE STORIES</h2>
            </div>
            <a href="#instagram" className="dark-nav-link" style={{ fontSize: "0.85rem" }}>
              LIHAT INSTAGRAM ↗
            </a>
          </div>

          <div className="gallery-grid-modular">
            {gallery.map((item, idx) => (
              <article
                className={`gallery-card ${idx === 0 ? "gallery-card-large" : ""}`}
                key={item.id}
              >
                <Image
                  src={item.image_url}
                  alt={item.title}
                  fill
                  className="gallery-card-img"
                  sizes="(max-width: 768px) 100vw, 480px"
                />
                <div className="gallery-card-bg" />
                <div className="gallery-card-content">
                  <div className="gallery-card-meta">
                    {item.location && (
                      <span>
                        <MapPin size={12} style={{ display: "inline", marginRight: "4px", color: "var(--brand-red)" }} />
                        {item.location}
                      </span>
                    )}
                    {item.ride_date && (
                      <span>
                        <CalendarDays size={12} style={{ display: "inline", marginRight: "4px" }} />
                        {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(item.ride_date))}
                      </span>
                    )}
                  </div>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                </div>
              </article>
            ))}

            {/* Graphic Badge Card */}
            <div className="gallery-card gallery-graphic-card">
              <Image
                src="/revolt-riders-logo.jpg"
                alt="Revolt Riders Crest"
                width={80}
                height={80}
              />
              <span className="section-tag" style={{ color: "#fff", marginBottom: 0 }}>
                REVOLT RIDERS SITUBONDO
              </span>
              <small style={{ color: "var(--brand-muted)", fontSize: "0.72rem" }}>
                EST. 22 DESEMBER 2022
              </small>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Events & Activities */}
      <section id="events" className="industrial-section alt-bg">
        <div className="section-head-center">
          <span className="section-tag">AGENDA</span>
          <h2 className="section-title">ACTIVITIES</h2>
        </div>

        <div className="activities-list">
          {/* Live DB Events (if any) */}
          {publicEvents.map((evt) => {
            const d = formatShortDate(evt.start_at);
            return (
              <div className="activity-row" key={evt.id}>
                <div className="activity-badge-col">
                  <span className="activity-type-tag">{evt.type.toUpperCase()}</span>
                </div>
                <div className="activity-info-col">
                  <h4>{evt.title}</h4>
                  <p>
                    {d.day} {d.month} · {evt.location_name || "Situbondo"}
                  </p>
                </div>
                <div className="activity-status-col">
                  <span className="activity-status-pill active">UPCOMING</span>
                  {evt.location_url && (
                    <a href={evt.location_url} target="_blank" rel="noreferrer" className="activity-map-link">
                      Peta ↗
                    </a>
                  )}
                </div>
              </div>
            );
          })}

          {/* Standard Activities from template */}
          <div className="activity-row">
            <div className="activity-badge-col">
              <span className="activity-type-tag">ROUTINE</span>
            </div>
            <div className="activity-info-col">
              <h4>SUNDAY MORNING RIDE</h4>
              <p>Situbondo & Rute Sekitarnya · Kumpul Santai Akhir Pekan</p>
            </div>
            <div className="activity-status-col">
              <span className="activity-status-pill">WEEKLY</span>
            </div>
          </div>

          <div className="activity-row">
            <div className="activity-badge-col">
              <span className="activity-type-tag">MANDATORY</span>
            </div>
            <div className="activity-info-col">
              <h4>MONTHLY GATHERING</h4>
              <p>Basecamp Revolt Riders · Evaluasi & Silaturahmi Bulanan</p>
            </div>
            <div className="activity-status-col">
              <span className="activity-status-pill active">ACTIVE</span>
            </div>
          </div>

          <div className="activity-row">
            <div className="activity-badge-col">
              <span className="activity-type-tag">ANNUAL</span>
            </div>
            <div className="activity-info-col">
              <h4>ANNIVERSARY RIDE</h4>
              <p>Perayaan Hari Jadi Resmi Komunitas Revolt Riders</p>
            </div>
            <div className="activity-status-col">
              <span className="activity-status-pill">DEC 22</span>
            </div>
          </div>

          <div className="activity-row">
            <div className="activity-badge-col">
              <span className="activity-type-tag">SOCIAL</span>
            </div>
            <div className="activity-info-col">
              <h4>CHARITY & SOCIAL ACT</h4>
              <p>Bakti Sosial dan Kepedulian Lingkungan di Situbondo</p>
            </div>
            <div className="activity-status-col">
              <span className="activity-status-pill">ON GOING</span>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Live Statistics Strip */}
      <section id="stats" className="industrial-section">
        <div className="stats-strip">
          <div className="stat-item">
            <div className="stat-number">2022</div>
            <div className="stat-tag">ESTABLISHED</div>
          </div>

          <div className="stat-item">
            <div className="stat-number">{totalMembers}+</div>
            <div className="stat-tag">MEMBERS</div>
          </div>

          <div className="stat-item">
            <div className="stat-number">{totalRides}+</div>
            <div className="stat-tag">RIDES COMPLETED</div>
          </div>

          <div className="stat-item">
            <div className="stat-number">{yearsBrotherhood}</div>
            <div className="stat-tag">YEARS BROTHERHOOD</div>
          </div>
        </div>
      </section>

      {/* 9. Join Callout */}
      <section id="join" className="join-callout">
        <Image
          src="/revolt-riders-logo.jpg"
          alt=""
          width={750}
          height={750}
          className="join-watermark"
          aria-hidden="true"
        />

        <div className="join-inner">
          <h2>
            RIDE TOGETHER.<br />
            GROW TOGETHER.
          </h2>
          <p>
            Punya motor custom dan berdomisili di Kabupaten Situbondo? Jadilah bagian dari pergerakan dan persaudaraan kami.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn-hero-primary"
              onClick={() => {
                setFormSuccess(false);
                setFormError("");
                setIsJoinModalOpen(true);
              }}
            >
              JOIN REVOLT RIDERS
            </button>
            <a href="#about" className="btn-hero-secondary">
              KNOW THE COMMUNITY
            </a>
          </div>
        </div>
      </section>

      {/* 10. Official Instagram Showcase */}
      <section id="instagram" className="industrial-section">
        <div className="instagram-container">
          <span className="section-tag">OFFICIAL INSTAGRAM</span>
          <a
            href="https://instagram.com/revoltriders_"
            target="_blank"
            rel="noreferrer"
            className="instagram-handle"
          >
            @REVOLTRIDERS_
          </a>

          <div className="instagram-grid">
            <a
              href="https://instagram.com/revoltriders_"
              target="_blank"
              rel="noreferrer"
              className="instagram-card"
            >
              <Image
                src="/bold-riders-situbondo.jpg"
                alt="Instagram Post"
                fill
                sizes="(max-width: 768px) 50vw, 260px"
              />
              <div className="instagram-overlay">
                <InstagramIcon size={24} />
              </div>
            </a>

            <a
              href="https://instagram.com/revoltriders_"
              target="_blank"
              rel="noreferrer"
              className="instagram-card"
            >
              <Image
                src="/frtn.jpg"
                alt="Instagram Post"
                fill
                sizes="(max-width: 768px) 50vw, 260px"
              />
              <div className="instagram-overlay">
                <InstagramIcon size={24} />
              </div>
            </a>

            <a
              href="https://instagram.com/revoltriders_"
              target="_blank"
              rel="noreferrer"
              className="instagram-card"
            >
              <Image
                src="/revolt-riders-logo.jpg"
                alt="Instagram Post"
                fill
                sizes="(max-width: 768px) 50vw, 260px"
              />
              <div className="instagram-overlay">
                <InstagramIcon size={24} />
              </div>
            </a>

            <a
              href="https://instagram.com/revoltriders_"
              target="_blank"
              rel="noreferrer"
              className="instagram-card"
            >
              <Image
                src="/bold-riders-situbondo.jpg"
                alt="Instagram Post"
                fill
                sizes="(max-width: 768px) 50vw, 260px"
              />
              <div className="instagram-overlay">
                <InstagramIcon size={24} />
              </div>
            </a>
          </div>

          <a
            href="https://instagram.com/revoltriders_"
            target="_blank"
            rel="noreferrer"
            className="instagram-footer-link"
          >
            FOLLOW OUR JOURNEY ↗
          </a>
        </div>
      </section>

      {/* 11. Official Partners Strip */}
      <div className="partners-strip">
        <span className="partners-title">Kemitraan & Rekanan Resmi Komunitas</span>
        <div className="partners-logos">
          <div className="partner-logo-item">
            <Image
              src="/bold-riders-situbondo.jpg"
              alt="Bold Riders Situbondo"
              fill
              sizes="120px"
              style={{ objectFit: "contain" }}
            />
          </div>
          <div className="partner-logo-item">
            <Image
              src="/frtn.jpg"
              alt="FRTN"
              fill
              sizes="120px"
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>
      </div>

      {/* 12. Closing Statement */}
      <section className="closing-section">
        <div className="closing-title text-outline">
          YOUR MOTORCYCLE.<br />
          YOURSELF EXPRESSION.<br />
          <span>YOUR ROAD.</span>
        </div>
      </section>

      {/* 13. Footer */}
      <footer className="industrial-footer">
        <div className="footer-main-grid">
          <div className="footer-brand-col">
            <Image
              src="/revolt-riders-logo.jpg"
              alt="Revolt Riders Logo"
              width={56}
              height={56}
            />
            <p className="footer-brand-desc">
              Wadah independen pecinta motor custom di Kabupaten Situbondo. Dibangun atas dasar persaudaraan, kreativitas, dan solidaritas.
            </p>
            <div className="footer-socials">
              <a
                href="https://instagram.com/revoltriders_"
                target="_blank"
                rel="noreferrer"
                className="footer-social-link"
                aria-label="Instagram"
              >
                <InstagramIcon size={18} />
              </a>
            </div>
          </div>

          <div className="footer-col">
            <h4>EXPLORE</h4>
            <ul>
              <li><a href="#">Home</a></li>
              <li><a href="#about">About Us</a></li>
              <li><a href="#values">Core Values</a></li>
              <li><a href="#gallery">Gallery</a></li>
              <li><a href="#events">Activities</a></li>
              <li><Link href={user ? "/dashboard" : "/login"}>Portal Member</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>BASE</h4>
            <ul>
              <li>Situbondo, East Java</li>
              <li>Indonesia</li>
              <li style={{ marginTop: "8px" }}>
                <a href="mailto:info@revoltriders.id" style={{ color: "#fff" }}>
                  info@revoltriders.id
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <p>© {currentYear} Revolt Riders Situbondo. All rights reserved.</p>
          <p>EST. DEC 22, 2022</p>
        </div>
      </footer>

      {/* 14. Join With Us Modal Sheet */}
      <ModalSheet
        open={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        eyebrow=""
        title="Pendaftaran Anggota Revolt Riders"
      >
        <div className="join-modal-body">
          {formSuccess ? (
            <div className="join-success-card">
              <CheckCircle2 size={52} />
              <h3>Pendaftaran Berhasil Dikirim</h3>
              <p>
                Terima kasih telah mendaftar, <b>{fullName}</b>. Formulir pendaftaran Anda telah kami terima. Pengurus
                Revolt Riders akan segera menghubungi Anda melalui WhatsApp di nomor <b>{whatsapp}</b> untuk verifikasi selanjutnya.
              </p>
              <button
                type="button"
                className="btn-hero-primary"
                style={{ width: "100%", maxWidth: 220, justifyContent: "center" }}
                onClick={resetForm}
              >
                Selesai
              </button>
            </div>
          ) : (
            <>
              <p className="join-modal-intro">
                Silakan lengkapi data pendaftaran di bawah ini. Pengurus akan memverifikasi data dan menghubungi Anda melalui WhatsApp.
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
                    <small>Untuk verifikasi pengurus</small>
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
                    Saya menyatakan bahwa data yang diisi adalah benar serta berkomitmen mematuhi kode etik dan tata tertib Revolt Riders.
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
