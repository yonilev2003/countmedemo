"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function GoogleConnectButton({ connected }: { connected: boolean }) {
  const [pending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  function connect() {
    window.location.href = "/api/calendar/google/auth";
  }

  function sync() {
    setSyncing(true);
    startTransition(async () => {
      try {
        const res = await fetch("/api/calendar/google/sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) {
          toast({ title: "סנכרון נכשל", description: data.error, tone: "danger" });
          return;
        }
        toast({
          title: "סנכרון הושלם",
          description: `הוכנסו ${data.upserted}, נמחקו ${data.deleted}`,
          tone: "success",
        });
        router.refresh();
      } finally {
        setSyncing(false);
      }
    });
  }

  if (!connected) {
    return <Button onClick={connect}>חבר Google Calendar</Button>;
  }

  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={sync} loading={syncing || pending}>
        סנכרן עכשיו (Google → CRM)
      </Button>
      <Button variant="ghost" onClick={connect}>
        חיבור מחדש
      </Button>
    </div>
  );
}
