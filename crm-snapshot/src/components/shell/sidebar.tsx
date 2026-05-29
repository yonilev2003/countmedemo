"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ChatIcon,
  ContactsIcon,
  TasksIcon,
  DocsIcon,
  CalendarIcon,
  SettingsIcon,
  HomeIcon,
  XIcon,
} from "@/components/ui/icon";

interface Workspace {
  id: string;
  name: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const items: NavItem[] = [
  { href: "/dashboard", label: "סקירה", icon: HomeIcon },
  { href: "/chat", label: "צ'אט", icon: ChatIcon },
  { href: "/contacts", label: "אנשי קשר", icon: ContactsIcon },
  { href: "/tasks", label: "משימות וגאנט", icon: TasksIcon },
  { href: "/docs", label: "מסמכים", icon: DocsIcon },
  { href: "/calendar", label: "יומן", icon: CalendarIcon },
];

export function Sidebar({
  workspace,
  mobileOpen,
  onMobileClose,
}: {
  workspace: Workspace;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const inner = (
    <>
      <div className="flex h-16 items-center gap-2 border-b border-surface-200 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">
          {workspace.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-surface-900">
            {workspace.name}
          </div>
          <div className="text-xs text-surface-500">CRM</div>
        </div>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden p-1 rounded hover:bg-surface-100"
            aria-label="סגור תפריט"
          >
            <XIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-0.5">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-surface-600 hover:bg-surface-100 hover:text-surface-900",
                  )}
                >
                  <Icon className={active ? "text-brand-600" : "text-surface-400"} />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-surface-200 p-2">
        <Link
          href="/settings"
          onClick={onMobileClose}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-brand-50 text-brand-700"
              : "text-surface-600 hover:bg-surface-100",
          )}
        >
          <SettingsIcon />
          <span>הגדרות</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden md:flex w-60 flex-col border-l border-surface-200 bg-white">
        {inner}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <aside className="absolute end-0 top-0 bottom-0 w-72 max-w-[85%] flex flex-col bg-white shadow-xl">
            {inner}
          </aside>
        </div>
      )}
    </>
  );
}
