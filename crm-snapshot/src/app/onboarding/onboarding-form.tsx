"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { createWorkspaceAction } from "./actions";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createWorkspaceAction({ name });
      if (!result.ok) setError(result.error);
      // On success, the action redirects to /dashboard.
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        label="שם מרחב העבודה"
        hint="זה השם שיופיע למעלה בסרגל הצד. אפשר לשנות אחר כך."
      >
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="למשל: countme"
          autoFocus
          required
          minLength={2}
          maxLength={60}
        />
      </Field>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Button type="submit" loading={pending} size="lg" className="w-full">
        צור מרחב עבודה והתחל
      </Button>
    </form>
  );
}
