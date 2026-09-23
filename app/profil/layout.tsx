import type { ReactNode } from "react";

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style>{`
        /* Profile Autopilot: Task 02 — Cover Height & Composition */
        .profile-social-page .profile-social-cover {
          min-height: clamp(148px, 24vw, 220px);
          display: grid;
          place-items: center;
          align-content: center;
          gap: 10px;
          padding: clamp(20px, 4vw, 34px) clamp(18px, 4vw, 32px);
          overflow: hidden;
        }

        .profile-social-page .profile-social-cover > img {
          width: clamp(92px, 15vw, 132px);
          height: clamp(92px, 15vw, 132px);
          object-fit: contain;
          flex: none;
        }

        .profile-social-page .profile-social-cover > span {
          max-width: min(100%, 32rem);
          margin-inline: auto;
          text-align: center;
          text-wrap: balance;
        }

        @media (max-width: 560px) {
          .profile-social-page .profile-social-cover {
            min-height: 156px;
            padding: 20px 18px 26px;
          }

          .profile-social-page .profile-social-cover > img {
            width: 96px;
            height: 96px;
          }
        }
      `}</style>
    </>
  );
}
