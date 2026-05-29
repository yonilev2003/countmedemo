"use client";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogoutIcon, SearchIcon } from "@/components/ui/icon";
import { useState } from "react";

interface Profile {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={20}
      height={20}
      {...props}
    >
      <line x1={3} y1={6} x2={21} y2={6} />
      <line x1={3} y1={12} x2={21} y2={12} />
      <line x1={3} y1={18} x2={21} y2={18} />
    </svg>
  );
}

export function TopBar({
  profile,
  onMenuClick,
}: {
  profile: Profile;
  onMenuClick?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-surface-200 bg-white/80 px-4 sm:px-6 backdrop-blur">
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-surface-100"
          aria-label="פתח תפריט"
        >
          <MenuIcon />
        </button>
      )}

      <div className="flex-1 max-w-xl">
        <div className="relative">
          <SearchIcon className="absolute end-3 top-1/2 -translate-y-1/2 text-surface-400 hidden sm:block" />
          <input
            type="search"
            placeholder="חיפוש..."
            className="h-10 w-full rounded-lg border border-surface-200 bg-surface-50 pe-3 sm:pe-10 ps-3 text-sm placeholder:text-surface-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          />
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((s) => !s)}
          className="flex items-center gap-2 rounded-full p-1 hover:bg-surface-100"
        >
          <Avatar
            name={profile.full_name ?? profile.email}
            src={profile.avatar_url}
            size="sm"
          />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute end-0 mt-2 w-64 rounded-xl border border-surface-200 bg-white shadow-lg z-50">
              <div className="p-3 border-b border-surface-100">
                <div className="flex items-center gap-3">
                  <Avatar
                    name={profile.full_name ?? profile.email}
                    src={profile.avatar_url}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-surface-900">
                      {profile.full_name ?? profile.email}
                    </div>
                    <div className="truncate text-xs text-surface-500">
                      {profile.email}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <form action="/api/auth/signout" method="post">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                  >
                    <LogoutIcon className="text-surface-500" />
                    התנתקות
                  </Button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
