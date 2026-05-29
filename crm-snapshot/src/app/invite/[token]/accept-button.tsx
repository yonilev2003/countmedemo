"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "./actions";

export function AcceptButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInviteAction({ token });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div>
      <Button onClick={accept} loading={pending} size="lg" className="min-w-44">
        הצטרף למרחב
      </Button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  );
}
