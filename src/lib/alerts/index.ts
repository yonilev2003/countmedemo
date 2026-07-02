/**
 * Unified alerts system for countme.
 *
 * Each generator is a pure function: (persona, now?) → Alert | null.
 * All text is Hebrew. No fabricated external data — logic uses only the
 * persona + current date + known VAT reporting-cadence rules.
 */

import { Persona } from "@/lib/persona";
import { computeCeilingAlert } from "@/lib/alerts/ceiling";
import { getImminentDeadlines, type FilerType } from "@/lib/deadlines/calendar";

// ─── Common shape ──────────────────────────────────────────────────────────────

export type AlertSeverity = "ok" | "info" | "warn" | "alert";

export interface AlertCTA {
  labelHe: string;
  href: string;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  /** Short, one-line Hebrew headline. */
  headlineHe: string;
  /** Longer explanatory text. */
  detailHe: string;
  /** Optional call-to-action link. */
  cta?: AlertCTA;
}

// ─── 1. Ceiling alert (עוסק פטור מחזור) ────────────────────────────────────

/**
 * Maps the existing CeilingAlert into the common Alert shape.
 * Returns null when the persona is not an עוסק פטור.
 */
export function generateCeilingAlert(persona: Persona): Alert | null {
  const raw = computeCeilingAlert(persona);
  if (!raw) return null;

  return {
    id: "ceiling-osek-patur",
    severity: raw.tone,
    headlineHe: raw.headlineHe,
    detailHe: raw.detailHe,
    cta:
      raw.level === "exceeded" || raw.level === "critical"
        ? { labelHe: "מעבר לדשבורד", href: "/dashboard" }
        : undefined,
  };
}

// ─── 2. VAT advances reminder (מקדמות מע"מ) ────────────────────────────────

/**
 * VAT filing cadence rules (no invented figures — only period logic):
 *
 * עוסק פטור  → not registered for VAT; no reports needed.
 * עוסק מורשה → files monthly OR bi-monthly depending on whether the
 *               Israeli Tax Authority assigned them a monthly or bi-monthly cycle.
 *               The persona doesn't carry this flag directly, so we derive a
 *               safe proxy: turnover ≥ 1,500,000 NIS → monthly (per ITA rules);
 *               otherwise → bi-monthly.
 *
 * The due date is the 15th of the month following the period end.
 * We show the reminder starting 7 days before the due date.
 *
 * Example:
 *   Bi-monthly, period = March–April → due 15 May → remind from 8 May.
 *   Monthly, period = April → due 15 May → remind from 8 May.
 */
export function generateVatAdvancesAlert(
  persona: Persona,
  now: Date = new Date(),
): Alert | null {
  // עוסק פטור is exempt from VAT filing
  if (persona.business.osekType === "patur") return null;

  const annualTurnover = persona.vatAndTurnover.annualTurnoverWithoutVat;
  const isMonthly = annualTurnover >= 1_500_000;

  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  const day = now.getDate();

  let periodEndMonth: number; // 0-indexed month of the period's last month
  let periodLabelHe: string;

  if (isMonthly) {
    // Current reporting period: last month
    periodEndMonth = month === 0 ? 11 : month - 1;
    const periodYear = month === 0 ? year - 1 : year;
    periodLabelHe = new Date(periodYear, periodEndMonth, 1).toLocaleDateString(
      "he-IL",
      { month: "long", year: "numeric" },
    );
  } else {
    // Bi-monthly cycles: Jan–Feb, Mar–Apr, May–Jun, Jul–Aug, Sep–Oct, Nov–Dec
    // Determine which bi-monthly period just ended
    // Period ends at month indices 1,3,5,7,9,11 (Feb,Apr,Jun,Aug,Oct,Dec)
    const currentPeriodEnd = month % 2 === 0 ? month - 1 : month; // last even-index end
    if (currentPeriodEnd < 0) {
      periodEndMonth = 11; // Dec of previous year
    } else {
      periodEndMonth = currentPeriodEnd;
    }
    const periodStartMonth = periodEndMonth - 1;
    const periodYear =
      currentPeriodEnd < 0 ? year - 1 : year;
    const startDate = new Date(periodYear, periodStartMonth, 1);
    const endDate = new Date(periodYear, periodEndMonth, 1);
    const startLabel = startDate.toLocaleDateString("he-IL", { month: "long" });
    const endLabel = endDate.toLocaleDateString("he-IL", {
      month: "long",
      year: "numeric",
    });
    periodLabelHe = `${startLabel}–${endLabel}`;
  }

  // Due date: 15th of the month after the period ends
  const dueMonth = (periodEndMonth + 1) % 12;
  const dueYear = periodEndMonth === 11 ? year + 1 : year;
  const dueDate = new Date(dueYear, dueMonth, 15);

  // Show the reminder from 7 days before the due date
  const remindFrom = new Date(dueDate);
  remindFrom.setDate(remindFrom.getDate() - 7);

  const dueDateLabel = dueDate.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Only surface this alert if we're in the reminder window (7 days before → due day)
  const isInReminderWindow = now >= remindFrom && now <= dueDate;

  // Determine severity based on days remaining
  let severity: AlertSeverity;
  let headlineHe: string;
  let detailHe: string;

  if (isInReminderWindow) {
    if (daysUntilDue <= 1) {
      severity = "alert";
      headlineHe = "היום! הגשת דוח מע״מ — המועד האחרון";
      detailHe = `הגשת הדוח ${isMonthly ? "החודשי" : "הדו-חודשי"} (${periodLabelHe}) של מע״מ חייבת להתבצע היום, ${dueDateLabel}. אי-הגשה עלולה לגרור קנס.`;
    } else if (daysUntilDue <= 3) {
      severity = "warn";
      headlineHe = `${daysUntilDue} ימים לדוח מע״מ`;
      detailHe = `הגשת הדוח ${isMonthly ? "החודשי" : "הדו-חודשי"} (${periodLabelHe}) צריכה להתבצע עד ${dueDateLabel}. זמן טוב לסיים את ההכנה.`;
    } else {
      severity = "info";
      headlineHe = `תזכורת: דוח מע״מ עד ${dueDateLabel}`;
      detailHe = `הדוח ${isMonthly ? "החודשי" : "הדו-חודשי"} של מע״מ (תקופה: ${periodLabelHe}) צריך להיות מוגש בעוד ${daysUntilDue} ימים. ודאי/י שכל החשבוניות מרשומות.`;
    }
  } else {
    // Outside reminder window — show a gentle "next period" heads-up
    severity = "ok";
    headlineHe = "מע״מ — ללא פעולה נדרשת כרגע";
    detailHe = `הדוח הבא (${periodLabelHe}) יגיע ב-${dueDateLabel}. אין פעולה נדרשת כרגע.`;
  }

  return {
    id: "vat-advances-reminder",
    severity,
    headlineHe,
    detailHe,
    cta:
      isInReminderWindow
        ? { labelHe: "לדוח 1301", href: "/demo" }
        : undefined,
  };
}

// ─── 3. Monthly expense-entry reminder ─────────────────────────────────────

/**
 * Prompts the user to log this month's expenses.
 *
 * Logic (no DB — demo reminder):
 * - We look at the persona's expense data to see if any expense has a date in
 *   the current month. If not, we surface a reminder.
 * - If it's the first 5 days of the month we show a "have you logged last
 *   month's expenses?" reminder (grace period).
 * - Always shown — there's no harm in a gentle monthly nudge.
 */
export function generateMonthlyExpenseReminder(
  persona: Persona,
  now: Date = new Date(),
): Alert {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentDay = now.getDate();

  const expenses = persona.income.expenses ?? [];

  // Check if any expense is dated in the current calendar month
  const hasCurrentMonthEntry = expenses.some((e) => {
    const d = new Date(e.date);
    return (
      d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth
    );
  });

  const monthLabel = now.toLocaleDateString("he-IL", {
    month: "long",
    year: "numeric",
  });

  // Grace-period prompt: first 5 days of the month → ask about last month
  if (currentDay <= 5) {
    const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
    const lastMonthLabel = lastMonthDate.toLocaleDateString("he-IL", {
      month: "long",
      year: "numeric",
    });

    // Check if we have entries from last month
    const lastMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const hasLastMonthEntry = expenses.some((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === lastMonthYear && d.getMonth() + 1 === lastMonthNum;
    });

    if (!hasLastMonthEntry) {
      return {
        id: "monthly-expense-reminder",
        severity: "warn",
        headlineHe: `האם רשמת את הוצאות ${lastMonthLabel}?`,
        detailHe: `אנחנו בתחילת החודש — זמן טוב לסגור את ה-${lastMonthLabel}. לא זוהו הוצאות מהחודש שעבר. כל הוצאה מוכרת מקטינה את חבות המס שלך.`,
        cta: { labelHe: "לדשבורד", href: "/dashboard" },
      };
    }
  }

  if (hasCurrentMonthEntry) {
    return {
      id: "monthly-expense-reminder",
      severity: "ok",
      headlineHe: `הוצאות ${monthLabel} — נרשמו`,
      detailHe: `יש לך הוצאות רשומות עבור ${monthLabel}. כל הכבוד! שמור/י להוסיף קבלות חדשות ברגע שמתקבלות.`,
    };
  }

  return {
    id: "monthly-expense-reminder",
    severity: "info",
    headlineHe: `האם הכנסת הוצאות ל-${monthLabel}?`,
    detailHe: `לא זוהו הוצאות עבור ${monthLabel}. אם יש לך הוצאות עסקיות החודש — כגון תוכנות, נסיעות או ציוד — כדאי לרשום אותן עכשיו. כל ₪ מוכר מקטין את המס.`,
    cta: { labelHe: "לדשבורד", href: "/dashboard" },
  };
}

// ─── 4. Upcoming-deadline alerts (לוח מועדים) ──────────────────────────────

/** Maps the persona's osek type to the deadline-calendar filer type. */
function filerTypeFor(persona: Persona): FilerType {
  return persona.business.osekType === "patur" ? "osek-patur" : "osek-murshe";
}

/**
 * Surfaces deadlines from the structured calendar (lib/deadlines) that fall
 * within the next `withinDays` days. One Alert per imminent deadline.
 * Severity scales with proximity: ≤3d → alert, ≤7d → warn, else info.
 */
export function generateDeadlineAlerts(
  persona: Persona,
  now: Date = new Date(),
  withinDays = 21,
): Alert[] {
  const imminent = getImminentDeadlines(withinDays, now, filerTypeFor(persona))
    // VAT (מע"מ) is already handled by the richer generateVatAdvancesAlert —
    // skip maam here so the inbox doesn't show the same obligation twice.
    .filter((d) => d.authority !== "maam");
  return imminent.map((d) => {
    const severity: AlertSeverity =
      d.daysUntilDue <= 3 ? "alert" : d.daysUntilDue <= 7 ? "warn" : "info";
    const dueLabel = d.nextDueDate.toLocaleDateString("he-IL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return {
      id: `deadline-${d.id}`,
      severity,
      headlineHe:
        d.daysUntilDue === 0
          ? `היום: ${d.titleHe}`
          : `בעוד ${d.daysUntilDue} ימים: ${d.titleHe}`,
      detailHe: `מועד הגשה: ${dueLabel} (${d.dueRule}).${d.notesHe ? " " + d.notesHe : ""}`,
      cta: { labelHe: "ללוח המועדים", href: "/deadlines" },
    };
  });
}

// ─── Aggregator ─────────────────────────────────────────────────────────────

/**
 * Returns all alerts for the given persona, sorted by severity
 * (alert → warn → info → ok).
 */
export function generateAllAlerts(
  persona: Persona,
  now: Date = new Date(),
): Alert[] {
  const candidates: (Alert | null)[] = [
    generateCeilingAlert(persona),
    generateVatAdvancesAlert(persona, now),
    generateMonthlyExpenseReminder(persona, now),
    ...generateDeadlineAlerts(persona, now),
  ];

  const alerts = candidates.filter((a): a is Alert => a !== null);

  const severityOrder: Record<AlertSeverity, number> = {
    alert: 0,
    warn: 1,
    info: 2,
    ok: 3,
  };

  return alerts.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );
}
