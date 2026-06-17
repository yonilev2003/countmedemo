"use client";

// Brand motion primitives. The ONE place app-wide animation lives, so motion is
// consistent and accessible. Everything here respects `prefers-reduced-motion`
// (framer's useReducedMotion) — reduced users get the final state with no movement.
//
// Usage stays declarative:
//   <Reveal>…</Reveal>                       fade/rise a block into view
//   <Stagger><StaggerItem/>…</Stagger>       cascade a list/grid of cards
//   <CountUp value={200700} format={fmt}/>   animate a calculated number up
//
// Keep durations subtle (brand kit: 150–250ms, calm/premium — no flashy motion).

import {
  motion,
  useReducedMotion,
  useInView,
  animate,
  type Variants,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.22, 0.61, 0.36, 1] as const;

/** Fade + rise a block in when it scrolls into view (once). */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.45, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};
const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

/** Container that cascades its <StaggerItem> children into view. */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  );
}

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
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return (
    <span className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {format(display)}
    </span>
  );
}
