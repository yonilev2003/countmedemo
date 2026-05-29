import { requireSession } from "@/lib/auth";
import { isDemoMode } from "@/lib/demo/mode";
import { AppShellFrame } from "@/components/shell/app-shell-frame";
import { DemoBanner } from "@/components/shell/demo-banner";
import { ToastProvider } from "@/components/ui/toast";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const demo = isDemoMode();

  return (
    <WorkspaceProvider value={session}>
      <ToastProvider>
        <div className="flex h-screen overflow-hidden bg-surface-50 flex-col">
          {demo && <DemoBanner />}
          <AppShellFrame workspace={session.workspace} profile={session.profile}>
            {children}
          </AppShellFrame>
        </div>
      </ToastProvider>
    </WorkspaceProvider>
  );
}
