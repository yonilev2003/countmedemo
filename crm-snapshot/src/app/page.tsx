import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export default async function Root() {
  const user = await getUser();
  if (!user) redirect("/login");
  // Logged-in users go to the dashboard. The (app) layout will handle
  // bouncing to /onboarding if they don't yet have a workspace.
  redirect("/dashboard");
}
