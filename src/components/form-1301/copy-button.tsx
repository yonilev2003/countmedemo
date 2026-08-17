"use client";
import { useState } from "react";
import { ClipboardCheckIcon, CheckIcon } from "@/components/brand/icons";

export function CopyButton({ value }: { value: string | number }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "הועתק" : "העתק"}
      className="inline-flex min-h-6 items-center gap-1 rounded-md border border-brand-navy/20 bg-info/20 px-2 py-1 text-xs text-brand-navy hover:bg-info/40 transition-colors"
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <ClipboardCheckIcon className="size-3.5" />
      )}
      {copied ? "הועתק" : "העתק"}
    </button>
  );
}

/**
 * Compact icon-only copy button — used inline next to form values
 * inside the gov.il-faithful preview, where space is tight.
 */
export function InlineCopyButton({ value }: { value: string | number }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    await navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "הועתק" : "העתק לטופס gov.il"}
      aria-label="העתק"
      className={
        "inline-flex h-6 w-6 items-center justify-center rounded text-[11px] " +
        "border border-stone-300 bg-white hover:bg-stone-100 transition-colors " +
        (copied ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "text-stone-500")
      }
    >
      {copied ? (
        <CheckIcon className="size-3" />
      ) : (
        <ClipboardCheckIcon className="size-3" />
      )}
    </button>
  );
}
