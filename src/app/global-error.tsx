"use client";

import { useEffect } from "react";

// Last-resort boundary — fires only when the root layout itself crashes.
// Must include its own <html>/<body> because the layout is gone.
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
          background: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <div style={{ maxWidth: 420, padding: 28, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            countme לא זמין כרגע
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#57534e", marginBottom: 20 }}>
            קרתה שגיאה ברמה הגבוהה ביותר של היישום. נסי לטעון מחדש את הדף.
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, fontFamily: "monospace", color: "#a8a29e", marginBottom: 20 }}>
              קוד שגיאה: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              background: "#2563eb",
              color: "white",
              border: "none",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            טען מחדש
          </button>
        </div>
      </body>
    </html>
  );
}
