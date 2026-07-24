import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { PersonaHydrator } from "@/components/persona-hydrator";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const APP_TITLE = "countme — הכספים של העסק שלך";
// Copy per docs/reviews/2026-07-02-ws8-copy-audit.md (O1) — DRAFT — NEEDS LEGAL REVIEW
const APP_DESCRIPTION =
  "חשבוניות, קבלות, הוצאות ומי לא שילם לי — הכספים של העסק העצמאי שלך, בשפה של בני אדם. מחשבון מדויק, לא ייעוץ מס.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://countmedemo-eight.vercel.app",
  ),
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  openGraph: {
    title: APP_TITLE,
    description: APP_DESCRIPTION,
    type: "website",
    locale: "he_IL",
    siteName: "countme",
  },
  twitter: {
    card: "summary",
    title: APP_TITLE,
    description: APP_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    title: "CountMe",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#083A4F",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${assistant.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-cream text-ink font-sans">
        <ServiceWorkerRegistration />
        <PersonaHydrator />
        {children}
      </body>
    </html>
  );
}
