"use client";

// Client-side analytics helper. Fire-and-forget POST to /api/track — never
// awaits, never throws, never blocks UI. The server stamps the user_id.

import type { EventName } from "./track";

export function trackClient(
  name: EventName,
  props: Record<string, unknown> = {},
): void {
  try {
    const path = typeof window !== "undefined" ? window.location.pathname : null;
    // keepalive lets the event survive a navigation away from the page.
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, props, path }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore — analytics must never break the app.
  }
}
