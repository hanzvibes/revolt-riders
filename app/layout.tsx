import { PwaRegister } from "@/components/pwa-register";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./polish.css";
import "./checkin-qr.css";
import "./form-density.css";
import "./native-admin.css";

export const metadata: Metadata = {
  title: { default: "Revolt Riders", template: "%s · Revolt Riders" },
  description: "Sistem digital internal Revolt Riders Situbondo",
  applicationName: "Revolt Riders",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Revolt Riders" },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#151617", colorScheme: "light" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="id"><body>{children}<PwaRegister /></body></html>;
}
