import { verifyDocToken } from "@/lib/doc-link";
import { Logo, LogoMark } from "@/components/brand/logo";

export const metadata = {
  title: "מסמך · CountMe",
  robots: { index: false, follow: false },
};

/**
 * /d/[token] — public read-only document view for signed share links.
 * No login, no DB: the (HMAC-verified, expiry-checked) token carries the
 * document payload. Anything invalid renders a friendly expired screen.
 */
export default async function SharedDocPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const payload = verifyDocToken(decodeURIComponent(token));

  if (!payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-7 text-center shadow-brand">
          <div className="mx-auto mb-4 flex justify-center">
            <Logo size={26} />
          </div>
          <h1 className="text-lg font-bold text-brand-navy">הקישור לא זמין</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            תוקף הקישור פג או שהוא אינו תקין. אפשר לבקש מהשולח קישור חדש.
          </p>
        </div>
      </div>
    );
  }

  const { doc, business } = payload;
  const isPatur = business.osekType === "patur";
  const titles: Record<string, string> = {
    "tax-invoice-receipt": "חשבונית מס/קבלה",
    receipt: "קבלה",
    "business-account": "חשבון עסקה",
    quote: "הצעת מחיר",
  };
  const title = titles[doc.docType] ?? "מסמך";
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-line bg-paper shadow-brand" dir="rtl">
        <div className="bg-brand-navy px-6 py-6 text-white">
          <p className="text-sm text-aqua">{business.tradeName}</p>
          <h1 className="mt-1 font-display text-2xl font-extrabold">
            {title} {doc.invoiceNumber}
          </h1>
          <p className="mt-1 text-xs text-aqua">
            הופק {fmt(doc.date)}
            {doc.dueDate ? ` · לתשלום עד ${fmt(doc.dueDate)}` : ""}
            {doc.validUntil ? ` · בתוקף עד ${fmt(doc.validUntil)}` : ""}
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="flex items-center justify-between border-b border-line pb-3 text-sm">
            <span className="text-muted">לכבוד</span>
            <span className="font-bold text-brand-navy">{doc.customerName}</span>
          </div>
          <div className="flex items-center justify-between border-b border-line py-3 text-sm">
            <span className="text-muted">פירוט</span>
            <span className="max-w-[60%] text-end font-medium text-ink">{doc.description}</span>
          </div>
          <div className="flex items-center justify-between border-b border-line py-3 text-sm">
            <span className="text-muted">סכום</span>
            <span className="font-medium tabular-nums text-ink" dir="ltr">
              ₪{doc.amount.toLocaleString("he-IL")}
            </span>
          </div>
          {doc.vat > 0 && (
            <div className="flex items-center justify-between border-b border-line py-3 text-sm">
              <span className="text-muted">מע&quot;מ</span>
              <span className="font-medium tabular-nums text-ink" dir="ltr">
                ₪{doc.vat.toLocaleString("he-IL")}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between py-4">
            <span className="font-bold text-brand-navy">
              {doc.docType === "quote" ? "סה״כ ההצעה" : "סה״כ לתשלום"}
            </span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-brand-navy" dir="ltr">
              ₪{doc.total.toLocaleString("he-IL")}
            </span>
          </div>

          <div className="mt-2 space-y-1 border-t border-line pt-4 text-[11px] leading-relaxed text-faint">
            {/* DRAFT — NEEDS LEGAL REVIEW (per-kind legal lines) */}
            {doc.docType === "business-account" && (
              <p>חשבון עסקה — דרישת תשלום בלבד; אינו מסמך מס.</p>
            )}
            {doc.docType === "quote" && (
              <p>הצעת מחיר — אינה מסמך מס ואינה מחייבת עד לאישור ההזמנה.</p>
            )}
            {(doc.docType === "receipt" || doc.docType === "tax-invoice-receipt") &&
              isPatur && <p>עוסק פטור ממע&quot;מ לפי סעיף 31(1) לחוק מע&quot;מ.</p>}
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t border-line bg-cream px-6 py-3 text-xs text-faint">
          <span>מסמך ממוחשב הופק באמצעות</span>
          <LogoMark size={11} className="text-brand" />
          <span className="font-extrabold text-teal-600">CountMe</span>
        </div>
      </div>
    </div>
  );
}
