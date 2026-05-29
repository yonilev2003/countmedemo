"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loadPersona } from "@/lib/setup-storage";
import { Persona } from "@/lib/persona";
import {
  getUpcomingDeadlines,
  type UpcomingDeadline,
  type Authority,
  type FilerType,
} from "@/lib/deadlines/calendar";
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

const AUTHORITY_STYLE: Record<Authority, string> = {
  "mas-hachnasa": "bg-info/40 text-brand-navy",
  maam: "bg-amber-100 text-amber-800",
  "bituach-leumi": "bg-emerald-100 text-emerald-800",
};

function proximityStyle(days: number): { box: string; chip: string } {
  if (days <= 3) return { box: "border-alert/40", chip: "bg-alert/10 text-alert" };
  if (days <= 7) return { box: "border-amber-300", chip: "bg-amber-100 text-amber-800" };
  if (days <= 21) return { box: "border-brand-navy/20", chip: "bg-info/40 text-brand-navy" };
  return { box: "border-stone-200", chip: "bg-stone-100 text-stone-500" };
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
        <div className="animate-pulse text-stone-400">טוען…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-stone-200">
        <div className="mx-auto flex max-w-screen-lg items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/countme-logo.svg" alt="CountMe" className="h-10 w-10" />
            <span className="text-lg font-bold">CountMe · לוח מועדים</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/alerts" className="rounded-full border border-amber-300 px-3 py-1 text-xs text-amber-800 hover:bg-amber-50">
              🔔 התראות
            </Link>
            <Link href="/dashboard" className="rounded-full border border-brand-navy/20 px-3 py-1 text-xs text-brand-navy hover:bg-info/20">
              דשבורד ←
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-screen-lg px-6 py-8">
        <h1 className="font-display text-2xl font-bold text-brand-navy mb-1">
          לוח מועדי הגשה
        </h1>
        <p className="text-sm text-stone-500 mb-6">
          מועדים קרובים עבור {persona.business.osekType === "patur" ? "עוסק פטור" : "עוסק מורשה"} ·
          ניתן להוסיף הערה / פולו-אפ לכל מועד.
        </p>

        <div className="space-y-3">
          {deadlines.map((d) => (
            <DeadlineCard key={d.id} d={d} />
          ))}
        </div>

        <p className="mt-6 text-[10px] text-stone-400 leading-relaxed">
          המועדים מחושבים מתוך לוח מובנה (`lib/deadlines`) ואינם כוללים הזזת שבת/חג — לאימות סופי
          מול רשות המסים/ביטוח לאומי. הערות הפולו-אפ נשמרות מקומית בדפדפן (גרסה ראשונה, ללא שרת).
        </p>
      </main>
    </div>
  );
}

function DeadlineCard({ d }: { d: UpcomingDeadline }) {
  const [notes, setNotes] = useState<FollowUpNote[]>([]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const prox = proximityStyle(d.daysUntilDue);

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
    <section className={`rounded-2xl border bg-white p-4 ${prox.box}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${AUTHORITY_STYLE[d.authority]}`}>
              {AUTHORITY_LABEL[d.authority]}
            </span>
            <h3 className="font-semibold text-brand-navy">{d.titleHe}</h3>
          </div>
          <div className="mt-1 text-xs text-stone-500">{dueLabel} · {d.dueRule}</div>
          {d.notesHe && <div className="mt-1 text-[11px] text-stone-400">{d.notesHe}</div>}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${prox.chip}`}>
          {d.daysUntilDue === 0 ? "היום" : `בעוד ${d.daysUntilDue} ימים`}
        </span>
      </div>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 text-xs text-brand-navy hover:underline"
      >
        📝 פולו-אפ / הערות{openCount > 0 ? ` (${openCount} פתוחות)` : ""} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div className="mt-2 rounded-xl bg-stone-50 border border-stone-200 p-3">
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
              className="flex-1 rounded-lg border border-stone-300 px-3 py-1.5 text-sm focus:border-brand-navy focus:outline-none"
            />
            <button
              onClick={() => {
                setNotes(addNote(d.id, draft));
                setDraft("");
              }}
              className="rounded-lg bg-brand-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-navy/90"
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
                  <span className={`flex-1 ${n.done ? "line-through text-stone-400" : "text-stone-700"}`}>
                    {n.text}
                  </span>
                  <button
                    onClick={() => setNotes(deleteNote(d.id, n.id))}
                    className="text-stone-300 hover:text-alert text-xs"
                    aria-label="מחק הערה"
                  >
                    ✕
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
