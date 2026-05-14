import * as React from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border bg-white px-3 text-sm",
        "placeholder:text-surface-400",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-60",
        invalid ? "border-danger" : "border-surface-300",
        className,
      )}
      {...rest}
    />
  );
});

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-20 w-full rounded-lg border bg-white px-3 py-2 text-sm",
          "placeholder:text-surface-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
          "disabled:cursor-not-allowed disabled:opacity-60",
          invalid ? "border-danger" : "border-surface-300",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function Label({
  className,
  ...rest
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-surface-700", className)}
      {...rest}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
      {!error && hint && <p className="text-xs text-surface-500">{hint}</p>}
    </div>
  );
}
