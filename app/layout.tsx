import { ActionDialogProvider } from "@/components/action-dialog-provider";
import { PwaRegister } from "@/components/pwa-register";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import "./tokens.css";
import "./globals.css";
import "./polish.css";
import "./checkin-qr.css";
import "./form-density.css";
import "./native-admin.css";
import "./landing.css";
import "./system-ui.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.revoltriders.my.id"),
  title: { default: "Revolt Riders · Satu Aspal, Satu Persaudaraan", template: "%s · Revolt Riders" },
  description: "Official portal komunitas motor Revolt Riders Situbondo. Wadah persaudaraan, touring, dan kegiatan sosial.",
  applicationName: "Revolt Riders",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Revolt Riders" },
  formatDetection: { telephone: false },
  openGraph: {
    title: "Revolt Riders · Satu Aspal, Satu Persaudaraan",
    description: "Official portal komunitas motor Revolt Riders Situbondo. Wadah persaudaraan, touring, dan kegiatan sosial.",
    url: "https://www.revoltriders.my.id",
    siteName: "Revolt Riders",
    images: [
      {
        url: "/revolt-riders-logo.jpg",
        width: 800,
        height: 800,
        alt: "Logo Resmi Revolt Riders Situbondo",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Revolt Riders · Satu Aspal, Satu Persaudaraan",
    description: "Official portal komunitas motor Revolt Riders Situbondo. Wadah persaudaraan, touring, dan kegiatan sosial.",
    images: ["/revolt-riders-logo.jpg"],
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = { themeColor: "#0b0d10", colorScheme: "light dark", viewportFit: "cover" };

import { DataCacheProvider } from "@/context/data-cache-context";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <DataCacheProvider>
          <ActionDialogProvider>
            {children}
            <PwaRegister />
            <Analytics />
          </ActionDialogProvider>
        </DataCacheProvider>
      </body>
    </html>
  );
}
