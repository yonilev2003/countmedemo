"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * The interactive part of the login screen: a single "sign in with Google"
 * button that kicks off the Supabase OAuth (PKCE) flow. On click, Supabase
 * redirects the browser to Google and back to /auth/callback, which completes
 * the code exchange and forwards the user on to the app.
 *
 * Styled after the "CountMe Auth" handoff's primary action — a full-width 54px
 * pill. Because the product only supports Google OAuth, the Google sign-in is
 * the primary button rather than a secondary option below an email/password
 * form.
 */
export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleGoogleSignIn() {
    setFailed(false);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    // On success the browser is already navigating to Google; we only land
    // here if kicking off the redirect itself failed.
    if (error) {
      setLoading(false);
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex h-[54px] w-full items-center justify-center gap-3 rounded-full bg-white px-6 text-base font-bold text-brand-navy shadow-brand transition-all hover:-translate-y-px hover:bg-aqua-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-60"
      >
        <GoogleGlyph />
        {loading ? "מעביר ל-Google…" : "התחברות עם Google"}
      </button>

      {failed && (
        <p className="text-center text-sm text-alert" role="alert">
          לא הצלחנו לפתוח את חלון ההתחברות. נסו שוב.
        </p>
      )}

      {/* First-time path: try the product by filling data, without signing in. */}
      <div className="mt-1 flex items-center gap-3 text-white/50">
        <span className="h-px flex-1 bg-white/20" />
        <span className="text-xs">פעם ראשונה?</span>
        <span className="h-px flex-1 bg-white/20" />
      </div>
      <a
        href="/setup"
        className="flex h-[48px] w-full items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        התחילו במילוי הנתונים →
      </a>
    </div>
  );
}

/** Google "G" mark in its official four-color form. */
function GoogleGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 18 18"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}
