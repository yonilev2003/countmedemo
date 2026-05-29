"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Contact, ContactStatus } from "@/types/db";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { upsertContactAction } from "@/app/(app)/contacts/actions";

const STATUSES: { value: ContactStatus; label: string }[] = [
  { value: "lead", label: "ליד" },
  { value: "qualified", label: "מסונן" },
  { value: "customer", label: "לקוח" },
  { value: "lost", label: "אבוד" },
  { value: "archived", label: "ארכיון" },
];

export function ContactFormDialog({
  open,
  onOpenChange,
  workspaceId,
  contact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  contact?: Contact;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: contact?.name ?? "",
    company: contact?.company ?? "",
    role: contact?.role ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    status: contact?.status ?? ("lead" as ContactStatus),
    tagsText: (contact?.tags ?? []).join(", "),
    notes: contact?.notes ?? "",
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = form.tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    startTransition(async () => {
      const result = await upsertContactAction({
        id: contact?.id,
        workspaceId,
        name: form.name.trim(),
        company: form.company.trim() || null,
        role: form.role.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        status: form.status,
        tags,
        notes: form.notes.trim() || null,
      });
      if (!result.ok) {
        toast({ title: "שגיאה", description: result.error, tone: "danger" });
        return;
      }
      toast({ title: contact ? "עודכן" : "נוצר", tone: "success" });
      onOpenChange(false);
      if (!contact) router.push(`/contacts/${result.contactId}`);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={contact ? "ערוך איש קשר" : "איש קשר חדש"}
      className="max-w-xl"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="שם מלא">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </Field>
          <Field label="חברה">
            <Input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </Field>
          <Field label="תפקיד">
            <Input
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              placeholder="למשל: CFO"
            />
          </Field>
          <Field label="סטטוס">
            <Select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ContactStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="אימייל">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              dir="ltr"
            />
          </Field>
          <Field label="טלפון">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              dir="ltr"
            />
          </Field>
        </div>

        <Field label="תגיות" hint="הפרד בפסיקים. למשל: לקוח־vip, נדל״ן">
          <Input
            value={form.tagsText}
            onChange={(e) => setForm({ ...form, tagsText: e.target.value })}
            placeholder="לקוח, ראיון, דחוף"
          />
        </Field>

        <Field label="הערות">
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={4}
          />
        </Field>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" loading={pending}>
            {contact ? "שמור" : "צור"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
