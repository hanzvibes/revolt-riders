import type { ReactNode } from "react";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style>{`
        /* Profile Autopilot: Task 02 — Cover Height & Composition */
        .profile-social-page .profile-social-cover { min-height: clamp(148px, 24vw, 220px); display: grid; place-items: center; align-content: center; gap: 10px; padding: clamp(20px, 4vw, 34px) clamp(18px, 4vw, 32px) clamp(34px, 5vw, 46px); overflow: hidden; }
        .profile-social-page .profile-social-cover > img { width: clamp(92px, 15vw, 132px); height: clamp(92px, 15vw, 132px); object-fit: contain; flex: none; }
        .profile-social-page .profile-social-cover > span { position: relative; z-index: 2; max-width: min(100%, 32rem); margin-inline: auto; padding-inline: clamp(42px, 11vw, 78px); text-align: center; text-wrap: balance; }
        /* Task 03 — reserve the avatar overlap zone so the cover label stays readable. */
        .profile-social-page .profile-social-avatar-row { position: relative; z-index: 3; }
        /* Task 04 — keep the identity avatar compact, anchored, and predictable. */
        .profile-social-page .profile-social-avatar { width: clamp(72px, 16vw, 92px); height: clamp(72px, 16vw, 92px); min-width: clamp(72px, 16vw, 92px); flex: 0 0 auto; display: grid; place-items: center; aspect-ratio: 1; line-height: 1; letter-spacing: -0.04em; }
        /* Task 05 — edit remains visible without competing with the member identity. */
        .profile-social-page .profile-social-edit { min-height: 40px; padding: 9px 14px; gap: 7px; font-size: 0.78rem; font-weight: 700; white-space: nowrap; }
        .profile-social-page .profile-social-edit > svg { width: 15px; height: 15px; }
        /* Task 06 — name and verification icon read as one identity lockup. */
        .profile-social-page .profile-social-name-row { display: flex; align-items: center; gap: 7px; min-width: 0; }
        .profile-social-page .profile-social-name-row h2 { min-width: 0; margin: 0; line-height: 1.08; letter-spacing: -0.025em; overflow-wrap: anywhere; }
        .profile-social-page .profile-social-name-row > svg { width: 18px; height: 18px; flex: 0 0 18px; }
        /* Task 07 — legal/full name stays clearly secondary to the social identity. */
        .profile-social-page .profile-social-full-name { margin: 5px 0 0; font-size: clamp(0.78rem, 2.5vw, 0.9rem); line-height: 1.4; opacity: 0.68; overflow-wrap: anywhere; }
        /* Task 08 — handle, role, and status share one compact metadata rhythm. */
        .profile-social-page .profile-social-handle-row { display: flex; align-items: center; flex-wrap: wrap; gap: 7px 8px; margin-top: 9px; min-width: 0; }
        .profile-social-page .profile-social-handle-row code { max-width: 100%; font-size: 0.76rem; line-height: 1.35; overflow-wrap: anywhere; }
        .profile-social-page .profile-social-handle-row .member-role-badge, .profile-social-page .profile-social-active { min-height: 24px; display: inline-flex; align-items: center; gap: 4px; padding-block: 3px; line-height: 1.2; white-space: nowrap; }
        .profile-social-page .profile-social-active > svg { width: 13px; height: 13px; }
        /* Task 09 — bio is short-form supporting copy, not another headline. */
        .profile-social-page .profile-social-bio { max-width: 46rem; margin: 12px 0 0; font-size: clamp(0.84rem, 2.5vw, 0.94rem); line-height: 1.55; text-wrap: pretty; }
        /* Task 10 — member facts scan cleanly while preserving wrapping on narrow screens. */
        .profile-social-page .profile-social-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 14px; margin-top: 13px; }
        .profile-social-page .profile-social-meta > span { min-width: 0; display: inline-flex; align-items: center; gap: 6px; font-size: 0.78rem; line-height: 1.4; }
        .profile-social-page .profile-social-meta > span > svg { width: 14px; height: 14px; flex: 0 0 14px; }
        /* Task 11 — stats form an even, tap-friendly summary strip. */
        .profile-social-page .profile-social-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: stretch; gap: 8px; }
        .profile-social-page .profile-social-stats > a { min-width: 0; min-height: 68px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 10px 8px; text-align: center; }
        .profile-social-page .profile-social-stats strong { line-height: 1; font-variant-numeric: tabular-nums; }
        .profile-social-page .profile-social-stats span { font-size: clamp(0.66rem, 2.2vw, 0.76rem); line-height: 1.25; text-wrap: balance; }
        @media (max-width: 560px) {
          .profile-social-page .profile-social-cover { min-height: 156px; padding: 20px 18px 34px; }
          .profile-social-page .profile-social-cover > img { width: 96px; height: 96px; }
          .profile-social-page .profile-social-cover > span { padding-inline: 52px; font-size: clamp(0.56rem, 2.5vw, 0.68rem); line-height: 1.35; }
          .profile-social-page .profile-social-avatar { width: 74px; height: 74px; min-width: 74px; font-size: 1.05rem; }
          .profile-social-page .profile-social-edit { min-height: 38px; padding: 8px 12px; font-size: 0.74rem; }
          .profile-social-page .profile-social-name-row { gap: 6px; }
          .profile-social-page .profile-social-name-row > svg { width: 16px; height: 16px; flex-basis: 16px; }
          .profile-social-page .profile-social-handle-row { gap: 6px; }
          .profile-social-page .profile-social-meta { gap: 7px 10px; }
          .profile-social-page .profile-social-meta > span { flex: 1 1 calc(50% - 10px); }
          .profile-social-page .profile-social-stats { gap: 6px; }
          .profile-social-page .profile-social-stats > a { min-height: 64px; padding-inline: 5px; }
        }
      `}</style>
    </>
  );
}
