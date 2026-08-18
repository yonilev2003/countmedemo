import type { Metadata, Viewport } from "next";
import { Assistant, Rubik } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker";
import { PersonaHydrator } from "@/components/persona-hydrator";
import { AccessibilityWidget } from "@/components/a11y/accessibility-widget";
import { A11Y_BOOTSTRAP_SCRIPT } from "@/lib/a11y/core";

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  // 300 removed 2026-08-18: grep-verified unused across src/ (no
  // font-[300]/font-light usage referencing Assistant anywhere).
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Headings/display only (font-display) — body text stays Assistant (font-sans).
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  weight: ["500", "600", "700", "800", "900"],
  display: "swap",
});

const APP_TITLE = "countme — הכספים של העסק שלך";
// Copy per docs/reviews/2026-07-02-ws8-copy-audit.md (O1) — DRAFT — NEEDS LEGAL REVIEW
const APP_DESCRIPTION =
  "חשבוניות, קבלות, הוצאות ומי לא שילם לי — הכספים של העסק העצמאי שלך, בשפה של בני אדם. מחשבון מדויק, לא ייעוץ מס.";

export const metadata: Metadata = {
  metadataBase: new URL(
    // countmedemo-eight.vercel.app is the ONLY domain this Vercel project
    // actually owns (verified live via the Vercel API, 17/08 — get_project
    // on prj_3IlHVinVBsD8s16lXEEdGYUWMujj lists it plus 2 auto-aliases;
    // countmedemo.vercel.app is NOT in that list and does not belong to any
    // of the 9 projects on this account). Do not "fix" this back — that was
    // tried once before (see memory/STATUS.md, 03/08) and reverted for the
    // same reason.
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
      // suppressHydrationWarning: the a11y FOUC bootstrap adds a11y-* classes
      // to <html> BEFORE hydration (by design), which otherwise logs a React
      // hydration-mismatch error for every user with saved a11y preferences.
      suppressHydrationWarning
      // data-scroll-behavior: opts in to Next 16's smooth-scroll handling and
      // silences its console warning about the CSS scroll-behavior on <html>.
      data-scroll-behavior="smooth"
      className={`${assistant.variable} ${rubik.variable} h-full antialiased`}
    >
      <head>
        {/* FOUC bootstrap: applies persisted a11y prefs BEFORE hydration */}
        <script dangerouslySetInnerHTML={{ __html: A11Y_BOOTSTRAP_SCRIPT }} />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-cream text-ink font-sans">
        {/* IS 5568: skip link — must be the first focusable element on every page */}
        <a href="#main-content" className="skip-link">
          דלג לתוכן הראשי
        </a>
        <ServiceWorkerRegistration />
        <PersonaHydrator />
        <div id="main-content" tabIndex={-1} className="flex-1 flex flex-col">
          {children}
        </div>
        {/* IS 5568: the accessibility statement must be reachable from every page */}
        <footer
          role="contentinfo"
          className="border-t border-line bg-paper px-6 py-3 text-center text-xs text-muted print:hidden"
        >
          <a href="/accessibility" className="underline hover:text-brand-navy">
            הצהרת נגישות
          </a>
          <span aria-hidden="true" className="mx-2">
            ·
          </span>
          <a href="/privacy" className="underline hover:text-brand-navy">
            מדיניות פרטיות
          </a>
          <span aria-hidden="true" className="mx-2">
            ·
          </span>
          <a href="/terms" className="underline hover:text-brand-navy">
            תנאי שימוש
          </a>
        </footer>
        {/* Regulation 35 accessibility-preferences widget (Alt+A) */}
        <AccessibilityWidget />
      </body>
    </html>
  );
}
