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
          padding: clamp(20px, 4vw, 34px) clamp(18px, 4vw, 32px) clamp(34px, 5vw, 46px);
          overflow: hidden;
        }

        .profile-social-page .profile-social-cover > img {
          width: clamp(92px, 15vw, 132px);
          height: clamp(92px, 15vw, 132px);
          object-fit: contain;
          flex: none;
        }

        .profile-social-page .profile-social-cover > span {
          position: relative;
          z-index: 2;
          max-width: min(100%, 32rem);
          margin-inline: auto;
          padding-inline: clamp(42px, 11vw, 78px);
          text-align: center;
          text-wrap: balance;
        }

        /* Task 03 — reserve the avatar overlap zone so the cover label stays readable. */
        .profile-social-page .profile-social-avatar-row {
          position: relative;
          z-index: 3;
        }

        @media (max-width: 560px) {
          .profile-social-page .profile-social-cover {
            min-height: 156px;
            padding: 20px 18px 34px;
          }

          .profile-social-page .profile-social-cover > img {
            width: 96px;
            height: 96px;
          }

          .profile-social-page .profile-social-cover > span {
            padding-inline: 52px;
            font-size: clamp(0.56rem, 2.5vw, 0.68rem);
            line-height: 1.35;
          }
        }
      `}</style>
    </>
  );
}
