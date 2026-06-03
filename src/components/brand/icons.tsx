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

export function SearchIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </LineIcon>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 5v14M5 12h14" />
    </LineIcon>
  );
}

export function Trash2Icon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </LineIcon>
  );
}

export function PencilIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </LineIcon>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </LineIcon>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M20 6L9 17l-5-5" />
    </LineIcon>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9" />
    </LineIcon>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </LineIcon>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </LineIcon>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </LineIcon>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <rect x="3" y="6" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <circle cx="17" cy="14" r="1.3" />
    </LineIcon>
  );
}

export function ReceiptIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M5 3v18l2-1 2 1 2-1 2 1 2-1 2 1V3l-2 1-2-1-2 1-2-1-2 1z" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </LineIcon>
  );
}

export function TrendingUpIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M17 7h4v4" />
    </LineIcon>
  );
}

export function TrendingDownIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M3 7l6 6 4-4 7 7" />
      <path d="M17 17h4v-4" />
    </LineIcon>
  );
}

export function PieChartIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M21 15.5A9 9 0 1 1 8.5 3" />
      <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5V12z" />
    </LineIcon>
  );
}

export function AlertTriangleIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </LineIcon>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </LineIcon>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </LineIcon>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </LineIcon>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M5 4h4l2 5-3 2a14 14 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 3 6a2 2 0 0 1 2-2z" />
    </LineIcon>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </LineIcon>
  );
}

export function CreditCardIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </LineIcon>
  );
}

export function PaperclipIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M21 11l-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8-8" />
    </LineIcon>
  );
}

export function MicIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </LineIcon>
  );
}

export function SendIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </LineIcon>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <LineIcon className={className}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </LineIcon>
  );
}
