import Link from "next/link";

const tabs = [
  { href: "/settings", label: "כללי" },
  { href: "/settings/members", label: "חברים והזמנות" },
  { href: "/settings/integrations", label: "חיבורים" },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <h1 className="text-2xl font-bold font-display text-surface-900 mb-6">הגדרות</h1>
      <div className="border-b border-surface-200 mb-6">
        <nav className="flex gap-1">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="px-4 py-2 text-sm font-medium text-surface-600 hover:text-surface-900 border-b-2 border-transparent hover:border-surface-300"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
