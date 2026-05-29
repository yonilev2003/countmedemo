"use client";

import { useState, useTransition } from "react";
import type { CalendarEvent, EventAttendee } from "@/types/db";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { upsertEventAction, deleteEventAction } from "@/app/(app)/calendar/actions";
import { cn } from "@/lib/utils";

type Member = { id: string; full_name: string | null; email: string; avatar_url: string | null };
type EventWithAttendees = CalendarEvent & {
  attendees: (EventAttendee & { user: Pick<Member, "full_name" | "email" | "avatar_url"> | null })[];
};

const COLORS = ["#1a84e8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function toLocalInput(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export function EventDialog({
  open,
  onOpenChange,
  members,
  currentUserId,
  event,
  initial,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  currentUserId: string;
  event?: EventWithAttendees;
  initial?: { start: Date; end: Date };
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [delPending, startDelete] = useTransition();

  const initialAttendeeIds = new Set(
    event?.attendees?.filter((a) => a.user_id).map((a) => a.user_id as string) ?? [currentUserId],
  );
  const initialExternalEmails = (event?.attendees ?? [])
    .filter((a) => !a.user_id && a.external_email)
    .map((a) => a.external_email as string)
    .join(", ");

  const [form, setForm] = useState({
    title: event?.title ?? "",
    description: event?.description ?? "",
    location: event?.location ?? "",
    start: event ? toLocalInput(event.start_at) : initial ? toLocalInput(initial.start) : toLocalInput(new Date()),
    end: event ? toLocalInput(event.end_at) : initial ? toLocalInput(initial.end) : toLocalInput(new Date(Date.now() + 3600_000)),
    allDay: event?.all_day ?? false,
    color: event?.color ?? COLORS[0],
    attendeeIds: initialAttendeeIds,
    externalEmails: initialExternalEmails,
  });

  function toggle(id: string) {
    setForm((prev) => {
      const next = new Set(prev.attendeeIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...prev, attendeeIds: next };
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const externalEmails = form.externalEmails
        .split(/[, \n;]+/)
        .map((s) => s.trim())
        .filter((s) => s && s.includes("@"));

      const r = await upsertEventAction({
        id: event?.id,
        title: form.title.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        start_at: new Date(form.start).toISOString(),
        end_at: new Date(form.end).toISOString(),
        all_day: form.allDay,
        color: form.color,
        attendeeIds: Array.from(form.attendeeIds),
        externalEmails,
      });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      const syncedNote = r.googleSynced
        ? "סונכרן ל-Google Calendar"
        : "לא סונכרן ל-Google (לא מחובר)";
      toast({ title: event ? "עודכן" : "נוצר", description: syncedNote, tone: "success" });
      onDone();
    });
  }

  function remove() {
    if (!event) return;
    startDelete(async () => {
      const r = await deleteEventAction({ id: event.id });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      toast({ title: "האירוע נמחק", tone: "success" });
      onDone();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={event ? "ערוך אירוע" : "אירוע חדש"}
      className="max-w-2xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="כותרת">
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="התחלה">
            <Input
              type="datetime-local"
              value={form.start}
              onChange={(e) => setForm({ ...form, start: e.target.value })}
              required
            />
          </Field>
          <Field label="סיום">
            <Input
              type="datetime-local"
              value={form.end}
              onChange={(e) => setForm({ ...form, end: e.target.value })}
              required
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.allDay}
            onChange={(e) => setForm({ ...form, allDay: e.target.checked })}
          />
          כל היום
        </label>

        <Field label="מיקום">
          <Input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="מיקום פיזי או קישור Zoom"
          />
        </Field>

        <Field label="תיאור">
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </Field>

        <Field label="צבע">
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={cn(
                  "h-8 w-8 rounded-lg border-2 transition-all",
                  form.color === c ? "border-surface-900 scale-110" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
                aria-label={c}
              />
            ))}
          </div>
        </Field>

        <div>
          <Label>משתתפים מהצוות</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {members.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => toggle(m.id)}
                className={cn(
                  "px-2.5 py-1 text-xs rounded-full border",
                  form.attendeeIds.has(m.id)
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white text-surface-700 border-surface-300 hover:border-brand-400",
                )}
              >
                {m.full_name ?? m.email}
              </button>
            ))}
          </div>
        </div>

        <Field label="משתתפים חיצוניים (אימיילים מופרדים בפסיקים)">
          <Input
            dir="ltr"
            value={form.externalEmails}
            onChange={(e) => setForm({ ...form, externalEmails: e.target.value })}
            placeholder="client@example.com, partner@other.com"
          />
        </Field>

        <DialogFooter>
          {event && (
            <Button type="button" variant="ghost" onClick={remove} loading={delPending} className="text-danger me-auto">
              מחק
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" loading={pending}>
            {event ? "שמור" : "צור"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
