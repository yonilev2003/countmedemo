"use client";

import { useState } from "react";
import type { HelpLinkEntry } from "@/lib/onboarding/help-links";
import { ChevronDownIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

/**
 * Subtle, collapsed-by-default "side option" — a small text toggle that
 * expands into a one-line explanation plus a link to the official source.
 * Purely additive UI chrome: no persona/validation logic, no new colors or
 * spacing scale (every className below already appears elsewhere in
 * setup/page.tsx). Renders nothing for a link marked "unverified" — belt and
 * suspenders alongside keeping such entries out of the exported HELP_LINKS
 * array in the first place.
 */
export function HelpLink({
  link,
  className,
}: {
  link: HelpLinkEntry;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (link.confidence === "unverified") return null;

  return (
    <div className={cn("mt-1.5", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs text-brand-deep hover:underline"
      >
        <span>{link.labelHe}</span>
        <ChevronDownIcon
          className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <p className="mt-1 rounded-lg border border-line bg-cream/60 px-3 py-2 text-xs leading-relaxed text-muted">
          {link.descriptionHe}{" "}
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-deep underline hover:text-brand-navy"
          >
            למקור הרשמי
          </a>
        </p>
      )}
    </div>
  );
}
