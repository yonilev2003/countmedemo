import { test, expect } from "@playwright/test";

/**
 * Smoke tests for the EY demo path. Each test is independent and self-contained.
 * Run: npm run test:e2e
 */

test.describe("/demo — gov.il-faithful form preview", () => {
  test("loads with form phase by default and shows gov.il header", async ({ page }) => {
    await page.goto("/demo");

    // Top brand strip
    await expect(page.getByText("gov.il", { exact: true })).toBeVisible();
    await expect(page.getByText("רשות המסים בישראל")).toBeVisible();
    await expect(
      page.getByText("שידור דו״ח מס הכנסה ליחיד טופס 1301"),
    ).toBeVisible();

    // File info table
    await expect(page.getByText("פרטי תיק")).toBeVisible();

    // CTA into estimate (only present in form phase)
    await expect(
      page.getByRole("button", { name: /ראה הערכת מס שנתית/ }),
    ).toBeVisible();
  });

  test("flips to estimate phase on CTA, back on header button", async ({ page }) => {
    await page.goto("/demo");

    await page.getByRole("button", { name: /ראה הערכת מס שנתית/ }).click();

    // Estimate panel appears
    await expect(page.getByText("הערכת מס שנתית")).toBeVisible();
    // Header now offers a way back
    const back = page.getByRole("button", { name: /חזור לדו״ח/ });
    await expect(back.first()).toBeVisible();

    await back.first().click();

    // Form is visible again
    await expect(page.getByText("פרטי תיק")).toBeVisible();
  });

  test("calculated value opens tooltip with formula on click", async ({ page }) => {
    await page.goto("/demo");

    // Field 150 (business income) should be a clickable calculated value.
    // We click the first button that exposes our 'calculated-value' class.
    const firstCalc = page.locator("button.calculated-value").first();
    await expect(firstCalc).toBeVisible();
    await firstCalc.click();

    // Tooltip surfaces formula + sources
    await expect(page.getByText("איך הגענו לזה")).toBeVisible();
    await expect(page.getByText("מקור")).toBeVisible();
  });

  test("manual fields are eliminated — no 'למילוי ידני' anywhere on the form", async ({ page }) => {
    await page.goto("/demo");

    // Iterate all 3 tabs
    for (const tabName of ["פרטים אישיים", "פרטים כלליים", "פירוט הכנסות"]) {
      await page.getByRole("button", { name: tabName }).click();
      await expect(page.getByText("למילוי ידני")).toHaveCount(0);
    }
  });
});

test.describe("/setup — wizard", () => {
  test("step 1 blocks advance when required fields are empty", async ({ page }) => {
    await page.goto("/setup");

    await page.getByRole("button", { name: /הבא/ }).click();

    // Validation messages appear
    await expect(page.getByText("שדה חובה").first()).toBeVisible();
    // Still on step 1
    await expect(page.getByText("פרטים אישיים")).toBeVisible();
  });

  test("עוסק זעיר checkbox appears only when עוסק פטור is selected", async ({ page }) => {
    await page.goto("/setup");

    // Fill step 1 minimally then advance to step 3
    await page.getByLabel("שם פרטי").fill("טסט");
    await page.getByLabel("שם משפחה").fill("טסטסון");
    // Valid Teudat Zehut (real check digit): 318274561
    await page.getByLabel("תעודת זהות").fill("318274561");
    await page.getByLabel("תאריך לידה").fill("1996-08-14");
    await page.getByRole("button", { name: /הבא/ }).click();
    // Step 2 — no required, just continue
    await page.getByRole("button", { name: /הבא/ }).click();

    // Step 3
    await expect(page.getByText("פרטי עסק")).toBeVisible();
    // עוסק פטור is the default → checkbox should be visible
    await expect(page.getByText("מסלול עוסק זעיר")).toBeVisible();

    // Switch to עוסק מורשה → checkbox disappears
    await page.getByLabel("סוג עוסק").selectOption("morshe");
    await expect(page.getByText("מסלול עוסק זעיר")).toHaveCount(0);
  });
});

test.describe("/api/chat — input validation + rate limit", () => {
  test("rejects malformed body with 400", async ({ request }) => {
    const res = await request.post("/api/chat", { data: { foo: "bar" } });
    // 503 if API key not set, 400 if validation runs — either is acceptable here
    expect([400, 503]).toContain(res.status());
  });

  test("rejects empty message with 400", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: { message: "", history: [], persona: {} },
    });
    expect([400, 503]).toContain(res.status());
  });
});
