"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone?: "info" | "success" | "warning" | "danger";
};

type Ctx = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = React.createContext<Ctx | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback((t: Omit<Toast, "id">) => {
    const id = ++idRef.current;
    setToasts((s) => [...s, { ...t, id }]);
    setTimeout(() => {
      setToasts((s) => s.filter((x) => x.id !== id));
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 start-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto min-w-72 max-w-sm rounded-lg border bg-white p-3 shadow-lg",
              t.tone === "success" && "border-emerald-300 bg-emerald-50",
              t.tone === "warning" && "border-amber-300 bg-amber-50",
              t.tone === "danger" && "border-red-300 bg-red-50",
            )}
          >
            <div className="text-sm font-semibold text-surface-900">{t.title}</div>
            {t.description && (
              <div className="mt-0.5 text-xs text-surface-600">{t.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
