"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";
import { btn } from "@/components/brand/button";
import { StatusBadge, statusStripe, type Status } from "@/components/brand/status";
import {
  BellIcon,
  CalendarIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  ClockIcon,
  FileTextIcon,
  InfoIcon,
  PercentIcon,
  ShieldIcon,
  XIcon,
} from "@/components/brand/icons";
import { loadPersona } from "@/lib/setup-storage";
import { Persona } from "@/lib/persona";
import {
  getUpcomingDeadlines,
  type UpcomingDeadline,
  type Authority,
  type FilerType,
} from "@/lib/deadlines/calendar";
import { googleCalendarUrl, icsDataUrl } from "@/lib/deadlines/calendar-links";
import {
  getNotes,
  addNote,
  toggleNoteDone,
  deleteNote,
  type FollowUpNote,
} from "@/lib/crm/notes";

const AUTHORITY_LABEL: Record<Authority, string> = {
  "mas-hachnasa": "מס הכנסה",
  maam: 'מע"מ',
  "bituach-leumi": "ביטוח לאומי",
};

/**
 * Per-authority brand chip — uses the kit's `.ttl-*` brand-tone palette
 * (teal / beige / navy) so the authority reads as its own brand chip,
 * distinct from the row's traffic-light status (icon cell + pill). Keeps
 * the chip from echoing — and clashing with — the status colors.
 */
const AUTHORITY_STYLE: Record<Authority, string> = {
  "mas-hachnasa": "bg-aqua-soft text-brand-navy", // .ttl-navy
  maam: "bg-beige-100 text-beige-600", // .ttl-beige
  "bituach-leumi": "bg-teal-100 text-brand-deep", // .ttl-teal
};

/**
 * Soft tint for the ~42px status-icon cell — pairs a status-toned background
 * with a matching readable stroke, mirroring the kit's `.ttl-*` icon cells
 * (CountMe Shortcuts.html). Keyed to the row's traffic-light status so the
 * cell reads as a single colored unit with the edge stripe + pill.
 */
const ICON_CELL_TINT: Record<Status, string> = {
  "on-track": "bg-success-light text-success",
  due: "bg-due-bg text-[#7d6422]",
  overdue: "bg-overdue-bg text-alert",
  plan: "bg-teal-100 text-teal-600",
};

function AuthorityIcon({ authority, className }: { authority: Authority; className?: string }) {
  if (authority === "maam") return <PercentIcon className={className} />;
  if (authority === "bituach-leumi") return <ShieldIcon className={className} />;
  return <FileTextIcon className={className} />;
}

/** Map days-until-due to the kit's traffic-light status. */
function deadlineStatus(days: number): Status {
  if (days <= 3) return "overdue";
  if (days <= 10) return "due";
  return "plan";
}

export default function DeadlinesPage() {
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null>(null);
  const [deadlines, setDeadlines] = useState<UpcomingDeadline[]>([]);

  useEffect(() => {
    const p = loadPersona();
    if (!p) {
      router.push("/setup");
      return;
    }
    setPersona(p);
    const filer: FilerType = p.business.osekType === "patur" ? "osek-patur" : "osek-murshe";
    setDeadlines(getUpcomingDeadlines(new Date(), filer, 12));
  }, [router]);

  if (!persona) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-pulse text-faint">טוען…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-line">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-base font-semibold text-muted">· לוח מועדים</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/alerts" className={btn("secondary", "sm")}>
              <BellIcon className="size-4" /> התראות
            </Link>
            <Link href="/dashboard" className={btn("secondary", "sm")}>
              דשבורד ←
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg px-6 py-8">
        <div className="mb-7">
          <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-600">
            <span className="size-[7px] rounded-full bg-brand" />
            CountMe · מועדים
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-brand-navy">
            לוח מועדי הגשה
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted">
            מועדים קרובים עבור {persona.business.osekType === "patur" ? "עוסק פטור" : "עוסק מורשה"} ·
            ניתן להוסיף הערה / פולו-אפ לכל מועד.
          </p>
        </div>

        <div className="space-y-3">
          {deadlines.map((d) => (
            <DeadlineCard key={d.id} d={d} />
          ))}
        </div>

        <p className="mt-7 flex items-start gap-2 text-[11px] leading-relaxed text-faint">
          <InfoIcon className="mt-px size-3.5 shrink-0" />
          <span>
            המועדים מחושבים מתוך לוח מובנה (`lib/deadlines`) ואינם כוללים הזזת שבת/חג — לאימות סופי
            מול רשות המסים/ביטוח לאומי. הערות הפולו-אפ נשמרות מקומית בדפדפן (גרסה ראשונה, ללא שרת).
          </span>
        </p>
      </main>
    </div>
  );
}

function DeadlineCard({ d }: { d: UpcomingDeadline }) {
  const [notes, setNotes] = useState<FollowUpNote[]>([]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const status = deadlineStatus(d.daysUntilDue);

  useEffect(() => {
    setNotes(getNotes(d.id));
  }, [d.id]);

  const dueLabel = d.nextDueDate.toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const openCount = notes.filter((n) => !n.done).length;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-line bg-paper p-4 ps-5 shadow-brand transition-shadow hover:border-brand-deep">
      {/* status edge stripe on the inline-end (RTL-aware) */}
      <span className={cn("absolute inset-y-0 end-0 w-1.5", statusStripe(status))} />

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3.5 min-w-0">
          {/* ~46px status-icon cell, tinted to the row's traffic-light tone (kit .li) */}
          <span
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-xl",
              ICON_CELL_TINT[status],
            )}
          >
            <AuthorityIcon authority={d.authority} className="size-[23px]" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[15.5px] font-bold leading-tight text-brand-navy">
                {d.titleHe}
              </h3>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-bold",
                  AUTHORITY_STYLE[d.authority],
                )}
              >
                {AUTHORITY_LABEL[d.authority]}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-muted">
              <CalendarIcon className="size-3.5 shrink-0 text-faint" />
              <span className="tabular-nums">{dueLabel}</span>
            </div>
            <div className="mt-0.5 flex items-start gap-1.5 text-[12px] leading-relaxed text-faint">
              <ClockIcon className="mt-px size-3.5 shrink-0" />
              <span>{d.dueRule}</span>
            </div>
            {d.notesHe && <div className="mt-1.5 text-[11px] leading-relaxed text-faint">{d.notesHe}</div>}
          </div>
        </div>
        <StatusBadge status={status} className="shrink-0">
          {d.daysUntilDue === 0 ? "היום" : `בעוד ${d.daysUntilDue} ימים`}
        </StatusBadge>
      </div>

      <div className="mt-3 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-deep transition-colors hover:text-teal-600"
        >
          <ClipboardCheckIcon className="size-4" />
          פולו-אפ / הערות{openCount > 0 ? ` (${openCount} פתוחות)` : ""}
          <ChevronDownIcon className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        <a
          href={googleCalendarUrl({
            title: `countme — ${d.titleHe}`,
            date: d.nextDueDate,
            details: `${d.dueRule}${d.notesHe ? ` · ${d.notesHe}` : ""}`,
          })}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-deep transition-colors hover:text-teal-600"
        >
          <CalendarIcon className="size-4" />
          הוסף ליומן Google
        </a>
        <a
          href={icsDataUrl({
            title: `countme — ${d.titleHe}`,
            date: d.nextDueDate,
            details: `${d.dueRule}${d.notesHe ? ` · ${d.notesHe}` : ""}`,
          })}
          download={`countme-${d.id}.ics`}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-faint transition-colors hover:text-brand-deep"
        >
          הורדת .ics
        </a>
      </div>

      {open && (
        <div className="mt-2 rounded-xl bg-cream border border-line p-3">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setNotes(addNote(d.id, draft));
                  setDraft("");
                }
              }}
              placeholder="הוסף הערה / משימת המשך…"
              className="flex-1 rounded-lg border border-line px-3 py-1.5 text-sm focus:border-brand-deep focus:outline-none"
            />
            <button
              onClick={() => {
                setNotes(addNote(d.id, draft));
                setDraft("");
              }}
              className={btn("primary", "sm")}
            >
              הוסף
            </button>
          </div>

          {notes.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {notes.map((n) => (
                <li key={n.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={n.done}
                    onChange={() => setNotes(toggleNoteDone(d.id, n.id))}
                    className="accent-brand-navy"
                  />
                  <span className={cn("flex-1", n.done ? "line-through text-faint" : "text-ink")}>
                    {n.text}
                  </span>
                  <button
                    onClick={() => setNotes(deleteNote(d.id, n.id))}
                    className="text-faint hover:text-alert"
                    aria-label="מחק הערה"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
