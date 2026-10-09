"use client";

import "./landing.css";
import { LandingCommunitySections, LandingSocialSections } from "./landing-sections";
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
  LogIn,
  MapPin,
  Menu,
  Phone,
  User,
  UserPlus,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type ConnectedEvent = {
  id: string;
  title: string;
  type: string;
  slug: string;
  location_name?: string | null;
  start_at?: string | null;
};

type GalleryItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  location: string | null;
  ride_date: string | null;
  event_id?: string | null;
  events?: ConnectedEvent | null;
};

function getEventStatusBadge(startAt: string, status: string) {
  if (status === "completed") return { label: "SELESAI", active: false };
  const eventDate = new Date(startAt);
  const now = new Date();
  const isToday =
    eventDate.getFullYear() === now.getFullYear() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getDate() === now.getDate();
  if (isToday) return { label: "HARI INI", active: true };
  if (eventDate.getTime() > now.getTime()) return { label: "UPCOMING", active: true };
  return { label: "BERLALU", active: false };
}

export default function PublicLandingPage() {
  const { user } = useDataCache();
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Live Stats State
  const [totalMembers, setTotalMembers] = useState(27);
  const [totalKm, setTotalKm] = useState(19177);
  const [totalRides, setTotalRides] = useState(194);

  // Agenda & Gallery State (Pure database-driven, 0 hardcoded dummy)
  const [publicEvents, setPublicEvents] = useState<EventRecord[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);

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

  // Scroll listener for Navbar (throttled with RAF to eliminate mobile scroll jank)
  useEffect(() => {
    let ticking = false;
    let lastScrolled = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY > 40;
          if (scrolled !== lastScrolled) {
            lastScrolled = scrolled;
            setIsScrolled(scrolled);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fetch Public Events (Live Database)
  const fetchEvents = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("events")
        .select("id,title,slug,type,description,location_name,location_url,start_at,end_at,meetup_at,status")
        .in("status", ["published", "completed"])
        .order("start_at", { ascending: true })
        .limit(8);

      if (!error) {
        setPublicEvents((data ?? []) as EventRecord[]);
      }
    } catch (err) {
      console.warn("Public landing events fetch notice:", err);
    }
  }, []);

  // Fetch Public Gallery / Ride Stories (Live Database with joined Agenda)
  const fetchGallery = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("club_gallery")
        .select("id,title,description,image_url,location,ride_date,event_id,events:event_id(id,title,type,slug,location_name,start_at)")
        .eq("is_public", true)
        .order("ride_date", { ascending: false })
        .limit(6);

      if (!error) {
        setGallery((data ?? []) as GalleryItem[]);
      }
    } catch (err) {
      console.warn("Public landing gallery fetch notice:", err);
    }
  }, []);

  // Fetch Club Stats
  const fetchStats = useCallback(async () => {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: statsData, error: statsErr } = await supabase.rpc("get_public_club_stats");
      if (!statsErr && statsData?.[0]) {
        setTotalMembers(Number(statsData[0].total_members) || 27);
        setTotalRides(Number(statsData[0].total_rides) || 194);
        setTotalKm(Number(statsData[0].total_km) || 19177);
      }
    } catch (err) {
      console.warn("Public stats fetch notice:", err);
    }
  }, []);

  // Initial Load & Real-Time Sync
  useEffect(() => {
    void fetchStats();
    void fetchEvents();
    void fetchGallery();

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel("landing-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          void fetchEvents();
          void fetchGallery();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_gallery" },
        () => {
          void fetchGallery();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchStats, fetchEvents, fetchGallery]);

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
      const rawMsg = (err as { message?: string })?.message || "";
      if (rawMsg.includes("whatsapp") || rawMsg.includes("unique") || rawMsg.includes("sedang diproses")) {
        setFormError("Nomor WhatsApp ini sudah pernah terdaftar dan sedang dalam proses verifikasi.");
      } else if (rawMsg.includes("schema cache") || rawMsg.includes("Could not find the function")) {
        setFormError("Sistem pendaftaran sedang dalam proses sinkronisasi. Silakan hubungi pengurus atau coba beberapa saat lagi.");
      } else if (rawMsg) {
        setFormError(rawMsg);
      } else {
        setFormError("Pendaftaran gagal dikirim. Silakan periksa kembali data Anda.");
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
          aria-controls="landing-mobile-drawer"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </nav>

      {/* Mobile Drawer */}
      <div
        id="landing-mobile-drawer"
        className={`dark-mobile-drawer ${isMobileMenuOpen ? "open" : ""}`}
        aria-hidden={!isMobileMenuOpen}
        inert={!isMobileMenuOpen ? true : undefined}
      >
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

      <LandingCommunitySections />

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
            {gallery.length > 0 ? (
              gallery.map((item, idx) => (
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

                    {item.events && (
                      <div className="gallery-linked-agenda">
                        <Link href={`/agenda#${item.events.slug}`} className="gallery-agenda-badge">
                          <CalendarDays size={11} />
                          <span>AGENDA: {item.events.title}</span>
                        </Link>
                      </div>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="landing-empty-state" style={{ gridColumn: "1 / -1", minHeight: 180 }}>
                <CalendarDays size={28} />
                <p>Belum ada dokumentasi perjalanan yang dipublikasikan.</p>
              </div>
            )}

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
        <div className="activities-head-row">
          <div>
            <span className="section-tag">AGENDA</span>
            <h2 className="section-title" style={{ marginBottom: 0 }}>ACTIVITIES</h2>
          </div>
          <Link href="/agenda" className="dark-nav-link" style={{ fontSize: "0.85rem" }}>
            LIHAT SEMUA AGENDA ↗
          </Link>
        </div>

        <div className="activities-list">
          {publicEvents.length > 0 ? (
            publicEvents.map((evt) => {
              const d = formatShortDate(evt.start_at);
              const statusBadge = getEventStatusBadge(evt.start_at, evt.status);
              return (
                <div className="activity-row" key={evt.id}>
                  <div className="activity-badge-col">
                    <span className="activity-type-tag">{evt.type.toUpperCase()}</span>
                  </div>
                  <div className="activity-info-col">
                    <Link href={`/agenda#${evt.slug}`} style={{ textDecoration: "none" }}>
                      <h4>{evt.title}</h4>
                    </Link>
                    <p>
                      {d.day} {d.month} · {evt.location_name || "Situbondo"}
                      {evt.description ? ` · ${evt.description}` : ""}
                    </p>
                  </div>
                  <div className="activity-status-col">
                    <span className={`activity-status-pill ${statusBadge.active ? "active" : ""}`}>
                      {statusBadge.label}
                    </span>
                    {evt.location_url && (
                      <a href={evt.location_url} target="_blank" rel="noreferrer" className="activity-map-link">
                        Peta ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="landing-empty-state">
              <CalendarDays size={28} />
              <p>Belum ada agenda kegiatan yang dijadwalkan.</p>
            </div>
          )}
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
            <div className="stat-number">{new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(totalKm)} KM</div>
            <div className="stat-tag">TOTAL DISTANCE</div>
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

      <LandingSocialSections />

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
        eyebrow="MEMBERSHIP REGISTRATION"
        title="Pendaftaran Anggota Revolt Riders"
      >
        <div className="join-modal-body">
          {formSuccess ? (
            <div className="join-success-card" role="status" aria-live="polite">
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

              <form
                className="join-form-stack"
                onSubmit={handleSubmitJoin}
                aria-busy={formSubmitting}
              >
                <div className="join-field-group">
                  <label className="join-field-label" htmlFor="join-full-name">
                    <span>Nama Lengkap</span>
                    <small>Sesuai KTP/SIM</small>
                  </label>
                  <div className="join-input-wrap">
                    <User />
                    <input
                      id="join-full-name"
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
                    <label className="join-field-label" htmlFor="join-birth-place">
                      <span>Tempat Lahir</span>
                    </label>
                    <div className="join-input-wrap">
                      <MapPin />
                      <input
                        id="join-birth-place"
                        value={birthPlace}
                        onChange={(e) => setBirthPlace(e.target.value)}
                        placeholder="Situbondo"
                        required
                      />
                    </div>
                  </div>

                  <div className="join-field-group">
                    <label className="join-field-label" htmlFor="join-birth-date">
                      <span>Tanggal Lahir</span>
                    </label>
                    <div className="join-input-wrap">
                      <CalendarDays />
                      <input
                        id="join-birth-date"
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
                    <label className="join-field-label" htmlFor="join-city">
                      <span>Domisili / Kota</span>
                    </label>
                    <div className="join-input-wrap">
                      <MapPin />
                      <input
                        id="join-city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Contoh: Situbondo Kota"
                        required
                      />
                    </div>
                  </div>

                  <div className="join-field-group">
                    <label className="join-field-label" htmlFor="join-instagram">
                      <span>Akun Instagram</span>
                    </label>
                    <div className="join-input-wrap">
                      <InstagramIcon />
                      <input
                        id="join-instagram"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@username"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="join-field-group">
                  <label className="join-field-label" htmlFor="join-whatsapp">
                    <span>Nomor WhatsApp Aktif</span>
                    <small>Untuk verifikasi pengurus</small>
                  </label>
                  <div className="join-input-wrap">
                    <Phone />
                    <input
                      id="join-whatsapp"
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
                  <div className="error-message" role="alert">
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
