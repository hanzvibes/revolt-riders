"use client";

import { CountUpNumber } from "@/components/count-up-number";
import { motion, useReducedMotion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Gauge,
  Medal,
  Trophy,
  Users,
} from "lucide-react";
import type { LeaderboardRider } from "./leaderboard-data";
import type { LeaderboardTopStackItem } from "./leaderboard-model";

export function LeaderboardTopStack({
  top3,
  top3Stack,
  activeTopIndex,
  onActiveIndexChange,
  onRotate,
}: {
  top3: LeaderboardRider[];
  top3Stack: LeaderboardTopStackItem[];
  activeTopIndex: number;
  onActiveIndexChange: (index: number) => void;
  onRotate: (direction: 1 | -1) => void;
}) {
  const reduceMotion = useReducedMotion();

  if (top3.length < 3) {
    return (
      <div className="leaderboard-hero-podium-empty">
        Podium akan tampil setelah minimal tiga rider memiliki data.
      </div>
    );
  }

  return (
    <div
      className="leaderboard-hero-podium leaderboard-swipe-podium"
      aria-label="Tiga rider teratas"
    >
      <div
        className="leaderboard-swipe-deck"
        role="region"
        aria-roledescription="carousel"
        aria-label="Top 3 leaderboard. Geser kartu ke kiri atau kanan."
      >
        {top3Stack.map(({ rider, rank, layer }) => {
          const isFront = layer === 0;
          const Icon = rank === 1 ? Crown : Medal;
          const layerX = layer === 1 ? 32 : layer === 2 ? -32 : 0;
          const layerY = layer === 0 ? 0 : layer === 1 ? 14 : 20;
          const layerScale = layer === 0 ? 1 : layer === 1 ? 0.955 : 0.92;
          const layerRotate = layer === 0 ? 0 : layer === 1 ? 1.8 : -1.8;
          const layerOpacity = layer === 0 ? 1 : layer === 1 ? 0.82 : 0.66;

          return (
            <motion.article
              key={rider.member_external_id}
              className={
                "leaderboard-hero-podium-card rank-" +
                rank +
                " stack-layer-" +
                layer
              }
              aria-hidden={!isFront}
              tabIndex={isFront ? 0 : -1}
              drag={isFront && !reduceMotion ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.16}
              dragMomentum={false}
              animate={{
                x: layerX,
                y: layerY,
                scale: layerScale,
                rotate: layerRotate,
                opacity: layerOpacity,
              }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 290,
                      damping: 34,
                      mass: 0.78,
                    }
              }
              whileDrag={
                isFront && !reduceMotion
                  ? {
                      scale: 1.015,
                      rotate: 0.35,
                      cursor: "grabbing",
                    }
                  : undefined
              }
              onDragEnd={(_, info) => {
                const shouldMove =
                  Math.abs(info.offset.x) > 54 ||
                  Math.abs(info.velocity.x) > 460;
                if (!shouldMove) return;
                onRotate(info.offset.x < 0 ? 1 : -1);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  onRotate(-1);
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  onRotate(1);
                }
              }}
              style={{ zIndex: 10 - layer }}
            >
              <header className="leaderboard-stack-card-head">
                <div className="leaderboard-stack-card-identity">
                  <div
                    className="leaderboard-hero-rank-icon"
                    aria-hidden="true"
                  >
                    <Icon />
                  </div>
                  <div>
                    <span className="leaderboard-hero-rank-label">
                      Peringkat #{rank}
                    </span>
                    <strong title={rider.full_name}>{rider.full_name}</strong>
                    <small>{rider.member_external_id}</small>
                  </div>
                </div>
                <b className="leaderboard-stack-card-km">
                  <CountUpNumber value={rider.total_km} suffix=" KM" />
                </b>
              </header>

              <p className="leaderboard-stack-card-note">
                Kilometer riding terverifikasi dari aktivitas member.
              </p>

              <div className="leaderboard-stack-card-details">
                <div>
                  <Trophy aria-hidden="true" />
                  <span>Peringkat</span>
                  <strong>#{rank}</strong>
                </div>
                <div>
                  <Users aria-hidden="true" />
                  <span>Member ID</span>
                  <strong>{rider.member_external_id}</strong>
                </div>
                <div>
                  <Gauge aria-hidden="true" />
                  <span>Status</span>
                  <strong>Terverifikasi</strong>
                </div>
              </div>

              <footer className="leaderboard-stack-card-total">
                <span>Total Kilometer</span>
                <strong>
                  <CountUpNumber value={rider.total_km} suffix=" KM" />
                </strong>
              </footer>
            </motion.article>
          );
        })}
      </div>

      <div
        className="leaderboard-swipe-controls"
        aria-label="Navigasi kartu leaderboard"
      >
        <button
          type="button"
          onClick={() => onRotate(-1)}
          aria-label="Kartu sebelumnya"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <div className="leaderboard-swipe-dots">
          {top3.map((rider, index) => (
            <button
              key={rider.member_external_id}
              type="button"
              className={index === activeTopIndex ? "active" : ""}
              aria-label={"Tampilkan peringkat #" + (index + 1)}
              aria-current={
                index === activeTopIndex ? "true" : undefined
              }
              onClick={() => onActiveIndexChange(index)}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => onRotate(1)}
          aria-label="Kartu berikutnya"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <small className="leaderboard-swipe-hint">
        Swipe kiri atau kanan
      </small>
    </div>
  );
}
