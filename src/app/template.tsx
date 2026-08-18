// Route-transition layer (Wave 2, docs/launch/status-vs-plan.md WS-A: "View
// Transitions למעברי route"). Deliberately the LIGHT version — not React's
// <ViewTransition> / the browser View Transitions API (that needs each
// participating page.tsx to opt in per Next's view-transitions guide, and
// framer-motion's AnimatePresence needs a persistent client shell to run
// exit animations — both are explicitly out of scope for this pass).
//
// template.js remounts (gets a fresh DOM node, unlike layout.tsx which
// persists across navigations) on every route-segment change, so simply
// giving it a CSS mount animation is enough to replace the current hard
// swap with a subtle settle-in — no client JS, no framer-motion, no
// persistent nav shell. See src/app/globals.css for the `.cm-route-enter`
// keyframes (fade + 6px rise, 180ms, prefers-reduced-motion-aware).
//
// Deliberately a Server Component (no "use client", no hooks) — the
// animation is pure CSS, so there is nothing here that could disagree
// between server and first client render, and no hydration-mismatch risk.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="cm-route-enter">{children}</div>;
}
