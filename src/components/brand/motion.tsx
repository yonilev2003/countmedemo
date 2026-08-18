"use client";

// Brand motion primitives. The ONE place app-wide animation lives, so motion is
// consistent and accessible. Everything here respects `prefers-reduced-motion`
// (a local matchMedia hook, see usePrefersReducedMotion) — reduced users get
// the final state with no movement.
//
// Usage stays declarative:
//   <Reveal>…</Reveal>                       fade/rise a block into view
//   <Stagger><StaggerItem/>…</Stagger>       cascade a list/grid of cards
//   <CountUp value={200700} format={fmt}/>   animate a calculated number up
//
// Keep durations subtle (brand kit: 150–250ms, calm/premium — no flashy motion).
//
// PERF: framer-motion (~134KB decompressed) is NOT imported at module scope
// here. It previously was, which welded it into the shared webpack chunk and
// shipped it to every route in the app — including ones that never render
// Reveal/Stagger/CountUp (/, /invoices/new, etc). Instead, the real
// framer-motion-powered implementations live in ./motion-engine and are
// pulled in via a dynamic import() the first time a component actually
// mounts. Until that import resolves (typically well under a frame on a warm
// cache, at most one extra network round trip on a cold one), each component
// below renders its OWN final, fully visible markup synchronously — same
// element, same layout, same className — so there is no layout shift and no
// hydration mismatch: the server and the first client render always agree.
// The animation is a progressive enhancement layered on top once the engine
// chunk lands. Users with prefers-reduced-motion never trigger the import at
// all, so they never pay for the chunk.
//
// The Reveal/Stagger/StaggerItem/CountUp props/behavior are unchanged for
// callers — only the internal loading strategy changed.

import { useEffect, useState, type ComponentType, type ReactNode } from "react";

/** SSR-safe prefers-reduced-motion: false on server + first client paint
 * (matching hydration), updated to the real value right after mount — same
 * pattern framer-motion's own `useReducedMotion` uses internally. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return reduced;
}

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

/** Fade + rise a block in when it scrolls into view (once). */
export function Reveal({ children, className, delay = 0, y = 12 }: RevealProps) {
  const reduced = usePrefersReducedMotion();
  const [Engine, setEngine] = useState<ComponentType<RevealProps> | null>(null);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    import("./motion-engine").then((m) => {
      if (alive) setEngine(() => m.RevealEngine as ComponentType<RevealProps>);
    });
    return () => {
      alive = false;
    };
  }, [reduced]);

  if (reduced || !Engine) {
    return <div className={className}>{children}</div>;
  }
  return (
    <Engine className={className} delay={delay} y={y}>
      {children}
    </Engine>
  );
}

type StaggerProps = {
  children: ReactNode;
  className?: string;
};

/** Container that cascades its <StaggerItem> children into view. */
export function Stagger({ children, className }: StaggerProps) {
  const reduced = usePrefersReducedMotion();
  const [Engine, setEngine] = useState<ComponentType<StaggerProps> | null>(null);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    import("./motion-engine").then((m) => {
      if (alive) setEngine(() => m.StaggerEngine as ComponentType<StaggerProps>);
    });
    return () => {
      alive = false;
    };
  }, [reduced]);

  if (reduced || !Engine) {
    return <div className={className}>{children}</div>;
  }
  return <Engine className={className}>{children}</Engine>;
}

export function StaggerItem({ children, className }: StaggerProps) {
  const reduced = usePrefersReducedMotion();
  const [Engine, setEngine] = useState<ComponentType<StaggerProps> | null>(null);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    import("./motion-engine").then((m) => {
      if (alive) setEngine(() => m.StaggerItemEngine as ComponentType<StaggerProps>);
    });
    return () => {
      alive = false;
    };
  }, [reduced]);

  if (reduced || !Engine) {
    return <div className={className}>{children}</div>;
  }
  return <Engine className={className}>{children}</Engine>;
}

type CountUpProps = {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
};

/**
 * Animate a number counting up to `value`. The "whoa, it computed MY number"
 * moment for calculated fields. Pass a `format` fn (e.g. formatCurrency) so the
 * displayed text matches the rest of the app. Reduced-motion → jumps to final.
 */
export function CountUp({
  value,
  format = (n) => String(Math.round(n)),
  duration = 0.9,
  className,
}: CountUpProps) {
  const reduced = usePrefersReducedMotion();
  const [Engine, setEngine] = useState<ComponentType<
    Required<Pick<CountUpProps, "value" | "format" | "duration">> &
      Pick<CountUpProps, "className">
  > | null>(null);

  useEffect(() => {
    if (reduced) return;
    let alive = true;
    import("./motion-engine").then((m) => {
      if (alive)
        setEngine(
          () =>
            m.CountUpEngine as ComponentType<
              Required<Pick<CountUpProps, "value" | "format" | "duration">> &
                Pick<CountUpProps, "className">
            >
        );
    });
    return () => {
      alive = false;
    };
  }, [reduced]);

  if (reduced || !Engine) {
    return (
      <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
        {format(value)}
      </span>
    );
  }

  return (
    <Engine value={value} format={format} duration={duration} className={className} />
  );
}
