import * as React from "react";
import { cn, initials, avatarColor } from "@/lib/utils";

interface Props {
  name: string;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClass = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function Avatar({ name, src, size = "md", className }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover", sizeClass[size], className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full text-white font-semibold",
        avatarColor(name || "?"),
        sizeClass[size],
        className,
      )}
      aria-label={name}
    >
      {initials(name || "?")}
    </div>
  );
}

export function AvatarStack({
  people,
  max = 3,
  size = "sm",
}: {
  people: { name: string; avatar_url?: string | null }[];
  max?: number;
  size?: "xs" | "sm" | "md";
}) {
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  return (
    <div className="flex -space-x-2 rtl:space-x-reverse">
      {visible.map((p, i) => (
        <Avatar
          key={i}
          name={p.name}
          src={p.avatar_url ?? undefined}
          size={size}
          className="ring-2 ring-white"
        />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-surface-200 text-surface-700 font-semibold ring-2 ring-white",
            size === "xs" ? "h-6 w-6 text-[10px]" : size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm",
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
