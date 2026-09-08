"use client";

/**
 * Side-quest follow-up nudge (CPA-BNG round, 2026-09-08, spec §10). Reads the
 * user's OWN side_quest_* events directly from `public.events` (RLS policy
 * `events_own_read`: `auth.uid() = user_id`) — deliberately no new table, no
 * duplicate "side quest status" source of truth. The events log already IS
 * the status: the latest side_quest_* row for a given `quest` tells the
 * whole story (shown → help_requested → guide_opened → reported_done).
 *
 * Renders nothing if the quest was never shown, or was already reported
 * done — never re-nags after a self-reported completion (spec §10: "אל
 * תפתח שוב משימה שהושלמה"). Renders nothing on any read failure (best-effort
 * UI chrome, matching the analytics layer's own "never break the app" rule).
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { trackClient } from "@/lib/analytics/track-client";

type SideQuestStatus = "shown" | "help_requested" | "guide_opened" | "reported_done" | null;

const EVENT_NAMES = [
  "side_quest_shown",
  "side_quest_help_requested",
  "side_quest_guide_opened",
  "side_quest_reported_done",
] as const;

async function latestOsekOpenFileStatus(): Promise<SideQuestStatus> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("events")
      .select("name, props, created_at")
      .in("name", EVENT_NAMES as unknown as string[])
      .order("created_at", { ascending: false })
      .limit(20); // small bound — this is a handful of events per user, ever
    if (error || !data) return null;
    const row = data.find((r) => (r.props as { quest?: string } | null)?.quest === "osek_open_file");
    if (!row) return null;
    return row.name.replace("side_quest_", "") as SideQuestStatus;
  } catch {
    return null;
  }
}

export function SideQuestNudge() {
  const [status, setStatus] = useState<SideQuestStatus>(null);

  useEffect(() => {
    void latestOsekOpenFileStatus().then(setStatus);
  }, []);

  if (!status || status === "reported_done") return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-due/40 bg-due-bg/40 px-4 py-3 text-sm">
      <span className="text-ink">
        עדיין לא פתחת/ה תיק עוסק ברשות המסים? אפשר להשלים את זה בכל שלב.
      </span>
      <Link
        href="https://www.gov.il/he/service/request-open-exempt-dealer-via-internet"
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClient("side_quest_guide_opened", { quest: "osek_open_file" })}
        className="shrink-0 whitespace-nowrap text-xs font-bold text-brand-deep hover:underline"
      >
        למדריך הרשמי
      </Link>
    </div>
  );
}
