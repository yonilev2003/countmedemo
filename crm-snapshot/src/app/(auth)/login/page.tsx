import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginButton } from "./login-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold font-display text-brand-700">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
              c
            </span>
            countme CRM
          </Link>
          <p className="mt-3 text-surface-600 text-sm">
            המערכת הפנימית של הצוות. צ'אט, אנשי קשר, משימות, מסמכים ויומן — במקום אחד.
          </p>
        </div>

        <div className="rounded-2xl border border-surface-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-surface-900 mb-1">כניסה למערכת</h1>
          <p className="text-sm text-surface-600 mb-6">
            התחבר עם חשבון Google כדי להתחיל.
          </p>

          {params.error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {decodeURIComponent(params.error)}
            </div>
          )}

          <LoginButton next={params.next} />

          <p className="mt-4 text-xs text-surface-500 text-center">
            רק חברי הצוות יכולים להיכנס. אם הוזמנת ולא ניתן להיכנס — בקש ממי שהזמין אותך לבדוק את ההזמנה.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-surface-500">
          countme · בנוי בעברית, ל-RTL, מותאם לעצמאים בישראל
        </p>
      </div>
    </div>
  );
}
