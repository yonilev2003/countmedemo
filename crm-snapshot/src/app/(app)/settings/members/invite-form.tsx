"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { inviteMemberAction } from "./actions";

export function InviteForm({ workspaceId }: { workspaceId: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteMemberAction({ workspaceId, email, role });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast({
        title: "ההזמנה נשלחה",
        description: `מייל בדרך אל ${email}`,
        tone: "success",
      });
      setEmail("");
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
      <div className="flex-1 w-full">
        <Field label="אימייל">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />
        </Field>
      </div>
      <div className="w-full sm:w-44">
        <Field label="תפקיד">
          <Select value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")}>
            <option value="member">חבר צוות</option>
            <option value="admin">מנהל</option>
          </Select>
        </Field>
      </div>
      <Button type="submit" loading={pending} className="w-full sm:w-auto">
        שלח הזמנה
      </Button>
      {error && (
        <div className="w-full text-sm text-danger sm:order-last">{error}</div>
      )}
    </form>
  );
}
