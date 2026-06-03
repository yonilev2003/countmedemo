import { cn } from "@/lib/utils";

/**
 * Brand line-icons — Feather/Lucide-equivalent paths matching the Brand Kit
 * spec: 24px grid, 1.75px stroke, round caps/joins, no fill, currentColor.
 * The kit bans emoji, so these replace any emoji used as iconography.
 */
function LineIcon({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export function BellIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </LineIcon>
  );
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </LineIcon>
  );
}

export function SparklesIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 3l1.7 4.6L18 9l-4.3 1.4L12 15l-1.7-4.6L6 9l4.3-1.4L12 3z" />
      <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14z" />
    </LineIcon>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </LineIcon>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </LineIcon>
  );
}

export function ClipboardCheckIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 13l2 2 4-4" />
    </LineIcon>
  );
}

export function BarChartIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M3 3v18h18" />
      <path d="M8 17v-5M13 17v-9M18 17v-12" />
    </LineIcon>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M6 9l6 6 6-6" />
    </LineIcon>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M18 6L6 18M6 6l12 12" />
    </LineIcon>
  );
}

export function FileTextIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
    </LineIcon>
  );
}

export function PercentIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M19 5L5 19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </LineIcon>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </LineIcon>
  );
}
