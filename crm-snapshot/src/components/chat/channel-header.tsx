import { HashIcon, UserIcon } from "@/components/ui/icon";

export function ChannelHeader({
  title,
  topic,
  type,
}: {
  title: string;
  topic: string | null;
  type: "channel" | "dm";
}) {
  return (
    <header className="flex items-center gap-3 border-b border-surface-200 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-100 text-surface-500">
        {type === "channel" ? <HashIcon /> : <UserIcon />}
      </div>
      <div className="min-w-0">
        <div className="text-base font-semibold text-surface-900 truncate">{title}</div>
        {topic && <div className="text-xs text-surface-500 truncate">{topic}</div>}
      </div>
    </header>
  );
}
