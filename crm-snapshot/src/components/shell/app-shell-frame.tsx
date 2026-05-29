"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

interface Profile {
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

interface Workspace {
  id: string;
  name: string;
}

/**
 * Client wrapper that manages the mobile sidebar drawer state.
 * Keeps the server-component layout simple while still allowing
 * the topbar hamburger to toggle the drawer.
 */
export function AppShellFrame({
  workspace,
  profile,
  children,
}: {
  workspace: Workspace;
  profile: Profile;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar
        workspace={workspace}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar profile={profile} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
