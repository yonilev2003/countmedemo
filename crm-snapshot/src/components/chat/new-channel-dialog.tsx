"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { createChannelAction } from "@/app/(app)/chat/actions";
import { useToast } from "@/components/ui/toast";

export function NewChannelDialog({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createChannelAction({ workspaceId, name, topic });
      if (!result.ok) {
        toast({ title: "לא הצלחנו ליצור ערוץ", description: result.error, tone: "danger" });
        return;
      }
      onOpenChange(false);
      setName("");
      setTopic("");
      router.push(`/chat/${result.channelId}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="ערוץ חדש">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="שם הערוץ" hint="באנגלית, באותיות קטנות, ללא רווחים. לדוגמה: sales">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="general"
            required
            pattern="^[a-z0-9א-ת][-a-z0-9א-ת]{1,30}$"
            autoFocus
          />
        </Field>
        <Field label="נושא (אופציונלי)">
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="על מה הערוץ הזה?"
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button type="submit" loading={pending}>
            צור ערוץ
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
