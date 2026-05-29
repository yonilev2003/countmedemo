"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ListIcon, KanbanIcon, GanttIcon } from "@/components/ui/icon";

export function ProjectViewTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/tasks/${projectId}`, label: "רשימה", icon: ListIcon, exact: true },
    { href: `/tasks/${projectId}/kanban`, label: "קנבן", icon: KanbanIcon },
    { href: `/tasks/${projectId}/gantt`, label: "גאנט", icon: GanttIcon },
  ];

  return (
    <nav className="flex gap-1">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors",
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-surface-600 hover:text-surface-900 hover:border-surface-300",
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
