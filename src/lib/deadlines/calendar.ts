/**
 * Israeli Tax / Reporting Deadline Calendar
 * ==========================================
 * Structured data derived from:
 *   .claude/skills/israeli-freelancer-ops/references/deadline-calendar.md
 *
 * This module is the FOUNDATION for a future live-scraping layer. No network
 * calls happen here — all values are statically codified from authoritative
 * sources checked as of 2026-05-29.
 *
 * ── Future scraper notes ────────────────────────────────────────────────────
 *  1. Source pages to monitor (all on gov.il / official portals):
 *       • רשות המסים — עמוד דוחות ומועדי הגשה:
 *           https://www.gov.il/he/departments/israel_tax_authority (filing calendar)
 *       • מע"מ — לוח תשלומים:
 *           https://www.misim.gov.il/
 *       • ביטוח לאומי — מועדי תשלום:
 *           https://www.btl.gov.il/
 *  2. Scraping cadence: once a quarter is enough for annual deadlines; monthly
 *     for per-period deadlines (VAT / B"L / mkdamot) since dates can shift for
 *     Shabbat / holidays at any time.
 *  3. A scraper should:
 *       a. Fetch each source page (plain HTML or structured JSON if available).
 *       b. Extract dates using a trained or regex extractor.
 *       c. Map extracted dates to the `id` fields in DEADLINE_CALENDAR below.
 *       d. Replace `dueRule` with an absolute `Date` object for the current year.
 *       e. Persist to DB / cache with a `scrapedAt` timestamp.
 *  4. For Shabbat/holiday shifting: import a Hebrew calendar library (e.g.
 *     `hebcal`) to compute adjusted dates at runtime rather than hard-coding.
 *  5. Never trust a scraped value without a human sanity-check for the first run
 *     of each new tax year — misim.gov.il sometimes publishes preliminary dates
 *     that shift after the Knesset approves the budget.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Types ──────────────────────────────────────────────────────────────────

/** Which Israeli government body owns the deadline. */
export type Authority =
  | "mas-hachnasa"   // רשות המסים — income-tax wing
  | "maam"           // רשות המסים — VAT wing (מע"מ)
  | "bituach-leumi"; // המוסד לביטוח לאומי

/** Reporting cadence — determines how many due-dates we generate per year. */
export type Cadence =
  | "annual"         // once a year
  | "monthly"        // every calendar month
  | "bi-monthly";    // every two months (6 periods per year)

/** Whether the filer type is restricted. */
export type FilerType =
  | "osek-murshe"    // עוסק מורשה (VAT-registered)
  | "osek-patur"     // עוסק פטור (VAT-exempt)
  | "all";           // applies to both

/**
 * A single deadline entry in the calendar.
 *
 * `dueRule` is a human-readable rule string (e.g. "15th of the month following
 * the reporting period"). A future scraper will replace / supplement this with
 * concrete `Date` objects for the current filing year.
 */
export interface DeadlineEntry {
  /** Unique stable identifier — used as a DB/cache key by a future scraper. */
  id: string;

  /** Short title in Hebrew — shown in the UI. */
  titleHe: string;

  /** Short title in English — for code / logging. */
  titleEn: string;

  /** Who enforces this deadline. */
  authority: Authority;

  /** How often the obligation recurs. */
  cadence: Cadence;

  /** Which filer type this applies to. */
  filerType: FilerType;

  /**
   * Human-readable due-date rule.  Examples:
   *   "15 בחודש שאחרי תקופת הדיווח"
   *   "31 בינואר של השנה שלאחר שנת המס"
   *   "30 ביוני של שנת ההגשה (מגיש מקוון)"
   *
   * A future scraper will also populate `nextDueDate` with an absolute Date.
   */
  dueRule: string;

  /**
   * Authoritative source URL — the page a future scraper should watch.
   * May be undefined when a single portal covers multiple deadlines.
   */
  sourceUrl?: string;

  /**
   * Free-form notes visible in the agent tooltip — e.g. caveats,
   * holiday-shift rules, or links to related obligations.
   */
  notesHe?: string;
}

/**
 * The computed next occurrence returned by `getUpcomingDeadlines`.
 * When a scraper is wired, it will replace `nextDueDate` with a verified date
 * fetched from the live source.
 */
export interface UpcomingDeadline extends DeadlineEntry {
  /**
   * Computed next due date (Gregorian).
   * Shabbat / holiday shifting is NOT applied here — the caller or a future
   * `shiftForHolidays(date)` utility should adjust.
   */
  nextDueDate: Date;

  /**
   * Days remaining from `fromDate` to `nextDueDate`.
   * Negative means the deadline already passed (within the current period).
   */
  daysUntilDue: number;
}

// ─── Static Calendar ────────────────────────────────────────────────────────

/**
 * All known Israeli freelancer / self-employed deadlines, codified from the
 * `israeli-freelancer-ops` skill's `deadline-calendar.md` (checked 2026-05-29).
 *
 * To add a deadline: append a new `DeadlineEntry` object and update tests.
 * To update a deadline: edit `dueRule` + `notesHe`; leave `id` unchanged.
 */
export const DEADLINE_CALENDAR: DeadlineEntry[] = [
  // ── VAT (מע"מ) — Osek Murshe ─────────────────────────────────────────────

  {
    id: "vat-bi-monthly",
    titleHe: "דוח מע״מ דו-חודשי",
    titleEn: "VAT bi-monthly return",
    authority: "maam",
    cadence: "bi-monthly",
    filerType: "osek-murshe",
    dueRule: "15 בחודש שאחרי תקופת הדיווח (מרץ 15, מאי 15, יולי 15, ספטמבר 15, נובמבר 15, ינואר 15)",
    sourceUrl: "https://www.misim.gov.il/",
    notesHe:
      "מועד ברירת המחדל לרוב העוסקים המורשים. עסק שמחזורו עולה על הסף לדיווח חודשי עובר לדיווח חודשי.",
  },
  {
    id: "vat-monthly",
    titleHe: "דוח מע״מ חודשי",
    titleEn: "VAT monthly return",
    authority: "maam",
    cadence: "monthly",
    filerType: "osek-murshe",
    dueRule: "15 בחודש שאחרי חודש הדיווח",
    sourceUrl: "https://www.misim.gov.il/",
    notesHe:
      "נדרש ממי שמחזורו עולה על הסף החודשי. מ-2026 גם מי שמחזורו עולה על 500,000 ₪ שנתי — הגשת דוח מפורט (874).",
  },
  {
    id: "vat-detailed-874",
    titleHe: "דוח מע״מ מפורט (874) — ממחזור 500 אלף ₪",
    titleEn: "Detailed VAT report 874 (from 500K+ turnover)",
    authority: "maam",
    cadence: "monthly",
    filerType: "osek-murshe",
    dueRule: "23 בחודש שאחרי חודש הדיווח (החל מינואר 2026)",
    sourceUrl: "https://www.misim.gov.il/",
    notesHe:
      "החל מינואר 2026 — עוסק מורשה עם מחזור שנתי מעל 500,000 ₪ חייב בהגשת דוח מפורט הכולל פירוט חשבוניות. המועד הוא ה-23 (לא ה-15) של החודש שאחרי.",
  },
  {
    id: "vat-osek-patur-annual",
    titleHe: "הצהרת מחזור שנתי — עוסק פטור",
    titleEn: "Osek patur annual turnover declaration",
    authority: "maam",
    cadence: "annual",
    filerType: "osek-patur",
    dueRule: "31 בינואר של השנה שלאחר שנת המס",
    sourceUrl: "https://www.misim.gov.il/",
    notesHe:
      "עוסק פטור אינו מגיש דוחות מע״מ שוטפים אך חייב בהצהרת מחזור שנתית עד 31/1. אם המחזור עלה על 122,833 ₪ (2026) — יש לעבור לעוסק מורשה.",
  },

  // ── Income Tax Annual Report ──────────────────────────────────────────────

  {
    id: "form-1301-paper",
    titleHe: "דוח שנתי למס הכנסה — מגיש נייר (טופס 1301)",
    titleEn: "Annual income-tax return — paper filer (Form 1301)",
    authority: "mas-hachnasa",
    cadence: "annual",
    filerType: "all",
    dueRule: "31 במאי של שנת ההגשה (לדוגמה: 31.5.2026 לשנת מס 2025)",
    sourceUrl:
      "https://www.gov.il/he/departments/israel_tax_authority/govil-landing-page",
    notesHe:
      "הגשה בנייר חריגה — רוב המגישים עוברים להגשה מקוונת. ודא את המועד מדי שנה בעמוד שירות טפסי מס הכנסה.",
  },
  {
    id: "form-1301-online",
    titleHe: "דוח שנתי למס הכנסה — הגשה מקוונת (טופס 1301)",
    titleEn: "Annual income-tax return — online filer (Form 1301)",
    authority: "mas-hachnasa",
    cadence: "annual",
    filerType: "all",
    dueRule: "30 ביוני של שנת ההגשה (לדוגמה: 30.6.2026 לשנת מס 2025)",
    sourceUrl: "https://secapp.taxes.gov.il/",
    notesHe:
      "הגשה מקוונת חובה לרוב המגישים. הארכה דרך רואה חשבון — בדרך כלל עד 31 ביולי ואילך, לפי הסדר עם רשות המסים.",
  },
  {
    id: "form-1301-accountant-extension",
    titleHe: "דוח שנתי — הארכה דרך רואה חשבון",
    titleEn: "Annual return — accountant extension",
    authority: "mas-hachnasa",
    cadence: "annual",
    filerType: "all",
    dueRule: "בדרך כלל 31 ביולי ואילך, לפי הסדר שרואה החשבון קיבל עם רשות המסים",
    notesHe:
      "אינו אוטומטי — יש לוודא עם רואה החשבון שהגיש בקשת הארכה בשמך.",
  },

  // ── Income-Tax Advances (Mkdamot Mas Hachnasa) ───────────────────────────

  {
    id: "mkdamot-monthly",
    titleHe: "מקדמות מס הכנסה — מגיש חודשי",
    titleEn: "Income-tax advance payments — monthly filer",
    authority: "mas-hachnasa",
    cadence: "monthly",
    filerType: "all",
    dueRule: "15 בחודש שאחרי חודש הדיווח (לדוגמה: מקדמת ינואר — עד 15 בפברואר)",
    sourceUrl:
      "https://www.gov.il/he/departments/israel_tax_authority",
    notesHe:
      "הסכום נקבע לפי שובר שנשלח בתחילת שנת המס. אם המועד חל בשבת — נדחה ליום ראשון.",
  },
  {
    id: "mkdamot-bi-monthly",
    titleHe: "מקדמות מס הכנסה — מגיש דו-חודשי",
    titleEn: "Income-tax advance payments — bi-monthly filer",
    authority: "mas-hachnasa",
    cadence: "bi-monthly",
    filerType: "all",
    dueRule:
      "19 בחודש שאחרי תקופת הדיווח (מרץ 19, מאי 19, יולי 19, ספטמבר 19, נובמבר 19, ינואר 19)",
    sourceUrl:
      "https://www.gov.il/he/departments/israel_tax_authority",
    notesHe:
      "שים לב: מועד 19 (לא 15) בדיווח דו-חודשי. אם המועד חל בשבת או חג — נדחה ליום עסקים הבא.",
  },

  // ── Bituach Leumi (National Insurance) ───────────────────────────────────

  {
    id: "bituach-leumi-monthly",
    titleHe: "תשלום דמי ביטוח לאומי — עצמאי (מקדמות)",
    titleEn: "National Insurance advance payment — self-employed",
    authority: "bituach-leumi",
    cadence: "monthly",
    filerType: "all",
    dueRule: "15 בחודש שאחרי החודש שבעדו משולמים דמי הביטוח",
    sourceUrl: "https://www.btl.gov.il/",
    notesHe:
      "תשלום חודשי על חשבון שומת הביטוח הלאומי. הסכום עשוי להשתנות לאחר הגשת הדוח השנתי וקבלת שומה סופית.",
  },
];

// ─── Helper: Israel-timezone "today" ───────────────────────────────────────

/** IANA timezone every "days until due" computation in this module rolls over at. */
const CALENDAR_TIMEZONE = "Asia/Jerusalem";

/**
 * Collapse an instant to the CALENDAR DATE it falls on in Asia/Jerusalem,
 * expressed as a Date at local midnight (00:00:00.000).
 *
 * Every function below reads back only `getFullYear()`/`getMonth()`/`getDate()`
 * from its `fromDate` — i.e. this module already does pure calendar-date
 * arithmetic, never wall-clock arithmetic. The bug this fixes: `new Date()`
 * exposes those getters in the HOST's local timezone, not Israel's. On a
 * server running UTC, 2026-08-18T22:30Z is still "Aug 18" by
 * `getDate()`/`getMonth()` — but it's already 2026-08-19 01:30 in Israel
 * (UTC+3, DST). Left uncorrected, a deadline due "tomorrow" in Israel would
 * still show as due "in 2 days" until the host's own midnight, hours after
 * Israeli users already consider it "today".
 *
 * Normalizing every `fromDate` through this function makes the whole
 * module's day-diff arithmetic roll over at Israel midnight regardless of
 * the host timezone the code happens to run in (server, browser, or CI).
 */
export function jerusalemToday(instant: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value ?? NaN);
  return new Date(get("year"), get("month") - 1, get("day"));
}

// ─── Helper: compute next occurrences ───────────────────────────────────────

/**
 * The bi-monthly periods used by both VAT and mkdamot deadlines.
 *
 * Each entry is [reportingMonthStart (0-based), dueDay]:
 *   Jan–Feb period → due March 15 (or 19 for mkdamot)
 */
const BI_MONTHLY_PERIODS: Array<{ periodStart: number; dueMonth: number }> = [
  { periodStart: 0,  dueMonth: 2  }, // Jan–Feb → March
  { periodStart: 2,  dueMonth: 4  }, // Mar–Apr → May
  { periodStart: 4,  dueMonth: 6  }, // May–Jun → July
  { periodStart: 6,  dueMonth: 8  }, // Jul–Aug → September
  { periodStart: 8,  dueMonth: 10 }, // Sep–Oct → November
  { periodStart: 10, dueMonth: 0  }, // Nov–Dec → January (next year)
];

/**
 * Parse the due-day from a `dueRule` string.
 * Falls back to 15 if nothing can be extracted.
 */
function parseDueDay(dueRule: string): number {
  const match = dueRule.match(/(\d{1,2})\s+ב/);
  return match ? parseInt(match[1], 10) : 15;
}

/**
 * Return the next due date for a MONTHLY deadline relative to `fromDate`.
 *
 * The reporting month is the previous calendar month; the due date is
 * `dueDay` of the current month.
 */
function nextMonthly(fromDate: Date, dueDay: number): Date {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth(); // 0-based

  // Due date for the reporting month that ended last month
  const candidate = new Date(year, month, dueDay);
  if (candidate >= fromDate) return candidate;

  // Already past — next period = next calendar month
  return new Date(year, month + 1, dueDay);
}

/**
 * Return the next due date for a BI-MONTHLY deadline relative to `fromDate`.
 */
function nextBiMonthly(fromDate: Date, dueDay: number): Date {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth(); // 0-based

  for (const period of BI_MONTHLY_PERIODS) {
    // The due date for this period
    const dueYear = period.dueMonth === 0 ? year + 1 : year;
    const candidate = new Date(dueYear, period.dueMonth, dueDay);
    if (candidate >= fromDate) return candidate;
  }

  // All periods this year have passed — return the first period of next year
  return new Date(year + 1, 2, dueDay); // March of next year
}

/**
 * Absolute due-date factories for each annual deadline id, keyed by the
 * FILING year (the calendar year the deadline itself falls in — e.g. tax
 * year 2025's online return is due in filing year 2026). A future scraper
 * would replace these with live scraped dates.
 *
 * Module-level (not local to `nextAnnual`) so `isAnnualFilingDeadlinePassed`
 * (FP-08) can look up a SPECIFIC tax year's due date from the same factory
 * `nextAnnual` uses for "next occurrence from today" — one definition, two
 * call shapes, no drift between them.
 */
const ANNUAL_DUE_DATE_FACTORIES: Record<string, (filingYear: number) => Date> = {
  "form-1301-paper": (y) => new Date(y, 4, 31),      // May 31
  "form-1301-online": (y) => new Date(y, 5, 30),     // June 30
  "form-1301-accountant-extension": (y) => new Date(y, 6, 31), // July 31 (approximate)
  "vat-osek-patur-annual": (y) => new Date(y, 0, 31), // Jan 31
};

/**
 * Return the next due date for an ANNUAL deadline relative to `fromDate`.
 *
 * Uses ANNUAL_DUE_DATE_FACTORIES, keyed on the deadline id.
 * A future scraper would replace these with live scraped dates.
 */
function nextAnnual(id: string, fromDate: Date): Date {
  const year = fromDate.getFullYear();

  const factory = ANNUAL_DUE_DATE_FACTORIES[id];
  if (!factory) {
    // Unknown annual deadline — return end of June as a safe fallback
    return new Date(year, 5, 30);
  }

  const candidate = factory(year);
  // If already past, return the same date next year
  return candidate >= fromDate ? candidate : factory(year + 1);
}

/**
 * Whether the annual Form 1301 filing deadline for tax year `taxYear` has
 * already passed, as of `today` (defaults to now; normalized to the
 * Asia/Jerusalem calendar date via `jerusalemToday`, same rollover rule as
 * the rest of this module).
 *
 * The annual-report deadline for tax year N falls in FILING year N+1 (see
 * DEADLINE_CALENDAR's `form-1301-*` entries) — this checks the ONLINE
 * deadline ("form-1301-online", 30 ביוני), the one the vast majority of
 * filers are subject to. The paper deadline (31 במאי) is earlier and the
 * accountant-extension deadline is later and individually negotiated per
 * filer, so neither is a safe universal default. Built on the SAME
 * ANNUAL_DUE_DATE_FACTORIES entry `nextAnnual` uses for "next occurrence",
 * so the two definitions can never drift apart.
 *
 * FP-08, verified 2026-08-19: for tax years 2024 and 2025 the online
 * deadline (30.6.2025 and 30.6.2026 respectively) is already behind today —
 * returns true. For tax year 2026 (deadline 30.6.2027) it returns false.
 *
 * A deadline that falls exactly ON `today` is NOT yet "passed" (still due
 * today) — this returns true only once `today` is strictly after the due
 * date.
 */
export function isAnnualFilingDeadlinePassed(
  taxYear: number,
  today: Date = new Date(),
): boolean {
  const todayJerusalem = jerusalemToday(today);
  const dueDate = ANNUAL_DUE_DATE_FACTORIES["form-1301-online"](taxYear + 1);
  return todayJerusalem > dueDate;
}

/**
 * Compute the next N upcoming occurrences of Israeli tax/reporting deadlines,
 * starting from `fromDate` (defaults to today).
 *
 * Returns entries sorted ascending by `nextDueDate`.
 *
 * Note: Shabbat and holiday shifting is NOT applied here. Pass the results
 * through a `shiftForIsraeliHolidays(dates)` utility (to be added in a
 * future task using the `hebcal` library) before displaying.
 *
 * `fromDate` is an instant (any timezone) — it is normalized to the
 * Asia/Jerusalem calendar date via `jerusalemToday()` before any arithmetic,
 * so `daysUntilDue` always rolls over at Israel midnight.
 *
 * @param fromDate   Reference instant (defaults to `new Date()`)
 * @param filerType  Filter to a specific filer type (default: all types)
 * @param limit      Maximum number of results to return (default: 20)
 */
export function getUpcomingDeadlines(
  fromDate: Date = new Date(),
  filerType: FilerType | "all" = "all",
  limit = 20,
): UpcomingDeadline[] {
  // Normalize to the Israel calendar date FIRST — every date built below
  // (nextMonthly/nextBiMonthly/nextAnnual, and the day-diff) derives from
  // this single value, so the whole result set rolls over at Israel
  // midnight, not the host's local midnight (see jerusalemToday doc).
  const today = jerusalemToday(fromDate);
  const results: UpcomingDeadline[] = [];

  for (const entry of DEADLINE_CALENDAR) {
    // Filter by filer type if requested
    if (filerType !== "all" && entry.filerType !== "all" && entry.filerType !== filerType) {
      continue;
    }

    const dueDay = parseDueDay(entry.dueRule);
    let nextDueDate: Date;

    switch (entry.cadence) {
      case "monthly":
        nextDueDate = nextMonthly(today, dueDay);
        break;
      case "bi-monthly":
        nextDueDate = nextBiMonthly(today, dueDay);
        break;
      case "annual":
        nextDueDate = nextAnnual(entry.id, today);
        break;
    }

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilDue = Math.round(
      (nextDueDate.getTime() - today.getTime()) / msPerDay,
    );

    results.push({ ...entry, nextDueDate, daysUntilDue });
  }

  // Sort ascending by next due date
  results.sort((a, b) => a.nextDueDate.getTime() - b.nextDueDate.getTime());

  return results.slice(0, limit);
}

/**
 * Convenience: return only deadlines due within the next `withinDays` days.
 * Useful for a dashboard "urgent" panel.
 */
export function getImminentDeadlines(
  withinDays = 30,
  fromDate: Date = new Date(),
  filerType: FilerType | "all" = "all",
): UpcomingDeadline[] {
  return getUpcomingDeadlines(fromDate, filerType).filter(
    (d) => d.daysUntilDue >= 0 && d.daysUntilDue <= withinDays,
  );
}
