"use client";

import * as React from "react";
import type { SessionContext } from "@/lib/auth";

const Ctx = React.createContext<SessionContext | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: SessionContext;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkspace(): SessionContext {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error("useWorkspace must be inside <WorkspaceProvider>");
  }
  return ctx;
}
