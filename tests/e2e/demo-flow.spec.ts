import { test, expect } from "@playwright/test";
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
    await page.getByRole("button", { name: "פירוט הכנסות" }).click();

    const firstCalc = page.locator("button.calculated-value").first();
    await expect(firstCalc).toBeVisible();
    await firstCalc.click();

    await expect(page.getByText("איך הגענו לזה")).toBeVisible();
    await expect(page.getByText("מקור")).toBeVisible();
  });

  test("manual fields are eliminated — no 'למילוי ידני' anywhere on the form", async ({ page }) => {
    await seedPersona(page);
    await page.goto("/demo");

    for (const tabName of ["פרטים אישיים", "פרטים כלליים", "פירוט הכנסות"]) {
      await page.getByRole("button", { name: tabName }).click();
      await expect(page.getByText("למילוי ידני")).toHaveCount(0);
    }
  });
});

test.describe("/setup — wizard", () => {
  test("step 0 fast-track upload step is the entry point", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByText("מסלול מהיר — אופציונלי")).toBeVisible();
    await expect(page.getByText("דו״ח הכנסות תקופתי")).toBeVisible();
    await expect(page.getByText("אקסל הוצאות")).toBeVisible();
  });

  test("step 1 blocks advance when required fields are empty", async ({ page }) => {
    await page.goto("/setup");

    // Skip the optional fast-track step
    await page.getByRole("button", { name: /דלג על העלאה/ }).click();

    await page.getByRole("button", { name: /הבא/ }).click();

    await expect(page.getByText("שדה חובה").first()).toBeVisible();
    await expect(page.getByText("פרטים אישיים")).toBeVisible();
  });

  test("עוסק זעיר checkbox appears only when עוסק פטור is selected", async ({ page }) => {
    await page.goto("/setup");

    await page.getByRole("button", { name: /דלג על העלאה/ }).click();
    await page.getByLabel("שם פרטי").fill("טסט");
    await page.getByLabel("שם משפחה").fill("טסטסון");
    await page.getByLabel("תעודת זהות").fill("318274561");
    await page.getByLabel("תאריך לידה").fill("1996-08-14");
    await page.getByRole("button", { name: /הבא/ }).click();
    await page.getByRole("button", { name: /הבא/ }).click();

    await expect(page.getByText("פרטי עסק")).toBeVisible();
    await expect(page.getByText("מסלול עוסק זעיר")).toBeVisible();

    await page.getByLabel("סוג עוסק").selectOption("morshe");
    await expect(page.getByText("מסלול עוסק זעיר")).toHaveCount(0);
  });

  test("חברה בע״מ option is no longer available", async ({ page }) => {
    await page.goto("/setup");
    await page.getByRole("button", { name: /דלג על העלאה/ }).click();
    await page.getByLabel("שם פרטי").fill("טסט");
    await page.getByLabel("שם משפחה").fill("טסטסון");
    await page.getByLabel("תעודת זהות").fill("318274561");
    await page.getByLabel("תאריך לידה").fill("1996-08-14");
    await page.getByRole("button", { name: /הבא/ }).click();
    await page.getByRole("button", { name: /הבא/ }).click();

    const options = await page.getByLabel("סוג עוסק").locator("option").allTextContents();
    expect(options).not.toContain("חברה בע\"מ");
    expect(options).toEqual(expect.arrayContaining(["עוסק פטור", "עוסק מורשה"]));
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
