"use client";

/**
 * "הגדרות מסמכים" — document-branding settings (Tomi's request, 2026-08-23,
 * inspired by a reference "document settings" menu: logo/signature, fixed
 * content, numbering). Scoped to the pieces with real, contained value for
 * this product: logo + signature images shown on issued documents instead
 * of the trade-name monogram, a fixed footer note appended to every
 * document, and a numbering control (the underlying numbering mechanism
 * already exists from onboarding — this just surfaces it here too, so it
 * isn't only reachable once, buried in the /setup wizard).
 *
 * Not built here (deliberately, kept out of this first pass): per-document
 * visual theming/color and localized (English) document content — open-
 * ended scope with no clear MVP shape yet.
 */

import { useEffect, useRef, useState } from "react";
import { useRequiredPersona } from "@/lib/data/use-required-persona";
import { persistPersona } from "@/lib/data/persona-store";
import { setPersonaPath } from "@/lib/setup-storage";
import { nextInvoiceNumber } from "@/lib/invoice-generator";
import {
  uploadBusinessAsset,
  getBusinessAssetSignedUrl,
  deleteBusinessAsset,
  type BusinessAssetSlot,
} from "@/lib/documents/asset-storage";
import { AppHeader } from "@/components/brand/app-header";
import { btn } from "@/components/brand/button";
import { UploadIcon, Trash2Icon, CheckCircleIcon, InfoIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

const MAX_ASSET_BYTES = 2 * 1024 * 1024; // 2MB — a logo/signature, not a scanned document
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/** Highest already-issued number in the shared invoice/receipt series (never
 *  quote/business-account — those run their own docCounters series) — the
 *  floor a new starting number must stay above, so re-numbering can never
 *  reissue a number that's already out there. */
function highestIssuedInvoiceNumber(invoices: { invoiceNumber: string; docType?: string }[]): number {
  let max = 0;
  for (const inv of invoices) {
    if (inv.docType === "quote" || inv.docType === "business-account") continue;
    const match = /-(\d+)$/.exec(inv.invoiceNumber);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max;
}

export default function DocumentSettingsPage() {
  const { persona, setPersona } = useRequiredPersona();

  if (!persona) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="h-8 w-40 rounded-lg bg-sand animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <AppHeader pageLabel="הגדרות מסמכים" />
      <main className="mx-auto w-full max-w-screen-sm px-4 py-6 sm:px-6 space-y-6">
        <div>
          <h1 className="text-xl font-bold font-display text-brand-navy">הגדרות מסמכים</h1>
          <p className="mt-1 text-sm text-muted">
            איך המסמכים שאתה מפיק (חשבוניות, קבלות) ייראו — לוגו, חתימה, טקסט קבוע ומספור.
          </p>
        </div>

        <AssetUploadCard
          title="לוגו העסק"
          hint="מוצג בראש כל מסמך שתפיק/י, במקום העיגול עם האות הראשונה."
          slot="logo"
          persona={persona}
          setPersona={setPersona}
        />

        <AssetUploadCard
          title="חתימה"
          hint="לא חובה חוקית בישראל — תוספת אישית בלבד, מוצגת בתחתית המסמך."
          slot="signature"
          persona={persona}
          setPersona={setPersona}
        />

        <FooterNoteCard persona={persona} setPersona={setPersona} />

        <NumberingCard persona={persona} setPersona={setPersona} />
      </main>
    </div>
  );
}

function AssetUploadCard({
  title,
  hint,
  slot,
  persona,
  setPersona,
}: {
  title: string;
  hint: string;
  slot: BusinessAssetSlot;
  persona: NonNullable<ReturnType<typeof useRequiredPersona>["persona"]>;
  setPersona: ReturnType<typeof useRequiredPersona>["setPersona"];
}) {
  const path = slot === "logo" ? "business.logoPath" : "business.signaturePath";
  const currentPath = slot === "logo" ? persona.business.logoPath : persona.business.signaturePath;
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!currentPath) {
      setPreviewUrl(null);
      return;
    }
    getBusinessAssetSignedUrl(currentPath).then((url) => {
      if (!cancelled) setPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [currentPath]);

  async function handleFile(file: File) {
    setError(null);
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("סוג קובץ לא נתמך — PNG, JPG, WebP או SVG בלבד.");
      return;
    }
    if (file.size > MAX_ASSET_BYTES) {
      setError("הקובץ גדול מדי — עד 2MB.");
      return;
    }
    setBusy(true);
    const uploaded = await uploadBusinessAsset(slot, file, file.type, currentPath);
    setBusy(false);
    if (!uploaded) {
      setError("ההעלאה נכשלה — נסה/י שוב.");
      return;
    }
    const updated = setPersonaPath(persona, path, uploaded);
    persistPersona(updated);
    setPersona(updated);
  }

  async function handleRemove() {
    if (!currentPath) return;
    setBusy(true);
    await deleteBusinessAsset(currentPath);
    setBusy(false);
    const updated = setPersonaPath(persona, path, null);
    persistPersona(updated);
    setPersona(updated);
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>

      {previewUrl ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- private signed URL, not an optimizable static asset */}
          <img
            src={previewUrl}
            alt={title}
            className="h-16 w-16 rounded-xl border border-line bg-cream object-contain"
          />
          <div className="flex-1 flex items-center gap-2 text-xs text-success">
            <CheckCircleIcon className="size-3.5 shrink-0" />
            הועלה
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className={btn("ghost", "sm")}
          >
            <Trash2Icon className="size-3.5" />
            הסר
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(btn("secondary", "sm"), "w-full justify-center")}
        >
          <UploadIcon className="size-3.5" />
          {busy ? "מעלה..." : "העלה תמונה"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-alert">
          <InfoIcon className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function FooterNoteCard({
  persona,
  setPersona,
}: {
  persona: NonNullable<ReturnType<typeof useRequiredPersona>["persona"]>;
  setPersona: ReturnType<typeof useRequiredPersona>["setPersona"];
}) {
  const [draft, setDraft] = useState(persona.business.documentFooterNote ?? "");
  const [saved, setSaved] = useState(false);

  function save() {
    const updated = setPersonaPath(persona, "business.documentFooterNote", draft.trim() || null);
    persistPersona(updated);
    setPersona(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">תוכן קבוע במסמכים</h2>
        <p className="mt-0.5 text-xs text-muted">
          טקסט חופשי שיופיע בתחתית כל מסמך שתפיק/י — למשל תנאי תשלום או תודה קצרה.
        </p>
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        rows={3}
        maxLength={300}
        className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-brand-deep focus:ring-brand-deep/15"
        placeholder="לדוגמה: התשלום מתקבל תוך 14 יום ממועד קבלת המסמך. תודה על העסקה!"
      />
      {saved && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircleIcon className="size-3.5 shrink-0" />
          נשמר
        </p>
      )}
    </div>
  );
}

function NumberingCard({
  persona,
  setPersona,
}: {
  persona: NonNullable<ReturnType<typeof useRequiredPersona>["persona"]>;
  setPersona: ReturnType<typeof useRequiredPersona>["setPersona"];
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const floor = highestIssuedInvoiceNumber(persona.income.invoices ?? []);
  const nextNow = nextInvoiceNumber(persona);

  function save() {
    setError(null);
    const n = Number(draft);
    if (!draft || isNaN(n) || !Number.isInteger(n) || n < 1) {
      setError("יש להזין מספר שלם חיובי.");
      return;
    }
    if (n <= floor) {
      setError(
        `המספר הבא חייב להיות גדול מהמספר האחרון שכבר הופק (${floor}) — אחרת מסמך חדש יקבל מספר שכבר בשימוש.`,
      );
      return;
    }
    const updated = setPersonaPath(persona, "invoiceCounter", n);
    persistPersona(updated);
    setPersona(updated);
    setDraft("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-line bg-paper p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">מספור מסמכים</h2>
        <p className="mt-0.5 text-xs text-muted">
          המסמך הבא שתפיק/י יקבל את המספר{" "}
          <span dir="ltr" className="font-mono font-semibold text-ink">
            #{nextNow}
          </span>
          . אפשר לקבוע מספר התחלה אחר — למשל כדי להמשיך רצף ממערכת קודמת.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={floor + 1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-brand-deep focus:ring-brand-deep/15"
          dir="ltr"
          placeholder={`למשל ${floor + 1}`}
        />
        <button type="button" onClick={save} className={btn("secondary", "sm")}>
          עדכן
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-alert">
          <InfoIcon className="size-3.5 shrink-0" />
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-1.5 text-xs text-success">
          <CheckCircleIcon className="size-3.5 shrink-0" />
          המספור עודכן
        </p>
      )}
    </div>
  );
}
