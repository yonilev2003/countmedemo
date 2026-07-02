import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "countme — המלווה לדו״ח שלך",
  // Copy per docs/reviews/2026-07-02-ws8-copy-audit.md (O1) — DRAFT — NEEDS LEGAL REVIEW
  description:
    "המוצר שמלווה עצמאים בישראל בהכנת דו״ח המס השנתי. AI שלוקח את הנתונים שלך ומראה בדיוק מה למלא בכל שדה — מחשבון מדויק, לא ייעוץ מס.",
  manifest: "/manifest.json",
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
