import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Autopilot Monitor | Revolt Riders",
  description: "Near-live monitor untuk workflow autopilot Revolt Riders.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AutopilotLayout({ children }: { children: ReactNode }) {
  return children;
}
