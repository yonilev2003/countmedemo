import type { ContactActivity, ActivityType } from "@/types/db";
import { Avatar } from "@/components/ui/avatar";
import { relativeTime } from "@/lib/utils";
import {
  PhoneIcon,
  MailIcon,
  ChatIcon,
  TasksIcon,
  DocsIcon,
  CalendarIcon,
} from "@/components/ui/icon";

type ActivityWithAuthor = ContactActivity & {
  author: { full_name: string | null; avatar_url: string | null; email: string } | null;
};

const typeConfig: Record<ActivityType, { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }> = {
  note: { label: "הערה", icon: ChatIcon, color: "bg-surface-100 text-surface-600" },
  call: { label: "שיחת טלפון", icon: PhoneIcon, color: "bg-emerald-100 text-emerald-700" },
  meeting: { label: "פגישה", icon: CalendarIcon, color: "bg-purple-100 text-purple-700" },
  email: { label: "מייל", icon: MailIcon, color: "bg-amber-100 text-amber-700" },
  task: { label: "משימה", icon: TasksIcon, color: "bg-brand-100 text-brand-700" },
  document: { label: "מסמך", icon: DocsIcon, color: "bg-pink-100 text-pink-700" },
};

export function ActivityTimeline({ activities }: { activities: ActivityWithAuthor[] }) {
  if (activities.length === 0) {
    return (
      <div className="text-sm text-surface-500 text-center py-8">
        אין עדיין פעילות. הוסף הערה, שיחה, או פגישה כדי לתעד.
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {activities.map((a) => {
        const cfg = typeConfig[a.type];
        const Icon = cfg.icon;
        return (
          <li key={a.id} className="flex gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${cfg.color}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-medium text-surface-900">{cfg.label}</span>
                {a.author && (
                  <span className="text-xs text-surface-500">
                    על-ידי {a.author.full_name ?? a.author.email}
                  </span>
                )}
                <span className="text-xs text-surface-400">· {relativeTime(a.occurred_at)}</span>
              </div>
              {a.body && (
                <p className="mt-1 text-sm text-surface-700 whitespace-pre-wrap">{a.body}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
