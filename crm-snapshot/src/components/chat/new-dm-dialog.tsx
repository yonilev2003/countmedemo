"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { createOrFindDmAction } from "@/app/(app)/chat/actions";
import { useToast } from "@/components/ui/toast";

interface Person {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export function NewDmDialog({
  open,
  onOpenChange,
  workspaceId,
  currentUserId,
  people,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  currentUserId: string;
  people: Person[];
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function start(otherUserId: string) {
    startTransition(async () => {
      const result = await createOrFindDmAction({ workspaceId, otherUserId });
      if (!result.ok) {
        toast({ title: "לא הצלחנו ליצור שיחה", description: result.error, tone: "danger" });
        return;
      }
      onOpenChange(false);
      router.push(`/chat/${result.channelId}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="הודעה ישירה">
      <div className="flex flex-col gap-1">
        {people.length === 0 && (
          <p className="text-sm text-surface-500 text-center py-4">
            אין עוד חברים במרחב הזה
          </p>
        )}
        {people.map((p) => (
          <button
            key={p.user_id}
            type="button"
            onClick={() => start(p.user_id)}
            disabled={pending}
            className="flex items-center gap-3 rounded-lg p-2 text-start hover:bg-surface-50 disabled:opacity-50"
          >
            <Avatar name={p.full_name ?? p.email} src={p.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-surface-900 truncate">
                {p.full_name ?? p.email}
              </div>
              <div className="text-xs text-surface-500 truncate">{p.email}</div>
            </div>
          </button>
        ))}
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={() => onOpenChange(false)}>
          סגור
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
