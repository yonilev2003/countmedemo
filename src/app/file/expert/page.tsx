import { redirect } from "next/navigation";

/**
 * Legacy route — the "expert view" has been merged into /demo.
 * /demo is the gov.il-faithful preview, now with inline copy buttons + chat panel.
 */
export default function ExpertPage() {
  redirect("/demo");
}
