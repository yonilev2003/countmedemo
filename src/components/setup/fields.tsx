import { cn } from "@/lib/utils";

export function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-ink mb-1"
    >
      {children}
      {required && <span className="text-alert ms-1">*</span>}
    </label>
  );
}

export function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-alert">{msg}</p>;
}

export function inputCls(hasError: boolean) {
  return cn(
    "w-full rounded-xl border px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 transition-colors",
    hasError
      ? "border-alert focus:border-alert focus:ring-alert/20"
      : "border-line focus:border-brand-deep focus:ring-brand-deep/15",
  );
}
