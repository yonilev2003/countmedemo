import { test, expect, type Page } from "@playwright/test";
import danaCohen from "../../personas/dana-cohen.json";

/**
 * Smoke tests for the EY demo path. Each test is independent and self-contained.
 * Run: npm run test:e2e
 *
 * /demo redirects to /setup when localStorage is empty, so demo tests seed
 * the persona via page.addInitScript() before navigation.
 */

const seedPersona = async (
  page: import("@playwright/test").Page,
  persona: unknown = danaCohen,
) => {
  await page.addInitScript((p) => {
    localStorage.setItem("countme_persona", JSON.stringify(p));
  }, persona);
};

test.describe("/demo — gov.il-faithful form preview", () => {
  test("redirects to /setup when localStorage has no persona", async ({ page }) => {
    await page.goto("/demo");
    await expect(page).toHaveURL(/\/setup$/);
  });

  test("loads with form phase by default and shows gov.il header", async ({ page }) => {
    await seedPersona(page);
    await page.goto("/demo");

    await expect(page.getByText("gov.il", { exact: true })).toBeVisible();
    await expect(page.getByText("רשות המסים בישראל")).toBeVisible();
    await expect(
      page.getByText("שידור דו״ח מס הכנסה ליחיד טופס 1301"),
    ).toBeVisible();
    await expect(page.getByText("פרטי תיק")).toBeVisible();

    // Top-level CTA
    await expect(
      page.getByRole("button", { name: /ראה הערכת מס שנתית/ }),
    ).toBeVisible();
    // Bottom CTA inside the form preview
    await expect(page.getByRole("button", { name: /^המשך/ })).toBeVisible();
  });

  test("default active tab is 'פרטים אישיים'", async ({ page }) => {
    await seedPersona(page);
    await page.goto("/demo");

    // The personal tab should be visually active (white bg, bold text via TabBar styling).
    // Easiest check: the section "מצב משפחתי בשנת המס" only appears on personal tab.
    await expect(page.getByText("מצב משפחתי בשנת המס")).toBeVisible();
  });

  test("removed action buttons (שלח/בדיקה/שמירה/ניקוי/הבא) are absent from the form", async ({ page }) => {
    await seedPersona(page);
    await page.goto("/demo");

    // The form preview is inside the yellow countme frame. Scope to that container.
    // None of the gov.il action buttons should exist as buttons.
    for (const label of ["שלח", "בדיקה", "שמירה", "ניקוי"]) {
      await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0);
    }
  });

  test("flips to estimate via top CTA, returns via header back-button", async ({ page }) => {
    await seedPersona(page);
    await page.goto("/demo");

    await page.getByRole("button", { name: /ראה הערכת מס שנתית/ }).click();
    await expect(page.getByText("הערכת מס שנתית")).toBeVisible();

    await page.getByRole("button", { name: /חזור לדו״ח/ }).first().click();
    await expect(page.getByText("פרטי תיק")).toBeVisible();
  });

  test("bottom 'המשך' button also opens the estimate", async ({ page }) => {
    await seedPersona(page);
    await page.goto("/demo");

    await page.getByRole("button", { name: /^המשך/ }).click();
    await expect(page.getByText("הערכת מס שנתית")).toBeVisible();
  });

  test("calculated value tooltip opens with formula and source", async ({ page }) => {
    await seedPersona(page);
    await page.goto("/demo");

    // Default tab is personal which has no calculated fields — switch to income.
    // GovNavBar's tabs carry role="tab" (a11y fix, 22/08) — not the implicit
    // "button" role a plain <button> would have.
    await page.getByRole("tab", { name: "פירוט הכנסות" }).click();

    const firstCalc = page.locator("button.calculated-value").first();
    await expect(firstCalc).toBeVisible();
    await firstCalc.click();

    await expect(page.getByText("איך הגענו לזה")).toBeVisible();
    await expect(page.getByText("מקור", { exact: true })).toBeVisible();
  });

  test("manual fields are eliminated — no 'למילוי ידני' anywhere on the form", async ({ page }) => {
    await seedPersona(page);
    await page.goto("/demo");

    for (const tabName of ["פרטים אישיים", "פרטים כלליים", "פירוט הכנסות"]) {
      await page.getByRole("tab", { name: tabName }).click();
      await expect(page.getByText("למילוי ידני")).toHaveCount(0);
    }
  });
});

test.describe("/setup — wizard", () => {
  // Onboarding-v5: the upload fast-track is no longer a separate opening
  // step — it's a collapsed card at the top of screen 1 (see FastTrackCard
  // in setup/page.tsx). The wizard opens directly on פרטים אישיים.
  test("fast-track upload card sits collapsed on screen 1 and expands to the slots", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: "פרטים אישיים" })).toBeVisible();
    const card = page.getByRole("button", { name: /מסלול מהיר/ });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByText("דו״ח הכנסות תקופתי")).toBeVisible();
    await expect(page.getByText("אקסל הוצאות").first()).toBeVisible();
  });

  test("step 1 blocks advance when required fields are empty", async ({ page }) => {
    await page.goto("/setup");

    await page.getByRole("button", { name: /הבא/ }).click();

    await expect(page.getByText("שדה חובה").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "פרטים אישיים" })).toBeVisible();
  });

  /** Fill step 1 and advance to step 3 (פרטי עסק), asserting each arrival. */
  async function goToBusinessStep(page: Page) {
    await page.getByLabel("שם פרטי").fill("טסט");
    await page.getByLabel("שם משפחה").fill("טסטסון");
    // Must pass the israeli-id check-digit validation (the previous fixture
    // value 318274561 was invalid, so step 1 silently blocked the advance).
    await page.getByLabel("תעודת זהות").fill("123456782");
    await page.getByLabel("תאריך לידה").fill("1996-08-14");
    // מגדר became a required screen-1 field with the credit-points work.
    // Click the visible label — the radio input itself is sr-only (1×1,
    // clipped), so a direct .check() on it can't receive the pointer.
    await page.getByText("נקבה (2.75 נקודות)").click();
    // Terms+privacy consent is also required on screen 1 now (a real
    // checkbox, not sr-only — .check() works directly).
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /הבא/ }).click();
    await expect(page.getByRole("heading", { name: "מעמד ומשפחה" })).toBeVisible();
    await page.getByRole("button", { name: /הבא/ }).click();
    // Onboarding-v5: the osek picker lives on screen 3, "היכרות עם העסק"
    // (the old "פרטי עסק" screen is now screen 4, business name/address).
    await expect(page.getByRole("heading", { name: "היכרות עם העסק" })).toBeVisible();
  }

  // Onboarding-v5 osek model: two first-class radio tracks (פטור / מורשה)
  // and עוסק זעיר as a checkbox toggle. MURSHE-ZEIR REFORM (תיקון 265,
  // verified 2026-08-19): מסלול זעיר is a pure income-tax track, gated on
  // turnover only — INDEPENDENT of VAT registration — so a מורשה under the
  // ceiling can elect it too. The toggle is offered under both tracks, and
  // (round-2 fix 1d) no longer resets when the user switches tracks — an
  // earlier version of this test asserted the pre-reform "פטור only,
  // resets on switch" behavior; that was wrong and has been corrected here.
  test("עוסק זעיר toggle is offered under both פטור and מורשה, and survives a track switch", async ({ page }) => {
    await page.goto("/setup");
    await goToBusinessStep(page);

    // No track picked yet — the זעיר toggle isn't offered at all.
    await expect(page.getByText("עוסק זעיר")).toHaveCount(0);

    // Picking פטור reveals the זעיר toggle; checking it...
    await page.getByText("עוסק פטור", { exact: true }).click();
    const zeirCheckbox = page
      .getByText("עוסק זעיר", { exact: true })
      .locator("xpath=ancestor::label[1]//input[@type='checkbox']");
    await expect(zeirCheckbox).toBeVisible();
    await zeirCheckbox.check();

    // ...and switching to מורשה keeps the toggle visible AND still checked
    // (murshe-zeir reform — VAT-track switch no longer clears the flag).
    await page.getByText("עוסק מורשה", { exact: true }).click();
    await expect(zeirCheckbox).toBeVisible();
    await expect(zeirCheckbox).toBeChecked();
  });

  test("חברה בע״מ is an explainer-only dead end, not an osek track", async ({ page }) => {
    await page.goto("/setup");
    await goToBusinessStep(page);

    // Exactly two real tracks — פטור / מורשה. No company radio.
    const tracks = page.getByRole("radiogroup", { name: "סוג עוסק" }).getByRole("radio");
    await expect(tracks).toHaveCount(2);

    // The חברה card exists but only opens an honest explainer (Form 1214),
    // deliberately without selecting a track (onboarding-v5 §5 "not silent").
    await page.getByRole("button", { name: "חברה בע״מ" }).click();
    await expect(page.getByText(/חברות מגישות טופס 1214/)).toBeVisible();
  });
});

test.describe("/business-expenses — expense coaching page", () => {
  test("redirects to /setup when localStorage has no persona", async ({ page }) => {
    await page.goto("/business-expenses");
    await expect(page).toHaveURL(/\/setup$/);
  });

  test("shows occupation-tailored expense profile", async ({ page }) => {
    await page.addInitScript((p) => {
      localStorage.setItem("countme_persona", JSON.stringify(p));
    }, danaCohen);
    await page.goto("/business-expenses");

    await expect(page.getByRole("heading", { name: /יצירה ועיצוב|עצמאי כללי/ })).toBeVisible();
    await expect(page.getByText("ביטוח לאומי לעצמאי")).toBeVisible();
    await expect(page.getByText("קרן השתלמות לעצמאי")).toBeVisible();
  });
});

test.describe("/api/upload — file validation", () => {
  test("rejects request without file", async ({ request }) => {
    const res = await request.post("/api/upload", {
      multipart: { kind: "expenses-excel" },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects unknown kind", async ({ request }) => {
    const res = await request.post("/api/upload", {
      multipart: {
        kind: "garbage",
        file: { name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("x") },
      },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("/api/chat — input validation + rate limit", () => {
  test("rejects malformed body with 400", async ({ request }) => {
    const res = await request.post("/api/chat", { data: { foo: "bar" } });
    expect([400, 503]).toContain(res.status());
  });

  test("rejects empty message with 400", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: { message: "", history: [], persona: {} },
    });
    expect([400, 503]).toContain(res.status());
  });
});
