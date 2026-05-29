import { Badge } from "@/components/ui/badge";
import type { ContactStatus } from "@/types/db";

const labels: Record<ContactStatus, string> = {
  lead: "ליד",
  qualified: "מסונן",
  customer: "לקוח",
  lost: "אבוד",
  archived: "ארכיון",
};

const tones = {
  lead: "warning",
  qualified: "brand",
  customer: "success",
  lost: "danger",
  archived: "neutral",
} as const;

export function StatusBadge({ status }: { status: ContactStatus }) {
  return <Badge tone={tones[status]}>{labels[status]}</Badge>;
}
