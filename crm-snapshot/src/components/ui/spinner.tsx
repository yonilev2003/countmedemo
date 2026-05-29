import { cn } from "@/lib/utils";

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-brand-500 border-t-transparent",
        className,
      )}
      style={{ width: size, height: size }}
      aria-label="טוען"
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size={32} />
    </div>
  );
}
