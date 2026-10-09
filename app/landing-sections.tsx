"use client";

import { InstagramIcon } from "@/components/icons/instagram";
import { motion } from "framer-motion";
import { Flag, Globe, Handshake, Link2, Shield, Wrench } from "lucide-react";
import Image from "next/image";

export function LandingCommunitySections() {
  return (
    <>
      {/* 3. About Revolt Riders Section */}
      <section id="about" className="industrial-section">
        <div className="about-watermark text-outline" aria-hidden="true">
          SINCE 2022
        </div>

        <div className="about-grid">
          <motion.div
            className="about-left"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
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
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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

        <motion.div
          className="values-grid"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-20px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <article className="value-card">
            <div className="value-icon-box">
              <Handshake size={24} />
            </div>
            <h4>BROTHERHOOD</h4>
            <p>Persaudaraan tanpa batas, di atas dan di luar aspal.</p>
          </article>

          <article className="value-card">
            <div className="value-icon-box">
              <Link2 size={24} />
            </div>
            <h4>SOLIDARITY</h4>
            <p>Saling mendukung dan bergerak sebagai satu kesatuan yang solid.</p>
          </article>

          <article className="value-card">
            <div className="value-icon-box">
              <Flag size={24} />
            </div>
            <h4>INDEPENDENCE</h4>
            <p>Mandiri, bebas dari kepentingan politik & tujuan komersial.</p>
          </article>

          <article className="value-card">
            <div className="value-icon-box">
              <Shield size={24} />
            </div>
            <h4>RESPECT</h4>
            <p>Saling menghargai antar anggota dan seluruh pengguna jalan raya.</p>
          </article>

          <article className="value-card">
            <div className="value-icon-box">
              <Wrench size={24} />
            </div>
            <h4>CUSTOM CULTURE</h4>
            <p>Merayakan kreativitas seni rancang bangun motor custom.</p>
          </article>

          <article className="value-card">
            <div className="value-icon-box">
              <Globe size={24} />
            </div>
            <h4>SOCIAL RESPONSIBILITY</h4>
            <p>Memberikan kontribusi dan dampak positif bagi masyarakat sekitar.</p>
          </article>
        </motion.div>
      </section>

    </>
  );
}

export function LandingSocialSections() {
  return (
    <>
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

    </>
  );
}
