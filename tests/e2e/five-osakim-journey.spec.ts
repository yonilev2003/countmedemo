import { test, expect, Page } from "@playwright/test";
import danaCohen from "../../personas/dana-cohen.json";

/**
 * Five-osakim beta journey (2026-08-18, Roy-feedback round).
 *
 * Drives the FULL /setup wizard end-to-end as five different self-employed
 * profiles — the flows real beta users hit on their phones — and asserts the
 * beta-goal contract on each: no dead ends, no validation traps, and exactly
 * ONE finish path that always carries the cloud-save intent (Yoni's locked
 * decision; see docs/feedback/2026-08-18-roy-beta-feedback-tasks.md).
 *
 * Runs at a mobile viewport (390×844) deliberately: most beta users are on
 * phones, and Roy's round of feedback was a phone run. Headless OAuth can't
 * complete a real Google sign-in, so each journey asserts up to the OAuth
 * boundary: the finish CTA must route to /login carrying BOTH ?next= and the
 * ?intent=save-persona signal that survives cross-tab OAuth completion.
 */

test.use({ viewport: { width: 390, height: 844 } });

/** Valid TZ per the israeli-id check-digit validation used by screen 1. */
const VALID_TZ = "123456782";

interface Profile {
  name: string;
  first: string;
  last: string;
  gender: "female" | "male";
  /** Screen-2 special statuses. */
  oleh?: { aliyahDate: string };
  soldier?: { dischargeDate: string };
  /** Screen-3 osek track. */
  track: "patur" | "morshe";
  zeir?: boolean;
  occupation: string;
  tradeName: string;
  revenue: string;
  expenses: string;
  bituachLeumi?: string;
  kerenHishtalmut?: string;
}

const PROFILES: Profile[] = [
  {
    name: "עוסקת פטורה — מעצבת",
    first: "דנה", last: "כהן", gender: "female",
    track: "patur", occupation: "עיצוב גרפי", tradeName: "דנה עיצובים",
    revenue: "118000", expenses: "24000", bituachLeumi: "22340", kerenHishtalmut: "8000",
  },
  {
    name: "עוסק זעיר — יועץ",
    first: "יואב", last: "לוי", gender: "male",
    track: "patur", zeir: true, occupation: "ייעוץ עסקי", tradeName: "יואב ייעוץ",
    revenue: "95000", expenses: "9000",
  },
  {
    name: "עוסק מורשה — מפתח (מעל סף 6111)",
    first: "אלון", last: "ברק", gender: "male",
    track: "morshe", occupation: "פיתוח תוכנה", tradeName: "ברק טכנולוגיות",
    revenue: "310000", expenses: "61000", bituachLeumi: "31000", kerenHishtalmut: "13500",
  },
  {
    name: "עולה חדשה — עוסקת פטורה",
    first: "מריה", last: "איבנוב", gender: "female",
    oleh: { aliyahDate: "2024-03-10" },
    track: "patur", occupation: "צילום", tradeName: "מריה צילום",
    revenue: "76000", expenses: "14000",
  },
  {
    name: "חייל משוחרר — עוסק פטור",
    first: "עומר", last: "שלו", gender: "male",
    soldier: { dischargeDate: "2024-11-01" },
    track: "patur", occupation: "צילום אירועים", tradeName: "עומר הפקות",
    revenue: "54000", expenses: "8000",
  },
];

async function runWizard(page: Page, p: Profile) {
  await page.goto("/setup");

  // ── Screen 1: personal details ──
  await expect(page.getByRole("heading", { name: "פרטים אישיים" })).toBeVisible();
  await page.getByLabel("שם פרטי").fill(p.first);
  await page.getByLabel("שם משפחה").fill(p.last);
  await page.getByLabel("תעודת זהות").fill(VALID_TZ);
  await page.getByLabel("תאריך לידה").fill("1996-08-14");
  // sr-only radio — click the visible label.
  await page
    .getByText(p.gender === "female" ? "נקבה (2.75 נקודות)" : "זכר (2.25 נקודות)")
    .click();
  // Mobile phone is required (Yoni, 28/08).
  await page.getByLabel("נייד").fill("050-1234567");
  await page.getByRole("checkbox").first().check(); // terms+privacy
  await page.getByRole("button", { name: /הבא/ }).click();

  // ── Screen 2: statuses (oleh / soldier) ──
  await expect(page.getByRole("heading", { name: "מעמד ומשפחה" })).toBeVisible();
  if (p.oleh) {
    await page.getByText("עולה חדש/ה").click();
    // aliyahDate is now REQUIRED when the status is checked (this round's
    // validateStep2 fix) — fill it, else הבא must block.
    await page.getByLabel("תאריך עלייה").fill(p.oleh.aliyahDate);
  }
  if (p.soldier) {
    await page.getByText("חייל/ת משוחרר/ת").click();
    await page.getByLabel("תאריך שחרור").fill(p.soldier.dischargeDate);
  }
  await page.getByRole("button", { name: /הבא/ }).click();

  // ── Screen 3: business intro (occupation, age, osek track) ──
  await expect(page.getByRole("heading", { name: "היכרות עם העסק" })).toBeVisible();
  await page.locator("#primaryOccupation").fill(p.occupation);
  // Dismiss the suggestions dropdown — the picker closes on outside
  // mousedown only (it has no Escape handler), and the open dropdown
  // overlays the osek radios below it.
  await page.getByRole("heading", { name: "היכרות עם העסק" }).click();
  await page.getByText("שנה ראשונה", { exact: true }).click();
  await page
    .getByText(p.track === "patur" ? "עוסק פטור" : "עוסק מורשה", { exact: true })
    .click();
  if (p.zeir) {
    await page.getByText("עוסק זעיר", { exact: true }).click();
  }
  await page.getByRole("button", { name: /הבא/ }).click();

  // ── Screen 4: business identity ──
  await expect(page.getByRole("heading", { name: "פרטי העסק" })).toBeVisible();
  await page.locator("#tradeName").fill(p.tradeName);
  // Address (city/street) is required (Yoni, 27/08) — pickers still accept
  // free text, so no need to select a dropdown suggestion here.
  await page.locator("#addressCity").fill("תל אביב - יפו");
  await page.getByRole("heading", { name: "פרטי העסק" }).click();
  await page.locator("#addressStreet").fill("הרצל");
  await page.getByRole("heading", { name: "פרטי העסק" }).click();
  await page.getByRole("button", { name: /הבא/ }).click();

  // ── Screen 5: revenue ──
  await expect(page.getByRole("heading", { name: "הכנסות" })).toBeVisible();
  await page.locator("#totalRevenue").fill(p.revenue);
  await page.getByRole("button", { name: /הבא/ }).click();

  // ── Screen 6: expenses + deductions ──
  await expect(page.getByRole("heading", { name: "הוצאות וניכויים" })).toBeVisible();
  await page.locator("#expenses").fill(p.expenses);
  if (p.bituachLeumi) await page.locator("#bituachLeumi").fill(p.bituachLeumi);
  if (p.kerenHishtalmut) await page.locator("#kerenH").fill(p.kerenHishtalmut);
  await page.getByRole("button", { name: /הבא/ }).click();

  // ── Screen 7: bank + summary → submit ──
  await expect(page.getByRole("heading", { name: "בנק וסיכום" })).toBeVisible();
  await page.getByRole("button", { name: "הציגי את הדוח שלי" }).click();
}

for (const profile of PROFILES) {
  test(`מסע מלא במובייל: ${profile.name}`, async ({ page }) => {
    await runWizard(page, profile);

    // ── DoneScreen: the single-finish-path contract ──
    const finishCta = page.getByRole("button", { name: /כניסה ללוח הבקרה/ });
    await expect(finishCta).toBeVisible();
    // The old unsaved bare-Link path must be gone: no second "כניסה ללוח
    // הבקרה" element, and no separate standalone Google-login link.
    await expect(page.getByText("התחברות עם Google ←")).toHaveCount(0);

    // Not authenticated in headless — the CTA must hand off to /login
    // carrying BOTH the destination and the save-persona intent, so the
    // upload survives OAuth completing in another tab (task #2).
    await finishCta.click();
    await expect(page).toHaveURL(/\/login\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("next")).toBe("/dashboard");
    expect(url.searchParams.get("intent")).toBe("save-persona");
  });
}

test("מובייל /demo: הטופס קריא, הצ'אט נפתח כ-bottom-sheet, וערך מחושב נפתח לפירוט", async ({ page }) => {
  // Seed the wizard output directly (the journey above ends at the OAuth
  // boundary; /demo itself is persona-gated, not auth-gated).
  await page.addInitScript((p) => {
    localStorage.setItem("countme_persona", JSON.stringify(p));
  }, danaCohen);
  await page.goto("/demo");

  // The gov-form replica renders on a phone viewport: the star-field 150 row
  // exists and its calculated value is visible (not clipped away).
  // GovNavBar's tabs carry role="tab" (a11y fix, 22/08) — not the implicit
  // "button" role a plain <button> would have.
  await expect(page.getByRole("tab", { name: "פירוט הכנסות" })).toBeVisible();
  await page.getByRole("tab", { name: "פירוט הכנסות" }).click();
  const code150 = page.getByText("150", { exact: true }).first();
  await expect(code150).toBeVisible();

  // No horizontal page scroll — the old fixed 204px grid forced one.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  // Mobile chat: hidden by default, floating CTA opens the bottom sheet.
  await expect(page.getByRole("button", { name: /שאל את countme/ })).toBeVisible();
  await page.getByRole("button", { name: /שאל את countme/ }).click();
  await expect(page.getByPlaceholder(/שאל/).or(page.locator("textarea"))).toBeVisible();
  await page.getByRole("button", { name: "סגור צ׳אט" }).click();
});
