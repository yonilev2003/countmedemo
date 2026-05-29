"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HashIcon, PlusIcon } from "@/components/ui/icon";
import { NewChannelDialog } from "./new-channel-dialog";
import { NewDmDialog } from "./new-dm-dialog";

interface DmPartner {
  full_name: string | null;
  avatar_url: string | null;
  email: string;
}

interface Channel {
  id: string;
  name: string | null;
  type: "channel" | "dm";
  topic: string | null;
  is_private: boolean;
  dmPartner: DmPartner | null;
}

interface Person {
  user_id: string;
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
}

export function ChannelList({
  workspaceId,
  currentUserId,
  channels,
  people,
}: {
  workspaceId: string;
  currentUserId: string;
  channels: Channel[];
  people: Person[];
}) {
  const pathname = usePathname();
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newDmOpen, setNewDmOpen] = useState(false);

  const channelsList = channels.filter((c) => c.type === "channel");
  const dms = channels.filter((c) => c.type === "dm");

  return (
    <div className="w-72 flex flex-col bg-surface-50 border-s border-surface-200">
      <div className="p-4 border-b border-surface-200">
        <h2 className="text-base font-semibold text-surface-900">שיחות</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        <Section
          title="ערוצים"
          onAdd={() => setNewChannelOpen(true)}
        >
          {channelsList.map((c) => {
            const active = pathname === `/chat/${c.id}`;
            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                  active
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-surface-700 hover:bg-surface-100",
                )}
              >
                <HashIcon className="text-surface-400 shrink-0" />
                <span className="truncate">{c.name}</span>
              </Link>
            );
          })}
        </Section>

        <Section
          title="הודעות ישירות"
          onAdd={() => setNewDmOpen(true)}
        >
          {dms.map((c) => {
            const active = pathname === `/chat/${c.id}`;
            const partner = c.dmPartner;
            const name = partner?.full_name ?? partner?.email ?? "משתמש";
            return (
              <Link
                key={c.id}
                href={`/chat/${c.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm",
                  active
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-surface-700 hover:bg-surface-100",
                )}
              >
                <Avatar
                  name={name}
                  src={partner?.avatar_url}
                  size="xs"
                />
                <span className="truncate">{name}</span>
              </Link>
            );
          })}
          {dms.length === 0 && (
            <div className="text-xs text-surface-500 px-2">אין הודעות ישירות</div>
          )}
        </Section>
      </div>

      <NewChannelDialog
        open={newChannelOpen}
        onOpenChange={setNewChannelOpen}
        workspaceId={workspaceId}
      />
      <NewDmDialog
        open={newDmOpen}
        onOpenChange={setNewDmOpen}
        workspaceId={workspaceId}
        currentUserId={currentUserId}
        people={people}
      />
    </div>
  );
}

function Section({
  title,
  onAdd,
  children,
}: {
  title: string;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-surface-500">
          {title}
        </h3>
        <Button
          size="icon"
          variant="ghost"
          onClick={onAdd}
          className="h-6 w-6"
          aria-label={`הוסף ${title}`}
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}
