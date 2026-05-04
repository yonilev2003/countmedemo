"use client";
import { useState } from "react";

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
      className="rounded-md border border-brand-navy/20 bg-info/20 px-2 py-0.5 text-xs text-brand-navy hover:bg-info/40 transition-colors"
    >
      {copied ? "✓ הועתק" : "📋 העתק"}
    </button>
  );
}
