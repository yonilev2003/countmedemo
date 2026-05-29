"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActivityType } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { addActivityAction } from "@/app/(app)/contacts/actions";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const TYPES: { value: ActivityType; label: string; placeholder: string }[] = [
  { value: "note", label: "הערה", placeholder: "מה רצית להוסיף?" },
  { value: "call", label: "שיחה", placeholder: "על מה דיברתם?" },
  { value: "meeting", label: "פגישה", placeholder: "סיכום הפגישה" },
  { value: "email", label: "מייל", placeholder: "תוכן המייל / סיכום" },
];

export function QuickAddActivity({ contactId }: { contactId: string }) {
  const [type, setType] = useState<ActivityType>("note");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function add() {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await addActivityAction({ contactId, type, body: body.trim() });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  const cfg = TYPES.find((t) => t.value === type)!;

  return (
    <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
      <div className="flex gap-1 mb-2">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setType(t.value)}
            className={cn(
              "px-2.5 py-1 text-xs rounded-md font-medium",
              type === t.value
                ? "bg-brand-600 text-white"
                : "bg-white text-surface-700 hover:bg-surface-100",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={cfg.placeholder}
        rows={2}
        className="bg-white"
      />
      <div className="mt-2 flex justify-end">
        <Button size="sm" onClick={add} loading={pending} disabled={!body.trim()}>
          הוסף
        </Button>
      </div>
    </div>
  );
}
