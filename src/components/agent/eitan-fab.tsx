import Link from "next/link";
import { SparklesIcon } from "@/components/brand/icons";

/**
 * Floating "ask Eitan" button (CEO §3.4: chat reachable from every screen).
 * Fixed to the bottom-start corner, safe-area aware. Mount on content screens
 * that don't already carry a prominent Eitan entry in their chrome.
 */
export function EitanFab() {
  return (
    <Link
      href="/coach"
      aria-label="לשאול את איתן"
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] start-5 z-40 flex h-14 items-center gap-2 rounded-full bg-brand-navy px-5 text-brand shadow-brand transition-all hover:-translate-y-0.5 hover:bg-navy-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      <SparklesIcon className="size-5" />
      <span className="text-sm font-bold">איתן</span>
    </Link>
  );
}
