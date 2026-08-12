"use client";

import { useEffect } from "react";

// Last-resort boundary — fires only when the root layout itself crashes.
// Must include its own <html>/<body> because the layout is gone.
// Brand hex values are inlined since Tailwind/CSS vars are unavailable here.
// navy=#083A4F, gold=#F5A93F, cream=#F1EFEA, alert=#C05B45, muted=#6A7A80, paper=#FBFAF8
// (none of the below inline styles currently use gold/beige — comment kept for completeness)
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[countme:global]", error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#F1EFEA",
          color: "#083A4F",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: "100%",
            padding: 32,
            textAlign: "center",
            background: "#FBFAF8",
            border: "1px solid #E5E1DD",
            borderRadius: 20,
            boxShadow: "0 2px 8px rgba(8,58,79,0.08)",
          }}
        >
          {/* Alert icon — triangle with exclamation mark, brand alert colour */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "#FBEAE6",
              marginBottom: 16,
            }}
          >
            <svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C05B45"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>

          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "#083A4F" }}>
            countme לא זמין כרגע
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#6A7A80", marginBottom: 20 }}>
            קרתה שגיאה ברמה הגבוהה ביותר של היישום. נסי לטעון מחדש את הדף.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, fontFamily: "monospace", color: "#9AABB0", marginBottom: 20 }}>
              קוד שגיאה: {error.digest}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={reset}
              style={{
                padding: "9px 20px",
                borderRadius: 999,
                background: "#083A4F",
                color: "#FBFAF8",
                border: "none",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              טען מחדש
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
