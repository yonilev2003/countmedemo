"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { CalendarEvent, EventAttendee } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PlusIcon } from "@/components/ui/icon";
import { EventDialog } from "./event-dialog";
import Link from "next/link";

type Member = { id: string; full_name: string | null; email: string; avatar_url: string | null };
type EventWithAttendees = CalendarEvent & {
  attendees: (EventAttendee & { user: Pick<Member, "full_name" | "email" | "avatar_url"> | null })[];
};

export function CalendarView({
  events,
  members,
  currentUserId,
  googleConnected,
}: {
  events: EventWithAttendees[];
  members: Member[];
  currentUserId: string;
  googleConnected: boolean;
}) {
  const calRef = useRef<FullCalendar | null>(null);
  const router = useRouter();
  const [editing, setEditing] = useState<EventWithAttendees | null>(null);
  const [creating, setCreating] = useState<{ start: Date; end: Date } | null>(null);

  const fcEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    start: e.start_at,
    end: e.end_at,
    allDay: e.all_day,
    backgroundColor: e.color,
    borderColor: e.color,
    extendedProps: { event: e },
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold font-display text-surface-900">יומן</h1>
        <div className="flex gap-2">
          {!googleConnected && (
            <Link href="/settings/integrations" className="text-xs text-brand-600 self-center hover:underline">
              חבר Google Calendar
            </Link>
          )}
          <Button
            onClick={() => {
              const now = new Date();
              const inHour = new Date(now.getTime() + 3600_000);
              setCreating({ start: now, end: inHour });
            }}
          >
            <PlusIcon /> אירוע חדש
          </Button>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardBody className="h-full p-3">
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            direction="rtl"
            locale="he"
            firstDay={0}
            buttonText={{ today: "היום", month: "חודש", week: "שבוע", day: "יום", list: "רשימה" }}
            headerToolbar={{
              start: "prev,next today",
              center: "title",
              end: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
            }}
            allDayText="כל היום"
            events={fcEvents}
            selectable
            selectMirror
            editable
            eventClick={(info) => {
              const e = info.event.extendedProps.event as EventWithAttendees;
              setEditing(e);
            }}
            select={(info) => {
              setCreating({ start: info.start, end: info.end });
            }}
            eventDrop={async (info) => {
              // We could call updateEventAction here. For now refresh after manual edit.
              info.revert();
            }}
            height="100%"
          />
        </CardBody>
      </Card>

      {creating && (
        <EventDialog
          open
          onOpenChange={(o) => !o && setCreating(null)}
          members={members}
          currentUserId={currentUserId}
          initial={{ start: creating.start, end: creating.end }}
          onDone={() => {
            setCreating(null);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <EventDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          members={members}
          currentUserId={currentUserId}
          event={editing}
          onDone={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
