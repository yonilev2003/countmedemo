import type { NextConfig } from "next";

// ── Security headers (WS2 hardening) ─────────────────────────────────────
// Applied to every route via headers() below. CSP starts as REPORT-ONLY so
// we can watch for violations in the live pilot without breaking anything.

// Content-Security-Policy, report-only for now.
// TODO(security): monitoring was wired up 2026-08-05 (/api/csp-report,
// see report-uri below) - before that, this ran report-only for over a
// month with nowhere for violations to land, so "no violations" was never
// actually observed. After 2+ weeks of real reports with none, rename the
// header to "Content-Security-Policy" to enforce AND replace 'unsafe-inline'/
// 'unsafe-eval' in script-src with nonces/strict-dynamic first.
const cspReportOnly = [
  // Fallback for anything not listed below — same-origin only.
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts, and dev/react-refresh needs
  // eval. TODO(security): move to nonces + strict-dynamic before enforcing.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Next/Tailwind stream inline <style> tags during rendering.
  "style-src 'self' 'unsafe-inline'",
  // data:/blob: cover inline SVGs, canvas exports and next/image placeholders.
  "img-src 'self' data: blob:",
  // Assistant is loaded via next/font/google → self-hosted at build time, so
  // no fonts.gstatic.com needed. data: covers inlined font subsets.
  "font-src 'self' data:",
  // Browser-side Supabase: auth + PostgREST over https, realtime over wss.
  // (Anthropic is called server-side only — deliberately NOT listed.)
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  // We never embed this app in a frame (modern twin of X-Frame-Options: DENY).
  "frame-ancestors 'none'",
  // No plugins / <object> embeds.
  "object-src 'none'",
  // Prevent <base> tag hijacking of relative URLs.
  "base-uri 'self'",
  // Forms only ever submit to ourselves.
  "form-action 'self'",
  // Send violation reports somewhere the team can actually see them (Vercel
  // logs), instead of only each visitor's own browser console. Legacy
  // directive, but still respected by every major browser for report-only
  // mode — see src/app/api/csp-report/route.ts.
  "report-uri /api/csp-report",
].join("; ");

const securityHeaders = [
  {
    // Force HTTPS for 2 years, incl. subdomains (Vercel serves HTTPS anyway;
    // this stops any future downgrade/SSL-strip on first visit after one load).
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    // Never MIME-sniff responses — declared Content-Type is authoritative.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Legacy clickjacking protection for older browsers; CSP frame-ancestors
    // above is the modern equivalent.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Full referrer same-origin; origin-only to other HTTPS; nothing to HTTP.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Deny camera + geolocation everywhere. Microphone stays same-origin
    // only: the voice-invoice page (/invoices/new) dictates via the Web
    // Speech API (SpeechRecognition), which needs mic access.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=()",
  },
  {
    // REPORT-ONLY: browsers log violations to the console without blocking.
    key: "Content-Security-Policy-Report-Only",
    value: cspReportOnly,
  },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework in an x-powered-by header.
  poweredByHeader: false,

  async headers() {
    return [
      {
        // Every route — pages, API handlers and static assets alike.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
