import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "./icon";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className, invalid, children, ...rest }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none rounded-lg border bg-white px-3 pe-9 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1",
            "disabled:cursor-not-allowed disabled:opacity-60",
            invalid ? "border-danger" : "border-surface-300",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-surface-400" />
      </div>
    );
  },
);
