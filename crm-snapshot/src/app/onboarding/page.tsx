import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUserWithProfile } from "@/lib/auth";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const { user, profile } = await requireUserWithProfile();
  const supabase = await createClient();

  // Already a member? Skip onboarding.
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);

  if (memberships && memberships.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 p-6">
      <div className="mx-auto max-w-xl pt-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold font-display text-surface-900">
            ברוך הבא{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
          </h1>
          <p className="mt-2 text-surface-600">
            אין לך עדיין מרחב עבודה. תיצור אחד חדש או חכה שיזמינו אותך.
          </p>
        </div>
        <div className="rounded-2xl border border-surface-200 bg-white p-8 shadow-lg">
          <OnboardingForm defaultName="countme" />
        </div>
      </div>
    </div>
  );
}
