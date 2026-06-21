// Build "add to calendar" links for a deadline — pure, client-safe.
//
// Two options, covering most users: a Google Calendar template URL (opens a
// pre-filled event) and an .ics data URL (Apple/Outlook/any calendar). Events
// are all-day on the due date; a reminder is encoded in the .ics (VALARM).

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** YYYYMMDD in local time (all-day events use floating dates). */
function ymd(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export interface CalendarEventInput {
  title: string;
  date: Date;
  details?: string;
}

/** Google Calendar "create event" template URL (all-day). */
export function googleCalendarUrl({ title, date, details }: CalendarEventInput): string {
  const start = ymd(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 1); // Google all-day end is exclusive
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${ymd(end)}`,
    details: details ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** An .ics file as a data: URL — all-day VEVENT with a 1-day-before alarm. */
export function icsDataUrl({ title, date, details }: CalendarEventInput): string {
  const dt = ymd(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);
  const uid = `countme-${dt}-${Math.random().toString(36).slice(2, 8)}@countme`;
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//countme//deadlines//HE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${dt}`,
    `DTEND;VALUE=DATE:${ymd(end)}`,
    `SUMMARY:${esc(title)}`,
    details ? `DESCRIPTION:${esc(details)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-P1D",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(lines.join("\r\n"))}`;
}
