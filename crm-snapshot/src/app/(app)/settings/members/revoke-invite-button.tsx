"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@/components/ui/icon";
import { revokeInvitationAction } from "./actions";
import { useToast } from "@/components/ui/toast";

export function RevokeInviteButton({ invitationId }: { invitationId: string }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function revoke() {
    startTransition(async () => {
      const r = await revokeInvitationAction({ invitationId });
      if (!r.ok) {
        toast({ title: "שגיאה", description: r.error, tone: "danger" });
        return;
      }
      toast({ title: "ההזמנה בוטלה", tone: "success" });
    });
  }

  return (
    <Button size="icon" variant="ghost" onClick={revoke} loading={pending} aria-label="בטל הזמנה">
      <TrashIcon className="text-danger" />
    </Button>
  );
}
