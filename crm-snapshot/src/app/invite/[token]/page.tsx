import { redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { AcceptButton } from "./accept-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invitations")
    .select("id, workspace_id, email, role, expires_at, accepted_at, workspace:workspaces(name)")
    .eq("token", token)
    .single();

  if (!invite) {
    return (
      <Center>
        <h1 className="text-2xl font-bold text-surface-900">הזמנה לא נמצאה</h1>
        <p className="mt-2 text-surface-600">
          הקישור לא תקף. בקש ממי שהזמין אותך לשלוח לך אחד חדש.
        </p>
      </Center>
    );
  }

  if (invite.accepted_at) {
    return (
      <Center>
        <h1 className="text-2xl font-bold text-surface-900">ההזמנה כבר אושרה</h1>
        <p className="mt-2 text-surface-600">היכנס כרגיל למערכת.</p>
        <Link href="/login" className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-white text-sm">
          כניסה
        </Link>
      </Center>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <Center>
        <h1 className="text-2xl font-bold text-surface-900">ההזמנה פגה</h1>
        <p className="mt-2 text-surface-600">
          ההזמנה הזו הייתה תקפה ל-14 ימים. בקש הזמנה חדשה.
        </p>
      </Center>
    );
  }

  const ws = invite.workspace as unknown as { name: string };
  const user = await getUser();

  // Not logged in? Send to login with a return URL.
  if (!user) {
    const next = encodeURIComponent(`/invite/${token}`);
    redirect(`/login?next=${next}`);
  }

  // Wrong email mismatch warning
  const emailMatch = user.email.toLowerCase() === invite.email.toLowerCase();

  return (
    <Center>
      <div className="text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold text-surface-900">
          הוזמנת ל-{ws.name}
        </h1>
        <p className="mt-2 text-surface-600">
          תקבל הרשאות {invite.role === "admin" ? "מנהל" : "חבר צוות"}.
        </p>
        {!emailMatch && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            ההזמנה נשלחה ל-<strong>{invite.email}</strong> אבל אתה מחובר כ-<strong>{user.email}</strong>.
            תצטרך להתחבר עם החשבון הנכון או לבקש הזמנה חדשה.
          </div>
        )}
        {emailMatch && (
          <div className="mt-6">
            <AcceptButton token={token} />
          </div>
        )}
      </div>
    </Center>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-surface-200 bg-white p-8 shadow-lg text-center">
        {children}
      </div>
    </div>
  );
}
